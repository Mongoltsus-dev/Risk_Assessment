"use client";

import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Layers3,
  RefreshCw,
  Search,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ControlRec = {
  id: number;
  control_name: string;
  nist_function: string | null;
  priority: string | null;
  implementation_status: "existing" | "partial" | "not_started";
  assigned_to: string | null;
  evidence_file_path: string | null;
  evidence_original_name: string | null;
  evidence_uploaded_at: string | null;
  approval_status: "pending" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  approval_notes: string | null;
  risk_register_id: number;
  risk_title: string | null;
  risk_code: string | null;
  inherent_risk_score: number | null;
  inherent_risk_level: string | null;
  asset_name: string | null;
  created_at: string;
  cis_control: string | null;
  catalog_control_type: string | null;
  catalog_category_code: string | null;
};

// One row in the grouped table
type ControlGroup = {
  ctlId: string; // "CTL-0003"
  controlName: string; // full name
  recs: ControlRec[]; // all risk-linked records for this CTL
  // derived
  aggStatus: "existing" | "partial" | "not_started";
  evidence: ControlRec | null; // first rec that has evidence
  approval: "pending" | "approved" | "rejected";
  cis_control: string | null;
  nist_function: string | null;
  catalog_control_type: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  existing: "Байгаа",
  partial: "Хэсэгчлэн",
  not_started: "Байхгүй",
};

const STATUS_CLS: Record<string, string> = {
  existing:
    "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800",
  partial:
    "bg-amber-100   text-amber-700   border-amber-200   dark:bg-amber-950/50   dark:text-amber-300   dark:border-amber-800",
  not_started:
    "bg-red-100     text-red-700     border-red-200     dark:bg-red-950/50     dark:text-red-300     dark:border-red-800",
};

const APPROVAL_CLS: Record<string, string> = {
  approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  rejected:
    "bg-red-100     text-red-700     dark:bg-red-950/50     dark:text-red-300",
  pending:
    "bg-amber-100   text-amber-700   dark:bg-amber-950/50   dark:text-amber-300",
};

const LEVEL_CLS: Record<string, string> = {
  Critical: "bg-red-500 text-white",
  High: "bg-orange-500 text-white",
  Medium: "bg-amber-500 text-white",
  Low: "bg-emerald-500 text-white",
};

const NIST_FN_MN: Record<string, string> = {
  Govern: "Засаглал",
  Identify: "Таних",
  Protect: "Хамгаалах",
  Detect: "Илрүүлэх",
  Respond: "Хариу үйлдэл",
  Recover: "Сэргээх",
};

function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cisKey(s: string | null | undefined): string {
  if (!s) return "";
  const m = s.match(/^(CIS \d+)/);
  return m ? m[1] : s;
}

function ctlIdFrom(controlName: string): string {
  return controlName.match(/^(CTL-\d+)/)?.[1] ?? controlName;
}

function aggStatus(recs: ControlRec[]): "existing" | "partial" | "not_started" {
  if (recs.length === 0) return "not_started";
  if (recs.every((r) => r.implementation_status === "existing"))
    return "existing";
  if (recs.some((r) => r.implementation_status === "not_started"))
    return "not_started";
  return "partial";
}

