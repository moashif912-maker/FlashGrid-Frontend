import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { getOrders, getSales, purchase } from "../api/flashSaleApi";
import { useAuth } from "../context/AuthContext";
import OrderSuccessModal from "../components/OrderSuccessModal";
import SaleCard from "../components/SaleCard";
import SaleCardSkeleton from "../components/SaleCardSkeleton";
import useNow from "../utils/useNow";

const POLL_MS = 2000;
const COOLDOWN_MS = 10000; // backend: 5 requests per 10 seconds per user

export default function SalesPage() {
  const { userId, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const now = useNow(1000);

  const [sales, setSales] = useState(null);
  const [error, setError] = useState("");
  const [purchased, setPurchased] = useState(() => new Set());
  const [buyingId, setBuyingId] = useState(null);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [order, setOrder] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await getSales();
      setSales(data);
      setError("");
    } catch (e) {
      setError(e.message || "Unable to load sales.");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!isLoggedIn) {
      setPurchased(new Set());
      return;
    }
    let cancelled = false;
    getOrders(userId)
      .then((orders) => {
        if (!cancelled) setPurchased(new Set(orders.map((o) => o.itemId)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userId, isLoggedIn]);

  const markPurchased = (itemId) => setPurchased((prev) => new Set(prev).add(itemId));

  const handleBuy = async (sale) => {
    if (!isLoggedIn) {
      toast("Please sign in to continue.", { icon: "🔐" });
      navigate("/login", { state: { from: "/" } });
      return;
    }
    if (buyingId !== null) return;

    setBuyingId(sale.id);
    try {
      const result = await purchase(sale.id, userId);
      markPurchased(sale.id);
      setOrder({ ...result, title: sale.title });
      load();
    } catch (e) {
      switch (e.status) {
        case 409:
          markPurchased(sale.id);
          toast.error("You have already purchased this item.");
          break;
        case 410:
          toast.error(/ended/i.test(e.message) ? "This sale has ended." : "Sold out. No stock left.");
          load();
          break;
        case 425:
          toast("This sale has not started yet.", { icon: "⏳" });
          break;
        case 404:
          toast.error("Sale is not initialized. Initialize it from the Admin page.");
          break;
        case 429:
          setCooldownUntil(Date.now() + COOLDOWN_MS);
          toast.error("Too many requests. Please wait 10 seconds.");
          break;
        case 400:
          toast.error(e.message || "Invalid request.");
          break;
        default:
          toast.error(e.message || "Something went wrong. Please try again.");
      }
    } finally {
      setBuyingId(null);
    }
  };

  const cooldownLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  const header = (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h1 className="page-title">Flash sales</h1>
        <p className="page-subtitle">Limited stock. Availability updates in real time.</p>
      </div>
      <span className="hidden items-center gap-2 text-xs text-zinc-500 sm:inline-flex">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
        Live, refreshing every 2s
      </span>
    </div>
  );

  if (sales === null && !error) {
    return (
      <div>
        {header}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <SaleCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (sales === null && error) {
    return (
      <div>
        {header}
        <div className="card p-10 text-center">
          <p className="font-medium text-zinc-900">Unable to load sales</p>
          <p className="mt-1 text-sm text-zinc-500">{error}</p>
          <button onClick={load} className="btn-primary mt-5">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (sales.length === 0) {
    return (
      <div>
        {header}
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-14 text-center">
          <p className="font-medium text-zinc-900">No sales yet</p>
          <p className="mt-1 text-sm text-zinc-500">
            Create a sale from the Admin page and it will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}
      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Connection issue. Showing the last known data, retrying automatically.
        </div>
      )}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {sales.map((sale) => (
          <SaleCard
            key={sale.id}
            sale={sale}
            now={now}
            onBuy={handleBuy}
            buying={buyingId === sale.id}
            purchased={purchased.has(sale.id)}
            cooldownLeft={cooldownLeft}
          />
        ))}
      </div>

      <OrderSuccessModal
        order={order}
        onClose={() => setOrder(null)}
        onViewOrders={() => {
          setOrder(null);
          navigate("/orders");
        }}
      />
    </div>
  );
}