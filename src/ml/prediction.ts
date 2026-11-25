import type * as TF from "@tensorflow/tfjs";
import { loadModel } from "./model";
import { assessQuality, imageToCanvas, loadImageElement } from "./preprocessing";
import type { ConditionId, PredictionResult, QualityReport, ScoredCategory } from "./types";

/**
 * Turns raw model scores into a ranked list and decides whether the result is reliable enough to show.
 * The "reliable" rule uses a threshold that was chosen on the validation set during training.
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
  const { tf, model, info } = await loadModel();

  onStage?.("Preparing your photograph…");
  const img = await loadImageElement(objectUrl);
  const quality = assessQuality(img);
  if (quality.blocking) {
    throw new Error(quality.issues.find((i) => i.severity === "blocking")!.message);
  }
  const canvas = imageToCanvas(img, info.inputSize);

  onStage?.("Analysing the image…");
  await new Promise((r) => setTimeout(r, 30)); // let the loading animation paint
  const t0 = performance.now();
  const scores = tf.tidy(() => {
    // The model contains EfficientNet's own normalisation layers, so it expects raw 0..255 RGB values.
    const x = tf.browser.fromPixels(canvas).toFloat().expandDims(0);
    return model.predict(x) as TF.Tensor;
  });
  const data = await scores.data().finally(() => scores.dispose());
  const ms = performance.now() - t0;

  return interpretScores(data, info.classes, info.rejectThreshold, quality, ms);
}
