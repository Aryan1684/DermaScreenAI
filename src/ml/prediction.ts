import { loadModel } from "./model";
import { SCREENING_THRESHOLD } from "./screeningConfig";
import { assessQuality, imageToCanvas, loadImageElement } from "./preprocessing";
import type { ConditionId, PredictionResult, QualityReport, ScoredCategory } from "./types";

/**
 * Turns raw model scores into a ranked list and decides whether the result is reliable enough to show.
 * The acceptance rule uses the configured screening threshold; it is not a clinical reliability guarantee.
 * A poor-quality photograph (warnings) raises the bar slightly. Scores are NOT calibrated probabilities.
 */
export function interpretScores(
  scores: ArrayLike<number>,
  classes: ConditionId[],
  threshold: number,
  quality: QualityReport,
  inferenceMs: number,
): PredictionResult {
  if (scores.length !== classes.length || classes.length === 0 || Array.from(scores).some((score) => !Number.isFinite(score) || score < 0 || score > 1)) {
    throw new Error("The model returned invalid scores. No result can be shown.");
  }
  const ranked: ScoredCategory[] = classes
    .map((id, i) => ({ id, score: scores[i] }))
    .sort((a, b) => b.score - a.score);
  const top = ranked[0];
  const effectiveThreshold = quality.issues.length > 0 ? Math.min(0.95, threshold + 0.1) : threshold;
  return {
    ranked,
    top,
    reliable: top.score >= effectiveThreshold && !quality.blocking,
    threshold: effectiveThreshold,
    quality,
    inferenceMs,
  };
}

/** Full pipeline: decode -> quality check -> resize -> (0..255 float) tensor -> TF.js inference -> ranked result. */
export async function analyseImage(objectUrl: string, onStage?: (stage: string) => void): Promise<PredictionResult> {
  onStage?.("Loading the AI model…");

  onStage?.("Preparing your photograph…");
  const img = await loadImageElement(objectUrl);
  const quality = assessQuality(img);
  if (quality.blocking) {
    throw new Error(quality.issues.find((i) => i.severity === "blocking")!.message);
  }
  const { ort, sessions, info } = await loadModel();
  const canvas = imageToCanvas(img, info.inputSize);

  onStage?.("Analysing the image…");
  await new Promise((r) => setTimeout(r, 30)); // let the loading animation paint
  const t0 = performance.now();
  const pixels=canvas.getContext("2d")!.getImageData(0,0,224,224).data;
  const rgb=new Float32Array(224*224*3);
  for(let i=0,j=0;i<pixels.length;i+=4){rgb[j++]=pixels[i];rgb[j++]=pixels[i+1];rgb[j++]=pixels[i+2];}
  const input=new ort.Tensor("float32",rgb,[1,224,224,3]);
  const data=new Float32Array(7);
  for(const session of sessions){
    const outputs=await session.run({[session.inputNames[0]]:input});
    const scores=outputs[session.outputNames[0]].data;
    if(scores.length!==7)throw new Error("Invalid model output.");
    for(let i=0;i<7;i++)data[i]+=Number(scores[i])*.5;
  }
  const ms=performance.now()-t0;
  return {...interpretScores(data,info.classes,SCREENING_THRESHOLD,quality,ms),modelCount:2};
}
