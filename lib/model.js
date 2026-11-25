const tf = require('@tensorflow/tfjs');
const fs = require('node:fs/promises');
const path = require('node:path');
const size=224, modelName='efficientnet-b0';
const classes=['eczema_dermatitis','psoriasis','fungal_infection','urticaria','insect_bite','acne_folliculitis','other'];
let loaded;
function load(){
 if(!loaded) {
   loaded=(async()=>{
     await tf.setBackend('cpu'); await tf.ready();
     const dir=path.join(process.cwd(),'model');
     const manifest=JSON.parse(await fs.readFile(path.join(dir,'model.json'),'utf8'));
     const info=JSON.parse(await fs.readFile(path.join(dir,'model_info.json'),'utf8'));
     if(!info.trained||info.inputSize!==size||info.classes.join(',')!==classes.join(',')) throw Error('Model metadata mismatch');
     const specs=[], chunks=[];
     for(const group of manifest.weightsManifest){specs.push(...group.weights);for(const name of group.paths){if(!/^group\d+-shard\d+of\d+\.bin$/.test(name))throw Error('Invalid weight path');chunks.push(await fs.readFile(path.join(dir,name)));}}
     const bytes=Buffer.concat(chunks);
     const model=await tf.loadLayersModel(tf.io.fromMemory({modelTopology:manifest.modelTopology,weightSpecs:specs,weightData:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)}));
     if(model.outputs[0].shape.at(-1)!==classes.length)throw Error('Unexpected output');
     return {model,info};
   })(); loaded.catch(()=>{loaded=undefined;});
 }
 return loaded;
}
async function predict(rgb) {
 if(!(rgb instanceof Uint8Array)||rgb.length!==size*size*3)throw Error('Invalid RGB input');
 const {model}=await load();
 const scores=tf.tidy(()=>Array.from(model.predict(tf.tensor4d(Float32Array.from(rgb),[1,size,size,3])).dataSync()));
 if(scores.length!==classes.length||scores.some(x=>!Number.isFinite(x)||x<0||x>1)||Math.abs(scores.reduce((a,b)=>a+b,0)-1)>.001)throw Error('Invalid model output');
 return scores;
}
module.exports={load,predict,classes,size,modelName};