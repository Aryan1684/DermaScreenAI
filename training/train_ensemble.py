"""Train independent SCIN classifiers and export a validation-selected ensemble.
Run in the same TensorFlow/Keras environment as training/train.py.
No test results are used to choose weights or rejection thresholds.
"""
import argparse
import json
from pathlib import Path
import numpy as np
import tensorflow as tf
from tensorflow import keras
from sklearn.metrics import f1_score
from train import load, CLASSES, SIZE

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", default="/tmp/scin/data")
    parser.add_argument("--out", default="/tmp/scin/ensemble")
    parser.add_argument("--epochs", type=int, default=12)
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    rows = json.loads((Path(args.data) / "index.json").read_text())
    Xtr, ytr, ctr = load(rows, "train")
    Xva, yva, cva = load(rows, "val")
    Xte, yte, cte = load(rows, "test")
    assert not (set(ctr)&set(cva) or set(ctr)&set(cte) or set(cva)&set(cte)), "Case leakage"
    counts = np.bincount(ytr, minlength=len(CLASSES))
    assert np.all(counts > 0), "Missing training class"
    weights = {i: float((len(ytr)/(len(CLASSES)*n))**0.5) for i,n in enumerate(counts)}
    models, validation = [], []
    for name, constructor in [("mobilenetv2", keras.applications.MobileNetV2),
                              ("resnet50", keras.applications.ResNet50)]:
        keras.utils.set_random_seed(42 + len(models))
        inp = keras.Input((SIZE,SIZE,3))
        if name == "mobilenetv2":
            x = keras.layers.Rescaling(1/127.5, offset=-1)(inp)
        else:
            # ResNet50 ImageNet preprocessing: RGB -> BGR, subtract channel means.
            x = keras.layers.Lambda(keras.applications.resnet50.preprocess_input)(inp)
        backbone = constructor(weights="imagenet", include_top=False, pooling="avg", input_shape=(SIZE,SIZE,3))
        backbone.trainable = False
        x = backbone(x, training=False)
        x = keras.layers.Dropout(0.35)(x)
        model = keras.Model(inp, keras.layers.Dense(len(CLASSES), activation="softmax")(x), name=name)
        model.compile(optimizer=keras.optimizers.Adam(0.001), loss="sparse_categorical_crossentropy", metrics=["accuracy"])
        aug = keras.Sequential([keras.layers.RandomFlip("horizontal"), keras.layers.RandomRotation(.08), keras.layers.RandomZoom(.1)])
        ds = tf.data.Dataset.from_tensor_slices((Xtr,ytr)).shuffle(len(ytr),seed=42).batch(32).map(lambda x,y:(aug(tf.cast(x,tf.float32),training=True),y)).prefetch(1)
        best, best_weights = -1, None
        for epoch in range(args.epochs):
            model.fit(ds, epochs=1, class_weight=weights, verbose=2)
            p = model.predict(Xva,batch_size=32,verbose=0)
            f = f1_score(yva,p.argmax(1),average="macro",zero_division=0)
            if f > best:
                best, best_weights = f, model.get_weights()
        model.set_weights(best_weights)
        # Export only backbone + dense head, with preprocessing done in browser.
        raw = keras.Input((SIZE,SIZE,3))
        scores = model.layers[-1](backbone(raw,training=False))
        export = keras.Model(raw,scores,name=name+"_browser")
        import tensorflowjs as tfjs
        tfjs.converters.save_keras_model(export,str(out/name),quantization_dtype_map={"float16":"*"})
        models.append(model)
        validation.append(model.predict(Xva,batch_size=32,verbose=0))
    # Equal averaging, with unanimous top-category agreement.
    def combine(preds):
        mean = np.mean(preds,axis=0)
        agree = np.all(np.stack([p.argmax(1) for p in preds]) == mean.argmax(1),axis=0)
        return mean, agree
    va, agreement = combine(validation)
    threshold = None
    for t in np.arange(.30,1,.01):
        mask = agreement & (va.max(1)>=t)
        if mask.mean()>=.10 and (va.argmax(1)[mask]==yva[mask]).mean()>=.75:
            threshold = float(round(t,2))
            break
    test = [m.predict(Xte,batch_size=32,verbose=0) for m in models]
    te, agree = combine(test)
    mask = agree & (te.max(1)>=threshold) if threshold is not None else np.zeros(len(yte),dtype=bool)
    metrics = {"classes":CLASSES,"inputSize":SIZE,"rejectThreshold":threshold,
        "test_accuracy":float((te.argmax(1)==yte).mean()),
        "test_macro_f1":float(f1_score(yte,te.argmax(1),average="macro",zero_division=0)),
        "test_coverage":float(mask.mean()),
        "test_accepted_accuracy":float((te.argmax(1)[mask]==yte[mask]).mean()) if mask.any() else None,
        "individual_test_accuracy":{m.name:float((p.argmax(1)==yte).mean()) for m,p in zip(models,test)}}
    (out/"evaluation.json").write_text(json.dumps(metrics,indent=2))
    print(json.dumps(metrics,indent=2))
    print("Review held-out results and verify browser parity before enabling any exported model.")

if __name__ == "__main__":
    main()
