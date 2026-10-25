const styles = {
  UPCOMING: { wrap: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  LIVE: { wrap: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500 animate-pulse" },
  ENDED: { wrap: "bg-zinc-100 text-zinc-600 border-zinc-200", dot: "bg-zinc-400" },
};

const labels = { UPCOMING: "Upcoming", LIVE: "Live", ENDED: "Ended" };

export default function StatusBadge({ status }) {
  const s = styles[status] || styles.ENDED;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${s.wrap}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {labels[status] || status}
    </span>
  );
}