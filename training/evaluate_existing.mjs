// Evaluate the exact exported weights, not a hypothetical model.
// npm ci; optionally install @tensorflow/tfjs-node separately for faster local CPU inference.
import fs from "node:fs";
import path from "node:path";
import * as tf from "@tensorflow/tfjs";
const [modelDir="public/models/skin", dataDir="/tmp/scin/quick_eval"]=process.argv.slice(2);
const read=p=>JSON.parse(fs.readFileSync(p,"utf8"));
const info=read(path.join(modelDir,"model_info.json"));
const manifest=read(path.join(dataDir,"manifest.json"));
const json=read(path.join(modelDir,"model.json"));
try { await import("@tensorflow/tfjs-node"); await tf.setBackend("tensorflow"); }
catch { await tf.setBackend("cpu"); }
await tf.ready();
const model=await tf.loadLayersModel({async load(){
  const specs=[], buffers=[];
  for(const g of json.weightsManifest){
    specs.push(...g.weights); for(const p of g.paths) buffers.push(fs.readFileSync(path.join(modelDir,p)));
  }
  const b=Buffer.concat(buffers);
  return {modelTopology:json.modelTopology,weightSpecs:specs,weightData:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
}});
const k=info.classes.length;
const argmax=v=>v.indexOf(Math.max(...v));
function metric(rows, score) {
  const cm=Array.from({length:k},()=>Array(k).fill(0));
  for(const r of rows) cm[r.label][argmax(score(r))]++;
  const n=rows.length;
  const accuracy=cm.reduce((s,r,i)=>s+r[i],0)/n;
  const macroF1=cm.reduce((s,r,i)=>{
    const denom=r.reduce((a,b)=>a+b,0)+cm.reduce((a,b)=>a+b[i],0);
    return s+(denom?2*r[i]/denom:0);
  },0)/k;
  return {accuracy,macroF1,count:n,confusionMatrix:cm};
}
async function collect(split) {
  const rows=[];
  for(const r of manifest.filter(r=>r.split===split)){
    const bytes=fs.readFileSync(path.join(dataDir,r.file));
    const label=info.classes.indexOf(r.category);
    if(label<0||bytes.length!==224*224*3) throw Error("Invalid evaluation input");
    const pred=tf.tidy(()=>{
      const x=tf.tensor4d(Float32Array.from(bytes),[1,224,224,3]);
      const batch=tf.concat([x,tf.reverse(x,[2]),tf.reverse(x,[1]),tf.reverse(x,[1,2])],0);
      return model.predict(batch);
    });
    const values=Array.from(await pred.data().finally(()=>pred.dispose()));
    if(values.length!==4*k||values.some(v=>!Number.isFinite(v)||v<0||v>1)) throw Error("Invalid model output");
    const base=values.slice(0,k);
    const tta=base.map((_,i)=>(values[i]+values[k+i]+values[2*k+i]+values[3*k+i])/4);
    rows.push({label,base,tta});
    if(rows.length%50===0) console.log(split,rows.length);
  }
  if(!rows.length) throw Error("Empty "+split+" set");
  return rows;
}
const counts=info.classes.map(c=>info.metrics.train_class_counts[c]);
if(counts.some(x=>!Number.isFinite(x)||x<=0))throw Error("Missing class counts");
const prior=counts.map(n=>n/counts.reduce((a,b)=>a+b,0));
const score=(r,cfg)=>{
  const v=(cfg.tta?r.tta:r.base).map((x,i)=>x*prior[i]**cfg.alpha);
  const sum=v.reduce((a,b)=>a+b,0);
  if(!Number.isFinite(sum)||sum<=0)throw Error("Invalid adjusted score");
  return v.map(x=>x/sum);
};
const val=await collect("val");
const baseline={tta:false,alpha:0};
const baselineVal=metric(val,r=>score(r,baseline));
// Select on validation ONLY; preserve macro-F1 to avoid simply favouring eczema.
let best={config:baseline,metrics:baselineVal};
for(const tta of [false,true])for(const alpha of [-.5,-.25,0,.25,.5,.75,1]){
  const cfg={tta,alpha}, m=metric(val,r=>score(r,cfg));
  if(m.macroF1>=baselineVal.macroF1 && (m.accuracy>best.metrics.accuracy || (m.accuracy===best.metrics.accuracy&&m.macroF1>best.metrics.macroF1))) best={config:cfg,metrics:m};
}
// Do not tune after looking at test results.
const test=await collect("test");
const before=metric(test,r=>score(r,baseline));
const after=metric(test,r=>score(r,best.config));
const targetMet=after.accuracy>=.5 && after.macroF1>=before.macroF1 && after.accuracy>before.accuracy;
const report={baselineValidation:baselineVal,selectedValidation:best,baselineTest:before,selectedTest:after,targetMet,
 note:"Research evaluation only. No clinical validation; no automatic activation. Existing test set has previously been evaluated."};
fs.writeFileSync(path.join(dataDir,"quick_evaluation.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
model.dispose();
