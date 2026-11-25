import {Sandbox} from '@vercel/sandbox';
import {timingSafeEqual,randomBytes} from 'node:crypto';
const repo='https://github.com/Aryan1684/DermaScreenAI.git';
const revision='3d1a8af42cfda4e0310d08fd2cde4130b88c3e71';
function authorized(req){
 const expected=process.env.DEMO_ADMIN_KEY||'';
 const supplied=String(req.headers.authorization||'');
 if(expected.length<24)return false;
 const a=Buffer.from('Bearer '+expected),b=Buffer.from(supplied);
 return a.length===b.length&&timingSafeEqual(a,b);
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'POST required'});
 if(!authorized(req))return res.status(401).json({error:'Admin key required'});
 let body=req.body||{};if(typeof body==='string'){try{body=JSON.parse(body)}catch{return res.status(400).json({error:'Invalid JSON'})}}
 if(body.action==='stop'){
   if(typeof body.name!=='string'||!/^derm-demo-[a-f0-9]{16}$/.test(body.name))return res.status(400).json({error:'Invalid session name'});
   try{const sandbox=await Sandbox.get({name:body.name,resume:false});await sandbox.stop();return res.status(200).json({stopped:true});}
   catch{return res.status(400).json({error:'Session not found or already stopped'});}
 }
 if(body.action!=='start')return res.status(400).json({error:'Invalid action'});
 if(!process.env.HF_TOKEN)return res.status(503).json({error:'Set HF_TOKEN in Vercel project settings and redeploy'});
 let sandbox;
 try{
   const name='derm-demo-'+randomBytes(8).toString('hex');
   sandbox=await Sandbox.create({name,persistent:false,resources:{vcpus:4},timeout:45*60*1000,ports:[7860],source:{type:'git',url:repo,revision,depth:1}});
   const cmd=await sandbox.runCommand({cmd:'bash',args:['-lc',`set -eu
cd /vercel/sandbox
test "$(git rev-parse HEAD)" = '3d1a8af42cfda4e0310d08fd2cde4130b88c3e71'
env -u HF_TOKEN uv python install 3.11
env -u HF_TOKEN uv venv --python 3.11 /tmp/derm-venv
env -u HF_TOKEN uv pip install --python /tmp/derm-venv/bin/python -r backend/requirements.txt
/tmp/derm-venv/bin/python -m backend.prepare_runtime
/tmp/derm-venv/bin/python -m backend.smoke_test
unset HF_TOKEN
exec /tmp/derm-venv/bin/python -m uvicorn backend.app:app --host 0.0.0.0 --port 7860 --no-access-log`],cwd:'/vercel/sandbox',detached:true,env:{HF_TOKEN:process.env.HF_TOKEN,DERM_WORK_DIR:'/tmp/derm-runtime',HF_HOME:'/tmp/huggingface',ALLOWED_ORIGINS:'https://dermascreenai.netlify.app,https://deploy-preview-1--dermascreenai.netlify.app',TF_CPP_MIN_LOG_LEVEL:'2',TF_NUM_INTRAOP_THREADS:'2',TF_NUM_INTEROP_THREADS:'2',OPENBLAS_NUM_THREADS:'2',OMP_NUM_THREADS:'2'}});
   return res.status(202).json({name,sandboxId:sandbox.sandboxId,commandId:cmd.cmdId,backendUrl:sandbox.domain(7860),maxSessionMinutes:45,status:'initializing; check /health; not yet ready'});
 }catch(e){if(sandbox){try{await sandbox.stop()}catch{}}console.error('Demo sandbox creation failed:',e?.name||'Error');return res.status(503).json({error:'Sandbox startup could not be initiated. Check Vercel sandbox limits and logs.'});}
}