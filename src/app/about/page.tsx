"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchModelInfo } from "@/ml/model";
import { SCREENING_THRESHOLD } from "@/ml/screeningConfig";
import { CONDITIONS } from "@/ml/conditions";
import type { ModelInfo } from "@/ml/types";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card">
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-slate-700">{children}</div>
    </section>
  );
}

export default function AboutPage() {
  const [info, setInfo] = useState<ModelInfo | null | undefined>(undefined);
  useEffect(() => {
    fetchModelInfo().then(setInfo);
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-10">
      <header>
        <h1 className="section-title">About the project</h1>
        <p className="mt-2 text-slate-600">AI-Powered Skin Condition Screening Using Smartphone Images – a college minor project.</p>
      </header>

      <Block title="Introduction">
        <p>
          This is an academic web application that lets a user upload or capture a photograph of a skin area and receive preliminary
          information about possible skin-condition categories. A deep-learning image classifier runs inside the browser using TensorFlow.js,
          so local screening needs no prediction server. Optional server-based Derm Foundation research mode requires separate consent and a configured backend.
        </p>
      </Block>

      <Block title="Problem statement">
        <p>
          Access to dermatologists is limited in many rural and underserved regions of India. Geographical barriers, limited facilities and low
          awareness can delay the recognition of skin conditions and the decision to seek treatment. Early recognition can help people seek
          medical attention sooner.
        </p>
      </Block>

      <Block title="Objectives">
        <ul className="list-disc space-y-1 pl-5">
          <li>Build a simple, mobile-friendly web application for uploading or capturing skin photographs.</li>
          <li>Train a transfer-learning image classifier on a real, public dermatology image dataset.</li>
          <li>Run inference in the browser so the application can be hosted statically and protects privacy.</li>
          <li>Show results honestly: report uncertainty, give educational information and always recommend professional consultation.</li>
        </ul>
      </Block>

      <Block title="Technologies used">
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>Next.js / React + TypeScript</strong> – user interface (exported as a static site for Netlify).</li>
          <li><strong>Tailwind CSS</strong> – responsive styling.</li>
          <li><strong>TensorFlow.js</strong> – in-browser model loading and inference.</li>
          <li><strong>TensorFlow / Keras (Python)</strong> – model training and export to TensorFlow.js format.</li>
          <li><strong>HTML canvas</strong> – image resizing and basic quality checks (brightness, contrast, blur).</li>
        </ul>
      </Block>

      <Block title="What is a CNN?">
        <p>
          A Convolutional Neural Network is a deep-learning model designed for images. Small learnable filters slide across the image and
          detect simple patterns such as edges and colours. Deeper layers combine them into more complex patterns such as textures and shapes.
          The final layers turn these patterns into a score for each category.
        </p>
      </Block>

      <Block title="What is transfer learning?">
        <p>
          Training a large CNN from scratch needs huge amounts of data. With transfer learning we start from a network that has already
          learned general visual features from millions of everyday images (ImageNet) and only train a small new classification layer for our
          skin categories. This works much better when the available medical dataset is small.
        </p>
      </Block>

      <Block title="Dataset">
        <p>
          <strong>SCIN – Skin Condition Image Network</strong> (Google Research), a public dataset of ordinary photographs of skin conditions with
          dermatologist-provided differential diagnoses. It is the only dataset used here. Sources:{" "}
          <a className="font-medium text-teal-700 underline" href="https://github.com/google-research-datasets/scin" target="_blank" rel="noopener noreferrer">repository</a>{" · "}
          <a className="font-medium text-teal-700 underline" href="https://pmc.ncbi.nlm.nih.gov/articles/PMC11579799/" target="_blank" rel="noopener noreferrer">research paper</a>.
        </p>
        <p>
          Only cases that dermatologists labelled were used. For each case the highest-weighted dermatologist label was grouped into one of
          seven categories (the groups are defined in <code>training/prepare_data.py</code>). Categories without enough examples – for
          example scabies and acne on its own – were merged: acne with folliculitis, and scabies into “Other”. The “Other” group is a mixture of
          many different conditions (capped in size) and is the least informative class. The data was split <strong>by case</strong> into
          train / validation / test so that photographs from the same case never appear in two splits.
        </p>
        {info ? (
          <p>
            Images used: {info.images.train} train, {info.images.val} validation, {info.images.test} test.
          </p>
        ) : null}
      </Block>

      <Block title="Model architecture">
        <ul className="list-disc space-y-1 pl-5">
          <li>Input: 224 × 224 RGB image (raw 0–255 pixel values; normalisation is inside the model).</li>
          <li>Backbone: EfficientNet-B0 pre-trained on ImageNet. The early blocks stay frozen; the upper blocks (block 6 onwards) are fine-tuned on SCIN. BatchNormalization layers stay frozen.</li>
          <li>Head (trained on SCIN): Dropout(0.4) → Dense(7, softmax).</li>
          <li>Loss: categorical cross-entropy with label smoothing; class weights (square root of inverse frequency) compensate for class imbalance.</li>
          <li>Augmentation while training: random flips, rotation, zoom, brightness and contrast.</li>
          <li>10 training epochs; the epoch with the best <strong>validation</strong> macro-F1 is kept. The test split is only used once, for the final evaluation.</li>
          <li>The original evaluation threshold was chosen on the validation set. The current single-model demonstration uses a temporary {pct(SCREENING_THRESHOLD)} base threshold (10 percentage points higher for quality warnings). Below it, the app displays inconclusive scores, not an accepted category.</li>
          <li>Exported with the TensorFlow.js converter (float16 weights, about 8 MB) and served from <code>/models/skin/</code>. The output of the exported model was checked against the original Keras model.</li>
        </ul>
        <p className="text-sm text-slate-500">Categories supported: {Object.values(CONDITIONS).map((c) => c.name).join(", ")}.</p>
      </Block>

      <Block title="Local EfficientNet-B0 evaluation (held-out test split)">
        {info === undefined && <p className="text-slate-500">Loading…</p>}
        {info === null && (
          <p className="rounded-xl bg-amber-50 p-3 text-amber-900">
            No trained model is installed on this website, so there are no evaluation results to show.
          </p>
        )}
        {info && (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Test accuracy</p><p className="text-2xl font-bold">{pct(info.metrics.test_accuracy)}</p></div>
              <div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Macro F1-score</p><p className="text-2xl font-bold">{info.metrics.test_macro_f1.toFixed(2)}</p></div>
              <div className="col-span-2 rounded-xl bg-slate-50 p-4 sm:col-span-1"><p className="text-xs text-slate-500">Always guessing the biggest class</p><p className="text-2xl font-bold">{pct(info.metrics.majority_class_baseline_accuracy)}</p></div>
            </div>
            <p>
              In the original test evaluation at the threshold of {pct(info.rejectThreshold)}, the model gives an answer for {pct(info.metrics.test_coverage_at_threshold)} of
              test images
              {info.metrics.test_accuracy_on_accepted !== null && <> and {pct(info.metrics.test_accuracy_on_accepted)} of those answers were correct</>}. For the
              remaining test images were rejected. These historical metrics do not measure performance at the current {pct(SCREENING_THRESHOLD)} demonstration threshold; accuracy and coverage at that threshold have not been evaluated.
            </p>
            <p className="text-xs text-slate-600 sm:hidden">Swipe the table sideways to see all metrics.</p>
            <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-lg" role="region" aria-label="Per-class evaluation metrics" tabIndex={0}>
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-3">Category</th><th className="pr-3">Precision</th><th className="pr-3">Recall</th><th className="pr-3">F1</th><th>Test images</th>
                  </tr>
                </thead>
                <tbody>
                  {info.classes.map((c) => {
                    const m = info.metrics.per_class[c];
                    return (
                      <tr key={c} className="border-b border-slate-100">
                        <td className="py-2 pr-3 font-medium">{CONDITIONS[c].name}</td>
                        <td className="pr-3">{m.precision.toFixed(2)}</td><td className="pr-3">{m.recall.toFixed(2)}</td><td className="pr-3">{m["f1-score"].toFixed(2)}</td><td>{m.support}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-slate-500">
              These numbers come from the trained model’s evaluation file (<code>model_info.json</code>) and are shown unchanged. Accuracy is modest:
              this is a small student prototype trained on a limited public dataset, not a clinical tool.
            </p>
          </>
        )}
      </Block>

      <Block title="Derm Foundation research evaluation">
        <p>Our classifier using precomputed SCIN embeddings achieved 55.95% test accuracy and 0.466 macro-F1 on 974 images. This is a research result, not a measurement of the local browser model or the complete raw-image backend. The optional server mode uses a separately deployed Vercel FastAPI backend. The 55.95% figure describes the historical embedding-based test split, not clinical accuracy or a measured score for every uploaded photograph.</p>
      </Block>

      <Block title="Limitations">
        <ul className="list-disc space-y-1 pl-5">
          <li>Modest accuracy on a few, visually similar categories; some categories have little training data.</li>
          <li>The dataset labels are dermatologists’ opinions from photographs, not confirmed by biopsy or tests.</li>
          <li>SCIN images come from a particular population and phone cameras; performance on other skin tones, lighting or devices may differ.</li>
          <li>Skin cancer, rare diseases and many other conditions are not supported and may be grouped into “Other”.</li>
          <li>Model scores are raw outputs, not calibrated probabilities. A negative or low result does not prove the skin is healthy.</li>
          <li>Photo-quality checks are simple heuristics and can be wrong.</li>
        </ul>
      </Block>

      <Block title="Future scope">
        <ul className="list-disc space-y-1 pl-5">
          <li>Fine-tune the whole network and test additional architectures with more GPU time.</li>
          <li>Add more data, including images from Indian clinics, with ethical approval and consent.</li>
          <li>Calibrate the scores and evaluate fairness across skin tones.</li>
          <li>Support regional languages and offline use (PWA).</li>
          <li>Validate with dermatologists before any real-world use.</li>
        </ul>
      </Block>

      <div className="text-center">
        <Link href="/screening" className="btn btn-primary">Start Skin Screening</Link>
      </div>
    </div>
  );
}
