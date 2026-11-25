"""Verify raw-image embedding and classifier using a public SCIN example."""
import os, urllib.request
from pathlib import Path
import numpy as np
from huggingface_hub import hf_hub_download
from backend.app import embedding,scores_from_embedding,ROOT,classes
key="dataset/images/3445096909671059178.png"
raw=urllib.request.urlopen("https://storage.googleapis.com/dx-scin-public-data/"+key,timeout=60).read()
computed=embedding(raw); scores=scores_from_embedding(computed)
assert scores.shape==(7,) and np.isfinite(scores).all() and abs(scores.sum()-1)<1e-6
file=hf_hub_download("google/derm-foundation","scin_dataset_precomputed_embeddings.npz",revision=(ROOT/"revision.txt").read_text(),token=os.environ["HF_TOKEN"])
with np.load(file,allow_pickle=False) as refs:
    if key not in refs: raise RuntimeError("Public reference embedding not found")
    ref=refs[key].reshape(-1)
    cosine=float(computed@ref/(np.linalg.norm(computed)*np.linalg.norm(ref)))
    expected=scores_from_embedding(ref)
    gap=float(np.max(np.abs(scores-expected)))
    print({"embedding_cosine":cosine,"max_score_difference":gap,"raw_top":classes[int(scores.argmax())],"reference_top":classes[int(expected.argmax())]})
    assert cosine>=.99 and gap<=.05 and scores.argmax()==expected.argmax(),"Raw-image reference mismatch"
print("Raw-image smoke test passed; not a full held-out clinical evaluation.")
