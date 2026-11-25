import fs from "node:fs";
import * as ort from "onnxruntime-web";
ort.env.wasm.numThreads=1;
const refs=JSON.parse(fs.readFileSync("/tmp/ensemble-reference.json","utf8"));
const b=fs.readFileSync("/tmp/ensemble-reference.raw");
const x=new Float32Array(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
for(const ref of refs){const s=await ort.InferenceSession.create(new Uint8Array(fs.readFileSync("public/models/ensemble/"+ref.name+".onnx")),{executionProviders:["wasm"]});const out=await s.run({[s.inputNames[0]]:new ort.Tensor("float32",x,[1,224,224,3])});const scores=Array.from(out[s.outputNames[0]].data);const diff=Math.max(...scores.map((v,i)=>Math.abs(v-ref.scores[i])));if(!Number.isFinite(diff)||diff>.002)throw Error("WASM score mismatch "+diff);console.log(ref.name,"WASM matches Python",diff);await s.release();}
