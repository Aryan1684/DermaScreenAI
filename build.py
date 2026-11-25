"""Prepare gated model in private function bundle, never in Git or static files."""
import os,sys,subprocess,tempfile,shutil,json
from pathlib import Path
ROOT=Path(__file__).resolve().parent
def main():
 target=ROOT/"runtime_assets"
 if target.exists():shutil.rmtree(target)
 if not os.environ.get("HF_TOKEN"):
  print("HF_TOKEN missing: deploying configuration-only health endpoint; inference will be disabled.")
  return
 with tempfile.TemporaryDirectory(prefix="derm-build-") as tmp:
  work=Path(tmp)/"work"
  env={**os.environ,"DERM_WORK_DIR":str(work),"HF_HOME":str(Path(tmp)/"hf"),"OPENBLAS_NUM_THREADS":"2","OMP_NUM_THREADS":"2","HF_HUB_DISABLE_TELEMETRY":"1"}
  subprocess.run([sys.executable,"backend/prepare_runtime.py"],cwd=ROOT,env=env,check=True)
  metrics=json.loads((work/"head/metrics.json").read_text())
  if metrics["test"]["accuracy"]<.5 or not metrics["target_met"]:raise RuntimeError("Research evaluation gate failed")
  target.mkdir()
  shutil.copytree((work/"model_path.txt").read_text().strip(),target/"model",symlinks=False)
  shutil.copytree(work/"head",target/"head")
  print("Private model bundle prepared. Research test accuracy:",metrics["test"]["accuracy"])
if __name__=="__main__":main()
