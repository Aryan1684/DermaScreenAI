import type * as TF from "@tensorflow/tfjs";
import type { ConditionId } from "./types";

export interface EnsembleConfig {
  enabled: boolean;
  classes: ConditionId[];
  rejectThreshold: number;
  members: { name: "mobilenetv2" | "resnet50"; url: string }[];
}

export function combineScores(outputs: ArrayLike<number>[], count: number) {
  if (outputs.length < 2 || count < 2) throw new Error("Incomplete ensemble");
  const vectors = outputs.map(v => Array.from(v));
  for (const v of vectors) {
    if (v.length !== count || v.some(x => !Number.isFinite(x) || x < 0 || x > 1) ||
        Math.abs(v.reduce((a,b)=>a+b,0)-1) > .02) throw new Error("Invalid ensemble output");
  }
  const scores = Array.from({length:count},(_,i)=>vectors.reduce((s,v)=>s+v[i],0)/vectors.length);
  const top = (v:number[]) => v.indexOf(Math.max(...v));
  return {scores, agreement:vectors.every(v=>top(v)===top(scores))};
}

let cached: Promise<{config:EnsembleConfig; models:TF.LayersModel[]} | null> | null = null;
export function loadEnsemble(tf:typeof TF, classes:ConditionId[]) {
  if (!cached) cached = (async()=>{
    const response = await fetch("/models/ensemble/config.json",{cache:"no-cache"});
    if (!response.ok) throw new Error("Ensemble configuration unavailable");
    const config = await response.json() as EnsembleConfig;
    if (!config.enabled) return null;
    if (JSON.stringify(config.classes)!==JSON.stringify(classes) ||
        !Number.isFinite(config.rejectThreshold) || config.rejectThreshold<=0 || config.rejectThreshold>1 ||
        config.members.length!==2 || new Set(config.members.map(m=>m.name)).size!==2 ||
        config.members.some(m=>!["mobilenetv2","resnet50"].includes(m.name)||m.url!=="/models/ensemble/"+m.name+"/model.json"))
      throw new Error("Invalid ensemble configuration");
    const models:TF.LayersModel[]=[];
    try {
      for (const member of config.members) {
        const model = await tf.loadLayersModel(member.url);
        models.push(model);
        if (model.outputs[0]?.shape.at(-1)!==classes.length ||
            JSON.stringify(model.inputs[0]?.shape.slice(1))!==JSON.stringify([224,224,3]))
          throw new Error("Ensemble model shape mismatch");
      }
      return {config,models};
    } catch(e) { models.forEach(m=>m.dispose()); throw e; }
  })();
  cached.catch(()=>{cached=null;});
  return cached;
}

export async function predictEnsemble(tf:typeof TF, canvas:HTMLCanvasElement, loaded:NonNullable<Awaited<ReturnType<typeof loadEnsemble>>>) {
  const outputs = [];
  for (let i=0;i<loaded.models.length;i++) {
    const tensor = tf.tidy(()=>{
      const raw = tf.browser.fromPixels(canvas).toFloat().expandDims(0);
      const input = loaded.config.members[i].name==="mobilenetv2"
        ? raw.div(127.5).sub(1)
        : tf.reverse(raw,[-1]).sub(tf.tensor1d([103.939,116.779,123.68]));
      return loaded.models[i].predict(input) as TF.Tensor;
    });
    outputs.push(await tensor.data().finally(()=>tensor.dispose()));
  }
  return combineScores(outputs,loaded.config.classes.length);
}
