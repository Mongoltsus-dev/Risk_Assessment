"use client";

import { useAuth } from "@/app/context/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Edit3,
  FileText,
  FileUp,
  Plus,
  RefreshCw,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

// ── Types ────────────────────────────────────────────────────────────────────

type Policy = {
  id: number;
  title: string;
  description: string | null;
  category: string;
  version: number;
  status: "Draft" | "Pending Approval" | "Approved";
  review_frequency: "Monthly" | "Quarterly" | "Annually";
  nist_ref: string | null;
  is_required: boolean;
  required_items: string | null;
  organization_response: string | null;
  csf_subcategory_ids: string | null;
  last_reviewed_at: string | null;
  next_review_at: string | null;
  created_by: number | null;
  created_by_name: string | null;
  approved_by: number | null;
  approved_by_name: string | null;
  approved_at: string | null;
  rejection_note: string | null;
  document_file_path: string | null;
  document_original_name: string | null;
  document_uploaded_at: string | null;
  document_note: string | null;
  is_due_for_review: boolean;
  created_at: string;
  updated_at: string;
};

// ── Constants ────────────────────────────────────────────────────────────────

const ROLE_ADMIN = 1;
const ROLE_MANAGER = 2;

const CATEGORIES = [
  "Мэдээллийн аюулгүй байдал",
  "Хандалтын удирдлага",
  "Эрсдэлийн менежмент",
  "Зөрчлийн хариу арга хэмжээ",
  "Нөөцлөлт ба сэргээлт",
  "Хөрөнгийн удирдлага",
  "Мониторинг ба илрүүлэлт",
  "Нийлүүлэлтийн сүлжээний аюулгүй байдал",
  "Хүний нөөцийн аюулгүй байдал",
  "Физик аюулгүй байдал",
  "Нийцлийн удирдлага",
  "Бусад",
];

const GOVERN_CATEGORIES = [
  "Эрсдэлийн менежмент",
  "Нийцлийн удирдлага",
  "Мэдээллийн аюулгүй байдал",
];

const FREQUENCIES = [
  { value: "Monthly", label: "Сар бүр" },
  { value: "Quarterly", label: "Улирал бүр" },
  { value: "Annually", label: "Жил бүр" },
];

const STATUS_MN: Record<string, string> = {
  Draft: "Ноорог",
  "Pending Approval": "Зөвшөөрөл хүлээж байна",
  Approved: "Батлагдсан",
  all: "Бүгд",
};

const STATUS_STYLE: Record<string, string> = {
  Draft:
    "bg-slate-100 text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 border-slate-200 dark:border-slate-700",
  "Pending Approval":
    "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  Approved:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
};

const FREQ_MN: Record<string, string> = {
  Monthly: "Сар бүр",
  Quarterly: "Улирал бүр",
  Annually: "Жил бүр",
};

const EMPTY_FORM = {
  title: "",
  description: "",
  category: CATEGORIES[0],
  review_frequency: "Quarterly",
  nist_ref: "",
  required_items: "",
  organization_response: "",
  csf_subcategory_ids: "",
  document_note: "",
};

const MAX_POLICY_PDF_SIZE = 20 * 1024 * 1024;

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleDateString("mn-MN");
}

