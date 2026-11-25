import Link from "next/link";
export default function PrivacyPage() {
  return <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
    <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Responsible AI · Privacy</p>
    <h1 className="section-title mt-2">Privacy policy</h1>
    <p className="mt-2 text-slate-600">Academic prototype · Version 1.0</p>
    <div className="card mt-6 space-y-6 text-sm leading-relaxed text-slate-700">
      <section><h2 className="text-lg font-bold text-slate-900">What information is processed?</h2><p>When you select a photograph, the app processes its pixels and produces model scores. No account, name, phone number or email is required for screening.</p></section>
      <section><h2 className="text-lg font-bold text-slate-900">Where does processing happen?</h2><p>The default local screening mode runs TensorFlow.js inside your browser. Optional Derm Foundation research mode, when configured, requires separate consent and sends a prepared image copy over HTTPS to a separate inference host. The application does not intentionally persist the photo on that backend, but provider retention is not independently verified. Use authorized non-identifiable demo images only. In local mode the photo and scores are held in the tab’s memory, not intentionally uploaded to a server or saved by the screening code to browser storage. The site downloads its model and other assets; hosting providers may receive ordinary request metadata such as IP addresses. Hosting log retention has not been independently verified.</p></section>
      <section><h2 className="text-lg font-bold text-slate-900">Control and removal</h2><p>Remove the image, withdraw consent on the screening page, start another screening or reload the tab to clear the app’s active image and result. This does not delete the original file on your device or any copies you save yourself.</p></section>
      <section><h2 className="text-lg font-bold text-slate-900">Your choices</h2><p>Participation is voluntary. For demonstrations, use public or properly authorized sample images rather than identifiable patient photographs. Do not submit another person’s image without permission. This prototype is intended for adult educational use.</p></section>
      <section><h2 className="text-lg font-bold text-slate-900">Questions and limitations</h2><p>Contact the project maintainers through the <a className="text-teal-800 underline" href="https://github.com/Aryan1684/DermaScreenAI">project repository</a>. Do not post personal medical information in public issues. This notice describes the application design, not a certification of legal compliance or security.</p></section>
    </div>
    <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap"><Link href="/consent" className="btn btn-primary">Read consent</Link><Link href="/" className="btn btn-secondary">Home</Link></div>
  </div>;
}
