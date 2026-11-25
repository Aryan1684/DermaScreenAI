const {predict,classes,modelName,size}=require('../lib/model');
const {headers}=require('../lib/http');
let busy=false,smokeResult;
module.exports=async(req,res)=>{
 const allowed=headers(req,res);
 if(req.method==='OPTIONS')return res.status(allowed?204:403).end();
 const smoke=req.method==='GET'&&req.query.smoke==='1';
 if(!smoke&&req.method!=='POST')return res.status(405).json({error:'POST required'});
 if(!smoke&&!allowed)return res.status(403).json({error:'Origin not allowed'});
 if(busy)return res.status(429).json({error:'Model busy'});
 if(smoke&&smokeResult)return res.status(200).json(smokeResult);
 let rgb;
 if(smoke){rgb=Uint8Array.from({length:size*size*3},(_,i)=>(Math.floor(i/3)%size+i%3*47)%256);}
 else{
   if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'JSON required'});
   let body=req.body;
   if(typeof body==='string'){try{body=JSON.parse(body);}catch{return res.status(400).json({error:'Invalid JSON'});}}
   if(body?.consent!==true||typeof body.rgb!=='string'||body.rgb.length!==size*size*4||!/^[A-Za-z0-9+/]+$/.test(body.rgb))return res.status(400).json({error:'Explicit demo consent and 224x224 RGB required'});
   rgb=Buffer.from(body.rgb,'base64');
   if(rgb.length!==size*size*3)return res.status(400).json({error:'Invalid RGB length'});
 }
 busy=true;
 try{
   const scores=await predict(rgb);
   const result={model:modelName,classes,scores,clinical_validation:false,...(smoke?{synthetic_smoke_test:true,note:'Synthetic input tests model execution only, not diagnostic performance.'}:{})};
   if(smoke)smokeResult=result;
   return res.status(200).json(result);
 }catch(e){console.error('Inference failed:',e.message);return res.status(503).json({error:'Inference unavailable'});}
 finally{busy=false;}
};