function daysUntil(v: string | null): number | null {
  if (!v) return null;
  return Math.ceil((new Date(v).getTime() - Date.now()) / 86_400_000);
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PoliciesPage() {
  const { user } = useAuth();
  const router = useRouter();

  const role = Number((user as { role?: number | string } | null)?.role ?? 0);
  const userId = Number(
    (user as { user_id?: number | string } | null)?.user_id ?? 0,
  );
  const isAdmin = role === ROLE_ADMIN;
  const isManager = role === ROLE_MANAGER;
  const canApprove = isAdmin || isManager;

  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [inlineUploading, setInlineUploading] = useState<Set<number>>(new Set());
  const [inlineUploadError, setInlineUploadError] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    if (!user) router.push("/auth/login");
  }, [user, router]);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/policies");
      if (res.ok) {
        const data = await res.json();
        setPolicies(data.policies ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPolicies();
    }
  }, [user]);


  // ── Derived stats ──────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const required = policies.filter((p) => p.is_required);
    const approved = policies.filter((p) => p.status === "Approved").length;
    const approvedRequired = required.filter(
      (p) => p.status === "Approved" && !p.is_due_for_review,
    ).length;
    const governMapped = policies.filter(
      (p) =>
        p.nist_ref?.startsWith("GV.") || GOVERN_CATEGORIES.includes(p.category),
    ).length;

    return {
      total: policies.length,
      approved,
      pending: policies.filter((p) => p.status === "Pending Approval").length,
      dueReview: policies.filter((p) => p.is_due_for_review).length,
      withDocuments: policies.filter((p) => p.document_file_path).length,
      required: required.length,
      approvedRequired,
      governMapped,
      compliancePct:
        required.length > 0
          ? Math.round((approvedRequired / required.length) * 100)
          : 0,
    };
  }, [policies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return policies.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return [
        p.title,
        p.description,
        p.category,
        p.nist_ref,
        p.required_items,
        p.organization_response,
        p.csf_subcategory_ids,
        p.created_by_name,
        p.document_original_name,
        p.document_note,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [policies, search, statusFilter]);

  // ── Dialog helpers ─────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingPolicy(null);
    setForm({ ...EMPTY_FORM });
    setDocumentFile(null);
    setFormError("");
    setDialogOpen(true);
  };

  const openEdit = (p: Policy) => {
    setEditingPolicy(p);
    setForm({
      title: p.title,
      description: p.description ?? "",
      category: p.category,
      review_frequency: p.review_frequency,
      nist_ref: p.nist_ref ?? "",
      required_items: p.required_items ?? "",
      organization_response: p.organization_response ?? "",
      csf_subcategory_ids: p.csf_subcategory_ids ?? p.nist_ref ?? "",
      document_note: p.document_note ?? "",
    });
    setDocumentFile(null);
    setFormError("");
    setDialogOpen(true);
  };

  // ── API actions ────────────────────────────────────────────────────────────

  const handleDocumentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setFormError("");

    if (!file) {
      setDocumentFile(null);
      return;
    }
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setDocumentFile(null);
      e.target.value = "";
      setFormError("Зөвхөн PDF файл оруулна уу.");
      return;
    }
    if (file.size > MAX_POLICY_PDF_SIZE) {
      setDocumentFile(null);
      e.target.value = "";
      setFormError("PDF файл 20 MB-аас ихгүй байх ёстой.");
      return;
    }

    setDocumentFile(file);
  };

  const uploadPolicyDocument = async (policyId: number) => {
    if (!documentFile) return null;

    const fd = new FormData();
    fd.append("id", String(policyId));
    fd.append("file", documentFile);
    fd.append("document_note", form.document_note);

    const res = await fetch("/api/policies/document", {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message);
    return data.policy as Policy;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError("");
    try {
      let savedPolicy: Policy;

      if (editingPolicy) {
        const res = await fetch("/api/policies", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingPolicy.id, ...form }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        savedPolicy = data.policy;
      } else {
        const res = await fetch("/api/policies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, created_by: userId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        savedPolicy = data.policy;
      }

      const uploadedPolicy = await uploadPolicyDocument(savedPolicy.id);
      const nextPolicy = uploadedPolicy ?? savedPolicy;

      setPolicies((prev) => {
        const exists = prev.some((p) => p.id === nextPolicy.id);
        if (exists) {
          return prev.map((p) =>
            p.id === nextPolicy.id ? { ...p, ...nextPolicy } : p,
          );
        }
        return [nextPolicy, ...prev];
      });
      setDocumentFile(null);
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Алдаа гарлаа");
    } finally {
      setFormSaving(false);
    }
  };

  const submitForApproval = async (policy: Policy) => {
    if (!policy.document_file_path) {
      alert("Баталгаажуулахын өмнө PDF дүрэм журмаа оруулна уу.");
      return;
    }
    if (
      (policy.is_required || policy.nist_ref) &&
      !policy.organization_response
    ) {
      alert("Байгууллагын тайлбар / хэрэгжилтийн мэдээллийг оруулна уу.");
      return;
    }

    setSavingId(policy.id);
    try {
      const res = await fetch("/api/policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: policy.id, submit: true }),
      });
      if (res.ok) await fetchPolicies();
    } finally {
      setSavingId(null);
    }
  };

  const approvePolicy = async (policy: Policy, approve: boolean) => {
    if (approve && !policy.document_file_path) {
      alert("PDF дүрэм журамгүй бүртгэлийг батлах боломжгүй.");
      return;
    }

    setSavingId(policy.id);
    try {
      const res = await fetch("/api/policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: policy.id, approve, approved_by: userId }),
      });
      if (res.ok) await fetchPolicies();
    } finally {
      setSavingId(null);
    }
  };

  const resubmitForReview = async (policy: Policy) => {
    if (!policy.document_file_path) {
      alert("Шинэчлэлт илгээхийн өмнө PDF дүрэм журмаа оруулна уу.");
      return;
    }

    setSavingId(policy.id);
    try {
      const res = await fetch("/api/policies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: policy.id, submit: true }),
      });
      if (res.ok) await fetchPolicies();
    } finally {
      setSavingId(null);
    }
  };

  const deletePolicy = async (policy: Policy) => {
    if (
      !window.confirm(`"${policy.title}" бодлогыг устгахдаа итгэлтэй байна уу?`)
    )
      return;
    try {
      const res = await fetch(`/api/policies?id=${policy.id}`, {
        method: "DELETE",
      });
      if (res.ok) setPolicies((prev) => prev.filter((p) => p.id !== policy.id));
    } catch {
      alert("Устгаж чадсангүй");
    }
  };

  const removePolicyDocument = async (policy: Policy) => {
    if (!window.confirm(`"${policy.title}" PDF баримтыг устгах уу?`)) return;

    setSavingId(policy.id);
    try {
      const res = await fetch(`/api/policies/document?id=${policy.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setPolicies((prev) =>
        prev.map((p) => (p.id === policy.id ? { ...p, ...data.policy } : p)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "PDF устгаж чадсангүй");
    } finally {
      setSavingId(null);
    }
  };

  const handleInlineUpload = async (policy: Policy, file: File) => {
    setInlineUploadError((prev) => { const m = new Map(prev); m.delete(policy.id); return m; });

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setInlineUploadError((prev) => new Map(prev).set(policy.id, "Зөвхөн PDF файл оруулна уу."));
      return;
    }
    if (file.size > MAX_POLICY_PDF_SIZE) {
      setInlineUploadError((prev) => new Map(prev).set(policy.id, "PDF файл 20 MB-аас ихгүй байх ёстой."));
      return;
    }

    setInlineUploading((prev) => new Set(prev).add(policy.id));
    try {
      const fd = new FormData();
      fd.append("id", String(policy.id));
      fd.append("file", file);
      const res = await fetch("/api/policies/document", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "PDF оруулах үед алдаа гарлаа");
      setPolicies((prev) => prev.map((p) => (p.id === policy.id ? { ...p, ...data.policy } : p)));
    } catch (err) {
      setInlineUploadError((prev) => new Map(prev).set(policy.id, err instanceof Error ? err.message : "PDF оруулах үед алдаа гарлаа"));
    } finally {
      setInlineUploading((prev) => { const s = new Set(prev); s.delete(policy.id); return s; });
    }
  };

  if (!user) return null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full space-y-5 bg-slate-50 p-4 text-foreground dark:bg-slate-950 sm:p-6">
      {/* Header */}
      <div className="rounded-lg border border-border bg-white p-4 shadow-sm dark:bg-slate-950 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">
              Дүрэм журмын удирдлага
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPolicies}
              disabled={loading}
              className="h-9 gap-1.5 bg-white shadow-sm dark:bg-slate-950"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Шинэчлэх
            </Button>
            <Button
              onClick={openAdd}
              className="h-9 gap-1.5 bg-blue-600 shadow-sm hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              Журам нэмэх
            </Button>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "Нийт дүрэм журам",
            value: stats.total,
            sub: `${stats.governMapped} Govern/нийцлийн хамрах хүрээ`,
            icon: FileText,
            accent:
              "text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-950/40 dark:border-blue-900",
            bar: "bg-blue-600",
            pct: 100,
          },
          {
            label: "Батлагдсан",
            value: stats.approved,
            sub: `${stats.compliancePct}% шаардлагатай бодлого current`,
            icon: CheckCircle2,
            accent:
              "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-900",
            bar: "bg-emerald-600",
            pct: stats.compliancePct,
          },
          {
            label: "Зөвшөөрөл хүлээж буй",
            value: stats.pending,
            sub: "удирдлагын баталгаажуулалт",
            icon: Clock,
            accent:
              "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:border-amber-900",
            bar: "bg-amber-500",
            pct: stats.total
              ? Math.round((stats.pending / stats.total) * 100)
              : 0,
          },
          {
            label: "PDF баримттай",
            value: stats.withDocuments,
            sub: "тайлбар болон эх файл хавсаргасан",
            icon: FileUp,
            accent:
              "text-cyan-600 bg-cyan-50 border-cyan-100 dark:bg-cyan-950/40 dark:border-cyan-900",
            bar: "bg-cyan-600",
            pct: stats.total
              ? Math.round((stats.withDocuments / stats.total) * 100)
              : 0,
          },
          {
            label: "Хяналт шаардлагатай",
            value: stats.dueReview,
            sub: `${stats.required} required governance controls`,
            icon: AlertTriangle,
            accent:
              "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900",
            bar: "bg-rose-600",
            pct: stats.total
              ? Math.round((stats.dueReview / stats.total) * 100)
              : 0,
          },
        ].map(({ label, value, sub, icon: Icon, accent, bar, pct }) => (
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
            <p className="mt-2 text-xs text-muted-foreground">{sub}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={`h-full rounded-full ${bar}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 text-xs md:grid-cols-3">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
          <span className="font-semibold">GV.PO / GV.RM / GV.OC</span> бодлого,
          эрсдэлийн стратеги, зохицуулалтын шаардлага
        </div>
        <div className="rounded-lg border border-border bg-white px-3 py-2 text-muted-foreground dark:bg-slate-950">
          Required policy current:{" "}
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {stats.approvedRequired}/{stats.required}
          </span>
        </div>
        <div className="rounded-lg border border-border bg-white px-3 py-2 text-muted-foreground dark:bg-slate-950">
          Энэ хэсэг CSF profile-ийн Govern maturity-д нөлөөлнө
        </div>
      </div>

      {/* Alert: overdue for review */}
      {stats.dueReview > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <p className="text-sm text-rose-700 dark:text-rose-400">
            <span className="font-bold">{stats.dueReview} дүрэм журам</span>{" "}
            хяналтын хугацаа өнгөрсөн байна. Шинэчлэлт оруулж, дахин
            зөвшөөрүүлнэ үү.
          </p>
        </div>
      )}

      {/* Search + filter */}
      <div className="rounded-lg border border-border bg-white p-3 shadow-sm dark:bg-slate-950">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Нэр, ангилал эсвэл хариуцагчаар хайх..."
              className="h-9 border-slate-200 bg-slate-50 pl-10 shadow-none dark:border-slate-800 dark:bg-slate-900"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "Draft", "Pending Approval", "Approved"].map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                onClick={() => setStatusFilter(s)}
              >
                {STATUS_MN[s] ?? s}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Policy list */}
      {loading ? (
        <Card className="p-8 text-center shadow-none">
          <p className="text-muted-foreground">Дүрэм журам ачааллаж байна...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center shadow-none">
          <p className="text-muted-foreground">Дүрэм журам олдсонгүй.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((policy) => {
            const isSaving = savingId === policy.id;
            const days = daysUntil(policy.next_review_at);
            const isOwner = policy.created_by === userId;
            const canEdit = isAdmin || isOwner;
            const canDelete = isAdmin;

            return (
              <Card key={policy.id} className="shadow-none overflow-hidden">
                {/* Overdue stripe */}
                {policy.is_due_for_review && (
                  <div className="h-1 w-full bg-rose-500" />
                )}
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* ── Left: info ── */}
                    <div className="min-w-0 flex-1 space-y-2.5">
                      {/* Badges row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={`border text-xs ${STATUS_STYLE[policy.status]}`}
                        >
                          {STATUS_MN[policy.status]}
                        </Badge>
                        {policy.is_due_for_review && (
                          <Badge className="border text-xs bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                            ⚠ Хяналт шаардлагатай
                          </Badge>
                        )}
                        <span className="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {policy.category}
                        </span>
                        {policy.nist_ref && (
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs font-semibold text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900">
                            {policy.nist_ref}
                          </span>
                        )}
                        {policy.is_required && (
                          <span className="rounded-md bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700 ring-1 ring-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900">
                            Required
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground font-mono">
                          v{policy.version}
                        </span>
                      </div>

                      {/* Title */}
                      <h2 className="text-lg font-bold leading-snug">
                        {policy.title}
                      </h2>

                      {/* Description */}
                      {policy.description && (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                          {policy.description}
                        </p>
                      )}


                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                        {policy.document_file_path ? (
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-center gap-2">
                                <FileUp className="h-4 w-4 shrink-0 text-cyan-600" />
                                <a
                                  href={policy.document_file_path}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="truncate text-sm font-semibold text-cyan-700 underline-offset-4 hover:underline dark:text-cyan-300"
                                >
                                  {policy.document_original_name ??
                                    "PDF баримт"}
                                </a>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {policy.document_note && (
                                  <span className="max-w-xl truncate">
                                    {policy.document_note}
                                  </span>
                                )}
                                {policy.document_uploaded_at && (
                                  <span>
                                    Оруулсан:{" "}
                                    {fmtDate(policy.document_uploaded_at)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-1.5">
                              <a
                                href={policy.document_file_path}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-cyan-200 bg-white px-2.5 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-50 dark:border-cyan-900 dark:bg-slate-950 dark:text-cyan-300 dark:hover:bg-cyan-950/40"
                              >
                                <Download className="h-3.5 w-3.5" />
                                PDF
                              </a>
                              {canEdit && policy.status !== "Pending Approval" && (
                                <label className={`inline-flex h-8 cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-950 dark:hover:border-cyan-800 dark:hover:text-cyan-300 ${inlineUploading.has(policy.id) ? "pointer-events-none opacity-60" : ""}`} title="PDF солих">
                                  {inlineUploading.has(policy.id) ? (
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <UploadCloud className="h-3.5 w-3.5" />
                                  )}
                                  Солих
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="sr-only"
                                    disabled={inlineUploading.has(policy.id)}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleInlineUpload(policy, file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              )}
                              {canEdit &&
                                policy.status !== "Pending Approval" && (
                                  <button
                                    onClick={() => removePolicyDocument(policy)}
                                    disabled={isSaving}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/30"
                                    title="PDF устгах"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                                <UploadCloud className="h-4 w-4 shrink-0 text-slate-400" />
                                PDF дүрэм журам хавсаргаагүй байна.
                              </span>
                              {canEdit && policy.status !== "Pending Approval" && (
                                <label className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-cyan-200 bg-white px-2.5 text-xs font-semibold text-cyan-700 transition-colors hover:bg-cyan-50 dark:border-cyan-800 dark:bg-slate-950 dark:text-cyan-300 dark:hover:bg-cyan-950/30 ${inlineUploading.has(policy.id) ? "pointer-events-none opacity-60" : ""}`}>
                                  {inlineUploading.has(policy.id) ? (
                                    <><RefreshCw className="h-3.5 w-3.5 animate-spin" />Оруулж байна…</>
                                  ) : (
                                    <><UploadCloud className="h-3.5 w-3.5" />PDF оруулах</>
                                  )}
                                  <input
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="sr-only"
                                    disabled={inlineUploading.has(policy.id)}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleInlineUpload(policy, file);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                            {inlineUploadError.get(policy.id) && (
                              <p className="flex items-center gap-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                {inlineUploadError.get(policy.id)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <UserRound className="w-3.5 h-3.5" />
                          {policy.created_by_name ?? "—"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5" />
                          {FREQ_MN[policy.review_frequency]} хянах
                        </span>
                        {policy.nist_ref && (
                          <span className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400">
                            <BookOpen className="w-3.5 h-3.5" />
                            CSF 2.0 {policy.nist_ref}
                          </span>
                        )}
                        {policy.next_review_at && (
                          <span
                            className={`flex items-center gap-1.5 ${days !== null && days < 0 ? "text-rose-600 font-semibold" : days !== null && days <= 14 ? "text-amber-600 font-medium" : ""}`}
                          >
                            Дараагийн хяналт: {fmtDate(policy.next_review_at)}
                            {days !== null &&
                              days < 0 &&
                              ` (${Math.abs(days)} өдөр хэтэрсэн)`}
                            {days !== null &&
                              days >= 0 &&
                              days <= 14 &&
                              ` (${days} өдрийн дотор)`}
                          </span>
                        )}
                        {policy.approved_by_name && (
                          <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {policy.approved_by_name} батласан ·{" "}
                            {fmtDate(policy.approved_at)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* ── Right: actions ── */}
                    <div className="flex flex-col gap-2 lg:items-end lg:min-w-50">
                      {/* Admin: approve/reject pending */}
                      {canApprove && policy.status === "Pending Approval" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={isSaving}
                            onClick={() => approvePolicy(policy, true)}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            Батлах
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                            disabled={isSaving}
                            onClick={() => approvePolicy(policy, false)}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                            Буцаах
                          </Button>
                        </div>
                      )}

                      {/* User: submit draft for approval */}
                      {policy.status === "Draft" && (isAdmin || isOwner) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={isSaving}
                          onClick={() => submitForApproval(policy)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Зөвшөөрүүлэх
                        </Button>
                      )}

                      {/* Resubmit after review due */}
                      {policy.status === "Approved" &&
                        policy.is_due_for_review &&
                        (isAdmin || isOwner) && (
                          <Button
                            size="sm"
                            className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                            disabled={isSaving}
                            onClick={() => resubmitForReview(policy)}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Шинэчлэлт илгээх
                          </Button>
                        )}

                      {/* Edit / delete */}
                      <div className="flex gap-1">
                        {canEdit && policy.status !== "Pending Approval" && (
                          <button
                            onClick={() => openEdit(policy)}
                            className="p-1.5 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            title="Засах"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => deletePolicy(policy)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-muted-foreground hover:text-rose-600"
                            title="Устгах"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              {editingPolicy ? "Дүрэм журам засах" : "Шинэ дүрэм журам нэмэх"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Дүрэм журмын гарчиг, тайлбар, ангилал болон хяналтын давтамжийг
              бүртгэнэ.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            {/* Title */}
            <div>
              <Label htmlFor="pol-title" className="mb-1.5 block">
                Гарчиг <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pol-title"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
                placeholder="жишээ: Мэдээллийн аюулгүй байдлын бодлого"
                required
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="pol-desc" className="mb-1.5 block">
                Тайлбар
              </Label>
              <textarea
                id="pol-desc"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="Дүрэм журмын зорилго, хамрах хүрээг товч тайлбарлана уу..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none"
              />
            </div>

            {/* CSF requirement fields */}
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
                <ClipboardList className="h-4 w-4" />
                CSF subcategory ба шаардлагатай зүйлс
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="pol-nist-ref" className="mb-1.5 block">
                    CSF subcategory
                  </Label>
                  <Input
                    id="pol-nist-ref"
                    value={form.nist_ref}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        nist_ref: e.target.value.toUpperCase(),
                        csf_subcategory_ids:
                          p.csf_subcategory_ids || e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="жишээ: GV.OC-01"
                    className="bg-white dark:bg-slate-950"
                  />
                </div>
                <div>
                  <Label htmlFor="pol-subcategories" className="mb-1.5 block">
                    Хамрах subcategory-ууд
                  </Label>
                  <Input
                    id="pol-subcategories"
                    value={form.csf_subcategory_ids}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        csf_subcategory_ids: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="GV.OC-01, GV.OC-02"
                    className="bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <Label htmlFor="pol-required-items" className="mb-1.5 block">
                    Дүрэм журам дээр заавал тусгах зүйлс
                  </Label>
                  <textarea
                    id="pol-required-items"
                    value={form.required_items}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        required_items: e.target.value,
                      }))
                    }
                    placeholder="- Хамрах хүрээ&#10;- Хариуцагч&#10;- Review давтамж"
                    rows={5}
                    className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none dark:bg-slate-950"
                  />
                </div>
                <div>
                  <Label htmlFor="pol-org-response" className="mb-1.5 block">
                    Байгууллагын тайлбар / хэрэгжилт
                  </Label>
                  <textarea
                    id="pol-org-response"
                    value={form.organization_response}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        organization_response: e.target.value,
                      }))
                    }
                    placeholder="Одоогоор мөрдөж буй журам, хамрах хүрээ, эзэмшигч, сайжруулах зүйлс..."
                    rows={5}
                    className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 resize-none dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>

            {/* PDF document */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <FileUp className="h-4 w-4 text-cyan-600" />
                  Аюулгүй байдлын дүрэм журмын PDF
                </div>
                {editingPolicy?.document_file_path && (
                  <a
                    href={editingPolicy.document_file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Одоогийн PDF
                  </a>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-[1fr_220px]">
                <div>
                  <Label htmlFor="pol-doc-note" className="mb-1.5 block">
                    PDF тайлбар
                  </Label>
                  <textarea
                    id="pol-doc-note"
                    value={form.document_note}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, document_note: e.target.value }))
                    }
                    placeholder="Жишээ: Ажилтны дагаж мөрдөх үндсэн аюулгүй байдлын журам"
                    rows={3}
                    className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none dark:bg-slate-950"
                  />
                </div>

                <div>
                  <Label className="mb-1.5 block">PDF файл</Label>
                  <label className="flex h-23 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-cyan-300 bg-white px-3 text-center text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-50 dark:border-cyan-900 dark:bg-slate-950 dark:text-cyan-300 dark:hover:bg-cyan-950/30">
                    <UploadCloud className="h-5 w-5" />
                    <span className="max-w-full truncate">
                      {documentFile ? documentFile.name : "PDF сонгох"}
                    </span>
                    <input
                      key={documentFile ? documentFile.name : "empty"}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      onChange={handleDocumentFileChange}
                    />
                  </label>
                  {documentFile && (
                    <button
                      type="button"
                      onClick={() => setDocumentFile(null)}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-rose-600"
                    >
                      <X className="h-3.5 w-3.5" />
                      Сонголт цэвэрлэх
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Category + Frequency */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="pol-cat" className="mb-1.5 block">
                  Ангилал
                </Label>
                <select
                  id="pol-cat"
                  value={form.category}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, category: e.target.value }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="pol-freq" className="mb-1.5 block">
                  Хяналтын давтамж
                </Label>
                <select
                  id="pol-freq"
                  value={form.review_frequency}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, review_frequency: e.target.value }))
                  }
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                >
                  {FREQUENCIES.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Info note */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 px-3 py-2.5 text-xs text-blue-700 dark:text-blue-400">
              Хадгалсны дараа <strong>Баталгаажуулах</strong> товчоор удирдлагад
              илгээнэ үү. Удирдлага батласны дараа хяналтын хуваарь автоматаар
              тогтоогдоно.
            </div>

            {formError && (
              <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                {formError}
              </div>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Болих
              </Button>
              <Button
                type="submit"
                disabled={formSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {formSaving
                  ? "Хадгалж байна..."
                  : editingPolicy
                    ? "Өөрчлөлт хадгалах"
                    : "Дүрэм нэмэх"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
