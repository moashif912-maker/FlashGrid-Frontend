export default function SaleCardSkeleton() {
  return (
    <div className="card animate-pulse p-5">
      <div className="flex items-start justify-between">
        <div className="h-4 w-2/3 rounded bg-zinc-200" />
        <div className="h-5 w-16 rounded-full bg-zinc-200" />
      </div>
      <div className="mt-5 h-8 w-1/3 rounded bg-zinc-200" />
      <div className="mt-6 h-3 w-1/2 rounded bg-zinc-200" />
      <div className="mt-4 h-1.5 w-full rounded-full bg-zinc-200" />
      <div className="mt-6 h-10 w-full rounded-lg bg-zinc-200" />
    </div>
  );
}