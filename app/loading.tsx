export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6 animate-pulse">
      {/* Skeleton Header Navbar */}
      <div className="h-12 w-full rounded-2xl bg-white/5 border border-white/10" />

      {/* Skeleton Banner Top */}
      <div className="h-32 w-full rounded-2xl bg-white/5 border border-white/10" />

      {/* Skeleton Content Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-44 rounded-2xl bg-white/5 border border-white/10" />
        <div className="h-44 rounded-2xl bg-white/5 border border-white/10" />
        <div className="h-44 rounded-2xl bg-white/5 border border-white/10" />
      </div>

      {/* Skeleton List Items */}
      <div className="space-y-3">
        <div className="h-16 w-full rounded-2xl bg-white/5 border border-white/10" />
        <div className="h-16 w-full rounded-2xl bg-white/5 border border-white/10" />
        <div className="h-16 w-full rounded-2xl bg-white/5 border border-white/10" />
      </div>
    </div>
  );
}
