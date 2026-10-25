import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { createSale, getSales, initSale } from "../api/flashSaleApi";
import StatusBadge from "../components/StatusBadge";
import { computeStatus, formatPrice, parseLocal } from "../utils/time";
import useNow from "../utils/useNow";

const POLL_MS = 2000;
const pad = (n) => String(n).padStart(2, "0");

// Date -> "yyyy-MM-ddTHH:mm" for <input type="datetime-local">
function toInputValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

// "yyyy-MM-ddTHH:mm" -> "yyyy-MM-ddTHH:mm:ss" (no timezone, no Z)
function toApiValue(value) {
  return value.length === 16 ? `${value}:00` : value;
}

function defaultForm() {
  const now = Date.now();
  return {
    title: "",
    stock: "",
    price: "",
    startTime: toInputValue(new Date(now + 2 * 60 * 1000)),
    endTime: toInputValue(new Date(now + 30 * 60 * 1000)),
  };
}

function formatShort(value) {
  const d = parseLocal(value);
  if (Number.isNaN(d.getTime())) return value || "-";
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function validate(form) {
  const errors = {};

  if (!form.title.trim()) errors.title = "Title is required.";

  const stock = Number(form.stock);
  if (form.stock === "") errors.stock = "Stock is required.";
  else if (!Number.isInteger(stock) || stock < 1) errors.stock = "Stock must be a whole number, 1 or greater.";

  const price = Number(form.price);
  if (form.price === "") errors.price = "Price is required.";
  else if (!(price >= 0.01)) errors.price = "Price must be at least 0.01.";

  const start = parseLocal(form.startTime).getTime();
  const end = parseLocal(form.endTime).getTime();

  if (!form.startTime || Number.isNaN(start)) errors.startTime = "Select a start time.";
  if (!form.endTime || Number.isNaN(end)) errors.endTime = "Select an end time.";

  if (!errors.startTime && !errors.endTime) {
    if (end <= start) errors.endTime = "End time must be after the start time.";
    else if (end <= Date.now()) errors.endTime = "End time must be in the future.";
  }

  return errors;
}

function Field({ label, hint, error, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-700">{label}</label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1.5 text-xs text-red-600">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-zinc-500">{hint}</p>
      )}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-5">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-9 rounded bg-zinc-100" />
      ))}
    </div>
  );
}

export default function AdminPage() {
  const now = useNow(1000);

  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [sales, setSales] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [initingId, setInitingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getSales();
      setSales(data);
      setLoadError("");
    } catch (e) {
      setLoadError(e.message || "Unable to load sales.");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  const setField = (name) => (e) => {
    setForm((f) => ({ ...f, [name]: e.target.value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      const created = await createSale({
        title: form.title.trim(),
        stock: Number(form.stock),
        price: Number(form.price),
        startTime: toApiValue(form.startTime),
        endTime: toApiValue(form.endTime),
      });
      toast.success(`Sale #${created.id} created: ${created.title}`);
      setForm(defaultForm());
      setErrors({});
      load();
    } catch (err) {
      toast.error(err.message || "Unable to create the sale.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleInit = async (sale) => {
    const ok = window.confirm(
      `Reset sale #${sale.id}? Stock goes back to ${sale.initialStock} and the buyer list in Redis is cleared.`
    );
    if (!ok) return;

    setInitingId(sale.id);
    try {
      await initSale(sale.id);
      toast.success(`Sale #${sale.id} reloaded into Redis.`);
      load();
    } catch (err) {
      toast.error(err.message || "Initialization failed.");
    } finally {
      setInitingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Create sales and monitor live inventory.</p>
      </div>

      {/* Create form */}
      <form onSubmit={handleSubmit} noValidate className="card p-6">
        <h2 className="text-base font-semibold text-zinc-900">Create sale</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Times are in India Standard Time (Asia/Kolkata).
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Title" error={errors.title}>
              <input
                type="text"
                value={form.title}
                onChange={setField("title")}
                placeholder="e.g. iPhone 16 Flash Deal"
                className={`input ${errors.title ? "input-error" : ""}`}
              />
            </Field>
          </div>

          <Field label="Stock" error={errors.stock}>
            <input
              type="number"
              min="1"
              step="1"
              value={form.stock}
              onChange={setField("stock")}
              placeholder="e.g. 100"
              className={`input ${errors.stock ? "input-error" : ""}`}
            />
          </Field>

          <Field label="Price (INR)" error={errors.price}>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={setField("price")}
              placeholder="e.g. 49999"
              className={`input ${errors.price ? "input-error" : ""}`}
            />
          </Field>

          <Field label="Start time" error={errors.startTime}>
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={setField("startTime")}
              className={`input ${errors.startTime ? "input-error" : ""}`}
            />
          </Field>

          <Field label="End time" error={errors.endTime}>
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={setField("endTime")}
              className={`input ${errors.endTime ? "input-error" : ""}`}
            />
          </Field>
        </div>

        <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-5">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Creating..." : "Create sale"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(defaultForm());
              setErrors({});
            }}
            className="btn-secondary"
          >
            Reset
          </button>
        </div>
      </form>

      {/* Sales table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-900">All sales</h2>
          <span className="inline-flex items-center gap-2 text-xs text-zinc-500">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live, refreshing every 2s
          </span>
        </div>

        {sales === null && !loadError && <TableSkeleton />}

        {sales === null && loadError && (
          <div className="p-10 text-center">
            <p className="font-medium text-zinc-900">Unable to load sales</p>
            <p className="mt-1 text-sm text-zinc-500">{loadError}</p>
            <button onClick={load} className="btn-primary mt-5">
              Try again
            </button>
          </div>
        )}

        {sales !== null && sales.length === 0 && (
          <div className="p-14 text-center">
            <p className="font-medium text-zinc-900">No sales yet</p>
            <p className="mt-1 text-sm text-zinc-500">Use the form above to create your first sale.</p>
          </div>
        )}

        {sales !== null && sales.length > 0 && (
          <>
            {loadError && (
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-800">
                Connection lost. Retrying... ({loadError})
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-5 py-3">ID</th>
                    <th className="px-5 py-3">Title</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Stock</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Start Time</th>
                    <th className="px-5 py-3">End Time</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 bg-white">
                  {sales.map((s) => {
                    const status = computeStatus(s, now);
                    return (
                      <tr key={s.id} className="hover:bg-zinc-50/50">
                        <td className="px-5 py-4 font-mono text-xs font-medium text-zinc-600">
                          #{s.id}
                        </td>
                        <td className="px-5 py-4 font-medium text-zinc-900">{s.title}</td>
                        <td className="px-5 py-4">
                          <StatusBadge status={status} />
                        </td>
                        <td className="px-5 py-4 text-zinc-700">
                          <span className="font-semibold text-zinc-900">{s.availableStock}</span>
                          <span className="text-zinc-400"> / {s.initialStock}</span>
                        </td>
                        <td className="px-5 py-4 text-zinc-700">{formatPrice(s.price)}</td>
                        <td className="px-5 py-4 text-xs text-zinc-500">{formatShort(s.startTime)}</td>
                        <td className="px-5 py-4 text-xs text-zinc-500">{formatShort(s.endTime)}</td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => handleInit(s)}
                            disabled={initingId === s.id}
                            className="btn-secondary text-xs disabled:opacity-50"
                          >
                            {initingId === s.id ? "Resetting..." : "Reset Stock"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}