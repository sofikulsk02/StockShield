"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────
type ReservationStatus = "PENDING" | "CONFIRMED" | "RELEASED";
type ReleaseReason = "EXPIRED" | "CANCELLED" | "PAYMENT_FAILED" | null;

interface HistoryEntry {
  id: string;
  status: ReservationStatus;
  releaseReason: ReleaseReason;
  quantity: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  inventory: {
    product: {
      name: string;
      sku: string;
      imageUrl?: string;
    };
    warehouse: {
      name: string;
      location: string;
    };
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const STATUS_META: Record<
  ReservationStatus,
  { label: string; badge: string; dot: string; icon: string; glow: string }
> = {
  PENDING: {
    label: "Pending",
    badge: "badge badge-pending",
    dot: "pulse-dot pulse-dot-pending",
    icon: "⏳",
    glow: "rgba(234, 179, 8, 0.15)",
  },
  CONFIRMED: {
    label: "Confirmed",
    badge: "badge badge-confirmed",
    dot: "pulse-dot pulse-dot-confirmed",
    icon: "✅",
    glow: "rgba(16, 185, 129, 0.15)",
  },
  RELEASED: {
    label: "Released",
    badge: "badge badge-released",
    dot: "pulse-dot pulse-dot-released",
    icon: "🔓",
    glow: "rgba(239, 68, 68, 0.15)",
  },
};

const RELEASE_REASON_LABEL: Record<string, string> = {
  EXPIRED: "⌛ Hold Expired",
  CANCELLED: "🚫 Cancelled",
  PAYMENT_FAILED: "❌ Payment Failed",
};

// ─── Skeleton Loader ─────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="glass-card rounded-2xl p-5 animate-pulse flex gap-4 items-center">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/5 rounded w-1/3" />
        <div className="h-3 bg-white/5 rounded w-1/4" />
      </div>
      <div className="h-6 w-20 bg-white/5 rounded-full" />
      <div className="h-4 w-16 bg-white/5 rounded" />
    </div>
  );
}

