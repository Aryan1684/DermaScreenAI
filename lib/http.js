const origins=new Set(['https://dermascreenai.netlify.app','https://deploy-preview-1--dermascreenai.netlify.app']);
function headers(req,res){
 const origin=req.headers.origin;
 res.setHeader('Cache-Control','no-store');
 res.setHeader('Vary','Origin');
 if(origins.has(origin)){res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Access-Control-Allow-Methods','GET, POST, OPTIONS');res.setHeader('Access-Control-Allow-Headers','Content-Type');}
 return origins.has(origin);
}
module.exports={headers};