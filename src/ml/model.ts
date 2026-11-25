import type { ModelInfo } from "./types";
export const MODEL_INFO_URL="/models/ensemble/model_info.json";
const modelUrls=["/models/ensemble/mobilenetv2.onnx","/models/ensemble/efficientnetv2b0.onnx"];
export class ModelUnavailableError extends Error {constructor(message:string){super(message);this.name="ModelUnavailableError";}}
export async function fetchModelInfo():Promise<ModelInfo|null>{
 try{const r=await fetch(MODEL_INFO_URL,{cache:"no-cache"});if(!r.ok)return null;const x=await r.json() as ModelInfo;return x.trained&&x.classes.length===7&&x.version==="ensemble-onnx-1"?x:null;}catch{return null;}
}
export async function checkModelAssets():Promise<boolean>{
 try{return (await Promise.all([...modelUrls,"/models/ensemble/wasm/ort-wasm-simd-threaded.wasm"].map(async u=>(await fetch(u,{method:"HEAD",cache:"no-cache"})).ok))).every(Boolean);}catch{return false;}
}
let loaded:Promise<{ort:typeof import("onnxruntime-web");sessions:import("onnxruntime-web").InferenceSession[];info:ModelInfo}>|null=null;
export function loadModel(){
 if(!loaded){loaded=(async()=>{
  const info=await fetchModelInfo();if(!info)throw new ModelUnavailableError("Verified ensemble metadata is not available.");
  const ort=await import("onnxruntime-web");
  ort.env.wasm.numThreads=1;ort.env.wasm.wasmPaths="/models/ensemble/wasm/";
  const sessions:import("onnxruntime-web").InferenceSession[]=[];
  try{for(const url of modelUrls)sessions.push(await ort.InferenceSession.create(url,{executionProviders:["wasm"]}));return{ort,sessions,info};}
  catch(e){for(const s of sessions)await s.release();throw new ModelUnavailableError("The browser could not load the trained ensemble. Please try a desktop browser.");}
 })();loaded.catch(()=>{loaded=null;});}
 return loaded;
}
