"""CPU-compatible transfer learning experiment. No test-set tuning.
Trains logistic heads on frozen ImageNet features, then evaluates the
validation-selected classifier/ensemble on held-out SCIN cases.
"""
import argparse, json, os
from pathlib import Path
import numpy as np
import tensorflow as tf
from tensorflow import keras
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, f1_score, classification_report
from train import CLASSES, SIZE

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--data", required=True)
    p.add_argument("--out", required=True)
    a=p.parse_args()
    out=Path(a.out)
    out.mkdir(parents=True,exist_ok=True)
    rows=json.loads((Path(a.data)/"index.json").read_text())
    splits={s:[r for r in rows if r[3]==s] for s in ("train","val","test")}
    cases={s:{r[1] for r in rr} for s,rr in splits.items()}
    assert not any(cases[x]&cases[y] for x,y in (("train","val"),("train","test"),("val","test"))), "Case leakage"
    labels={s:np.array([CLASSES.index(r[2]) for r in rr]) for s,rr in splits.items()}
    assert all(set(y)==set(range(len(CLASSES))) for y in labels.values()), "Missing classes"
    keras.utils.set_random_seed(42)
    def dataset(s):
        paths=[r[0] for r in splits[s]]
        def decode(f):
            x=tf.io.decode_jpeg(tf.io.read_file(f),channels=3)
            return tf.image.resize(x,(SIZE,SIZE))
        return tf.data.Dataset.from_tensor_slices(paths).map(decode,num_parallel_calls=2).batch(32).prefetch(1)
    def metrics(y,prob):
        return {"accuracy":float(accuracy_score(y,prob.argmax(1))),
                "macro_f1":float(f1_score(y,prob.argmax(1),average="macro",zero_division=0))}
    architectures=[("mobilenetv2",keras.applications.MobileNetV2),
                   ("efficientnetv2b0",keras.applications.EfficientNetV2B0)]
    candidates=[]
    for name,constructor in architectures:
        print("Extracting",name,flush=True)
        inp=keras.Input((SIZE,SIZE,3))
        x=keras.layers.Rescaling(1/127.5,offset=-1)(inp) if name=="mobilenetv2" else inp
        bb=constructor(weights="imagenet",include_top=False,pooling="avg",input_shape=(SIZE,SIZE,3))
        bb.trainable=False
        feature=keras.Model(inp,bb(x,training=False))
        # Training feature augmentation: original plus horizontal flip.
        tr=feature.predict(dataset("train"),verbose=1)
        flip=feature.predict(dataset("train").map(lambda x:tf.reverse(x,[2])),verbose=1)
        tr=np.concatenate([tr,flip]); ytr=np.tile(labels["train"],2)
        va=feature.predict(dataset("val"),verbose=1)
        scaler=StandardScaler().fit(tr)
        tr=scaler.transform(tr); va_s=scaler.transform(va)
        best=None
        for c in (.01,.05,.2,1.0):
            for power in (0,.5,1):
                counts=np.bincount(ytr,minlength=len(CLASSES))
                weights={i:float((len(ytr)/(len(CLASSES)*n))**power) for i,n in enumerate(counts)}
                clf=LogisticRegression(C=c,class_weight=weights,max_iter=500,random_state=42).fit(tr,ytr)
                prob=clf.predict_proba(va_s); m=metrics(labels["val"],prob)
                # Require a minimum useful macro-F1 while optimizing accuracy.
                key=(m["macro_f1"]>=.216,m["accuracy"],m["macro_f1"])
                if best is None or key>best[0]: best=(key,clf,prob,m,{"C":c,"class_weight_power":power})
        _,clf,prob,m,config=best
        # Fold standardized linear head into a Keras dense softmax layer.
        w=clf.coef_.T/scaler.scale_[:,None]
        b=clf.intercept_-scaler.mean_@w
        dense=keras.layers.Dense(len(CLASSES),activation="softmax",name=name+"_head")
        model=keras.Model(inp,dense(feature.output),name=name+"_skin")
        dense.set_weights([w.astype("float32"),b.astype("float32")])
        check=model.predict(dataset("val").take(1),verbose=0)
        assert np.max(np.abs(check-prob[:len(check)]))<.002, "Export head mismatch"
        model.save(out/(name+".keras"))
        candidates.append({"name":name,"val":prob,"model":model,"config":config,"metrics":m})
        print(name,m,flush=True)
    # Select single model or equal/weighted ensemble only on validation.
    options=[(1.,0.),(.75,.25),(.5,.5),(.25,.75),(0.,1.)]
    def mix(probs,w): return sum(p*v for p,v in zip(probs,w))
    def key(w):
        m=metrics(labels["val"],mix([c["val"] for c in candidates],w))
        return (m["macro_f1"]>=.216,m["accuracy"],m["macro_f1"])
    chosen=max(options,key=key)
    val=metrics(labels["val"],mix([c["val"] for c in candidates],chosen))
    # Test is read only after selection; no retuning on test results.
    test=[c["model"].predict(dataset("test"),verbose=1) for c in candidates]
    pred=mix(test,chosen); m=metrics(labels["test"],pred)
    majority=float(np.bincount(labels["test"]).max()/len(labels["test"]))
    report={"classes":CLASSES,"images":{s:len(v) for s,v in splits.items()},
        "validation":val,"test":m,"majority_baseline":majority,
        "ensemble_weights":dict(zip([c["name"] for c in candidates],chosen)),
        "individual_validation":{c["name"]:{"metrics":c["metrics"],"config":c["config"]} for c in candidates},
        "per_class":classification_report(labels["test"],pred.argmax(1),labels=list(range(len(CLASSES))),target_names=CLASSES,output_dict=True,zero_division=0),
        "target_met":bool(m["accuracy"]>=.5 and m["macro_f1"]>=.216),
        "note":"Experimental image-level result on case-separated SCIN data; existing test partition previously used. No clinical validation or automatic deployment."}
    (out/"metrics.json").write_text(json.dumps(report,indent=2))
    print(json.dumps(report,indent=2))
    # Keep artifacts limited to trained weights and metrics; no patient photos.

if __name__=="__main__": main()
