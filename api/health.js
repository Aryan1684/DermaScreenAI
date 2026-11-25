const {load,classes,modelName,size}=require('../lib/model');
const {headers}=require('../lib/http');
module.exports=async(req,res)=>{
 headers(req,res);
 if(req.method!=='GET')return res.status(405).json({error:'GET required'});
 try{const {info}=await load();return res.status(200).json({ready:true,model:modelName,classes,inputSize:size,inputFormat:'base64 RGB',experimental_test_accuracy:info.metrics.test_accuracy,experimental_macro_f1:info.metrics.test_macro_f1,clinical_validation:false});}
 catch(e){console.error('Model initialization failed:',e.message);return res.status(503).json({ready:false,error:'Model unavailable'});}
};