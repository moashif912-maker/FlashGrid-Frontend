import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOrders } from "../api/flashSaleApi";
import { useAuth } from "../context/AuthContext";
import { formatPrice, parseLocal } from "../utils/time";

function formatDate(value) {
  const d = parseLocal(value);
  if (Number.isNaN(d.getTime())) return value || "-";
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const statusStyles = {
  CREATED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  PAID: "border-blue-200 bg-blue-50 text-blue-700",
  CANCELLED: "border-red-200 bg-red-50 text-red-700",
};

const statusLabels = { CREATED: "Confirmed", PAID: "Paid", CANCELLED: "Cancelled" };

function OrderStatus({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
        statusStyles[status] || "border-zinc-200 bg-zinc-100 text-zinc-700"
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

function OrdersSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="card h-20" />
        <div className="card h-20" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="card p-4">
          <div className="flex justify-between">
            <div className="h-4 w-1/3 rounded bg-zinc-200" />
            <div className="h-4 w-20 rounded bg-zinc-200" />
          </div>
          <div className="mt-3 h-3 w-1/2 rounded bg-zinc-200" />
        </div>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  const { userId } = useAuth();
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const data = await getOrders(userId);
        setOrders(data);
        setError("");
      } catch (e) {
        setError(e.message || "Unable to load orders.");
      } finally {
        setRefreshing(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    setOrders(null);
    setError("");
    load();
  }, [load]);

  const header = (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="page-title">My orders</h1>
        <p className="page-subtitle">Order history for User {userId}.</p>
      </div>
      <button onClick={() => load(true)} disabled={refreshing} className="btn-secondary">
        {refreshing ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );

  if (orders === null && !error) {
    return (
      <div>
        {header}
        <OrdersSkeleton />
      </div>
    );
  }

  if (orders === null && error) {
    return (
      <div>
        {header}
        <div className="card p-10 text-center">
          <p className="font-medium text-zinc-900">Unable to load orders</p>
          <p className="mt-1 text-sm text-zinc-500">{error}</p>
          <button onClick={() => load()} className="btn-primary mt-5">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div>
        {header}
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-14 text-center">
          <p className="font-medium text-zinc-900">No orders yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Purchase an item from a live sale and it will show up here.
          </p>
          <Link to="/" className="btn-primary mt-5">
            Browse sales
          </Link>
        </div>
      </div>
    );
  }

  const total = orders.reduce((sum, o) => sum + Number(o.price), 0);

  return (
    <div>
      {header}

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Refresh failed: {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total orders</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-900">{orders.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Total spent</p>
          <p className="mt-1.5 text-2xl font-semibold tabular-nums text-zinc-900">
            {formatPrice(total)}
          </p>
        </div>
      </div>

      {/* Desktop table */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Placed at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {orders.map((o) => (
              <tr key={o.orderId} className="transition hover:bg-zinc-50">
                <td className="px-4 py-3 tabular-nums text-zinc-500">#{o.orderId}</td>
                <td className="px-4 py-3 font-medium text-zinc-900">{o.itemTitle}</td>
                <td className="px-4 py-3 font-medium tabular-nums text-zinc-900">
                  {formatPrice(o.price)}
                </td>
                <td className="px-4 py-3">
                  <OrderStatus status={o.status} />
                </td>
                <td className="px-4 py-3 text-zinc-500">{formatDate(o.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {orders.map((o) => (
          <div key={o.orderId} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-zinc-900">{o.itemTitle}</p>
              <OrderStatus status={o.status} />
            </div>
            <p className="mt-2 text-lg font-semibold tabular-nums text-zinc-900">
              {formatPrice(o.price)}
            </p>
            <div className="mt-2 flex justify-between text-xs text-zinc-500">
              <span className="tabular-nums">Order #{o.orderId}</span>
              <span>{formatDate(o.createdAt)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}