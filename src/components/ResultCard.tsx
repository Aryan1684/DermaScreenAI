import { CONDITIONS, UNCERTAIN_MESSAGE, URGENT_NOTE } from "@/ml/conditions";
import type { PredictionResult } from "@/ml/types";

function ScoreBar({ score, strong }: { score: number; strong?: boolean }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
      <div className={`h-full rounded-full ${strong ? "bg-teal-600" : "bg-sky-400"}`} style={{ width: `${Math.max(0, Math.min(100, score * 100))}%` }} />
    </div>
  );
}

export default function ResultCard({ result }: { result: PredictionResult }) {
  const top = CONDITIONS[result.top.id];
  const others = result.ranked.slice(1, 3);

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">{result.modelCount === 2 ? "Experimental two-model ensemble" : "Single trained model · EfficientNet-B0"}</p>
      {result.reliable ? (
        <section className="card" aria-label="Predicted category">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal-700">Highest-scoring category</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900">{top.name}</h2>
          <div className="mt-4">
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium text-slate-700">Model score</span>
              <span className="font-bold text-slate-900">{(result.top.score * 100).toFixed(1)}%</span>
            </div>
            <ScoreBar score={result.top.score} strong />
            <p className="mt-2 text-xs text-slate-500">
              This is the model’s raw output for this image. It is <strong>not</strong> a calibrated probability and not a diagnosis.
            </p>
          </div>
          <h3 className="mt-5 text-sm font-semibold text-slate-900">Information</h3>
          <p className="mt-1 text-slate-700">{top.description}</p>
        </section>
      ) : (
        <section className="card border-amber-300 bg-amber-50" role="alert" aria-label="Result not reliable">
          <h2 className="text-xl font-bold text-amber-900">{UNCERTAIN_MESSAGE}</h2>
          <p className="mt-2 text-sm text-amber-900">
            {result.disagreement ? "The models disagreed on the highest-scoring category." : "The result did not meet the experimental acceptance threshold."} This does not mean the skin is
            healthy or unhealthy.
          </p>
          <p className="mt-2 text-sm text-amber-900">
            You can retake the photograph in good light with the affected area in focus, but a healthcare professional is the right person to
            assess any skin concern.
          </p>
        </section>
      )}

      {result.quality.issues.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" aria-label="Photo quality notes">
          <p className="font-semibold">Photo quality notes</p>
          <ul className="mt-1 list-disc pl-5">
            {result.quality.issues.map((i) => (
              <li key={i.code}>{i.message}</li>
            ))}
          </ul>
        </section>
      )}

      {result.reliable && <section className="card" aria-label="Other possible categories">
        <h3 className="font-semibold text-slate-900">Other categories the model considered</h3>
        <ul className="mt-3 space-y-4">
          {(result.reliable ? others : result.ranked.slice(0, 3)).map((c) => (
            <li key={c.id}>
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">{CONDITIONS[c.id].name}</span>
                <span className="text-slate-600">{(c.score * 100).toFixed(1)}%</span>
              </div>
              <ScoreBar score={c.score} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          These categories are listed for information only. Scores are not clinical probabilities. Similar-looking conditions may be confused by the model.
        </p>
      </section>}

      <section className="card border-teal-200 bg-teal-50" aria-label="Medical guidance">
        <h3 className="font-semibold text-teal-900">Recommendation</h3>
        <p className="mt-1 text-teal-900">Consult a qualified healthcare professional for proper evaluation.</p>
        {result.reliable && <p className="mt-2 text-sm text-teal-900">{top.guidance}</p>}
        <p className="mt-2 text-sm text-teal-900">{URGENT_NOTE}</p>
        <p className="mt-2 text-sm text-teal-900">
          A result like this can never prove that the skin is healthy or that a condition is absent. This tool does not recommend any medicine
          or treatment.
        </p>
      </section>
    </div>
  );
}
