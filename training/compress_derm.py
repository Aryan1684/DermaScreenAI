"""FP16 TFLite conversion and evaluation on the original case-separated SCIN test.
No gated model or derived embeddings published. Failed conversion is a failed experiment.
"""
import ast, collections, csv, io, json, os, random, time, urllib.request
from pathlib import Path
import numpy as np
import tensorflow as tf
from PIL import Image,ImageOps
from sklearn.metrics import accuracy_score,f1_score
from huggingface_hub import hf_hub_download
from training.prepare_data import GROUPS,OTHER_CAP
ROOT=Path(os.environ.get("DERM_WORK_DIR","/tmp/derm-runtime"))
OUT=Path("compression-report");OUT.mkdir(exist_ok=True)
def save(report):
 (OUT/"fp16.json").write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2),flush=True)
def main():
 modeldir=(ROOT/"model_path.txt").read_text().strip()
 report={"status":"conversion_started","target_met":False,"source_bytes":sum(p.stat().st_size for p in Path(modeldir).rglob("*") if p.is_file())}
 save(report)
 try:
  converter=tf.lite.TFLiteConverter.from_saved_model(modeldir)
  converter.optimizations=[tf.lite.Optimize.DEFAULT]
  converter.target_spec.supported_types=[tf.float16]
  converter.target_spec.supported_ops=[tf.lite.OpsSet.TFLITE_BUILTINS,tf.lite.OpsSet.SELECT_TF_OPS]
  result=converter.convert()
  dest=ROOT/"model-fp16.tflite";dest.write_bytes(result);del result,converter
  report.update(status="converted",compressed_bytes=dest.stat().st_size)
  save(report)
 except Exception as e:
  report.update(status="conversion_failed",error=type(e).__name__,detail=str(e)[-2000:]);save(report);raise
 interpreter=tf.lite.Interpreter(model_path=str(dest),num_threads=1)
 sig=interpreter.get_signature_runner("serving_default")
 head=np.load(ROOT/"head/classifier_head.npz",allow_pickle=False)
 classes=head["classes"].tolist()
 def scores(raw):
  with Image.open(io.BytesIO(raw)) as im:
   buf=io.BytesIO();ImageOps.exif_transpose(im).convert("RGB").save(buf,format="PNG")
  example=tf.train.Example(features=tf.train.Features(feature={"image/encoded":tf.train.Feature(bytes_list=tf.train.BytesList(value=[buf.getvalue()]))})).SerializeToString()
  emb=sig(inputs=np.array([example],dtype=object))["embedding"].reshape(-1).astype(np.float64)
  assert emb.shape==(6144,) and np.isfinite(emb).all()
  if str(head["scaling"].item())=="l2":emb/=max(float(np.linalg.norm(emb)),1e-12)
  else:emb=(emb-head["mean"])/head["scale"]
  return head["coef"]@emb+head["intercept"]
 cases={r["case_id"]:r for r in csv.DictReader((ROOT/"scin/cases.csv").open())}
 mapping={l:c for c,ls in GROUPS.items() for l in ls};labels={}
 for r in csv.DictReader((ROOT/"scin/labels.csv").open()):
  try:d=ast.literal_eval(r["weighted_skin_condition_label"])
  except (SyntaxError,ValueError):continue
  if d and r["case_id"] in cases:labels[r["case_id"]]=max(d,key=d.get)
 by=collections.defaultdict(list)
 for cid,l in labels.items():by[mapping.get(l,"other")].append(cid)
 rng=random.Random(1);by["other"].sort();rng.shuffle(by["other"]);by["other"]=by["other"][:OTHER_CAP]
 test=[]
 for cat,ids in by.items():
  ids=sorted(ids);rng.shuffle(ids);n=len(ids);nt,nv=int(n*.6),int(n*.2)
  for cid in ids[nt+nv:]:
   for i in (1,2,3):
    path=cases[cid].get(f"image_{i}_path")
    if path:test.append((path,classes.index(cat)))
 refs=hf_hub_download("google/derm-foundation","scin_dataset_precomputed_embeddings.npz",revision=(ROOT/"revision.txt").read_text(),token=os.environ["HF_TOKEN"])
 with np.load(refs,allow_pickle=False) as f:keys=set(f.files)
 test=[(p,y) for p,y in test if p in keys]
 assert len(test)==974,("Unexpected test count",len(test))
 y=[];pred=[];start=time.monotonic()
 for i,(p,label) in enumerate(test):
  for attempt in range(3):
   try:raw=urllib.request.urlopen("https://storage.googleapis.com/dx-scin-public-data/"+p,timeout=60).read();break
   except Exception:
    if attempt==2:raise
  pred.append(int(scores(raw).argmax()));y.append(label)
  if i%50==0:print("evaluated",i+1,"/",len(test),flush=True)
 acc=float(accuracy_score(y,pred));f1=float(f1_score(y,pred,average="macro",zero_division=0))
 report.update(status="evaluated",test_accuracy=acc,macro_f1=f1,test_images=len(y),elapsed_s=time.monotonic()-start,target_met=acc>=.5 and f1>=.216,note="Historical test split; no clinical validation. All 974 reference-available images evaluated.")
 save(report)
if __name__=="__main__":main()
