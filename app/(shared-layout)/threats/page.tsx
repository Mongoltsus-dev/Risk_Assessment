"use client";

import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Database,
  Filter,
  Link2,
  RotateCcw,
  Search,
  ShieldAlert,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface LinkedAssetType {
  type_name: string;
  risk_level: string;
}

interface LinkedAsset {
  id: number;
  asset_name: string;
  asset_code: string | null;
  asset_type: string | null;
  criticality: string | null;
  internet_exposed: boolean;
  status: string | null;
  risk_level: string;
  matched_asset_type: string;
}

interface Threat {
  id: number;
  threat_name: string;
  description: string | null;
  description_mn: string | null;
  threat_type: string | null;
  likelihood_level: number | null;
  potential_impact: string | null;
  nist_category: string | null;
  mitigation_notes: string | null;
  mitigation_notes_mn: string | null;
  risk_level: string;
  linked_assets: LinkedAsset[];
  linked_asset_types: LinkedAssetType[];
  registered_asset_count: number;
}

interface ThreatLibraryMeta {
  registered_asset_count: number;
  linked_asset_count: number;
  registered_asset_types: string[];
}

interface AssetThreatItem {
  id: number;
  threat_name: string;
  description: string | null;
  description_mn: string | null;
  threat_type: string | null;
  likelihood_level: number | null;
  potential_impact: string | null;
  nist_category: string | null;
  mitigation_notes: string | null;
  mitigation_notes_mn: string | null;
  risk_level: string;
  matched_asset_type: string;
}

interface AssetThreatGroup {
  asset: LinkedAsset;
  risk_level: string;
  threats: AssetThreatItem[];
}

const ALL = "Бүгд";

const RISK_COLORS: Record<string, string> = {
  Critical:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300",
  High: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-300",
  Medium:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-300",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/40 dark:text-emerald-300",
  Unknown:
    "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
};

const RISK_ACCENTS: Record<string, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-amber-500",
  Low: "bg-emerald-500",
  Unknown: "bg-slate-400",
};

const IMPACT_COLORS: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300",
  High: "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300",
  Medium:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300",
  Low: "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300",
};

const LIKELIHOOD_LABELS: Record<number, string> = {
  1: "Маш бага",
  2: "Бага",
  3: "Дунд",
  4: "Өндөр",
  5: "Маш өндөр",
};

const RISK_LABELS: Record<string, string> = {
  Critical: "Ноцтой",
  High: "Өндөр",
  Medium: "Дунд",
  Low: "Бага",
  Unknown: "Тодорхойгүй",
};

const ASSET_TYPE_LABELS: Record<string, string> = {
  Identity: "Нэвтрэлтийн систем",
  "Identity Provider": "Нэвтрэлтийн систем",
  Database: "Мэдээллийн сан",
  Application: "Аппликейшн",
  Service: "Үйлчилгээ",
  Server: "Сервер",
  "Web Server": "Вэб сервер",
  Network: "Сүлжээ",
  "SaaS Tenant": "SaaS орчин",
  Cloud: "Үүлэн орчин",
  Data: "Өгөгдөл",
  Hardware: "Техник хангамж",
  Software: "Програм хангамж",
};

const THREAT_TYPE_LABELS: Record<string, string> = {
  Adversarial: "Халдагчийн үйлдэл",
  Attack: "Халдлага",
  Human: "Хүний хүчин зүйл",
  Application: "Аппликейшн",
  Malware: "Хортой код",
  Availability: "Хүртээмж",
  Network: "Сүлжээ",
  "Third-Party": "Гуравдагч тал",
  Vulnerability: "Эмзэг байдал",
  Configuration: "Тохиргоо",
  Data: "Өгөгдөл",
  Cryptography: "Криптограф",
  "Access Control": "Хандалтын хяналт",
  Monitoring: "Хяналт, лог",
  Cloud: "Үүлэн орчин",
  Technical: "Техникийн",
};

