"use client";

import {
  Activity,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  Info,
  Layers,
  RefreshCw,
  Save,
  Shield,
  TrendingUp,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GapRow {
  id: number;
  subcategory_code: string;
  subcategory_name: string;
  nist_function: string;
  current_tier: number;
  target_tier: number;
  gap: number;
  priority: "Critical" | "High" | "Medium" | "Low";
  rationale: string;
  owner: string | null;
  due_date: string | null;
  updated_at: string;
}

interface AssetScope {
  total_assets: number;
  critical_assets: number;
  mfa_coverage: number;
  encryption_coverage: number;
  logging_coverage: number;
  backup_coverage: number;
}

interface EditState {
  target_tier: number;
  owner: string;
  due_date: string;
}

interface RingItem {
  name: string;
  nameMn: string;
  current: number;
  target: number;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<
  number,
  { label: string; desc: string; color: string }
> = {
  1: { label: "Tier 1", desc: "Partial", color: "text-red-500" },
  2: { label: "Tier 2", desc: "Risk Informed", color: "text-orange-500" },
  3: { label: "Tier 3", desc: "Repeatable", color: "text-yellow-500" },
  4: { label: "Tier 4", desc: "Adaptive", color: "text-green-500" },
};

const FUNCTION_COLORS: Record<string, string> = {
  Govern: "#8b5cf6",
  Identify: "#3b82f6",
  Protect: "#10b981",
  Detect: "#f59e0b",
  Respond: "#ef4444",
  Recover: "#6366f1",
};

const FUNCTION_MN: Record<string, string> = {
  Govern: "Засаглал",
  Identify: "Тодорхойлох",
  Protect: "Хамгаалах",
  Detect: "Илрүүлэх",
  Respond: "Хариу арга хэмжээ",
  Recover: "Сэргээх",
};

const FUNCTION_ORDER = [
  "Govern",
  "Identify",
  "Protect",
  "Detect",
  "Respond",
  "Recover",
];

// ─── Activity Rings ───────────────────────────────────────────────────────────

function ActivityRings({
  items,
  overallPct,
}: {
  items: RingItem[];
  overallPct: number;
}) {
  const cx = 130,
    cy = 130;
  const RING_W = 13,
    GAP = 5,
    BASE_R = 114;

  return (
    <div className="flex flex-col items-center gap-5">
      <svg
        width={cx * 2}
        height={cy * 2}
        className="overflow-visible drop-shadow-sm"
      >
        {/* Glow filter */}
        <defs>
          <filter
            id="activity-rings-glow"
            x="-40"
            y="-40"
            width={cx * 2 + 80}
            height={cy * 2 + 80}
            filterUnits="userSpaceOnUse"
          >
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g aria-hidden="true">
          {items.map((item, i) => {
            const r = BASE_R - i * (RING_W + GAP);
            if (r < 8) return null;
            return (
              <circle
                key={`${item.name}-track`}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={item.color}
                strokeWidth={RING_W}
                opacity={0.1}
              />
            );
          })}
        </g>

        <g>
          {items.map((item, i) => {
            const r = BASE_R - i * (RING_W + GAP);
            if (r < 8) return null;
            const circ = 2 * Math.PI * r;
            const pct = Math.min(
              item.target > 0 ? item.current / item.target : 0,
              1,
            );
            const filled = pct * circ;
            const isComplete = pct >= 0.995;
            return (
              <circle
                key={`${item.name}-progress`}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={item.color}
                strokeWidth={RING_W}
                strokeDasharray={isComplete ? undefined : `${filled} ${circ}`}
                strokeLinecap={isComplete ? undefined : "round"}
                transform={`rotate(-90 ${cx} ${cy})`}
                filter="url(#activity-rings-glow)"
              />
            );
          })}
        </g>
      </svg>

      {/* Overall score */}
      <div className="text-center -mt-2">
        <span className="text-3xl font-black tabular-nums text-foreground">
          {overallPct}%
        </span>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-2.5 w-full px-2">
        {items.map((item) => {
          const pct =
            item.target > 0
              ? Math.round((item.current / item.target) * 100)
              : 0;
          const barW = Math.max(4, pct);
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  {item.nameMn}
                </span>
                <span
                  className="text-xs font-bold tabular-nums"
                  style={{ color: item.color }}
                >
                  {pct}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${barW}%`,
                    backgroundColor: item.color,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [gaps, setGaps] = useState<GapRow[]>([]);
  const [assetScope, setAssetScope] = useState<AssetScope | null>(null);
  const [dashSummary, setDashSummary] = useState<{
    health_score?: number;
    total_assets?: number;
    total_risks?: number;
    open_vulnerabilities?: number;
  } | null>(null);
  const [policyCompliance, setPolicyCompliance] = useState<{
    totalRequired: number;
    approvedCount: number;
    pendingCount: number;
    draftCount: number;
    compliancePct: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<EditState>({
    target_tier: 3,
    owner: "",
    due_date: "",
  });
  const [expandedFn, setExpandedFn] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>("All");

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileRes, dashRes] = await Promise.all([
        fetch("/api/csf-profile"),
        fetch("/api/dashboard"),
      ]);
      if (!profileRes.ok) throw new Error("Профайл татаж чадсангүй");
      const profileData = await profileRes.json();
      setGaps(profileData.gaps ?? []);
      setAssetScope(profileData.assetScope ?? null);
      setPolicyCompliance(profileData.policyCompliance ?? null);
      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setDashSummary(dashData.summary ?? null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // ── Save edits ─────────────────────────────────────────────────────────────
  const saveEdit = async (row: GapRow) => {
    setSaving(true);
    try {
      const res = await fetch("/api/csf-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gaps: [
            {
              subcategory_code: row.subcategory_code,
              target_tier: editState.target_tier,
              owner: editState.owner || null,
              due_date: editState.due_date || null,
            },
          ],
        }),
      });
      if (!res.ok) throw new Error("Хадгалж чадсангүй");
      const data = await res.json();
      setGaps(data.gaps ?? []);
      setEditingId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const radarData = useMemo(() => {
    const byFn: Record<string, { current: number[]; target: number[] }> = {};
    for (const fn of FUNCTION_ORDER) byFn[fn] = { current: [], target: [] };
    for (const g of gaps) {
      if (byFn[g.nist_function]) {
        byFn[g.nist_function].current.push(g.current_tier);
        byFn[g.nist_function].target.push(g.target_tier);
      }
    }
    const avg = (arr: number[]) =>
      arr.length
        ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1)
        : 0;
    return FUNCTION_ORDER.map((fn) => ({
      function: FUNCTION_MN[fn] ?? fn,
      fullMark: 4,
      "Одоогийн түвшин": avg(byFn[fn].current),
      "Зорилтот түвшин": avg(byFn[fn].target),
    }));
  }, [gaps]);

  const ringData = useMemo<RingItem[]>(
    () =>
      FUNCTION_ORDER.map((fn) => {
        const d = radarData.find((r) => r.function === (FUNCTION_MN[fn] ?? fn));
        return {
          name: fn,
          nameMn: FUNCTION_MN[fn] ?? fn,
          current: d?.["Одоогийн түвшин"] ?? 0,
          target: d?.["Зорилтот түвшин"] ?? 4,
          color: FUNCTION_COLORS[fn] ?? "#6b7280",
        };
      }),
    [radarData],
  );

  const overallPct = useMemo(() => {
    if (!ringData.length) return 0;
    const sum = ringData.reduce(
      (acc, r) => acc + (r.target > 0 ? r.current / r.target : 0),
      0,
    );
    return Math.round((sum / ringData.length) * 100);
  }, [ringData]);

  const stats = useMemo(() => {
    const totalGaps = gaps.filter((g) => g.gap < 0).length;
    const critical = gaps.filter((g) => g.priority === "Critical").length;
    const high = gaps.filter((g) => g.priority === "High").length;
    const avgCurrent = gaps.length
      ? +(gaps.reduce((a, g) => a + g.current_tier, 0) / gaps.length).toFixed(1)
      : 0;
    const avgTarget = gaps.length
      ? +(gaps.reduce((a, g) => a + g.target_tier, 0) / gaps.length).toFixed(1)
      : 0;
    return { totalGaps, critical, high, avgCurrent, avgTarget };
  }, [gaps]);

  const filteredGaps = useMemo(
    () =>
      filterPriority === "All"
        ? gaps
        : gaps.filter((g) => g.gap < 0 && g.priority === filterPriority),
    [gaps, filterPriority],
  );

  const gapsByFunction = useMemo(() => {
    const map: Record<string, GapRow[]> = {};
    for (const g of filteredGaps) {
      if (!map[g.nist_function]) map[g.nist_function] = [];
      map[g.nist_function].push(g);
    }
    return map;
  }, [filteredGaps]);

  const startEdit = (row: GapRow) => {
    setEditingId(row.id);
    setEditState({
      target_tier: row.target_tier,
      owner: row.owner ?? "",
      due_date: row.due_date ?? "",
    });
  };

  const avgTierForFunction = (fn: string) => {
    const rows = gaps.filter((g) => g.nist_function === fn);
    if (!rows.length) return null;
    const cur = +(
      rows.reduce((a, g) => a + g.current_tier, 0) / rows.length
    ).toFixed(1);
    const tgt = +(
      rows.reduce((a, g) => a + g.target_tier, 0) / rows.length
    ).toFixed(1);
    return { cur, tgt };
  };

  // ── Loading / Error ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-3 text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Хянах самбар ачааллаж байна…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto" />
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchAll}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Дахин оролдох
          </button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-10 p-4 sm:p-6 md:p-8 select-none [&_button]:select-auto [&_a]:select-auto [&_input]:select-text">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-600" />
            NIST CSF 2.0 Хянах самбар
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Байгууллагын кибер аюулгүй байдлын одоогийн болон зорилтот түвшний
            харьцуулалт
          </p>
        </div>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Шинэчлэх
        </button>
      </div>

      {/* KPI Cards — row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          icon={<Activity className="w-4 h-4 text-blue-500" />}
          value={`${dashSummary?.health_score ?? overallPct}%`}
          label="Аюулгүй байдлын индекс"
          accent="blue"
        />
        <KpiCard
          icon={<Layers className="w-4 h-4 text-indigo-500" />}
          value={dashSummary?.total_assets ?? assetScope?.total_assets ?? "—"}
          label="Нийт хөрөнгө"
          accent="indigo"
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 text-orange-500" />}
          value={dashSummary?.total_risks ?? "—"}
          label="Нийт эрсдэл"
          accent="orange"
        />
        <KpiCard
          icon={<Shield className="w-4 h-4 text-red-500" />}
          value={stats.totalGaps}
          label="Зөрүү"
          accent="red"
        />
        <KpiCard
          icon={<AlertTriangle className="w-4 h-4 text-rose-500" />}
          value={`${stats.critical} / ${stats.high}`}
          label="Чухал / Өндөр"
          accent="rose"
        />
        <KpiCard
          icon={<TrendingUp className="w-4 h-4 text-green-500" />}
          value={`${stats.avgCurrent} / 4`}
          label="Дундаж түвшин"
          accent="green"
        />
      </div>

      {/* Policy compliance banner */}
      {policyCompliance && policyCompliance.totalRequired > 0 && (
        <div
          className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
            policyCompliance.compliancePct >= 80
              ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900"
              : policyCompliance.compliancePct >= 40
                ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900"
                : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900"
          }`}
        >
          <BookOpen
            className={`w-5 h-5 shrink-0 ${
              policyCompliance.compliancePct >= 80
                ? "text-emerald-600"
                : policyCompliance.compliancePct >= 40
                  ? "text-amber-600"
                  : "text-rose-600"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <span className="text-sm font-bold text-foreground">
                Дүрэм журмын нийцлийн түвшин
              </span>
              <span
                className={`text-sm font-black tabular-nums ${
                  policyCompliance.compliancePct >= 80
                    ? "text-emerald-600"
                    : policyCompliance.compliancePct >= 40
                      ? "text-amber-600"
                      : "text-rose-600"
                }`}
              >
                {policyCompliance.approvedCount} /{" "}
                {policyCompliance.totalRequired} батлагдсан (
                {policyCompliance.compliancePct}%)
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  policyCompliance.compliancePct >= 80
                    ? "bg-emerald-500"
                    : policyCompliance.compliancePct >= 40
                      ? "bg-amber-500"
                      : "bg-rose-500"
                }`}
                style={{
                  width: `${Math.max(policyCompliance.compliancePct, 3)}%`,
                }}
              />
            </div>
            <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
              <span>
                ✓ Батлагдсан: <b>{policyCompliance.approvedCount}</b>
              </span>
              <span>
                ⏳ Зөвшөөрөл хүлээж: <b>{policyCompliance.pendingCount}</b>
              </span>
              <span>
                ✎ Ноорог: <b>{policyCompliance.draftCount}</b>
              </span>
            </div>
          </div>
          <a
            href="/policies"
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
              policyCompliance.compliancePct >= 80
                ? "border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950"
                : policyCompliance.compliancePct >= 40
                  ? "border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
                  : "border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950"
            }`}
          >
            Дүрэм журам →
          </a>
        </div>
      )}

      {/* Charts — Radar + Activity Rings */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Radar chart */}
        <div className="lg:col-span-3 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-1">
            Функцийн харьцуулалт
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Tier 1–4 · Одоогийн болон зорилтот түвшний харьцуулалт
          </p>
          <ResponsiveContainer width="100%" height={320}>
            <RadarChart
              data={radarData}
              margin={{ top: 24, right: 48, bottom: 16, left: 48 }}
            >
              <PolarGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <PolarAngleAxis
                dataKey="function"
                tick={{
                  fontSize: 11,
                  fill: "hsl(var(--foreground))",
                  fontWeight: 600,
                }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 4]}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickCount={5}
                tickFormatter={(v: number) => (v === 0 ? "" : `T${v}`)}
              />
              <Radar
                name="Одоогийн түвшин"
                dataKey="Одоогийн түвшин"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.25}
                strokeWidth={2.5}
                dot={(props: Record<string, unknown>) => {
                  const cx = props.cx as number;
                  const cy = props.cy as number;
                  const idx = props.index as number;
                  if (!cx || !cy) return <g key={idx} />;
                  return (
                    <g key={`cur-${idx}`}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={6}
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth={2}
                      />
                    </g>
                  );
                }}
              />
              <Radar
                name="Зорилтот түвшин"
                dataKey="Зорилтот түвшин"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.12}
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={(props: Record<string, unknown>) => {
                  const cx = props.cx as number;
                  const cy = props.cy as number;
                  const idx = props.index as number;
                  if (!cx || !cy) return <g key={idx} />;
                  return (
                    <g key={`tgt-${idx}`}>
                      <circle
                        cx={cx}
                        cy={cy}
                        r={5}
                        fill="white"
                        stroke="#10b981"
                        strokeWidth={2.5}
                      />
                    </g>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Tooltip
                formatter={(value, name) => [`Tier ${value}`, name as string]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 10,
                  fontSize: 12,
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                }}
              />
            </RadarChart>
          </ResponsiveContainer>

          {/* Score summary row */}
          <div className="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {radarData.map((d, i) => {
              const fn = FUNCTION_ORDER[i];
              const color = FUNCTION_COLORS[fn] ?? "#6b7280";
              const current = d["Одоогийн түвшин"];
              const target = d["Зорилтот түвшин"];
              const onTarget = current >= target;
              return (
                <div
                  key={fn}
                  className="rounded-lg p-2 text-center"
                  style={{
                    backgroundColor: `${color}12`,
                    border: `1px solid ${color}25`,
                  }}
                >
                  <div
                    className="text-xl font-black tabular-nums"
                    style={{ color }}
                  >
                    T{current}
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight mt-0.5 truncate font-medium">
                    {d.function}
                  </div>
                  <div
                    className="text-[10px] font-semibold mt-0.5"
                    style={{ color: onTarget ? "#10b981" : "#ef4444" }}
                  >
                    → T{target}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Rings */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm flex flex-col">
          <h2 className="text-base font-semibold text-foreground mb-1">
            Нийцтэй байдал
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            Одоогийн түвшинг зорилтот түвшинтэй харьцуулсан хувь
          </p>
          <div className="flex-1 flex items-center justify-center">
            <ActivityRings items={ringData} overallPct={overallPct} />
          </div>
        </div>
      </div>

      {/* Asset scope */}
      {assetScope && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            Хөрөнгийн хамрах хүрээ (автомат тооцоо)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Нийт хөрөнгө", value: assetScope.total_assets },
              { label: "Чухал хөрөнгө", value: assetScope.critical_assets },
              { label: "MFA", value: `${assetScope.mfa_coverage}%` },
              {
                label: "Шифрлэлт",
                value: `${assetScope.encryption_coverage}%`,
              },
              {
                label: "Лог хөтлөлт",
                value: `${assetScope.logging_coverage}%`,
              },
              {
                label: "Нөөцлөлт(Backup)",
                value: `${assetScope.backup_coverage}%`,
              },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-muted/40 rounded-lg p-3 text-center"
              >
                <div className="text-lg font-bold text-foreground">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Зөрүү */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border bg-muted/20 flex-wrap">
          <div>
            <h2 className="text-m font-bold text-foreground tracking-tight">
              Одоогийн болон зорилтот түвшний зөрүү
            </h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["All", "Critical", "High", "Medium", "Low"] as const).map(
              (p) => {
                const LABEL: Record<string, string> = {
                  All: "Бүгд",
                  Critical: "Ноцтой",
                  High: "Өндөр",
                  Medium: "Дундаж",
                  Low: "Бага",
                };
                const ACTIVE_CLS: Record<string, string> = {
                  All: "bg-slate-700 text-white shadow-sm",
                  Critical: "bg-red-600 text-white shadow-sm",
                  High: "bg-orange-500 text-white shadow-sm",
                  Medium: "bg-amber-400 text-white shadow-sm",
                  Low: "bg-emerald-600 text-white shadow-sm",
                };
                return (
                  <button
                    key={p}
                    onClick={() => setFilterPriority(p)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      filterPriority === p
                        ? ACTIVE_CLS[p]
                        : "bg-muted/60 text-muted-foreground hover:bg-muted border border-border/50"
                    }`}
                  >
                    {LABEL[p]}
                  </button>
                );
              },
            )}
          </div>
        </div>

        {FUNCTION_ORDER.map((fn) => {
          const rows = gapsByFunction[fn];
          if (!rows?.length) return null;
          const isExpanded = expandedFn === fn || expandedFn === null;
          const tiers = avgTierForFunction(fn);
          const color = FUNCTION_COLORS[fn] ?? "#6b7280";
          const critCount = rows.filter(
            (r) => r.priority === "Critical",
          ).length;
          const highCount = rows.filter((r) => r.priority === "High").length;

          return (
            <div
              key={fn}
              className="border-b border-border last:border-b-0"
              style={{ backgroundColor: `${color}07` }}
            >
              {/* Function group header */}
              <button
                onClick={() => setExpandedFn(expandedFn === fn ? null : fn)}
                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors text-left"
                style={{ borderLeft: `4px solid ${color}` }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                  <span className="font-bold text-sm text-foreground">
                    {FUNCTION_MN[fn]}
                  </span>
                  <span className="text-sm text-muted-foreground">— {fn}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: `${color}18`, color }}
                  >
                    {rows.length} дэд ангилал
                  </span>
                  {critCount > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">
                      {critCount} ноцтой
                    </span>
                  )}
                  {highCount > 0 && critCount === 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 px-2 py-0.5 rounded-full font-semibold">
                      {highCount} өндөр
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {tiers && (
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4].map((t) => (
                          <div
                            key={t}
                            className="h-1.5 w-4 rounded-full"
                            style={{
                              backgroundColor: color,
                              opacity: t <= Math.round(tiers.cur) ? 1 : 0.18,
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Дундаж: Tier {tiers.cur} → Tier {tiers.tgt}
                      </span>
                    </div>
                  )}
                  {isExpanded && expandedFn === fn ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* Rows */}
              {(expandedFn === fn || expandedFn === null) && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr
                        className="text-xs text-muted-foreground uppercase tracking-wider"
                        style={{ backgroundColor: `${color}18` }}
                      >
                        <th className="text-left px-5 py-2.5 font-medium w-32">
                          Код
                        </th>
                        <th className="text-left px-3 py-2.5 font-medium">
                          Нэр
                        </th>
                        <th className="text-center px-3 py-2.5 font-medium w-24">
                          Одоо
                        </th>
                        <th className="text-center px-3 py-2.5 font-medium w-24">
                          Зорилт
                        </th>
                        <th className="text-center px-3 py-2.5 font-medium w-20">
                          Зөрүү
                        </th>
                        <th className="text-center px-3 py-2.5 font-medium w-24">
                          Эрэмбэ
                        </th>
                        <th className="text-left px-3 py-2.5 font-medium w-36">
                          Хариуцагч
                        </th>
                        <th className="text-left px-3 py-2.5 font-medium w-28">
                          Дуусах
                        </th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const isEditing = editingId === row.id;
                        const gapNum = row.current_tier - row.target_tier;
                        return (
                          <tr
                            key={row.id}
                            className={`border-t border-border/40 transition-colors ${
                              row.priority === "Critical"
                                ? "hover:bg-red-500/10"
                                : row.priority === "High"
                                  ? "hover:bg-orange-500/10"
                                  : "hover:bg-black/5 dark:hover:bg-white/5"
                            }`}
                            style={{ backgroundColor: `${color}05` }}
                          >
                            {/* Code */}
                            <td className="px-5 py-3">
                              <code
                                className="text-xs font-mono px-2 py-0.5 rounded-md font-bold"
                                style={{
                                  backgroundColor: `${color}15`,
                                  color,
                                  border: `1px solid ${color}30`,
                                }}
                              >
                                {row.subcategory_code}
                              </code>
                            </td>

                            {/* Name */}
                            <td className="px-3 py-3 max-w-xs">
                              <span
                                className="text-xs font-semibold text-foreground leading-snug"
                                title={row.rationale ?? undefined}
                              >
                                {row.subcategory_name}
                              </span>
                            </td>

                            {/* Current tier */}
                            <td className="px-3 py-3 text-center">
                              <TierBadge tier={row.current_tier} />
                            </td>

                            {/* Target tier */}
                            <td className="px-3 py-3 text-center">
                              {isEditing ? (
                                <select
                                  value={editState.target_tier}
                                  onChange={(e) =>
                                    setEditState((s) => ({
                                      ...s,
                                      target_tier: Number(e.target.value),
                                    }))
                                  }
                                  className="w-20 text-xs border border-border rounded px-1 py-0.5 bg-background"
                                >
                                  {[1, 2, 3, 4].map((t) => (
                                    <option key={t} value={t}>
                                      Tier {t}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <TierBadge tier={row.target_tier} />
                              )}
                            </td>

                            {/* Gap */}
                            <td className="px-3 py-3 text-center">
                              {gapNum < 0 ? (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                                  ▼ {Math.abs(gapNum)}
                                </span>
                              ) : gapNum === 0 ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                                  ✓
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400">
                                  ▲ {gapNum}
                                </span>
                              )}
                            </td>

                            {/* Priority */}
                            <td className="px-3 py-3 text-center">
                              <PriorityBadge priority={row.priority} />
                            </td>

                            {/* Owner */}
                            <td className="px-3 py-3">
                              {isEditing ? (
                                <input
                                  value={editState.owner}
                                  onChange={(e) =>
                                    setEditState((s) => ({
                                      ...s,
                                      owner: e.target.value,
                                    }))
                                  }
                                  placeholder="Хариуцагч"
                                  className="w-full text-xs border border-border rounded px-2 py-1 bg-background"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {row.owner ?? "—"}
                                </span>
                              )}
                            </td>

                            {/* Due date */}
                            <td className="px-3 py-3">
                              {isEditing ? (
                                <input
                                  type="date"
                                  value={editState.due_date}
                                  onChange={(e) =>
                                    setEditState((s) => ({
                                      ...s,
                                      due_date: e.target.value,
                                    }))
                                  }
                                  className="w-full text-xs border border-border rounded px-2 py-1 bg-background"
                                />
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  {row.due_date
                                    ? new Date(row.due_date).toLocaleDateString(
                                        "mn-MN",
                                      )
                                    : "—"}
                                </span>
                              )}
                            </td>

                            {/* Edit / Save */}
                            <td className="px-3 py-3 text-center">
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => saveEdit(row)}
                                    disabled={saving}
                                    className="p-1.5 rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                                    title="Хадгалах"
                                  >
                                    <Save className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1.5 rounded bg-muted text-foreground hover:bg-muted/80 transition-colors"
                                    title="Цуцлах"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => startEdit(row)}
                                  className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground"
                                  title="Засах"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}

        {filteredGaps.length === 0 && (
          <div className="py-14 text-center text-muted-foreground text-sm">
            Үл нийцэл олдсонгүй
          </div>
        )}
      </div>

      {/* Tier legend */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          Tier тайлбар
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.entries(TIER_LABELS).map(([tier, { label, desc, color }]) => (
            <div key={tier} className="bg-muted/40 rounded-lg p-3">
              <div className={`text-sm font-bold ${color}`}>
                {label} — {desc}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {tier === "1" &&
                  "Эрсдэлийн удирдлагын тогтсон процессгүй, ихэвчлэн асуудал гарсны дараа арга хэмжээ авдаг."}
                {tier === "2" &&
                  "Эрсдэлийг тодорхой хэмжээнд ойлгож, зарим бодлого, журам хэрэгжүүлдэг боловч байгууллагын хэмжээнд бүрэн хэрэгжээгүй."}
                {tier === "3" &&
                  "Эрсдэлийн удирдлагын процесс нь баримт болон стандартчилагдсан бөгөөд байгууллагын хэмжээнд тогтмол"}
                {tier === "4" &&
                  "Байгууллага эрсдэлийг тасралтгүй хянаж, шинэ аюул заналд хурдан дасан зохицож, сайжруулалтыг идэвхтэй хийдэг"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  accent: "blue" | "indigo" | "orange" | "red" | "rose" | "green";
}) {
  const cls: Record<string, string> = {
    blue: "bg-blue-50   border-blue-200   dark:bg-slate-800 dark:border-slate-700",
    indigo:
      "bg-indigo-50 border-indigo-200 dark:bg-slate-800 dark:border-slate-700",
    orange:
      "bg-orange-50 border-orange-200 dark:bg-slate-800 dark:border-slate-700",
    red: "bg-red-50    border-red-200    dark:bg-slate-800 dark:border-slate-700",
    rose: "bg-rose-50   border-rose-200   dark:bg-slate-800 dark:border-slate-700",
    green:
      "bg-green-50  border-green-200  dark:bg-slate-800 dark:border-slate-700",
  };
  return (
    <div className={`kpi-card rounded-xl border p-4 shadow-sm ${cls[accent]}`}>
      <div className="mb-1">{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function TierBadge({ tier }: { tier: number }) {
  const configs: Record<number, { label: string; cls: string }> = {
    1: {
      label: "Tier 1",
      cls: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400 border border-red-200 dark:border-red-900",
    },
    2: {
      label: "Tier 2",
      cls: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400 border border-orange-200 dark:border-orange-900",
    },
    3: {
      label: "Tier 3",
      cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-900",
    },
    4: {
      label: "Tier 4",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900",
    },
  };
  const { label, cls } = configs[tier] ?? {
    label: `Tier ${tier}`,
    cls: "bg-muted text-muted-foreground border border-border",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${cls}`}
    >
      {label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const configs: Record<string, { label: string; cls: string }> = {
    Critical: {
      label: "Ноцтой",
      cls: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900",
    },
    High: {
      label: "Өндөр",
      cls: "bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400 border border-orange-200 dark:border-orange-900",
    },
    Medium: {
      label: "Дундаж",
      cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-900",
    },
    Low: {
      label: "Бага",
      cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900",
    },
  };
  const { label, cls } = configs[priority] ?? {
    label: priority,
    cls: "bg-muted text-muted-foreground border border-border",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