function aggApproval(recs: ControlRec[]): "pending" | "approved" | "rejected" {
  if (recs.length === 0) return "pending";
  if (recs.every((r) => r.approval_status === "approved")) return "approved";
  if (recs.some((r) => r.approval_status === "rejected")) return "rejected";
  return "pending";
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ControlsPage() {
  const { user } = useAuth();

  const [recs, setRecs] = useState<ControlRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterApproval, setFilterApproval] = useState("all");
  const [filterCIS, setFilterCIS] = useState("all");
  const [expandedCtl, setExpandedCtl] = useState<string | null>(null);

  const [uploading, setUploading] = useState<string | null>(null); // ctlId
  const [approving, setApproving] = useState<string | null>(null); // ctlId
  const [approvalNotes, setApprovalNotes] = useState<Record<string, string>>(
    {},
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeUploadCtl = useRef<string | null>(null);

  // ── Data ───────────────────────────────────────────────────────────────────

  const fetchRecs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/controls?all=true");
      if (res.ok) setRecs((await res.json()).recommendations ?? []);
    } catch {
      /* */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecs();
  }, [fetchRecs]);

  // ── Group by CTL-ID ────────────────────────────────────────────────────────

  const groups = useMemo<ControlGroup[]>(() => {
    const map = new Map<string, ControlGroup>();
    for (const r of recs) {
      const ctlId = ctlIdFrom(r.control_name);
      if (!map.has(ctlId)) {
        map.set(ctlId, {
          ctlId,
          controlName: r.control_name,
          recs: [],
          aggStatus: "not_started",
          evidence: null,
          approval: "pending",
          cis_control: r.cis_control,
          nist_function: r.nist_function,
          catalog_control_type: r.catalog_control_type,
        });
      }
      map.get(ctlId)!.recs.push(r);
    }
    // compute derived fields
    for (const g of map.values()) {
      g.aggStatus = aggStatus(g.recs);
      g.approval = aggApproval(g.recs);
      g.evidence = g.recs.find((r) => r.evidence_file_path) ?? null;
    }
    return [...map.values()].sort((a, b) => a.ctlId.localeCompare(b.ctlId));
  }, [recs]);

  // ── Filters & stats ────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return groups.filter((g) => {
      if (filterStatus !== "all" && g.aggStatus !== filterStatus) return false;
      if (filterApproval !== "all" && g.approval !== filterApproval)
        return false;
      if (filterCIS !== "all" && cisKey(g.cis_control) !== filterCIS)
        return false;
      if (q) {
        const hay = [
          g.ctlId,
          g.controlName,
          g.cis_control ?? "",
          ...g.recs.map((r) => `${r.risk_title ?? ""} ${r.asset_name ?? ""}`),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [groups, search, filterStatus, filterApproval, filterCIS]);

  const stats = useMemo(
    () => ({
      total: groups.length,
      existing: groups.filter((g) => g.aggStatus === "existing").length,
      partial: groups.filter((g) => g.aggStatus === "partial").length,
      notStarted: groups.filter((g) => g.aggStatus === "not_started").length,
      hasEvidence: groups.filter((g) => g.evidence !== null).length,
      approved: groups.filter((g) => g.approval === "approved").length,
      pending: groups.filter((g) => g.approval === "pending").length,
      rejected: groups.filter((g) => g.approval === "rejected").length,
      highRiskLinks: groups.reduce(
        (sum, g) =>
          sum +
          g.recs.filter((r) =>
            ["Critical", "High"].includes(r.inherent_risk_level ?? ""),
          ).length,
        0,
      ),
    }),
    [groups],
  );

  const cisCategories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const g of groups) {
      if (g.cis_control) {
        const key = cisKey(g.cis_control);
        if (key && !seen.has(key)) seen.set(key, g.cis_control);
      }
    }
    return [...seen.entries()].sort(([a], [b]) => {
      return parseInt(a.replace("CIS ", "")) - parseInt(b.replace("CIS ", ""));
    });
  }, [groups]);

  // ── Upload (per CTL group) ─────────────────────────────────────────────────

  function triggerUpload(ctlId: string) {
    activeUploadCtl.current = ctlId;
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const ctlId = activeUploadCtl.current;
    if (!file || !ctlId) return;
    e.target.value = "";
    const group = groups.find((g) => g.ctlId === ctlId);
    if (!group) return;
    setUploading(ctlId);
    try {
      // Upload using the first rec's id; backend saves the file
      const firstId = group.recs[0].id;
      const fd = new FormData();
      fd.append("file", file);
      fd.append("id", String(firstId));
      const res = await fetch("/api/controls/evidence", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) return;
      const { path: filePath, original_name } = await res.json();
      // Propagate the evidence path to ALL recs in this group via PATCH
      await Promise.all(
        group.recs.slice(1).map((r) =>
          fetch("/api/controls", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: r.id,
              evidence_file_path: filePath,
              evidence_original_name: original_name,
            }),
          }),
        ),
      );
      setRecs((prev) =>
        prev.map((r) =>
          group.recs.some((gr) => gr.id === r.id)
            ? {
                ...r,
                evidence_file_path: filePath,
                evidence_original_name: original_name,
                evidence_uploaded_at: new Date().toISOString(),
              }
            : r,
        ),
      );
    } finally {
      setUploading(null);
    }
  }

  async function removeEvidence(ctlId: string) {
    const group = groups.find((g) => g.ctlId === ctlId);
    if (!group) return;
    await Promise.all(
      group.recs
        .filter((r) => r.evidence_file_path)
        .map((r) =>
          fetch(`/api/controls/evidence?id=${r.id}`, { method: "DELETE" }),
        ),
    );
    setRecs((prev) =>
      prev.map((r) =>
        group.recs.some((gr) => gr.id === r.id)
          ? {
              ...r,
              evidence_file_path: null,
              evidence_original_name: null,
              evidence_uploaded_at: null,
            }
          : r,
      ),
    );
  }

  // ── Status toggle (per CTL group — applies to all risks) ──────────────────

  async function toggleStatus(
    ctlId: string,
    status: ControlRec["implementation_status"],
  ) {
    const group = groups.find((g) => g.ctlId === ctlId);
    if (!group) return;
    setRecs((prev) =>
      prev.map((r) =>
        group.recs.some((gr) => gr.id === r.id)
          ? { ...r, implementation_status: status }
          : r,
      ),
    );
    await Promise.all(
      group.recs.map((r) =>
        fetch("/api/controls", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: r.id, implementation_status: status }),
        }),
      ),
    );
  }

  // ── Approval (per CTL group) ───────────────────────────────────────────────

  async function handleApproval(
    ctlId: string,
    status: "approved" | "rejected" | "pending",
  ) {
    const group = groups.find((g) => g.ctlId === ctlId);
    if (!group) return;
    setApproving(ctlId);
    try {
      const approvedBy =
        status !== "pending" ? (user?.email ?? user?.name ?? "Manager") : null;
      const notes = approvalNotes[ctlId] ?? null;
      await Promise.all(
        group.recs.map((r) =>
          fetch("/api/controls", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: r.id,
              approval_status: status,
              approved_by: approvedBy,
              approval_notes: notes,
            }),
          }),
        ),
      );
      setRecs((prev) =>
        prev.map((r) =>
          group.recs.some((gr) => gr.id === r.id)
            ? {
                ...r,
                approval_status: status,
                approved_by: approvedBy,
                approval_notes: notes,
                approved_at:
                  status !== "pending" ? new Date().toISOString() : null,
              }
            : r,
        ),
      );
      setApprovalNotes((prev) => {
        const n = { ...prev };
        delete n[ctlId];
        return n;
      });
    } finally {
      setApproving(null);
    }
  }

  // ── Hooks done → early return ──────────────────────────────────────────────

  if (!user) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  const evidencePct = pct(stats.hasEvidence, stats.total);
  const approvedPct = pct(stats.approved, stats.total);
  const implementationPct = pct(stats.existing, stats.total);
  const visibleLinks = filtered.reduce(
    (sum, group) => sum + group.recs.length,
    0,
  );

  return (
    <div className="flex min-h-full flex-col bg-slate-50/70 px-6 py-6 text-foreground dark:bg-slate-950/20">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
            <Shield className="h-3.5 w-3.5 text-blue-600" />
            Control assurance workspace
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
            Хяналтын баримт
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Эрсдэл бүртэй холбогдсон хяналтын хэрэгжилт, нотлох баримт,
            удирдлагын баталгаажуулалтыг нэг ажлын самбарт хянах хэсэг.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden rounded-lg border border-border bg-white px-3 py-2 text-right text-xs shadow-sm dark:bg-slate-950 md:block">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  {approvedPct}% баталгаажсан
                </p>
                <p className="text-muted-foreground">
                  {stats.approved}/{stats.total || 0} хяналт
                </p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecs}
            className="h-9 gap-2 bg-white shadow-sm dark:bg-slate-950"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Шинэчлэх
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Нийт хяналт",
            value: stats.total,
            meta: `${visibleLinks} холбоос харагдаж байна`,
            icon: Layers3,
            accent:
              "text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-950/40 dark:border-blue-900",
            bar: "bg-blue-600",
            pct: 100,
          },
          {
            label: "Хэрэгжилт",
            value: stats.existing,
            meta: `${implementationPct}% бүрэн хэрэгжсэн`,
            icon: CheckCircle2,
            accent:
              "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900",
            bar: "bg-emerald-600",
            pct: implementationPct,
          },
          {
            label: "Баримт байгаа",
            value: stats.hasEvidence,
            meta: `${evidencePct}% PDF нотолгоотой`,
            icon: FileText,
            accent:
              "text-indigo-600 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/40 dark:border-indigo-900",
            bar: "bg-indigo-600",
            pct: evidencePct,
          },
          {
            label: "Хүлээгдэж буй",
            value: stats.pending,
            icon: Clock,
            meta:
              stats.rejected > 0
                ? `${stats.rejected} татгалзсан`
                : `${approvedPct}% баталгаажсан`,
            accent:
              "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900",
            bar: "bg-amber-500",
            pct: pct(stats.pending, stats.total),
          },
        ].map(({ label, value, meta, icon: Icon, accent, bar, pct }) => (
          <div
            key={label}
            className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-slate-950"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
                  {value}
                </p>
              </div>
              <div className={`rounded-md border p-2 ${accent}`}>
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{meta}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 rounded-lg border border-border bg-white p-3 shadow-sm dark:bg-slate-950">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-64 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Хяналт, эрсдэл, хөрөнгө хайх..."
              className="h-9 border-slate-200 bg-slate-50 pl-9 text-sm shadow-none dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
          <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-medium text-muted-foreground dark:border-slate-800 dark:bg-slate-900">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Шүүлтүүр
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Бүх төлөв</option>
            <option value="existing">Байгаа</option>
            <option value="partial">Хэсэгчлэн</option>
            <option value="not_started">Байхгүй</option>
          </select>
          <select
            value={filterApproval}
            onChange={(e) => setFilterApproval(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Бүх баталгаа</option>
            <option value="pending">Хүлээгдэж буй</option>
            <option value="approved">Батлагдсан</option>
            <option value="rejected">Татгалзсан</option>
          </select>
          <select
            value={filterCIS}
            onChange={(e) => setFilterCIS(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">Бүх CIS хяналт</option>
            {cisCategories.map(([key, full]) => (
              <option key={key} value={key}>
                {full}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-4 grid gap-3 text-xs md:grid-cols-4">
        <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
          <AlertTriangle className="h-4 w-4" />
          <span className="font-semibold">{stats.highRiskLinks}</span>
          <span>өндөр эрсдэлийн холбоос</span>
        </div>
        <div className="rounded-lg border border-border bg-white px-3 py-2 text-muted-foreground dark:bg-slate-950">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {stats.partial}
          </span>{" "}
          хэсэгчлэн хэрэгжсэн
        </div>
        <div className="rounded-lg border border-border bg-white px-3 py-2 text-muted-foreground dark:bg-slate-950">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {stats.notStarted}
          </span>{" "}
          эхлээгүй хяналт
        </div>
        <div className="rounded-lg border border-border bg-white px-3 py-2 text-muted-foreground dark:bg-slate-950">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {stats.rejected}
          </span>{" "}
          татгалзсан баталгаа
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-lg border border-border bg-white shadow-sm dark:bg-slate-950">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            Ачаалж байна…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Shield className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {groups.length === 0
                ? "Эрсдэлд хяналт бүртгэгдээгүй байна. Эрсдэлийн бүртгэл хэсгийн Хяналтууд таб дээрээс хяналт нэмнэ үү."
                : "Шүүлтүүрт тохирох хяналт олдсонгүй."}
            </p>
          </div>
        ) : (
          <table className="w-full min-w-280 text-sm">
            <colgroup>
              <col className="w-11" />
              <col className="w-[31%]" />
              <col className="w-[22%]" />
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur dark:bg-slate-900/95">
              <tr className="border-b border-border">
                <th className="px-4 py-3" />
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Хяналт
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Хамрах эрсдэлүүд
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Framework
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Байдал
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Баримт
                </th>
                <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Баталгаа
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((group) => {
                const isExpanded = expandedCtl === group.ctlId;
                const visibleRisks = group.recs.slice(0, 4);
                const hiddenRiskCount = Math.max(
                  group.recs.length - visibleRisks.length,
                  0,
                );
                const highRiskCount = group.recs.filter((r) =>
                  ["Critical", "High"].includes(r.inherent_risk_level ?? ""),
                ).length;
                const rowAccent =
                  group.aggStatus === "existing"
                    ? "border-l-emerald-500"
                    : group.aggStatus === "partial"
                      ? "border-l-amber-500"
                      : "border-l-red-500";
                return (
                  <Fragment key={group.ctlId}>
                    <tr
                      className={`cursor-pointer border-b border-l-2 border-border/60 ${rowAccent} transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/60 ${isExpanded ? "bg-slate-50 dark:bg-slate-900/60" : ""}`}
                      onClick={() =>
                        setExpandedCtl(isExpanded ? null : group.ctlId)
                      }
                    >
                      <td className="px-4 py-4 text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-900">
                            {group.ctlId}
                          </span>
                          <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-950 dark:text-slate-50">
                            {group.controlName.replace(/^CTL-\d+ – /, "")}
                          </p>
                          {group.catalog_control_type && (
                            <span className="text-[11px] text-muted-foreground">
                              {group.catalog_control_type}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Covered risks as small tags */}
                      <td className="px-4 py-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {group.recs.length} эрсдэл
                            </span>
                            {highRiskCount > 0 && (
                              <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700 ring-1 ring-red-100 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
                                {highRiskCount} өндөр
                              </span>
                            )}
                          </div>
                          <div className="flex max-w-64 flex-wrap gap-1">
                            {visibleRisks.map((r) => (
                              <span
                                key={r.id}
                                title={r.risk_title ?? ""}
                                className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${LEVEL_CLS[r.inherent_risk_level ?? ""] ?? "bg-slate-200 text-slate-700"}`}
                              >
                                {r.risk_code ?? "—"}
                              </span>
                            ))}
                            {hiddenRiskCount > 0 && (
                              <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                +{hiddenRiskCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        {group.cis_control ? (
                          <div className="space-y-1">
                            <span className="inline-flex rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:ring-violet-900">
                              {cisKey(group.cis_control)}
                            </span>
                            <p className="max-w-36 truncate text-[11px] leading-snug text-muted-foreground">
                              {group.cis_control.replace(/^CIS \d+: /, "")}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {group.nist_function
                              ? (NIST_FN_MN[group.nist_function] ??
                                group.nist_function)
                              : "—"}
                          </span>
                        )}
                      </td>

                      <td
                        className="px-4 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="inline-flex rounded-md border border-border bg-slate-50 p-0.5 dark:bg-slate-900">
                          {(
                            ["existing", "partial", "not_started"] as const
                          ).map((s) => (
                            <button
                              key={s}
                              onClick={() => toggleStatus(group.ctlId, s)}
                              className={`rounded px-2 py-1 text-[10px] font-semibold transition-colors ${
                                group.aggStatus === s
                                  ? STATUS_CLS[s]
                                  : "text-muted-foreground hover:bg-white dark:hover:bg-slate-800"
                              }`}
                            >
                              {STATUS_LABEL[s]}
                            </button>
                          ))}
                        </div>
                      </td>

                      <td
                        className="px-4 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {group.evidence ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={group.evidence.evidence_file_path!}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex max-w-28 items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900"
                              title={
                                group.evidence.evidence_original_name ?? ""
                              }
                            >
                              <FileText className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">
                                {group.evidence.evidence_original_name ?? "PDF"}
                              </span>
                            </a>
                            <button
                              onClick={() => removeEvidence(group.ctlId)}
                              className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => triggerUpload(group.ctlId)}
                            disabled={uploading === group.ctlId}
                            className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-blue-950/30"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {uploading === group.ctlId ? "…" : "PDF"}
                          </button>
                        )}
                      </td>

                      <td
                        className="px-4 py-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {group.approval === "approved" ? (
                          <div className="flex items-center gap-1">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${APPROVAL_CLS.approved}`}
                            >
                              <CheckCircle2 className="h-3 w-3" /> Батлагдсан
                            </span>
                            <button
                              onClick={() =>
                                handleApproval(group.ctlId, "pending")
                              }
                              className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                              title="Цуцлах"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : group.approval === "rejected" ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${APPROVAL_CLS.rejected}`}
                          >
                            <XCircle className="h-3 w-3" /> Татгалзсан
                          </span>
                        ) : (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${APPROVAL_CLS.pending}`}
                          >
                            <Clock className="h-3 w-3" /> Хүлээгдэж буй
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr
                        key={`${group.ctlId}-exp`}
                        className="border-b border-border/60 bg-slate-50/80 dark:bg-slate-900/40"
                      >
                        <td />
                        <td colSpan={6} className="px-4 py-5">
                          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
                            {/* Left: covered risks + evidence */}
                            <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-slate-950">
                              <div className="mb-3 flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                    Хамрах эрсдэлүүд
                                  </p>
                                  <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                                    {group.recs.length} эрсдэлийг энэ хяналт
                                    хаана
                                  </p>
                                </div>
                                {group.cis_control && (
                                  <span className="rounded-md bg-violet-50 px-2 py-1 text-[10px] font-bold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900">
                                    {cisKey(group.cis_control)}
                                  </span>
                                )}
                              </div>

                              <div className="space-y-2">
                                {group.recs.map((r) => (
                                  <div
                                    key={r.id}
                                    className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/70"
                                  >
                                    {r.inherent_risk_level && (
                                      <span
                                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${LEVEL_CLS[r.inherent_risk_level] ?? "bg-gray-400 text-white"}`}
                                      >
                                        {r.inherent_risk_score}
                                      </span>
                                    )}
                                    <span className="shrink-0 font-medium text-muted-foreground">
                                      {r.risk_code}
                                    </span>
                                    <span className="truncate text-slate-800 dark:text-slate-100">
                                      {r.risk_title}
                                    </span>
                                    <span className="shrink-0 text-[10px] text-muted-foreground">
                                      {r.asset_name}
                                    </span>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 border-t border-border pt-4 text-xs">
                                {group.cis_control && (
                                  <>
                                    <span className="font-medium text-muted-foreground">
                                      CIS хяналт
                                    </span>
                                    <span className="font-medium">
                                      {group.cis_control}
                                    </span>
                                  </>
                                )}
                                {group.nist_function && (
                                  <>
                                    <span className="font-medium text-muted-foreground">
                                      NIST CSF
                                    </span>
                                    <span>
                                      {NIST_FN_MN[group.nist_function] ??
                                        group.nist_function}
                                    </span>
                                  </>
                                )}
                                {group.evidence?.evidence_uploaded_at && (
                                  <>
                                    <span className="font-medium text-muted-foreground">
                                      Баримт оруулсан
                                    </span>
                                    <span>
                                      {new Date(
                                        group.evidence.evidence_uploaded_at,
                                      ).toLocaleDateString("mn-MN")}
                                    </span>
                                  </>
                                )}
                                {group.recs[0]?.approved_by && (
                                  <>
                                    <span className="font-medium text-muted-foreground">
                                      Батласан
                                    </span>
                                    <span>
                                      {group.recs[0].approved_by}
                                      {group.recs[0].approved_at
                                        ? ` · ${new Date(group.recs[0].approved_at).toLocaleDateString("mn-MN")}`
                                        : ""}
                                    </span>
                                  </>
                                )}
                              </div>

                              <div className="mt-4">
                                {group.evidence ? (
                                  <a
                                    href={group.evidence.evidence_file_path!}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 ring-1 ring-blue-100 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    {group.evidence.evidence_original_name ??
                                      "Баримт татах"}
                                  </a>
                                ) : (
                                  <button
                                    onClick={() => triggerUpload(group.ctlId)}
                                    disabled={uploading === group.ctlId}
                                    className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-60 dark:border-slate-700 dark:hover:bg-blue-950/30"
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                    {uploading === group.ctlId
                                      ? "Оруулж байна…"
                                      : "PDF баримт оруулах (макс 20MB)"}
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Right: approval */}
                            <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-slate-950">
                              <p className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Удирдлагын баталгаажуулалт
                              </p>
                              {group.approval === "approved" ? (
                                <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs dark:border-emerald-800 dark:bg-emerald-950/30">
                                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                                    <CheckCircle2 className="w-4 h-4" />{" "}
                                    Батлагдсан
                                  </div>
                                  <p className="mt-1 text-muted-foreground">
                                    {group.recs[0]?.approved_by}
                                    {group.recs[0]?.approved_at
                                      ? ` · ${new Date(group.recs[0].approved_at).toLocaleDateString("mn-MN")}`
                                      : ""}
                                  </p>
                                  {group.recs[0]?.approval_notes && (
                                    <p className="mt-2 italic text-muted-foreground">
                                      {group.recs[0].approval_notes}
                                    </p>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleApproval(group.ctlId, "pending")
                                    }
                                    className="mt-3 text-xs font-medium text-muted-foreground transition-colors hover:text-red-600"
                                  >
                                    Баталгаа цуцлах
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-3 space-y-3">
                                  <textarea
                                    value={approvalNotes[group.ctlId] ?? ""}
                                    onChange={(e) =>
                                      setApprovalNotes((prev) => ({
                                        ...prev,
                                        [group.ctlId]: e.target.value,
                                      }))
                                    }
                                    placeholder="Тэмдэглэл нэмэх (заавал биш)…"
                                    rows={2}
                                    className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                      disabled={approving === group.ctlId}
                                      onClick={() =>
                                        handleApproval(group.ctlId, "approved")
                                      }
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Баталгаажуулах
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs"
                                      disabled={approving === group.ctlId}
                                      onClick={() =>
                                        handleApproval(group.ctlId, "rejected")
                                      }
                                    >
                                      <XCircle className="w-3.5 h-3.5" />
                                      Татгалзах
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {filtered.length} / {groups.length} хяналт харагдаж байна
          {recs.length !== groups.length && (
            <span className="ml-2 text-muted-foreground/60">
              ({recs.length} холбоос нийт)
            </span>
          )}
        </p>
      )}
    </div>
  );
}
