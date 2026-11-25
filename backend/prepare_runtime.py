"""Obtain authorized assets at runtime. Never commit gated weights or credentials."""
import os, subprocess, sys, urllib.request
from pathlib import Path
from huggingface_hub import HfApi, snapshot_download

def main():
    token=os.environ.get("HF_TOKEN")
    if not token: raise RuntimeError("HF_TOKEN is required")
    root=Path(os.environ.get("DERM_WORK_DIR","/tmp/derm-runtime"))
    root.mkdir(parents=True,exist_ok=True)
    revision=HfApi(token=token).model_info("google/derm-foundation").sha
    if not revision: raise RuntimeError("Cannot resolve foundation revision")
    os.environ["DERM_REVISION"]=revision
    csv=root/"scin"; csv.mkdir(exist_ok=True)
    for name in ("cases","labels"):
        if not (csv/(name+".csv")).exists():
            urllib.request.urlretrieve("https://storage.googleapis.com/dx-scin-public-data/dataset/scin_"+name+".csv",csv/(name+".csv"))
    output=root/"head"
    # Recreate the validation-selected head with the same deterministic training procedure.
    if not (output/"classifier_head.npz").exists() or not (root/"revision.txt").exists() or (root/"revision.txt").read_text()!=revision:
        subprocess.run([sys.executable,"training/train_derm_foundation.py","--csv-dir",str(csv),"--out",str(output)],check=True)
        root.joinpath("revision.txt").write_text(revision)
    import json
    metrics=json.loads((output/"metrics.json").read_text())
    if not metrics.get("target_met"): raise RuntimeError("Evaluation failed release gate")
    model=snapshot_download("google/derm-foundation",revision=revision,token=token,allow_patterns=["saved_model.pb","variables/*","assets/*","keras_metadata.pb","fingerprint.pb"])
    root.joinpath("model_path.txt").write_text(model)

if __name__=="__main__": main()