const STATUS_LABELS: Record<string, string> = {
  Active: "Идэвхтэй",
  Inactive: "Идэвхгүй",
  Deprecated: "Ашиглалтаас гарсан",
  Planned: "Төлөвлөсөн",
};

const CRITICALITY_LABELS: Record<string, string> = {
  "Tier 0 (Life/Safety)": "Түвшин 0 (Амь нас/аюулгүй байдал)",
  "Tier 1 (Mission Critical)": "Түвшин 1 (Үйл ажиллагаанд нэн чухал)",
  "Tier 2 (Business Critical)": "Түвшин 2 (Бизнесийн чухал)",
  "Tier 3 (Operational)": "Түвшин 3 (Үйл ажиллагааны)",
};

const labelOrOriginal = (
  labels: Record<string, string>,
  value: string | null | undefined,
) => {
  if (!value) return "—";
  return labels[value] ?? value;
};

const riskLabel = (value: string | null | undefined) =>
  labelOrOriginal(RISK_LABELS, value || "Unknown");

const assetTypeLabel = (value: string | null | undefined) =>
  labelOrOriginal(ASSET_TYPE_LABELS, value);

const threatTypeLabel = (value: string | null | undefined) =>
  labelOrOriginal(THREAT_TYPE_LABELS, value);

const statusLabel = (value: string | null | undefined) =>
  labelOrOriginal(STATUS_LABELS, value);

const criticalityLabel = (value: string | null | undefined) =>
  labelOrOriginal(CRITICALITY_LABELS, value);

const exposureLabel = (internetExposed: boolean) =>
  internetExposed ? "Интернэтэд нээлттэй" : "Дотоод";

const getRiskColor = (riskLevel: string | null | undefined) =>
  RISK_COLORS[riskLevel || "Unknown"] ?? RISK_COLORS.Unknown;

const getRiskAccent = (riskLevel: string | null | undefined) =>
  RISK_ACCENTS[riskLevel || "Unknown"] ?? RISK_ACCENTS.Unknown;

const riskWeight = (riskLevel: string | null | undefined) => {
  switch (riskLevel) {
    case "Critical":
      return 4;
    case "High":
      return 3;
    case "Medium":
      return 2;
    case "Low":
      return 1;
    default:
      return 0;
  }
};

const criticalityWeight = (criticality: string | null | undefined) => {
  if (criticality?.includes("Tier 0")) return 4;
  if (criticality?.includes("Tier 1")) return 3;
  if (criticality?.includes("Tier 2")) return 2;
  return 1;
};

const getCriticalityColor = (criticality: string | null) => {
  if (criticality?.includes("Tier 0"))
    return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  if (criticality?.includes("Tier 1"))
    return "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300";
  if (criticality?.includes("Tier 2"))
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/50 dark:text-yellow-300";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300";
};

const getCriticalityIconShell = (criticality: string | null | undefined) => {
  if (criticality?.includes("Tier 0")) {
    return "border-red-200 bg-white text-red-600 dark:border-red-900/70 dark:bg-slate-950 dark:text-red-300";
  }
  if (criticality?.includes("Tier 1")) {
    return "border-orange-200 bg-white text-orange-600 dark:border-orange-900/70 dark:bg-slate-950 dark:text-orange-300";
  }
  if (criticality?.includes("Tier 2")) {
    return "border-yellow-200 bg-white text-yellow-700 dark:border-yellow-900/70 dark:bg-slate-950 dark:text-yellow-300";
  }
  return "border-emerald-200 bg-white text-emerald-600 dark:border-emerald-900/70 dark:bg-slate-950 dark:text-emerald-300";
};

const getRiskIconShell = (riskLevel: string | null | undefined) => {
  switch (riskLevel) {
    case "Critical":
      return "border-red-200 bg-white text-red-600 dark:border-red-900/70 dark:bg-slate-950 dark:text-red-300";
    case "High":
      return "border-orange-200 bg-white text-orange-600 dark:border-orange-900/70 dark:bg-slate-950 dark:text-orange-300";
    case "Medium":
      return "border-amber-200 bg-white text-amber-600 dark:border-amber-900/70 dark:bg-slate-950 dark:text-amber-300";
    case "Low":
      return "border-emerald-200 bg-white text-emerald-600 dark:border-emerald-900/70 dark:bg-slate-950 dark:text-emerald-300";
    default:
      return "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300";
  }
};

