import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="site-footer mt-8 sm:mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-7 sm:gap-8 sm:px-6 sm:py-10 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 text-sm text-slate-600">
            A college minor project exploring AI-assisted skin screening with TensorFlow.js.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Pages</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link className="hover:text-teal-700" href="/">Home</Link></li>
            <li><Link className="hover:text-teal-700" href="/screening">Skin Screening</Link></li>
            <li><Link className="hover:text-teal-700" href="/about">About the project</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Privacy &amp; consent</h2>
          <div className="mt-3 flex flex-wrap gap-4 text-sm font-medium text-teal-800"><Link href="/privacy">Privacy policy</Link><Link href="/consent">Informed consent</Link></div>
          <p className="mt-3 text-sm text-slate-600">
            Photographs are analysed inside your browser and are never uploaded or stored. No login is needed.
          </p>
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-500">
        Academic prototype – educational use only. Not a medical device and not a medical diagnosis.
      </div>
    </footer>
  );
}
