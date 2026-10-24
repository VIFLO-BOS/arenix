export default function Loading() {
  return (
    <div data-surface="dark" className="container-x min-h-dvh pt-32" role="status" aria-live="polite" aria-label="Loading page">
      <div className="skeleton h-4 w-28 rounded-full" />
      <div className="skeleton mt-6 h-[clamp(2.5rem,8vw,6rem)] w-full max-w-3xl rounded-xl" />
      <div className="skeleton mt-4 h-[clamp(2.5rem,8vw,6rem)] w-3/4 max-w-2xl rounded-xl" />
      <div className="skeleton mt-8 h-5 w-full max-w-xl rounded-full" />
      <div className="skeleton mt-3 h-5 w-2/3 max-w-lg rounded-full" />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="skeleton aspect-[4/3] rounded-2xl" />
        <div className="skeleton aspect-[4/3] rounded-2xl" />
        <div className="skeleton aspect-[4/3] rounded-2xl hidden lg:block" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
