import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";

const STEPS = [
  { n: 1, title: "Consent and upload", text: "Read the consent notice, then choose a clear photograph of the affected skin area, or take one with your phone camera." },
  { n: 2, title: "Check the preview", text: "Make sure the area is visible, in focus and well lit. Replace the photo if needed." },
  { n: 3, title: "AI analysis", text: "A deep-learning model running in your browser scores the image against its supported categories." },
  { n: 4, title: "Read and consult", text: "See possible categories with basic information – and a reminder to see a healthcare professional." },
];

export default function HomePage() {
  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-b from-cyan-50 to-white">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-block rounded-full bg-teal-100 px-3 py-1 text-xs font-semibold text-teal-800">
              Academic prototype · Healthcare AI
            </span>
            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
              AI-powered skin condition screening from a smartphone photo
            </h1>
            <p className="mt-4 text-lg text-slate-600">
              Upload or capture a photograph of your skin and get preliminary, educational information about possible skin-condition
              categories – directly in your browser, with nothing uploaded.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/screening" className="btn btn-primary text-lg">
                Start Skin Screening
              </Link>
              <Link href="/about" className="btn btn-secondary">
                About the project
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500">No login · Local image processing · Informed consent</p>
          </div>

          <div className="card mx-auto w-full max-w-md">
            <p className="text-sm font-semibold text-slate-900">What this tool is – and is not</p>
            <ul className="mt-3 space-y-3 text-sm text-slate-700">
              <li className="flex gap-2"><span className="text-teal-700">✔</span> A student research prototype using a deep-learning image classifier.</li>
              <li className="flex gap-2"><span className="text-teal-700">✔</span> A way to learn about common skin-condition categories.</li>
              <li className="flex gap-2"><span className="text-rose-600">✘</span> Not a medical diagnosis or a replacement for a dermatologist.</li>
              <li className="flex gap-2"><span className="text-rose-600">✘</span> Not able to confirm that skin is healthy.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="section-title">Why this project?</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <div className="card">
            <h3 className="font-semibold text-slate-900">Limited access to specialists</h3>
            <p className="mt-2 text-sm text-slate-600">
              In many rural and underserved parts of India, dermatologists are far away and healthcare facilities are limited.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-900">Delays in seeking care</h3>
            <p className="mt-2 text-sm text-slate-600">
              Distance, cost and low awareness can mean skin problems are noticed late, and people may not know when to seek help.
            </p>
          </div>
          <div className="card">
            <h3 className="font-semibold text-slate-900">Smartphones are everywhere</h3>
            <p className="mt-2 text-sm text-slate-600">
              A phone camera plus AI that runs on the device can offer simple education and a nudge to seek proper medical advice sooner.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="section-title">How it works</h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <li key={s.n} className="card">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">{s.n}</span>
                <h3 className="mt-3 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid items-start gap-8 md:grid-cols-2">
          <div>
            <h2 className="section-title">The AI behind it</h2>
            <p className="mt-3 text-slate-600">
              The website uses a convolutional neural network (<strong>EfficientNet-B0</strong>) that was pre-trained on ImageNet and then adapted
              with <strong>transfer learning</strong> on photographs from the public <strong>SCIN</strong> (Skin Condition Image Network) dataset.
              Predictions run locally with <strong>TensorFlow.js</strong>, so the website works as a static site without any server.
            </p>
            <p className="mt-3 text-slate-600">
              The model is small and the data is limited, so its accuracy is modest. When the model score is below its experimental threshold, the app withholds category suggestions. Even accepted results can be wrong.
              See the <Link href="/about" className="font-semibold text-teal-700 underline">About page</Link> for the real evaluation numbers and limitations.
            </p>
          </div>
          <Disclaimer />
        </div>

        <div className="mt-10 rounded-2xl bg-teal-700 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">Ready to try it?</h2>
          <p className="mx-auto mt-2 max-w-xl text-teal-50">Have a clear, well-lit photograph of the skin area ready.</p>
          <Link href="/screening" className="btn mt-5 bg-white text-teal-800 hover:bg-teal-50">
            Start Skin Screening
          </Link>
        </div>
      </section>
    </>
  );
}
