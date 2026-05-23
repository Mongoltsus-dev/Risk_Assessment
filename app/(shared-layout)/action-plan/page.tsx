"use client";

import { useAuth } from "@/app/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Activity,
  Boxes,
  Building2,
  CheckCircle2,
  CircleDashed,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type ComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_assessed";

type AssetScope = {
  total_assets: number;
  critical_assets: number;
  sensitive_assets: number;
  internet_exposed_assets: number;
  public_without_mfa: number;
  sensitive_without_encryption: number;
  logging_gap_assets: number;
  backup_gap_assets: number;
  mfa_coverage: number;
  encryption_coverage: number;
  logging_coverage: number;
  backup_coverage: number;
};

type OrganizationSummary = {
  organization_name: string | null;
  industry: string | null;
  size_category: string | null;
  risk_appetite: string | null;
  uses_sensitive_data: boolean;
} | null;

type RiskSummary = {
  risk_register_id: number;
  risk_code: string | null;
  risk_title: string;
  risk_level: string | null;
  risk_score: number | null;
  asset_name: string | null;
};

type ComplianceRow = {
  subcategory_id: string;
  title: string;
  outcome: string;
  nist_function: string;
  function_code: string;
  category_code: string;
  category_name: string;
  status: ComplianceStatus;
  status_reason: string;
  current_tier: number | null;
  target_tier: number | null;
  gap: number;
  source: string;
  evidence: string[];
  owner: string | null;
  target_date: string | null;
  risk_score: number | null;
  risk_level: string | null;
  implemented_controls: number;
  recommended_controls: number;
  risks: RiskSummary[];
  affected_assets: string[];
  recommended_action: string;
};

type FunctionSummary = {
  nist_function: string;
  total: number;
  assessed: number;
  compliant: number;
  partial: number;
  non_compliant: number;
  not_assessed: number;
  compliance_rate: number;
};

type ComplianceResponse = {
  organization: OrganizationSummary;
  asset_scope: AssetScope;
  summary: {
    total_subcategories: number;
    assessed: number;
    compliant: number;
    partial: number;
    non_compliant: number;
    not_assessed: number;
    compliance_rate: number;
    gap_count: number;
  };
  by_function: FunctionSummary[];
  rows: ComplianceRow[];
};

type GapFilter = "all" | "gap" | "no_gap" | "not_assessed";

const FUNCTION_ORDER = [
  "Govern",
  "Identify",
  "Protect",
  "Detect",
  "Respond",
  "Recover",
];

const FUNCTION_MN: Record<string, string> = {
  Govern: "Засаглал",
  Identify: "Таних",
  Protect: "Хамгаалах",
  Detect: "Илрүүлэх",
  Respond: "Хариу үйлдэл",
  Recover: "Сэргээх",
};

const GAP_FILTER_LABEL: Record<GapFilter, string> = {
  all: "Бүгд",
  gap: "Gap: Yes",
  no_gap: "Gap: No",
  not_assessed: "Үнэлээгүй",
};

const STATUS_LABEL: Record<ComplianceStatus, string> = {
  compliant: "Aligned",
  partial: "Partial",
  non_compliant: "Gap",
  not_assessed: "Not assessed",
};

const STATUS_CLASS: Record<ComplianceStatus, string> = {
  compliant:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
  partial:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300",
  non_compliant:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
  not_assessed:
    "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
};

function hasGap(row: ComplianceRow) {
  return row.gap > 0 || row.status === "non_compliant";
}

function alignmentLabel(tier: number | null | undefined) {
  switch (tier) {
    case 1:
      return "Not Aligned";
    case 2:
      return "Partial";
    case 3:
      return "Aligned";
    case 4:
      return "Fully Aligned";
    default:
      return "Not Assessed";
  }
}

