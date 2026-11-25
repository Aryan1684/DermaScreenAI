import type * as TF from "@tensorflow/tfjs";
import { loadEnsemble, predictEnsemble } from "./ensemble";
import { loadModel } from "./model";
import { DERM_CLASSES, predictDermRemote } from "./dermRemote";
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
export async function analyseImage(objectUrl: string, onStage?: (stage: string) => void, remote = false): Promise<PredictionResult> {
  onStage?.("Loading the AI model…");

  onStage?.("Preparing your photograph…");
  const img = await loadImageElement(objectUrl);
  const quality = assessQuality(img);
  if (quality.blocking) {
    throw new Error(quality.issues.find((i) => i.severity === "blocking")!.message);
  }
  if (remote) {
    onStage?.("Analysing using Derm Foundation backend…");
    const t = performance.now();
    const scores = await predictDermRemote(img);
    return {...interpretScores(scores, DERM_CLASSES, SCREENING_THRESHOLD, quality, performance.now()-t), modelCount:1, modelName:"derm-foundation"};
  }
  const { tf, model, info } = await loadModel();
  const canvas = imageToCanvas(img, info.inputSize);

  onStage?.("Analysing the image…");
  await new Promise((r) => setTimeout(r, 30)); // let the loading animation paint
  const t0 = performance.now();
  const ensemble = await loadEnsemble(tf, info.classes);
  if (ensemble) {
    onStage?.("Comparing two independent models…");
    const combined = await predictEnsemble(tf, imageToCanvas(img, 224), ensemble);
    const result = interpretScores(combined.scores, info.classes, ensemble.config.rejectThreshold, quality, performance.now()-t0);
    return {...result, reliable: result.reliable && combined.agreement, modelCount: 2, disagreement: !combined.agreement};
  }
  const scores = tf.tidy(() => {
    // The model contains EfficientNet's own normalisation layers, so it expects raw 0..255 RGB values.
    const x = tf.browser.fromPixels(canvas).toFloat().expandDims(0);
    return model.predict(x) as TF.Tensor;
  });
  const data = await scores.data().finally(() => scores.dispose());
  const ms = performance.now() - t0;

  return {...interpretScores(data, info.classes, SCREENING_THRESHOLD, quality, ms), modelCount: 1};
}