export default function ThreatLibraryPage() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [meta, setMeta] = useState<ThreatLibraryMeta>({
    registered_asset_count: 0,
    linked_asset_count: 0,
    registered_asset_types: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState(ALL);
  const [filterType, setFilterType] = useState(ALL);
  const [filterAsset, setFilterAsset] = useState(ALL);
  const [expandedAssets, setExpandedAssets] = useState<Record<number, boolean>>(
    {},
  );

  useEffect(() => {
    let mounted = true;

    fetch("/api/threats/library")
      .then((response) => {
        if (!response.ok) throw new Error("Failed to fetch threats");
        return response.json();
      })
      .then((data) => {
        if (!mounted) return;
        setThreats(data.threats || []);
        setMeta({
          registered_asset_count: data.registered_asset_count || 0,
          linked_asset_count: data.linked_asset_count || 0,
          registered_asset_types: data.registered_asset_types || [],
        });
        setError("");
      })
      .catch(() => {
        if (!mounted) return;
        setThreats([]);
        setError("Аюулын мэдээлэл ачаалах үед алдаа гарлаа.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const threatTypes = useMemo(() => {
    const types = new Set(
      threats.map((threat) => threat.threat_type).filter(Boolean),
    );
    return [ALL, ...Array.from(types).sort()] as string[];
  }, [threats]);

  const assetOptions = useMemo(() => {
    const assets = new Map<number, LinkedAsset>();
    for (const threat of threats) {
      for (const asset of threat.linked_assets) {
        assets.set(asset.id, asset);
      }
    }
    return Array.from(assets.values()).sort((a, b) =>
      a.asset_name.localeCompare(b.asset_name),
    );
  }, [threats]);

  const stats = useMemo(() => {
    const criticalThreats = threats.filter(
      (threat) =>
        threat.risk_level === "Critical" ||
        threat.potential_impact === "Critical",
    ).length;
    const exposedAssetIds = new Set<number>();

    for (const threat of threats) {
      for (const asset of threat.linked_assets) {
        if (asset.internet_exposed) exposedAssetIds.add(asset.id);
      }
    }

    return {
      totalThreats: threats.length,
      criticalThreats,
      exposedAssets: exposedAssetIds.size,
      registeredAssetTypes: meta.registered_asset_types.length,
    };
  }, [meta.registered_asset_types.length, threats]);

  const assetThreatGroups = useMemo(() => {
    const groups = new Map<number, AssetThreatGroup>();

    for (const threat of threats) {
      const q = search.trim().toLowerCase();

      for (const asset of threat.linked_assets) {
        const searchable = [
          threat.threat_name,
          threat.description_mn,
          threat.description,
          threat.threat_type,
          threat.nist_category,
          asset.asset_name,
          asset.asset_code,
          asset.asset_type,
          asset.matched_asset_type,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        const mappedRiskLevel = asset.risk_level || threat.risk_level;
        const matchesSearch = !q || searchable.includes(q);
        const matchesRisk =
          filterRisk === ALL ||
          mappedRiskLevel === filterRisk ||
          threat.risk_level === filterRisk;
        const matchesType =
          filterType === ALL || threat.threat_type === filterType;
        const matchesAsset =
          filterAsset === ALL || String(asset.id) === filterAsset;

        if (!matchesSearch || !matchesRisk || !matchesType || !matchesAsset) {
          continue;
        }

        const group =
          groups.get(asset.id) ??
          ({
            asset,
            risk_level: "Unknown",
            threats: [],
          } satisfies AssetThreatGroup);

        group.risk_level =
          riskWeight(mappedRiskLevel) > riskWeight(group.risk_level)
            ? mappedRiskLevel
            : group.risk_level;
        group.threats.push({
          id: threat.id,
          threat_name: threat.threat_name,
          description: threat.description,
          description_mn: threat.description_mn,
          threat_type: threat.threat_type,
          likelihood_level: threat.likelihood_level,
          potential_impact: threat.potential_impact,
          nist_category: threat.nist_category,
          mitigation_notes: threat.mitigation_notes,
          mitigation_notes_mn: threat.mitigation_notes_mn,
          risk_level: mappedRiskLevel,
          matched_asset_type: asset.matched_asset_type,
        });

        groups.set(asset.id, group);
      }
    }

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        threats: group.threats.sort((a, b) => {
          const riskDiff = riskWeight(b.risk_level) - riskWeight(a.risk_level);
          if (riskDiff !== 0) return riskDiff;
          const likelihoodDiff =
            Number(b.likelihood_level ?? 0) - Number(a.likelihood_level ?? 0);
          if (likelihoodDiff !== 0) return likelihoodDiff;
          return a.threat_name.localeCompare(b.threat_name);
        }),
      }))
      .sort((a, b) => {
        const riskDiff = riskWeight(b.risk_level) - riskWeight(a.risk_level);
        if (riskDiff !== 0) return riskDiff;
        const criticalityDiff =
          criticalityWeight(b.asset.criticality) -
          criticalityWeight(a.asset.criticality);
        if (criticalityDiff !== 0) return criticalityDiff;
        return a.asset.asset_name.localeCompare(b.asset.asset_name);
      });
  }, [filterAsset, filterRisk, filterType, search, threats]);

  const hasActiveFilters =
    search.trim() !== "" ||
    filterRisk !== ALL ||
    filterType !== ALL ||
    filterAsset !== ALL;

  const resetFilters = () => {
    setSearch("");
    setFilterRisk(ALL);
    setFilterType(ALL);
    setFilterAsset(ALL);
  };

  return (
    <div className="app-page p-4 sm:p-6 md:p-8 pb-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300">
              <Link2 className="size-3.5" />
              Бүртгэлтэй хөрөнгөд холбогдсон
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Хөрөнгүүдэд үүсч болзошгүй аюулууд
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {loading
                ? "Аюулуудыг ачааллаж байна..."
                : `${meta.registered_asset_count} бүртгэлтэй хөрөнгөөс ${meta.linked_asset_count} хөрөнгө аюултай холбогдсон байна.`}
            </p>
          </div>
          <Link
            href="/assets"
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <Database className="size-4" />
            Хөрөнгө харах
          </Link>
        </div>

        {!loading && (
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              {
                label: "Холбогдсон аюул",
                value: stats.totalThreats,
                icon: ShieldAlert,
                color: "text-blue-700 dark:text-blue-300",
                surface:
                  "border-blue-200 bg-blue-50 dark:border-blue-900/60 dark:bg-blue-950/30",
              },
              {
                label: "Ноцтой аюул",
                value: stats.criticalThreats,
                icon: AlertTriangle,
                color: "text-red-700 dark:text-red-300",
                surface:
                  "border-red-200 bg-red-50 dark:border-red-900/60 dark:bg-red-950/30",
              },
              {
                label: "Нээлттэй хөрөнгө",
                value: stats.exposedAssets,
                icon: Target,
                color: "text-orange-700 dark:text-orange-300",
                surface:
                  "border-orange-200 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30",
              },
              {
                label: "Хөрөнгийн төрөл",
                value: stats.registeredAssetTypes,
                icon: Database,
                color: "text-emerald-700 dark:text-emerald-300",
                surface:
                  "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30",
              },
            ].map(({ label, value, icon: Icon, color, surface }) => (
              <div key={label} className={`rounded-lg border p-4 ${surface}`}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">
                    {label}
                  </span>
                  <Icon className={`size-4 ${color}`} />
                </div>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mb-5 rounded-lg border border-border bg-card p-3 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Аюул, хөрөнгө, код, NIST хайх..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="app-form-field h-10 w-full rounded-md border pl-9 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:flex lg:shrink-0">
              <label className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={filterRisk}
                  onChange={(event) => setFilterRisk(event.target.value)}
                  className="app-form-field h-10 w-full rounded-md border pl-9 pr-8 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 lg:w-40"
                >
                  {[ALL, "Critical", "High", "Medium", "Low"].map((value) => (
                    <option key={value} value={value}>
                      {value === ALL ? "Бүх эрсдэл" : riskLabel(value)}
                    </option>
                  ))}
                </select>
              </label>
              <select
                value={filterType}
                onChange={(event) => setFilterType(event.target.value)}
                className="app-form-field h-10 w-full rounded-md border px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 lg:w-44"
              >
                {threatTypes.map((value) => (
                  <option key={value} value={value}>
                    {value === ALL ? "Бүх төрөл" : threatTypeLabel(value)}
                  </option>
                ))}
              </select>
              <select
                value={filterAsset}
                onChange={(event) => setFilterAsset(event.target.value)}
                className="app-form-field h-10 w-full rounded-md border px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 lg:w-56"
              >
                <option value={ALL}>Бүх хөрөнгө</option>
                {assetOptions.map((asset) => (
                  <option key={asset.id} value={String(asset.id)}>
                    {asset.asset_name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!hasActiveFilters}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40"
            >
              <RotateCcw className="size-4" />
              Цэвэрлэх
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-36 animate-pulse rounded-lg border border-border bg-muted/40"
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-border bg-card px-4 text-center text-muted-foreground">
            <AlertTriangle className="mb-3 size-10 text-orange-500" />
            <p className="text-sm">{error}</p>
          </div>
        ) : threats.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-border bg-card px-4 text-center">
            <Database className="mb-3 size-10 text-muted-foreground" />
            <p className="text-sm font-medium">Холбогдсон аюул олдсонгүй.</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Бүртгэлтэй хөрөнгө нэмэх эсвэл хөрөнгийн төрлийг аюулын зураглалд
              тааруулснаар энэ хэсэг автоматаар шинэчлэгдэнэ.
            </p>
            <Link
              href="/assets"
              className="mt-4 inline-flex h-9 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <Database className="size-4" />
              Хөрөнгө нэмэх
            </Link>
          </div>
        ) : assetThreatGroups.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-border bg-card px-4 text-center text-muted-foreground">
            <AlertTriangle className="mb-3 size-10 opacity-50" />
            <p className="text-sm">
              Шүүлтүүрт тохирох хөрөнгө болон аюулын холбоос олдсонгүй.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {assetThreatGroups.map((group) => {
              const asset = group.asset;
              const expanded = Boolean(expandedAssets[asset.id]);
              const visibleThreats = expanded
                ? group.threats
                : group.threats.slice(0, 2);
              const hiddenThreatCount = group.threats.length - 2;
              return (
                <article
                  key={asset.id}
                  className="overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className={`h-1 ${getRiskAccent(group.risk_level)}`} />
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <span
                          className={`flex size-11 shrink-0 items-center justify-center rounded-lg border shadow-sm ${getCriticalityIconShell(asset.criticality)}`}
                        >
                          <Database className="size-5" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="min-w-0 text-base font-bold leading-snug sm:text-xl">
                              {asset.asset_name}
                            </h2>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getCriticalityColor(asset.criticality)}`}
                            >
                              {criticalityLabel(asset.criticality)}
                            </span>
                            <span
                              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getRiskColor(group.risk_level)}`}
                            >
                              Дээд эрсдэл: {riskLabel(group.risk_level)}
                            </span>
                            {asset.internet_exposed && (
                              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                                Интернэтэд нээлттэй
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1.5 text-xs text-muted-foreground">
                            {asset.asset_code && (
                              <span>{asset.asset_code}</span>
                            )}
                            {asset.asset_type && (
                              <span>{assetTypeLabel(asset.asset_type)}</span>
                            )}
                            {asset.status && (
                              <span>{statusLabel(asset.status)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link
                          href="/assets"
                          className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          Хөрөнгө харах
                        </Link>
                        <Link
                          href="/risk-register"
                          className="inline-flex h-9 items-center justify-center rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                        >
                          Эрсдэл үнэлэх
                        </Link>
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      <section className="rounded-lg border border-border bg-white p-3 shadow-sm dark:bg-slate-950">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                            <AssetFact
                              label="Код"
                              value={asset.asset_code || "—"}
                            />
                            <AssetFact
                              label="Төрөл"
                              value={assetTypeLabel(asset.asset_type)}
                            />
                            <AssetFact
                              label="Төлөв"
                              value={statusLabel(asset.status)}
                            />
                            <AssetFact
                              label="Хандалт"
                              value={exposureLabel(asset.internet_exposed)}
                            />
                          </div>
                        </div>
                      </section>

                      <section className="min-w-0">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Link2 className="size-4 text-blue-600 dark:text-blue-300" />
                            <h3 className="text-sm font-bold">
                              Үүсч болзошгүй аюулууд
                            </h3>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Хөрөнгийн төрөл болон аюулын зураглал дээр үндэслэв
                          </span>
                        </div>

                        <div className="space-y-2">
                          {visibleThreats.map((threat) => {
                            const description =
                              threat.description_mn || threat.description;
                            const mitigation =
                              threat.mitigation_notes_mn ||
                              threat.mitigation_notes;

                            return (
                              <div
                                key={`${asset.id}-${threat.id}-${threat.matched_asset_type}`}
                                className="rounded-md border border-border bg-background p-3 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                              >
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                                  <span
                                    className={`flex size-8 shrink-0 items-center justify-center rounded-md border shadow-sm ${getRiskIconShell(threat.risk_level)}`}
                                  >
                                    <ShieldAlert className="size-4" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="min-w-0 text-sm font-semibold">
                                        {threat.threat_name}
                                      </h4>
                                      <span
                                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getRiskColor(threat.risk_level)}`}
                                      >
                                        {riskLabel(threat.risk_level)}
                                      </span>
                                      {threat.potential_impact && (
                                        <span
                                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${IMPACT_COLORS[threat.potential_impact] ?? IMPACT_COLORS.Medium}`}
                                        >
                                          Нөлөө:{" "}
                                          {riskLabel(threat.potential_impact)}
                                        </span>
                                      )}
                                    </div>

                                    {description && (
                                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                        {description}
                                      </p>
                                    )}

                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                      {threat.threat_type && (
                                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                          {threatTypeLabel(threat.threat_type)}
                                        </span>
                                      )}
                                      {threat.nist_category && (
                                        <span className="rounded-md bg-blue-100 px-2 py-1 text-[11px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                                          {threat.nist_category}
                                        </span>
                                      )}
                                      {threat.likelihood_level && (
                                        <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                                          Магадлал:{" "}
                                          {LIKELIHOOD_LABELS[
                                            threat.likelihood_level
                                          ] ?? threat.likelihood_level}
                                        </span>
                                      )}
                                      <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                                        Зураглал:{" "}
                                        {assetTypeLabel(
                                          threat.matched_asset_type,
                                        )}
                                      </span>
                                    </div>

                                    {mitigation && (
                                      <div className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs leading-5 text-muted-foreground lg:max-w-3xl">
                                        {mitigation}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {hiddenThreatCount > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedAssets((current) => ({
                                  ...current,
                                  [asset.id]: !expanded,
                                }))
                              }
                              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                            >
                              {expanded ? (
                                <>
                                  <ChevronUp className="size-4" />
                                  Хураах
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="size-4" />
                                  Дахиад {hiddenThreatCount} аюул харах
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </section>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function AssetFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border/70 bg-white px-3 py-2 dark:bg-slate-950">
      <span className="shrink-0 text-xs font-semibold text-muted-foreground">
        {label}
      </span>
      <span className="truncate text-sm font-bold">{value}</span>
    </div>
  );
}