// ─── Filter Pill ─────────────────────────────────────────────────────────────
function FilterPill({
  active,
  label,
  count,
  onClick,
  color,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      style={active ? { borderColor: color, background: `${color}20` } : {}}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
        active
          ? "text-white"
          : "border-white/10 text-zinc-400 hover:border-white/20 hover:text-white bg-transparent"
      }`}
    >
      {label}
      <span
        style={active ? { background: color } : {}}
        className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
          active ? "text-white" : "bg-white/10 text-zinc-400"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ─── History Row ─────────────────────────────────────────────────────────────
function HistoryRow({
  entry,
  index,
}: {
  entry: HistoryEntry;
  index: number;
}) {
  const meta = STATUS_META[entry.status];
  const product = entry.inventory.product;
  const warehouse = entry.inventory.warehouse;

  return (
    <Link
      href={`/reservation/${entry.id}`}
      className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center group cursor-pointer no-underline"
      style={{
        animationDelay: `${index * 40}ms`,
        animation: "fadeSlideUp 0.4s ease both",
      }}
    >
      {/* Status icon */}
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-transform duration-300 group-hover:scale-110"
        style={{ background: meta.glow }}
      >
        {meta.icon}
      </div>

      {/* Product info */}
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate group-hover:text-indigo-300 transition-colors">
          {product.name}
        </p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
          <span className="text-xs text-zinc-500 font-mono">{product.sku}</span>
          <span className="text-xs text-zinc-600">·</span>
          <span className="text-xs text-zinc-500">
            {warehouse.name}, {warehouse.location}
          </span>
          <span className="text-xs text-zinc-600">·</span>
          <span className="text-xs text-zinc-500">Qty: {entry.quantity}</span>
        </div>
        {entry.releaseReason && (
          <span className="text-xs text-red-400/80 mt-0.5 block">
            {RELEASE_REASON_LABEL[entry.releaseReason] ?? entry.releaseReason}
          </span>
        )}
      </div>

      {/* Status badge */}
      <div className="flex-shrink-0">
        <span className={meta.badge}>
          <span className={meta.dot} />
          {meta.label}
        </span>
      </div>

      {/* Time */}
      <div className="flex-shrink-0 text-right">
        <p className="text-xs text-zinc-400 font-medium">{timeAgo(entry.createdAt)}</p>
        <p className="text-xs text-zinc-600 mt-0.5">{formatDate(entry.createdAt)}</p>
      </div>

      {/* Arrow */}
      <div className="text-zinc-700 group-hover:text-indigo-400 transition-colors text-lg flex-shrink-0">
        →
      </div>
    </Link>
  );
}

// ─── Stats Banner ─────────────────────────────────────────────────────────────
function StatsBanner({ entries }: { entries: HistoryEntry[] }) {
  const total = entries.length;
  const confirmed = entries.filter((e) => e.status === "CONFIRMED").length;
  const pending = entries.filter((e) => e.status === "PENDING").length;
  const released = entries.filter((e) => e.status === "RELEASED").length;
  const conversionRate = total > 0 ? ((confirmed / total) * 100).toFixed(0) : "0";

  const stats = [
    { label: "Total Activity", value: total, color: "#a78bfa", icon: "📋" },
    { label: "Confirmed", value: confirmed, color: "#34d399", icon: "✅" },
    { label: "Pending Holds", value: pending, color: "#fbbf24", icon: "⏳" },
    { label: "Released", value: released, color: "#f87171", icon: "🔓" },
    { label: "Conversion Rate", value: `${conversionRate}%`, color: "#818cf8", icon: "📈" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
      {stats.map((s) => (
        <div
          key={s.label}
          className="glass-card rounded-2xl p-4 flex flex-col gap-1"
          style={{ borderColor: `${s.color}20` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{s.icon}</span>
            <span className="text-xs text-zinc-500 font-medium">{s.label}</span>
          </div>
          <p className="text-2xl font-bold" style={{ color: s.color }}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | ReservationStatus>("ALL");
  const [search, setSearch] = useState("");

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history");
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setEntries(data.reservations);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [fetchHistory]);

  const filtered = entries.filter((e) => {
    const matchesFilter = filter === "ALL" || e.status === filter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      e.inventory.product.name.toLowerCase().includes(q) ||
      e.inventory.product.sku.toLowerCase().includes(q) ||
      e.inventory.warehouse.name.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });

  const counts = {
    ALL: entries.length,
    PENDING: entries.filter((e) => e.status === "PENDING").length,
    CONFIRMED: entries.filter((e) => e.status === "CONFIRMED").length,
    RELEASED: entries.filter((e) => e.status === "RELEASED").length,
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
            <span
              className="text-4xl"
              style={{ filter: "drop-shadow(0 0 12px rgba(99,102,241,0.7))" }}
            >
              📜
            </span>
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Reservation History
            </span>
          </h1>
          <p className="text-zinc-500 text-sm mt-1">
            All inventory hold activity — sorted by latest first
          </p>
        </div>
        <button
          onClick={fetchHistory}
          className="btn-secondary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 self-start md:self-auto"
        >
          🔄 Refresh
        </button>
      </div>

      {/* ── Stats Banner ── */}
      {!loading && !error && <StatsBanner entries={entries} />}

      {/* ── Search + Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm pointer-events-none">
            🔍
          </span>
          <input
            id="history-search"
            type="text"
            placeholder="Search by product, SKU, warehouse or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-zinc-600 outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 flex-wrap">
          <FilterPill
            active={filter === "ALL"}
            label="All"
            count={counts.ALL}
            onClick={() => setFilter("ALL")}
            color="#a78bfa"
          />
          <FilterPill
            active={filter === "PENDING"}
            label="Pending"
            count={counts.PENDING}
            onClick={() => setFilter("PENDING")}
            color="#fbbf24"
          />
          <FilterPill
            active={filter === "CONFIRMED"}
            label="Confirmed"
            count={counts.CONFIRMED}
            onClick={() => setFilter("CONFIRMED")}
            color="#34d399"
          />
          <FilterPill
            active={filter === "RELEASED"}
            label="Released"
            count={counts.RELEASED}
            onClick={() => setFilter("RELEASED")}
            color="#f87171"
          />
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <SkeletonRow key={n} />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">⚠️</p>
          <p className="text-red-400 font-medium">{error}</p>
          <button
            onClick={fetchHistory}
            className="mt-4 btn-primary px-5 py-2 rounded-lg text-sm font-medium"
          >
            Try Again
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <p className="text-5xl mb-4">
            {search || filter !== "ALL" ? "🔎" : "📭"}
          </p>
          <p className="text-zinc-400 font-medium text-lg">
            {search || filter !== "ALL"
              ? "No results match your search"
              : "No reservation activity yet"}
          </p>
          <p className="text-zinc-600 text-sm mt-1">
            {search || filter !== "ALL"
              ? "Try adjusting your filters"
              : "Head to the Products page to make your first reservation"}
          </p>
          {!(search || filter !== "ALL") && (
            <Link
              href="/"
              className="inline-block mt-5 btn-primary px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              Browse Products →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry, i) => (
            <HistoryRow key={entry.id} entry={entry} index={i} />
          ))}
          <p className="text-center text-xs text-zinc-600 pt-2">
            Showing {filtered.length} of {entries.length} records
          </p>
        </div>
      )}
    </div>
  );
}
