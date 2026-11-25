"""Compact public DINOv2 int8 encoder + classifier, seven SCIN classes.
Select only on validation; test once. No teacher-derived weights published.
"""
import os, argparse, json, hashlib
from pathlib import Path
import numpy as np
import onnxruntime as ort
from PIL import Image
from huggingface_hub import hf_hub_download,HfApi
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import Normalizer
from sklearn.metrics import accuracy_score,f1_score,classification_report
from prepare_data import GROUPS

CLASSES=list(GROUPS)+["other"]
def main():
 p=argparse.ArgumentParser();p.add_argument("--data",required=True);p.add_argument("--out",required=True);a=p.parse_args()
 out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
 rows=json.loads((Path(a.data)/"index.json").read_text())
 splits={s:[r for r in rows if r[3]==s] for s in ("train","val","test")}
 for x,y in (("train","val"),("train","test"),("val","test")):assert not ({r[1] for r in splits[x]}&{r[1] for r in splits[y]})
 labels={s:np.array([CLASSES.index(r[2]) for r in rr]) for s,rr in splits.items()}
 repo="Xenova/dinov2-small";rev=HfApi().model_info(repo).sha
 filename="onnx/model_quantized.onnx"
 path=hf_hub_download(repo,filename,revision=rev)
 opts=ort.SessionOptions();opts.intra_op_num_threads=4;opts.inter_op_num_threads=1
 model=ort.InferenceSession(path,sess_options=opts,providers=["CPUExecutionProvider"])
 inp=model.get_inputs()[0].name
 def features(split):
  out=[]
  for i in range(0,len(splits[split]),8):
   batch=[]
   for r in splits[split][i:i+8]:
    with Image.open(r[0]) as im:
     x=np.asarray(im.convert("RGB").resize((224,224),Image.Resampling.BICUBIC),dtype=np.float32)/255
    x=(x-np.array([.485,.456,.406],np.float32))/np.array([.229,.224,.225],np.float32)
    batch.append(x.transpose(2,0,1))
   z=model.run(None,{inp:np.stack(batch)})[0]
   assert z.ndim==3 and z.shape[-1]==384,z.shape
   out.append(np.concatenate([z[:,0],z[:,1:].mean(1)],axis=1))
   if i%256==0:print(split,i,len(splits[split]),flush=True)
  return np.concatenate(out)
 tr=features("train");va=features("val")
 def metric(y,p):return {"accuracy":float(accuracy_score(y,p)),"macro_f1":float(f1_score(y,p,average="macro",zero_division=0))}
 best=None
 for kind in ("cls","patch","both"):
  def select(x):return x[:,:384] if kind=="cls" else x[:,384:] if kind=="patch" else x
  X=Normalizer().fit_transform(select(tr));V=Normalizer().fit_transform(select(va))
  counts=np.bincount(labels["train"],minlength=7)
  for C in (.1,1,10,100,300):
   for power in (0,.25,.5,1):
    w={i:float((len(X)/(7*n))**power) for i,n in enumerate(counts)}
    clf=LogisticRegression(C=C,class_weight=w,max_iter=1200,random_state=42).fit(X,labels["train"])
    m=metric(labels["val"],clf.predict(V));key=(m["macro_f1"]>=.216,m["accuracy"],m["macro_f1"])
    if best is None or key>best[0]:best=(key,kind,clf,m,C,power)
 _,kind,clf,val,C,power=best
 te=features("test")
 T=Normalizer().fit_transform(te[:,:384] if kind=="cls" else te[:,384:] if kind=="patch" else te)
 pred=clf.predict(T);test=metric(labels["test"],pred)
 report={"encoder":repo,"revision":rev,"filename":filename,"encoder_bytes":os.path.getsize(path),"classes":CLASSES,"feature":kind,"validation":val,"test":test,"config":{"C":C,"power":power},"images":{s:len(rr) for s,rr in splits.items()},"target_met":test["accuracy"]>=.5 and test["macro_f1"]>=.216,"per_class":classification_report(labels["test"],pred,labels=list(range(7)),target_names=CLASSES,output_dict=True,zero_division=0),"note":"Quantized encoder evaluated directly; historical SCIN case-separated partition previously used. Research only."}
 (out/"metrics.json").write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
 if report["target_met"]:
  np.savez(out/"head.npz",coef=clf.coef_,intercept=clf.intercept_,classes=np.array(CLASSES),feature=np.array(kind))
if __name__=="__main__":main()
