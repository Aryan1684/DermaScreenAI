export default function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-2 ${className}`}>
      <svg className="shrink-0" width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="16" fill="#0e7490" />
        <path d="M32 14c8 10 14 16 14 24a14 14 0 0 1-28 0c0-8 6-14 14-24z" fill="#ecfeff" />
        <path d="M26 38h12M32 32v12" stroke="#0e7490" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="text-base min-[360px]:text-lg font-bold tracking-tight text-slate-900">
        Derma<span className="text-teal-700">Screen</span> AI
      </span>
    </span>
  );
}
