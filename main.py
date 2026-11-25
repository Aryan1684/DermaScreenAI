import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL","2")
os.environ.setdefault("TF_NUM_INTRAOP_THREADS","1")
os.environ.setdefault("TF_NUM_INTEROP_THREADS","1")
os.environ.setdefault("OPENBLAS_NUM_THREADS","1")
os.environ.setdefault("OMP_NUM_THREADS","1")
assets=Path(__file__).resolve().parent/"runtime_assets"
if (assets/"model/saved_model.pb").is_file() and (assets/"head/classifier_head.npz").is_file():
 from backend.app import app
else:
 app=FastAPI(docs_url=None,redoc_url=None)
 app.add_middleware(CORSMiddleware,allow_origins=["https://dermascreenai.netlify.app","https://deploy-preview-1--dermascreenai.netlify.app"],allow_methods=["GET","POST"],allow_headers=["Content-Type"])
 @app.get("/health")
 def health():
  return JSONResponse({"ready":False,"model":"derm-foundation","error":"Model bundle missing. Configure HF_TOKEN in Vercel production environment and redeploy."},status_code=503)
 @app.post("/predict")
 def predict():
  return JSONResponse({"error":"Model not available"},status_code=503)
@app.get("/")
def root():
 return {"service":"DermaScreen AI research inference","model":"derm-foundation","health":"/health","clinical_validation":False}
