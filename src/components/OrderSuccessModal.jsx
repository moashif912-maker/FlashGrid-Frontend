import { useEffect } from "react";
import { formatPrice, parseLocal } from "../utils/time";

export default function OrderSuccessModal({ order, onClose, onViewOrders }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!order) return null;

  const created = parseLocal(order.createdAt);
  const createdText = Number.isNaN(created.getTime())
    ? order.createdAt
    : created.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" });

  const rows = [
    ["Order ID", `#${order.orderId}`],
    ["Item", order.title],
    ["User", `User ${order.userId}`],
    ["Amount", formatPrice(order.price)],
    ["Status", order.status],
    ["Placed at", createdText],
  ];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-zinc-900/40 px-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-4 text-center text-lg font-semibold text-zinc-900">Order confirmed</h2>
        <p className="mt-1 text-center text-sm text-zinc-500">
          Your purchase was processed successfully.
        </p>

        <dl className="mt-5 divide-y divide-zinc-100 rounded-lg border border-zinc-200">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="text-zinc-500">{label}</dt>
              <dd className="text-right font-medium text-zinc-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">
            Close
          </button>
          <button onClick={onViewOrders} className="btn-primary flex-1">
            View orders
          </button>
        </div>
      </div>
    </div>
  );
}