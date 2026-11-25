"""Train seven-category SCIN classifier on Google's precomputed embeddings.
Case-level split; validation-only hyperparameter selection; one final test evaluation.
No model weights or image-level embeddings are uploaded by the CI job.
"""
import argparse, ast, collections, csv, json, random, os
from pathlib import Path
import numpy as np
from huggingface_hub import hf_hub_download
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler, Normalizer
from sklearn.pipeline import make_pipeline
from sklearn.metrics import accuracy_score, f1_score, classification_report
from prepare_data import GROUPS, OTHER_CAP

CLASSES=list(GROUPS)+["other"]

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--csv-dir",required=True)
    p.add_argument("--out",required=True)
    a=p.parse_args()
    root=Path(a.csv_dir)
    out=Path(a.out); out.mkdir(parents=True,exist_ok=True)
    cases={r["case_id"]:r for r in csv.DictReader((root/"cases.csv").open())}
    mapping={l:c for c,ls in GROUPS.items() for l in ls}
    labels={}
    for r in csv.DictReader((root/"labels.csv").open()):
        try: d=ast.literal_eval(r["weighted_skin_condition_label"])
        except (SyntaxError,ValueError): continue
        if d and r["case_id"] in cases: labels[r["case_id"]]=max(d,key=d.get)
    by=collections.defaultdict(list)
    for cid,l in labels.items(): by[mapping.get(l,"other")].append(cid)
    rng=random.Random(1); by["other"].sort(); rng.shuffle(by["other"])
    by["other"]=by["other"][:OTHER_CAP]
    splits={}
    for c,ids in by.items():
        ids=sorted(ids); rng.shuffle(ids); n=len(ids); nt,nv=int(n*.6),int(n*.2)
        for i,cid in enumerate(ids): splits[cid]=(c,"train" if i<nt else "val" if i<nt+nv else "test")
    path=hf_hub_download("google/derm-foundation", "scin_dataset_precomputed_embeddings.npz",token=os.environ.get("HF_TOKEN"))
    data={s:[] for s in ("train","val","test")}; missing=collections.Counter()
    with np.load(path,allow_pickle=False) as embeddings:
        keys=set(embeddings.files)
        for cid,(cat,s) in splits.items():
            for i in (1,2,3):
                image=cases[cid].get(f"image_{i}_path")
                if not image: continue
                if image not in keys: missing[s]+=1; continue
                v=np.asarray(embeddings[image],dtype=np.float32).reshape(-1)
                if v.size!=6144 or not np.isfinite(v).all(): missing[s]+=1; continue
                data[s].append((v,CLASSES.index(cat),cid))
    def xy(s):
        rows=data[s]
        if not rows: raise ValueError("Empty split "+s)
        return np.stack([r[0] for r in rows]), np.array([r[1] for r in rows])
    assert not any({r[2] for r in data[x]} & {r[2] for r in data[y]} for x,y in [("train","val"),("train","test"),("val","test")])
    X,y=xy("train"); V,vy=xy("val")
    assert len(set(y))==len(CLASSES)
    counts=np.bincount(y,minlength=len(CLASSES))
    def metrics(y,p): return {"accuracy":float(accuracy_score(y,p)),"macro_f1":float(f1_score(y,p,labels=list(range(len(CLASSES))),average="macro",zero_division=0))}
    best=None
    for scale in ("l2","standard"):
        for C in (.01,.1,1.,10.):
            for power in (0.,.5,1.):
                w={i:float((len(y)/(len(CLASSES)*n))**power) for i,n in enumerate(counts)}
                pipe=make_pipeline(Normalizer() if scale=="l2" else StandardScaler(),LogisticRegression(C=C,class_weight=w,max_iter=800,random_state=42))
                pipe.fit(X,y)
                m=metrics(vy,pipe.predict(V)); key=(m["macro_f1"]>=.216,m["accuracy"],m["macro_f1"])
                print(scale,C,power,m,flush=True)
                if best is None or key>best[0]: best=(key,pipe,m,{"scale":scale,"C":C,"class_weight_power":power})
    _,model,validation,config=best
    T,ty=xy("test"); pred=model.predict(T); test=metrics(ty,pred)
    report={"backbone":"Google Derm Foundation (precomputed 6144-dimensional SCIN embeddings)","classes":CLASSES,
      "images":{s:len(r) for s,r in data.items()},"missing_embeddings":dict(missing),
      "validation":validation,"test":test,"config":config,
      "majority_baseline":float(np.bincount(ty).max()/len(ty)),
      "per_class":classification_report(ty,pred,labels=list(range(len(CLASSES))),target_names=CLASSES,output_dict=True,zero_division=0),
      "target_met":bool(test["accuracy"]>=.5 and test["macro_f1"]>=.216),
      "note":"Experimental case-separated image-level evaluation; embedding availability may differ from the original image download. Historical test partition already used. No clinical validation or automatic deployment."}
    (out/"metrics.json").write_text(json.dumps(report,indent=2))
    # Numeric head for local inference; deliberately not published by public CI.
    scaler,clf=model.steps[0][1],model.steps[1][1]
    np.savez(out/"classifier_head.npz",coef=clf.coef_,intercept=clf.intercept_,classes=np.array(CLASSES),scaling=np.array(config["scale"]),mean=getattr(scaler,"mean_",np.zeros(6144)),scale=getattr(scaler,"scale_",np.ones(6144)))
    print(json.dumps(report,indent=2),flush=True)

if __name__=="__main__": main()
