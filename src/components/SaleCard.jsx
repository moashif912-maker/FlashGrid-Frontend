import StatusBadge from "./StatusBadge";
import { computeStatus, formatDuration, formatPrice, parseLocal } from "../utils/time";

export default function SaleCard({ sale, now, onBuy, buying, purchased, cooldownLeft }) {
  const status = computeStatus(sale, now);
  const start = parseLocal(sale.startTime).getTime();
  const end = parseLocal(sale.endTime).getTime();

  const available = Math.max(0, sale.availableStock);
  const total = Math.max(1, sale.initialStock);
  const percentLeft = Math.min(100, Math.round((available / total) * 100));
  const soldOut = available <= 0;

  let countdownLabel = "Sale ended";
  let countdownValue = "";
  if (status === "UPCOMING") {
    countdownLabel = "Starts in";
    countdownValue = formatDuration(start - now);
  } else if (status === "LIVE") {
    countdownLabel = "Ends in";
    countdownValue = formatDuration(end - now);
  }

  const barColor =
    percentLeft > 50 ? "bg-emerald-500" : percentLeft > 20 ? "bg-amber-500" : "bg-red-500";

  // Button state, in priority order
  let text = "Buy now";
  let disabled = false;
  let cls = "btn-primary";

  if (purchased) {
    text = "Purchased";
    disabled = true;
    cls = "btn border border-emerald-200 bg-emerald-50 text-emerald-700";
  } else if (status === "ENDED") {
    text = "Sale ended";
    disabled = true;
    cls = "btn bg-zinc-100 text-zinc-500";
  } else if (status === "UPCOMING") {
    text = `Starts in ${formatDuration(start - now)}`;
    disabled = true;
    cls = "btn bg-zinc-100 text-zinc-500";
  } else if (soldOut) {
    text = "Sold out";
    disabled = true;
    cls = "btn bg-zinc-100 text-zinc-500";
  } else if (buying) {
    text = "Processing...";
    disabled = true;
    cls = "btn bg-brand-600 text-white !opacity-70";
  } else if (cooldownLeft > 0) {
    text = `Too many requests, retry in ${cooldownLeft}s`;
    disabled = true;
    cls = "btn border border-amber-200 bg-amber-50 text-amber-800";
  }

  return (
    <div className="card flex flex-col p-5 transition hover:border-zinc-300">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-[15px] font-semibold leading-snug text-zinc-900">{sale.title}</h2>
        <StatusBadge status={status} />
      </div>

      <p className="mt-4 text-3xl font-semibold tracking-tight text-zinc-900 tabular-nums">
        {formatPrice(sale.price)}
      </p>

      <div className="mt-5 flex items-center justify-between text-sm">
        <span className="text-zinc-500">{countdownLabel}</span>
        {countdownValue && (
          <span className="font-medium text-zinc-900 tabular-nums">{countdownValue}</span>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-xs text-zinc-500">
          <span>{soldOut ? "No stock left" : `${available} remaining`}</span>
          <span className="tabular-nums">{sale.initialStock} total</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percentLeft}%` }}
          />
        </div>
      </div>

      <button disabled={disabled} onClick={() => onBuy(sale)} className={`${cls} mt-6 w-full`}>
        {text}
      </button>
    </div>
  );
}