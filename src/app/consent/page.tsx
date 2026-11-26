import Link from "next/link";
export default function ConsentPage() {
  return <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
    <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Responsible AI · Your choice</p>
    <h1 className="section-title mt-2">Informed consent</h1>
    <p className="mt-2 text-slate-600">Read this before taking part in the screening demonstration.</p>
    <div className="card mt-6 space-y-5 text-sm leading-relaxed text-slate-700">
      <section><h2 className="text-lg font-bold text-slate-900">Purpose</h2><p>DermaScreen AI is a student research prototype that demonstrates image classification. It is not a diagnostic tool, medical device or substitute for professional care.</p></section>
      <section><h2 className="text-lg font-bold text-slate-900">What you agree to</h2><ul className="mt-2 list-disc space-y-2 pl-5"><li>You are an adult participating voluntarily and have permission to use the selected image.</li><li>The browser will process the image to generate experimental model scores. Use only authorized images.</li><li>You understand that the model can be incorrect, even at high scores, and does not cover every skin condition.</li><li>You will not use the result to start or stop treatment or delay medical evaluation.</li></ul></section>
      <section><h2 className="text-lg font-bold text-slate-900">Privacy and withdrawal</h2><p>You can decline without submitting a photo. You can withdraw by unchecking consent, removing the image or closing or reloading the tab. Read the <Link href="/privacy" className="text-teal-800 underline">privacy policy</Link> for details. Consent is requested on the screening page and is not stored as a permanent record.</p></section>
      <section className="rounded-xl bg-amber-50 p-4 text-amber-950"><h2 className="font-bold">Medical concerns</h2><p className="mt-1">For a persistent, worsening or concerning skin problem, consult a qualified clinician. For severe symptoms or breathing difficulty, seek urgent medical care.</p></section>
    </div>
    <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap"><Link href="/screening" className="btn btn-primary">Continue to screening</Link><Link href="/" className="btn btn-secondary">Decline and return home</Link></div>
  </div>;
}