function tierBadgeClass(tier: number | null | undefined) {
  switch (tier) {
    case 4:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case 3:
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case 2:
      return "border-amber-200 bg-amber-50 text-amber-700";
    case 1:
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}

function avg(values: Array<number | null | undefined>) {
  const clean = values.filter(
    (value): value is number => typeof value === "number",
  );
  if (clean.length === 0) return null;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function formatTier(value: number | null) {
  if (value === null) return "—";
  return value.toFixed(1).replace(/\.0$/, "");
}

function functionRank(value: string) {
  const index = FUNCTION_ORDER.indexOf(value);
  return index === -1 ? FUNCTION_ORDER.length : index;
}

function sortRows(a: ComplianceRow, b: ComplianceRow) {
  const gapDelta = Number(hasGap(b)) - Number(hasGap(a));
  if (gapDelta !== 0) return gapDelta;
  const functionDelta =
    functionRank(a.nist_function) - functionRank(b.nist_function);
  if (functionDelta !== 0) return functionDelta;
  return a.subcategory_id.localeCompare(b.subcategory_id);
}

function assetScopeText(scope: AssetScope) {
  return `${scope.total_assets} хөрөнгө · ${scope.critical_assets} critical · ${scope.sensitive_assets} sensitive · ${scope.internet_exposed_assets} public`;
}

export default function GapAnalysisActionPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ComplianceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [gapFilter, setGapFilter] = useState<GapFilter>("all");
  const [functionFilter, setFunctionFilter] = useState("all");

  useEffect(() => {
    if (!user) router.push("/auth/login");
  }, [user, router]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/nist-csf-compliance");
      if (response.ok) {
        setData(await response.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchData();
  }, [fetchData, user]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return (data?.rows ?? [])
      .filter((row) => {
        const rowHasGap = hasGap(row);

        if (functionFilter !== "all" && row.nist_function !== functionFilter) {
          return false;
        }

        if (gapFilter === "gap" && !rowHasGap) return false;
        if (gapFilter === "no_gap" && rowHasGap) return false;
        if (gapFilter === "not_assessed" && row.status !== "not_assessed") {
          return false;
        }

        if (!query) return true;

        return [
          row.subcategory_id,
          row.title,
          row.outcome,
          row.nist_function,
          row.category_code,
          row.category_name,
          row.owner,
          row.status_reason,
          row.recommended_action,
          alignmentLabel(row.current_tier),
          alignmentLabel(row.target_tier),
          ...row.affected_assets,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort(sortRows);
  }, [data, functionFilter, gapFilter, search]);

  const pageStats = useMemo(() => {
    const rows = data?.rows ?? [];
    const currentAverage = avg(rows.map((row) => row.current_tier));
    const targetAverage = avg(rows.map((row) => row.target_tier));
    const gapRows = rows.filter(hasGap).length;
    const noGapRows = rows.filter(
      (row) => !hasGap(row) && row.status !== "not_assessed",
    ).length;

    return {
      currentAverage,
      targetAverage,
      gapRows,
      noGapRows,
      notAssessed: rows.filter((row) => row.status === "not_assessed").length,
      progress:
        currentAverage !== null && targetAverage !== null && targetAverage > 0
          ? Math.min(100, Math.round((currentAverage / targetAverage) * 100))
          : 0,
    };
  }, [data]);

  if (!user) return null;

  return (
    <div className="space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Зөрүүний шинжилгээ
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            NIST CSF subcategory бүрээр байгууллагын одоогийн аюулгүй байдлын
            түвшинг зорилтот түвшинтэй харьцуулж, gap байгаа эсэхийг харуулна.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Шинэчлэх
          </Button>
          <Link href="/csf-profile">
            <Button variant="outline" className="gap-2">
              <Target className="h-4 w-4" />
              CSF profile
            </Button>
          </Link>
          <Link href="/assets">
            <Button variant="outline" className="gap-2">
              <Boxes className="h-4 w-4" />
              Хөрөнгүүд
            </Button>
          </Link>
        </div>
      </div>

      {data && (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="rounded-lg border bg-background p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase text-blue-700">
                  Current vs target
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {formatTier(pageStats.currentAverage)} /{" "}
                  {formatTier(pageStats.targetAverage)} tier
                </h2>
              </div>
              <Badge className="border border-blue-200 bg-blue-50 text-blue-700">
                {pageStats.progress}% зорилтод хүрсэн
              </Badge>
            </div>

            <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${pageStats.progress}%` }}
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              <SummaryMetric
                icon={ShieldAlert}
                label="Gap: Yes"
                value={pageStats.gapRows}
                tone="rose"
              />
              <SummaryMetric
                icon={CheckCircle2}
                label="Gap: No"
                value={pageStats.noGapRows}
                tone="emerald"
              />
              <SummaryMetric
                icon={CircleDashed}
                label="Үнэлээгүй"
                value={pageStats.notAssessed}
                tone="slate"
              />
              <SummaryMetric
                icon={Activity}
                label="CSF aligned"
                value={`${data.summary.compliance_rate}%`}
                tone="blue"
              />
            </div>
          </div>

          <div className="rounded-lg border bg-background p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {data.organization?.organization_name ??
                    "Байгууллагын profile оруулаагүй"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data.organization
                    ? `${data.organization.industry ?? "Салбаргүй"} · ${
                        data.organization.size_category ?? "Хэмжээгүй"
                      }`
                    : "Profile хуудас дээр байгууллагын context бөглөнө."}
                </p>
                <p className="mt-2 text-xs font-medium text-muted-foreground">
                  {assetScopeText(data.asset_scope)}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <CoverageBar label="MFA" value={data.asset_scope.mfa_coverage} />
              <CoverageBar
                label="Encryption"
                value={data.asset_scope.encryption_coverage}
              />
              <CoverageBar
                label="Logging"
                value={data.asset_scope.logging_coverage}
              />
              <CoverageBar
                label="Backup"
                value={data.asset_scope.backup_coverage}
              />
            </div>
          </div>
        </div>
      )}

      {data && (
        <div className="grid gap-2 md:grid-cols-6">
          {FUNCTION_ORDER.map((fn) => {
            const stat = data.by_function.find(
              (item) => item.nist_function === fn,
            );
            const active = functionFilter === fn;

            return (
              <button
                key={fn}
                onClick={() =>
                  setFunctionFilter((value) => (value === fn ? "all" : fn))
                }
                className={`rounded-lg border bg-background p-3 text-left transition-colors ${
                  active
                    ? "border-blue-400 ring-2 ring-blue-500/20"
                    : "hover:border-blue-200"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold">{fn}</p>
                  <span className="text-sm font-black">
                    {stat?.compliance_rate ?? 0}%
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {FUNCTION_MN[fn]} · {stat?.non_compliant ?? 0} gap
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${stat?.compliance_rate ?? 0}%` }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="NIST код, current/target, owner, asset эсвэл action-р хайх..."
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          {(["all", "gap", "no_gap", "not_assessed"] as const).map((filter) => (
            <Button
              key={filter}
              size="sm"
              variant={gapFilter === filter ? "default" : "outline"}
              onClick={() => setGapFilter(filter)}
            >
              {GAP_FILTER_LABEL[filter]}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border bg-background p-10 text-center text-muted-foreground">
          NIST CSF gap analysis ачааллаж байна...
        </div>
      ) : !data ? (
        <div className="rounded-lg border bg-background p-10 text-center text-muted-foreground">
          Өгөгдөл уншиж чадсангүй.
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-lg border bg-background p-10 text-center text-muted-foreground">
          Шүүлтүүрт тохирох subcategory олдсонгүй.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border bg-background shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h2 className="font-bold">NIST CSF subcategory gap table</h2>
              <p className="text-xs text-muted-foreground">
                {filteredRows.length} subcategory харагдаж байна
              </p>
            </div>
            <Badge className="border border-slate-200 bg-slate-50 text-slate-700">
              Current · Target · Gap
            </Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-245 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-3">NIST CSF subcategory</th>
                  <th className="px-4 py-3">Current</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3 text-center">Gap</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Recommended action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRows.map((row) => {
                  const rowHasGap = hasGap(row);
                  return (
                    <tr
                      key={row.subcategory_id}
                      className="align-top transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
                    >
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className="border border-blue-200 bg-blue-50 font-mono text-blue-700">
                            {row.subcategory_id}
                          </Badge>
                          <Badge
                            className={`border ${STATUS_CLASS[row.status]}`}
                          >
                            {STATUS_LABEL[row.status]}
                          </Badge>
                        </div>
                        <p className="mt-2 max-w-sm text-xs font-semibold leading-5">
                          {row.outcome}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {row.nist_function} · {row.category_code}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <TierPill tier={row.current_tier} />
                      </td>
                      <td className="px-4 py-3">
                        <TierPill tier={row.target_tier} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          className={`border ${
                            rowHasGap
                              ? "border-rose-200 bg-rose-50 text-rose-700"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {rowHasGap ? "Yes" : "No"}
                        </Badge>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {row.gap > 0 ? `+${row.gap} tier` : "0 tier"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-xs text-xs leading-5">
                          {row.status_reason}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Эх үүсвэр: {row.source}
                        </p>
                        {row.owner && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            Owner: {row.owner}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-md text-xs leading-5 text-muted-foreground">
                          {row.recommended_action}
                        </p>
                        {row.affected_assets.length > 0 && (
                          <p className="mt-2 max-w-md truncate text-[11px] text-muted-foreground">
                            Хөрөнгө: {row.affected_assets.join(", ")}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TierPill({ tier }: { tier: number | null }) {
  return (
    <span
      className={`inline-flex min-w-30 items-center justify-center rounded-md border px-2.5 py-1 text-xs font-bold ${tierBadgeClass(
        tier,
      )}`}
    >
      {alignmentLabel(tier)}
    </span>
  );
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShieldAlert;
  label: string;
  value: number | string;
  tone: "rose" | "emerald" | "slate" | "blue";
}) {
  const toneClass = {
    rose: "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300",
    emerald:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300",
    slate:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
    blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300",
  }[tone];

  return (
    <div className={`rounded-lg border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <Icon className="h-4 w-4" />
        <span className="text-2xl font-black">{value}</span>
      </div>
      <p className="mt-2 text-xs font-bold uppercase">{label}</p>
    </div>
  );
}

function CoverageBar({ label, value }: { label: string; value: number }) {
  const safeValue = Math.min(100, Math.max(0, Number(value) || 0));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-muted-foreground">{label}</span>
        <span className="font-bold">{safeValue}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-blue-600"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}
