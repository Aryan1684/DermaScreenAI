"""Prepare raw RGB images for evaluating the shipped TF.js model.
Usage: python training/evaluate_existing.py --data /tmp/scin/data --out /tmp/scin/quick_eval
"""
import argparse, json
from pathlib import Path
from PIL import Image

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--data", required=True)
    p.add_argument("--out", required=True)
    a=p.parse_args()
    out=Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    rows=json.loads((Path(a.data)/"index.json").read_text())
    cases={s:{r[1] for r in rows if r[3]==s} for s in ("train","val","test")}
    assert not any(cases[a]&cases[b] for a,b in (("train","val"),("train","test"),("val","test"))), "Case leakage"
    manifest=[]
    for i,(filename,cid,category,split) in enumerate(rows):
        if split not in ("val","test"): continue
        with Image.open(filename) as im:
            im=im.convert("RGB")
            if im.size!=(224,224): im=im.resize((224,224),Image.Resampling.BILINEAR)
            raw=f"{i}.raw"
            (out/raw).write_bytes(im.tobytes())
        manifest.append({"file":raw,"case":cid,"category":category,"split":split})
    (out/"manifest.json").write_text(json.dumps(manifest))
    print("Prepared",len(manifest),"validation/test images")

if __name__=="__main__": main()
