"""Recover exact trained Keras models from historical run; verify converted ONNX on all test images."""
import argparse,json,os
from pathlib import Path
import numpy as np
import tensorflow as tf
import tf2onnx
import onnxruntime as ort
from sklearn.metrics import accuracy_score,f1_score,classification_report
from PIL import Image
p=argparse.ArgumentParser();p.add_argument("--artifact",required=True);p.add_argument("--data",required=True);p.add_argument("--out",required=True);a=p.parse_args()
source=Path(a.artifact);out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
r=json.loads((source/"metrics.json").read_text());classes=r["classes"]
assert r["ensemble_weights"]=={"mobilenetv2":0.5,"efficientnetv2b0":0.5}
assert abs(r["test"]["accuracy"]-0.3655030800821355)<1e-6,r["test"]
rows=json.loads((Path(a.data)/"index.json").read_text())
test=[x for x in rows if x[3]=="test"];assert len(test)==974
y=np.array([classes.index(x[2]) for x in test])
def pixels(row):
 return np.asarray(Image.open(row[0]).convert("RGB"),dtype=np.float32)[None,...]
pred=[];samples=[]
for name in ("mobilenetv2","efficientnetv2b0"):
 m=tf.keras.models.load_model(source/(name+".keras"),compile=False)
 @tf.function(input_signature=[tf.TensorSpec([1,224,224,3],tf.float32,name="image")])
 def serve(image):return m(image,training=False)
 file=out/(name+".onnx")
 tf2onnx.convert.from_function(serve,input_signature=serve.input_signature,opset=17,output_path=str(file))
 opts=ort.SessionOptions();opts.intra_op_num_threads=2;opts.inter_op_num_threads=1
 sess=ort.InferenceSession(str(file),sess_options=opts,providers=["CPUExecutionProvider"])
 results=[]
 for i,row in enumerate(test):
  x=pixels(row);actual=sess.run(None,{sess.get_inputs()[0].name:x})[0][0]
  assert actual.shape==(7,) and np.isfinite(actual).all() and abs(actual.sum()-1)<.001
  if i<16:
   expected=m(x,training=False).numpy()[0]
   assert np.max(np.abs(actual-expected))<.002,(name,i,actual,expected)
  results.append(actual)
  if i%100==0:print(name,i,flush=True)
 pred.append(np.stack(results))
 x=np.random.default_rng(42).integers(0,256,size=(1,224,224,3),dtype=np.uint8).astype(np.float32)
 scores=sess.run(None,{sess.get_inputs()[0].name:x})[0][0]
 samples.append({"name":name,"scores":scores.tolist()})
 del m,sess
 tf.keras.backend.clear_session()
scores=(pred[0]+pred[1])*.5
acc=float(accuracy_score(y,scores.argmax(1)));f1=float(f1_score(y,scores.argmax(1),average="macro",zero_division=0))
assert round(acc*100,2)==36.55,("Converted model did not reproduce original accuracy",acc)
assert abs(f1-r["test"]["macro_f1"])<.002,(f1,r["test"]["macro_f1"])
accepted=scores.max(1)>=.60
info={"trained":True,"version":"ensemble-onnx-1","backbone":"MobileNetV2 + EfficientNetV2-B0","inputSize":224,"classes":classes,"dataset":"SCIN","trainedOn":"GitHub Actions run 45554441628","rejectThreshold":.60,"images":r["images"],"metrics":{"test_accuracy":acc,"test_macro_f1":f1,"majority_class_baseline_accuracy":r["majority_baseline"],"test_coverage_at_threshold":float(accepted.mean()),"test_accuracy_on_accepted":float((scores.argmax(1)[accepted]==y[accepted]).mean()) if accepted.any() else None,"per_class":classification_report(y,scores.argmax(1),labels=list(range(7)),target_names=classes,output_dict=True,zero_division=0),"train_class_counts":{},"test_class_counts":{c:int((y==i).sum()) for i,c in enumerate(classes)}}}
(out/"model_info.json").write_text(json.dumps(info,indent=2))
Path("/tmp/ensemble-reference.json").write_text(json.dumps(samples))
x.astype("<f4").tofile("/tmp/ensemble-reference.raw")
print(json.dumps(info,indent=2))
