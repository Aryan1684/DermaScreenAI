"""Research-only inference service. No photo persistence, no external image API."""
import io, json, os, threading, warnings
from pathlib import Path
import numpy as np
import tensorflow as tf
from PIL import Image, ImageOps
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

ROOT=Path(os.environ.get("DERM_WORK_DIR","/tmp/derm-runtime"))
MAX_BYTES=10*1024*1024
Image.MAX_IMAGE_PIXELS=20_000_000
warnings.simplefilter("error",Image.DecompressionBombWarning)
CLASSES=["eczema_dermatitis","psoriasis","fungal_infection","urticaria","insect_bite","acne_folliculitis","other"]
app=FastAPI(title="DermaScreen AI research inference",docs_url=None,redoc_url=None)
origins=os.environ.get("ALLOWED_ORIGINS","https://dermascreenai.netlify.app,https://deploy-preview-1--dermascreenai.netlify.app").split(",")
app.add_middleware(CORSMiddleware,allow_origins=[o.strip() for o in origins if o.strip()],allow_methods=["GET","POST"],allow_headers=["Content-Type"],allow_credentials=False)
lock=threading.BoundedSemaphore(1)
head=np.load(ROOT/"head/classifier_head.npz",allow_pickle=False)
classes=head["classes"].tolist()
coef=head["coef"]; intercept=head["intercept"]
scaling=str(head["scaling"].item())
mean=head["mean"]; scale=head["scale"]
if classes!=CLASSES or coef.shape!=(7,6144) or intercept.shape!=(7,) or scaling not in ("l2","standard"): raise RuntimeError("Unexpected classifier head")
if not all(np.isfinite(x).all() for x in (coef,intercept,mean,scale)) or (scale<=0).any(): raise RuntimeError("Invalid head")
metrics=json.loads((ROOT/"head/metrics.json").read_text())
if not metrics.get("target_met"): raise RuntimeError("Classifier did not meet research evaluation gate")
model=tf.saved_model.load((ROOT/"model_path.txt").read_text().strip())
infer=model.signatures["serving_default"]

def embedding(raw):
    with Image.open(io.BytesIO(raw)) as im:
        if im.format not in ("PNG","JPEG"): raise ValueError("Only JPEG or PNG")
        if min(im.size)<100 or im.width*im.height>20_000_000: raise ValueError("Image dimensions unsupported")
        img=ImageOps.exif_transpose(im).convert("RGB")
        buf=io.BytesIO(); img.save(buf,format="PNG")
    example=tf.train.Example(features=tf.train.Features(feature={"image/encoded":tf.train.Feature(bytes_list=tf.train.BytesList(value=[buf.getvalue()]))})).SerializeToString()
    emb=infer(inputs=tf.constant([example]))["embedding"].numpy().reshape(-1).astype(np.float64)
    if emb.shape!=(6144,) or not np.isfinite(emb).all(): raise RuntimeError("Invalid embedding")
    return emb

def scores_from_embedding(emb):
    if scaling=="l2": emb=emb/max(float(np.linalg.norm(emb)),1e-12)
    else: emb=(emb-mean)/scale
    logits=coef@emb+intercept
    z=np.exp(logits-np.max(logits)); scores=z/z.sum()
    if not np.isfinite(scores).all(): raise RuntimeError("Invalid scores")
    return scores

@app.get("/health")
def health():
    return {"ready":True,"model":"derm-foundation","classes":classes,"experimental_test_accuracy":metrics["test"]["accuracy"]}

@app.post("/predict")
async def predict(request:Request):
    # Only explicit requests from permitted website origins. CORS is not authentication.
    origin=request.headers.get("origin")
    if origin not in [o.strip() for o in origins]: raise HTTPException(403,"Origin not allowed")
    if request.headers.get("content-type","").split(";")[0] not in ("image/png","image/jpeg"): raise HTTPException(415,"Use PNG or JPEG")
    if not lock.acquire(blocking=False): raise HTTPException(429,"Model busy; retry shortly")
    try:
        data=bytearray()
        async for chunk in request.stream():
            data.extend(chunk)
            if len(data)>MAX_BYTES: raise HTTPException(413,"Image exceeds 10 MB")
        try: result=await run_in_threadpool(lambda:scores_from_embedding(embedding(bytes(data))))
        except (ValueError,OSError,Image.DecompressionBombError,Image.DecompressionBombWarning): raise HTTPException(400,"Invalid or unsupported photograph")
        except Exception: raise HTTPException(503,"Inference unavailable")
        return {"model":"derm-foundation","classes":classes,"scores":result.tolist()}
    finally: lock.release()
