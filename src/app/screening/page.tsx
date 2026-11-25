"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageUploader from "@/components/ImageUploader";
import Disclaimer from "@/components/Disclaimer";
import { useAnalysis } from "@/components/AnalysisContext";
import { checkModelAssets, fetchModelInfo, ModelUnavailableError } from "@/ml/model";
import { analyseImage } from "@/ml/prediction";
import { assessQuality, loadImageElement } from "@/ml/preprocessing";
import type { QualityReport } from "@/ml/types";

type ModelStatus = "checking" | "ready" | "unavailable";

export default function ScreeningPage() {
  const router = useRouter();
  const { file, previewUrl, setFile, reset, setResult } = useAnalysis();
  const [consent, setConsent] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<{ title: string; text: string } | null>(null);
  const [quality, setQuality] = useState<QualityReport | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchModelInfo(), checkModelAssets()]).then(([info, assetsPresent]) => {
      if (!cancelled) setModelStatus(info && assetsPresent ? "ready" : "unavailable");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // basic quality check as soon as a photo is chosen
  useEffect(() => {
    let cancelled = false;
    if (!previewUrl) return;
    loadImageElement(previewUrl)
      .then((img) => {
        if (!cancelled) setQuality(assessQuality(img));
      })
      .catch(() => {
        if (!cancelled) setError({ title: "Image problem", text: "This image could not be read. It may be corrupted. Please choose another photograph." });
      });
    return () => {
      cancelled = true;
    };
  }, [previewUrl]);

  async function analyse() {
    if (!previewUrl || !file || !consent || busy || modelStatus !== "ready" || !quality || quality.blocking || error) return;
    setBusy(true);
    setError(null);
    try {
      const result = await analyseImage(previewUrl, setStage);
      setResult(result);
      router.push("/results");
    } catch (e) {
      if (e instanceof ModelUnavailableError) {
        setModelStatus("unavailable");
        setError({ title: "AI analysis is currently unavailable", text: e.message + " Please try again later." });
      } else {
        setError({ title: "The image could not be analysed", text: e instanceof Error ? e.message : "Unknown error. Please try another photograph." });
      }
      setBusy(false);
    }
  }

  const blocked = !!quality?.blocking;
  function declineConsent() {
    setConsent(false); setAcknowledged(false); reset(); setQuality(null); setError(null);
    dialogRef.current?.close(); router.push("/");
  }
  function openConsent() {
    setAcknowledged(false); dialogRef.current?.showModal();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <dialog ref={dialogRef} aria-labelledby="consent-title" aria-describedby="consent-summary" onCancel={(e) => { e.preventDefault(); declineConsent(); }} className="consent-dialog fixed inset-0 m-auto overflow-hidden rounded-3xl border border-slate-200 bg-white p-0 text-slate-900 shadow-2xl backdrop:bg-slate-950/65 backdrop:backdrop-blur-sm">
        <div className="flex max-h-[inherit] min-h-0 flex-col">
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-100 text-teal-800">
            <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Your privacy comes first</p>
          <h2 id="consent-title" className="mt-2 text-2xl font-bold tracking-tight">Before you start screening</h2>
          <p id="consent-summary" className="mt-2 text-sm text-slate-600">Please review and accept the informed consent notice to continue.</p>
          <ul className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <li><strong>Local processing:</strong> Your photo is analysed in your browser, not uploaded by the screening code.</li>
            <li><strong>Educational use only:</strong> AI results can be incorrect and are not a medical diagnosis.</li>
            <li><strong>Your choice:</strong> You may decline or withdraw consent and clear your image at any time before analysis.</li>
          </ul>
          <p className="mt-4 text-sm"><Link href="/privacy" className="font-medium text-teal-800 underline">Privacy policy</Link> · <Link href="/consent" className="font-medium text-teal-800 underline">Full consent notice</Link></p>
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm leading-relaxed"><input type="checkbox" checked={acknowledged} onChange={e=>setAcknowledged(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-teal-700"/><span>I am an adult, have permission to use the image, and voluntarily agree to local processing for educational purposes. I understand the limitations.</span></label>
          </div>
          <div className="consent-actions grid shrink-0 grid-cols-[1fr_1.6fr] gap-2 px-4 py-3 sm:gap-3 sm:px-7">
            <button type="button" className="btn btn-secondary !px-3" onClick={declineConsent}>Decline</button>
            <button type="button" className="btn btn-primary !px-3" disabled={!acknowledged} onClick={() => { setConsent(true); dialogRef.current?.close(); }}>Accept &amp; continue</button>
          </div>
        </div>
      </dialog>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-700">Step 1 of 2 · Prepare image</p>
      <h1 className="section-title">Skin image screening</h1>
      <p className="mt-2 text-slate-600">Upload or capture a photograph of the affected skin area, then press “Analyse image”.</p>

      {modelStatus === "unavailable" && (
        <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          <strong>AI analysis is currently unavailable.</strong> The model metadata or one or more model weight files are missing, so no analysis can be performed. If you are the project owner, follow the model export steps in the README.
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900 sm:mt-6">
        <details>
        <summary className="cursor-pointer font-semibold">Tips for a good photograph</summary>
        <p className="mt-1">Take a clear photograph in good lighting. Make sure the affected skin area is visible.</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Use daylight or bright, even light – avoid harsh flash.</li>
          <li>Hold the phone steady, about 15–30 cm from the skin, and let it focus.</li>
          <li>Fill most of the frame with the skin area. Avoid showing your face or other people.</li>
        </ul>
        </details>
      </div>

      <section className="card mt-4 sm:mt-6" aria-label="Photograph upload">
        {busy ? (
          <div className="py-4 text-center" role="status" aria-live="polite">
            {previewUrl && (
              <div className="relative mx-auto h-56 w-56 max-w-full overflow-hidden rounded-2xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Photograph being analysed" className="h-full w-full object-cover" />
                <div className="absolute inset-0">
                  <div className="scan-line h-1 w-full bg-teal-400 shadow-[0_0_14px_3px_rgba(45,212,191,0.8)]" />
                </div>
              </div>
            )}
            <div className="mx-auto mt-5 h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-700" />
            <p className="mt-3 font-semibold text-slate-800">{stage || "Starting…"}</p>
            <p className="mt-1 text-sm text-slate-500">The first analysis downloads the model (a few MB) and may take a little longer. Your photo stays on your device.</p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
              <span className="font-medium">{consent ? "✓ Informed consent accepted" : "Informed consent required"}</span>
              <button type="button" className="min-h-11 font-semibold underline underline-offset-4" onClick={consent ? () => { setConsent(false); reset(); setQuality(null); setError(null); openConsent(); } : openConsent}>{consent ? "Withdraw consent" : "Review consent"}</button>
            </div>
            <ImageUploader
              disabled={!consent}
              previewUrl={previewUrl}
              onSelect={(selectedFile) => {
                setQuality(null);
                setError(null);
                setFile(selectedFile);
              }}
              onRemove={() => {
                setQuality(null);
                setError(null);
                reset();
              }}
            />

            {quality && quality.issues.length > 0 && (
              <ul className="mt-4 space-y-2" aria-label="Photo quality notes">
                {quality.issues.map((i) => (
                  <li
                    key={i.code}
                    className={`rounded-xl border p-3 text-sm ${
                      i.severity === "blocking" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-amber-200 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {i.message}
                  </li>
                ))}
              </ul>
            )}
            {quality && quality.issues.length === 0 && (
              <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Basic quality checks passed (brightness and sharpness look acceptable).
              </p>
            )}

            {error && (
              <div role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <p className="font-semibold">{error.title}</p>
                <p className="mt-1">{error.text}</p>
              </div>
            )}

            <button type="button" className="btn btn-primary mt-6 w-full" disabled={!consent || !file || !quality || blocked || !!error || modelStatus !== "ready"} onClick={analyse}>
              Analyse image
            </button>
            {modelStatus === "checking" && <p role="status" className="mt-2 text-center text-sm text-slate-600">Checking model availability…</p>}
            {!consent && <p className="mt-2 text-center text-sm text-slate-600">Accept informed consent to choose a photograph.</p>}
            {!file && <p className="mt-2 text-center text-xs text-slate-500">Choose a photograph first to enable analysis.</p>}
          </>
        )}
      </section>

      <p className="mt-4 text-center text-sm text-slate-500">
        Privacy: the photograph is processed only inside your browser. It is not uploaded, saved or shared.
      </p>
      <Disclaimer className="mt-6" />
    </div>
  );
}
