import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { createSale, getSale, getSales, purchase } from "../api/flashSaleApi";
import { computeStatus, formatDuration, parseLocal } from "../utils/time";
import useNow from "../utils/useNow";

const EMPTY_COUNTS = { 201: 0, 409: 0, 410: 0, 429: 0, other: 0 };

const STATS = [
  { key: "201", label: "201 Success", color: "#10b981" },
  { key: "409", label: "409 Duplicate", color: "#f59e0b" },
  { key: "410", label: "410 Sold out", color: "#ef4444" },
  { key: "429", label: "429 Rate limited", color: "#8b5cf6" },
  { key: "other", label: "Other", color: "#71717a" },
];

const pad = (n) => String(n).padStart(2, "0");

// Date -> "yyyy-MM-ddTHH:mm:ss" in local time, never with a Z
function toApiDateTime(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export default function StressTestPage() {
  const now = useNow(1000);

  const [sales, setSales] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [saleId, setSaleId] = useState("");
  const [userCount, setUserCount] = useState(100);
  const [repeats, setRepeats] = useState(1);

  const [quickStock, setQuickStock] = useState(20);
  const [creating, setCreating] = useState(false);

  const [running, setRunning] = useState(false);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [report, setReport] = useState(null);

  const countsRef = useRef({ ...EMPTY_COUNTS });
  const completedRef = useRef(0);
  const otherRef = useRef(new Set());
  const timerRef = useRef(null);

  const loadSales = useCallback(async () => {
    try {
      const data = await getSales();
      setSales(data);
      setLoadError("");
      return data;
    } catch (e) {
      setLoadError(e.message || "Unable to load sales.");
      return null;
    }
  }, []);

  useEffect(() => {
    loadSales();
    return () => clearInterval(timerRef.current);
  }, [loadSales]);

  // Auto-select the newest LIVE sale once
  useEffect(() => {
    if (sales && saleId === "") {
      const live = sales.find((s) => computeStatus(s, Date.now()) === "LIVE");
      if (live) setSaleId(String(live.id));
    }
  }, [sales, saleId]);

  const flush = () => {
    setCounts({ ...countsRef.current });
    setCompleted(completedRef.current);
  };

  const quickCreate = async () => {
    const stock = Number(quickStock);
    if (!Number.isInteger(stock) || stock < 1 || stock > 100000) {
      toast.error("Stock must be a whole number between 1 and 100000.");
      return;
    }

    setCreating(true);
    try {
      const start = new Date(Date.now() + 5000);
      const end = new Date(Date.now() + 30 * 60 * 1000);
      const created = await createSale({
        title: `Stress Test Item ${Math.floor(1000 + Math.random() * 9000)}`,
        stock,
        price: 99,
        startTime: toApiDateTime(start),
        endTime: toApiDateTime(end),
      });
      await loadSales();
      setSaleId(String(created.id));
      setReport(null);
      toast.success(`Sale #${created.id} created. It goes live in 5 seconds.`);
    } catch (e) {
      toast.error(e.message || "Unable to create the test sale.");
    } finally {
      setCreating(false);
    }
  };

  const run = async () => {
    if (running) return;
    const sale = sales?.find((s) => String(s.id) === saleId);
    if (!sale) {
      toast.error("Select a sale first.");
      return;
    }

    setRunning(true);
    setReport(null);
    countsRef.current = { ...EMPTY_COUNTS };
    completedRef.current = 0;
    otherRef.current = new Set();
    setCounts({ ...EMPTY_COUNTS });
    setCompleted(0);

    // Fresh read: this is the starting stock for the PASS/FAIL check
    let fresh;
    try {
      fresh = await getSale(sale.id);
    } catch (e) {
      toast.error(e.message || "Unable to read the current stock.");
      setRunning(false);
      return;
    }
    if (computeStatus(fresh, Date.now()) !== "LIVE") {
      toast.error("This sale is not live. Tests only run against a live sale.");
      setRunning(false);
      loadSales();
      return;
    }

    const startStock = fresh.availableStock;
    const base = 1_000_000 + Math.floor(Math.random() * 8_000_000);
    const userIds = Array.from({ length: userCount }, (_, i) => base + i);
    const jobs = Array.from({ length: repeats }).flatMap(() => userIds);
    setTotal(jobs.length);

    const started = performance.now();
    timerRef.current = setInterval(flush, 100);

    await Promise.all(
      jobs.map(async (uid) => {
        try {
          await purchase(sale.id, uid, { timeout: 60000 });
          countsRef.current[201] += 1;
        } catch (e) {
          if ([409, 410, 429].includes(e.status)) {
            countsRef.current[e.status] += 1;
          } else {
            countsRef.current.other += 1;
            otherRef.current.add(e.status ? String(e.status) : "network");
          }
        } finally {
          completedRef.current += 1;
        }
      })
    );

    clearInterval(timerRef.current);
    const elapsedMs = performance.now() - started;
    flush();

    let finalStock = null;
    try {
      finalStock = (await getSale(sale.id)).availableStock;
    } catch {
      /* verdict still works from the success count */
    }

    const successes = countsRef.current[201];
    const oversold = successes > startStock || (finalStock !== null && finalStock < 0);

    setReport({
      title: sale.title,
      startStock,
      finalStock,
      successes,
      pass: !oversold,
      consistent: finalStock === null ? null : finalStock === startStock - successes,
      elapsedMs,
      requests: jobs.length,
      otherStatuses: [...otherRef.current],
    });

    setRunning(false);
    loadSales();
  };

  const chartData = STATS.map((s) => ({ name: s.label, value: counts[s.key], fill: s.color }));
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const selected = sales?.find((s) => String(s.id) === saleId);
  const selectedStatus = selected ? computeStatus(selected, now) : null;
  const selectedLive = selectedStatus === "LIVE";
  const startsInMs = selected ? parseLocal(selected.startTime).getTime() - now : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Stress test</h1>
        <p className="page-subtitle">
          Fire concurrent purchase requests from the browser and verify the system never oversells.
        </p>
      </div>

      {/* Quick create */}
      <div className="card p-6">
        <h2 className="text-base font-semibold text-zinc-900">Quick create test sale</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Creates a sale that goes live in 5 seconds and runs for 30 minutes. It is selected
          automatically.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="block text-sm font-medium text-zinc-700">Stock</label>
            <input
              type="number"
              min="1"
              max="100000"
              step="1"
              value={quickStock}
              onChange={(e) => setQuickStock(e.target.value)}
              disabled={creating || running}
              className="input mt-1.5"
            />
          </div>
          <button onClick={quickCreate} disabled={creating || running} className="btn-primary">
            {creating ? "Creating..." : "Create test sale"}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card p-6">
        {sales === null && !loadError && <div className="h-24 animate-pulse rounded-lg bg-zinc-100" />}

        {sales === null && loadError && (
          <div className="text-center">
            <p className="font-medium text-zinc-900">Unable to load sales</p>
            <p className="mt-1 text-sm text-zinc-500">{loadError}</p>
            <button onClick={loadSales} className="btn-primary mt-4">
              Try again
            </button>
          </div>
        )}

        {sales !== null && sales.length === 0 && (
          <p className="text-center text-sm text-zinc-600">
            No sales available. Use the quick create box above to make one.
          </p>
        )}

        {sales !== null && sales.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-700">Target sale</label>
              <select
                value={saleId}
                onChange={(e) => setSaleId(e.target.value)}
                disabled={running}
                className="input mt-1.5 disabled:opacity-60"
              >
                <option value="">Select a sale...</option>
                {sales.map((s) => (
                  <option key={s.id} value={s.id}>
                    #{s.id} {s.title} ({computeStatus(s, now)}, stock {s.availableStock}/
                    {s.initialStock})
                  </option>
                ))}
              </select>
              {selected && selectedStatus === "UPCOMING" && (
                <p className="mt-1.5 text-xs text-amber-700">
                  Goes live in {formatDuration(startsInMs)}. The Start button enables automatically.
                </p>
              )}
              {selected && selectedStatus === "ENDED" && (
                <p className="mt-1.5 text-xs text-amber-700">
                  This sale has ended. Create a new test sale above.
                </p>
              )}
              {selected && selectedLive && selected.availableStock <= 0 && (
                <p className="mt-1.5 text-xs text-amber-700">
                  This sale is sold out. Create a new test sale above, or use Re-init on the Admin
                  page.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Concurrent users:{" "}
                <span className="font-semibold tabular-nums text-zinc-900">{userCount}</span>
              </label>
              <input
                type="range"
                min="1"
                max="200"
                value={userCount}
                onChange={(e) => setUserCount(Number(e.target.value))}
                disabled={running}
                className="mt-3 w-full accent-zinc-900"
              />
              <div className="mt-2 flex gap-2">
                {[10, 50, 100, 200].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setUserCount(n)}
                    disabled={running}
                    className="btn-secondary !px-2.5 !py-1 !text-xs"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">Requests per user</label>
              <select
                value={repeats}
                onChange={(e) => setRepeats(Number(e.target.value))}
                disabled={running}
                className="input mt-1.5 disabled:opacity-60"
              >
                <option value={1}>1 (baseline)</option>
                <option value={2}>2 (duplicate buyers, 409 test)</option>
                <option value={6}>6 (rate limit, 429 test)</option>
              </select>
              <p className="mt-1.5 text-xs text-zinc-500">
                Total requests:{" "}
                <span className="font-semibold tabular-nums text-zinc-900">
                  {userCount * repeats}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-5">
          <button
            onClick={run}
            disabled={running || !selected || !selectedLive}
            className="btn-primary"
          >
            {running ? "Running..." : "Start test"}
          </button>
          <button onClick={loadSales} disabled={running} className="btn-secondary">
            Refresh sales
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          This creates real orders. Create a fresh test sale for each run, or use Re-init on the
          Admin page to reset the stock.
        </p>
      </div>

      {/* Verdict */}
      {report && (
        <div
          className={`rounded-xl border p-6 ${
            report.pass ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`grid h-9 w-9 place-items-center rounded-full text-white ${
                report.pass ? "bg-emerald-600" : "bg-red-600"
              }`}
            >
              {report.pass ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                </svg>
              )}
            </span>
            <div>
              <p className={`text-lg font-semibold ${report.pass ? "text-emerald-800" : "text-red-800"}`}>
                {report.pass ? "PASS: no overselling detected" : "FAIL: overselling detected"}
              </p>
              <p className="text-sm text-zinc-600">
                {report.successes} successful orders against a starting stock of {report.startStock}.
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-white/70 p-3">
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Final stock</dt>
              <dd className="mt-1 font-semibold tabular-nums text-zinc-900">
                {report.finalStock === null ? "Unavailable" : report.finalStock}
                {report.consistent === true && (
                  <span className="ml-2 text-xs font-normal text-emerald-700">consistent</span>
                )}
                {report.consistent === false && (
                  <span className="ml-2 text-xs font-normal text-amber-700">mismatch</span>
                )}
              </dd>
            </div>
            <div className="rounded-lg bg-white/70 p-3">
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Duration</dt>
              <dd className="mt-1 font-semibold tabular-nums text-zinc-900">
                {(report.elapsedMs / 1000).toFixed(2)}s
              </dd>
            </div>
            <div className="rounded-lg bg-white/70 p-3">
              <dt className="text-xs uppercase tracking-wide text-zinc-500">Throughput</dt>
              <dd className="mt-1 font-semibold tabular-nums text-zinc-900">
                {Math.round(report.requests / (report.elapsedMs / 1000))} req/s
              </dd>
            </div>
          </dl>

          {report.consistent === false && (
            <p className="mt-3 text-xs text-zinc-600">
              Final stock does not equal start minus successes. Another client may have purchased
              during the test.
            </p>
          )}
          {report.otherStatuses.length > 0 && (
            <p className="mt-2 text-xs text-zinc-600">
              Other statuses: {report.otherStatuses.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Live counts */}
      {(running || report || completed > 0) && (
        <>
          <div className="card p-5">
            <div className="mb-2 flex justify-between text-xs text-zinc-500">
              <span className="tabular-nums">
                {completed} / {total} responses
              </span>
              <span className="tabular-nums">{percent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-zinc-900 transition-all duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {STATS.map((s) => (
              <div key={s.key} className="card p-4">
                <p className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                  <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-zinc-900">
                  {counts[s.key]}
                </p>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900">Response breakdown</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#f4f4f5" }} />
                  <Bar dataKey="value" isAnimationActive={false} radius={[6, 6, 0, 0]}>
                    {chartData.map((d) => (
                      <Cell key={d.name} fill={d.fill} />
                    ))}
                    <LabelList dataKey="value" position="top" fontSize={12} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}