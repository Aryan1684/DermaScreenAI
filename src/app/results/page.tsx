"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAnalysis } from "@/components/AnalysisContext";
import ResultCard from "@/components/ResultCard";
import Disclaimer from "@/components/Disclaimer";

export default function ResultsPage() {
  const router = useRouter();
  const { result, previewUrl, reset } = useAnalysis();

  if (!result || !previewUrl) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <h1 className="section-title">No result to show</h1>
        <p className="mt-3 text-slate-600">
          Results are kept only in memory for privacy, so they disappear when the page is reloaded. Please analyse a photograph first.
        </p>
        <Link href="/screening" className="btn btn-primary mt-6">
          Start skin screening
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-teal-700">Step 2 of 2 · Review</p>
      <h1 className="section-title">Screening result</h1>
      <p className="mt-2 text-slate-600">A preliminary, educational result from an academic AI model.</p>

      <Disclaimer className="mt-6" />

      <div className="mt-4 grid gap-4 sm:mt-6 sm:gap-6 lg:grid-cols-5">
        <div className="order-2 min-w-0 lg:order-1 lg:col-span-2">
          <div className="card p-3 lg:sticky lg:top-24">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="The photograph you uploaded" className="max-h-[min(38dvh,384px)] w-full rounded-xl object-contain" />
            <p className="mt-2 text-center text-xs text-slate-500">Your photograph (held in this tab’s memory)</p>
            <p className="mt-1 text-center text-xs text-slate-400">Analysed in {Math.round(result.inferenceMs)} ms {result.modelName === "derm-foundation" ? "(server mode, including network time)" : "on your device"}</p>
          </div>
        </div>
        <div className="order-1 min-w-0 lg:order-2 lg:col-span-3">
          <ResultCard result={result} />
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            reset();
            router.push("/screening");
          }}
        >
          Analyse another image
        </button>
        <Link
          href="/"
          className="btn btn-secondary"
          onClick={() => {
            reset();
          }}
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
