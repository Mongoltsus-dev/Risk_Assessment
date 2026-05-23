"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Database,
  Globe2,
  LockKeyhole,
  Plus,
  RotateCcw,
  ScanSearch,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ScopeStatus = "in_scope" | "out_of_scope" | "undecided";

type ScopeRow = {
  subcategory_id: string;
  code: string;
  title: string;
  outcome: string;
  category_code: string;
  category_name: string;
  function_code: string;
  nist_function: string;
  function_name_mn: string;
  is_mandatory: boolean;
  scope_status: ScopeStatus;
  exclusion_reason: string;
  updated_at: string | null;
};

type ScopeDepartment = {
  id: number;
  department_name: string;
  owner_name: string | null;
  criticality: string | null;
  status: string | null;
  notes: string | null;
  asset_count: number;
  process_count: number;
};

type ScopeBusinessProcess = {
  id: number;
  process_code: string | null;
  process_name: string;
  description: string | null;
  business_function: string | null;
  business_owner: string | null;
  criticality: string | null;
  status: string | null;
  rto_hours: string | number | null;
  rpo_hours: string | number | null;
  asset_count: number;
};

type ScopeAsset = {
  id: number;
  asset_name: string;
  asset_code: string | null;
  asset_type: string | null;
  department: string | null;
  criticality: string | null;
  internet_exposed: boolean;
  status: string | null;
  business_owner: string | null;
};

type AssessmentScopeDraft = {
  assessment_name: string;
  assessment_type: string;
  selected_department_ids: number[];
  selected_business_process_ids: number[];
  selected_asset_ids: number[];
  status: string;
};

type ScopeResponse = {
  rows: ScopeRow[];
  departments: ScopeDepartment[];
  business_processes: ScopeBusinessProcess[];
  assets: ScopeAsset[];
  assessment_scope: AssessmentScopeDraft & {
    id: number;
    updated_at: string | null;
  };
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Хэлтэс", sublabel: "Scope-д орох хэлтэснүүд" },
  { label: "Процессууд", sublabel: "Бизнесийн үйл явц" },
  { label: "Хөрөнгүүд", sublabel: "Мэдээллийн хөрөнгүүд" },
  { label: "NIST CSF", sublabel: "Дэд ангилал сонгох" },
  { label: "Баталгаажуулах", sublabel: "Scope хянах & хадгалах" },
  { label: "Эрсдэлийн дүгнэлт", sublabel: "Тодорхойлогдсон эрсдэлүүд" },
];

const FUNCTION_ORDER = ["GV", "ID", "PR", "DE", "RS", "RC"];

const FUNCTION_META: Record<
  string,
  {
    name: string;
    mn: string;
    color: string;
    bg: string;
    icon: React.ElementType;
  }
> = {
  GV: {
    name: "Govern",
    mn: "Засаглал",
    color: "text-violet-700 dark:text-violet-300",
    bg: "bg-violet-500",
    icon: Building2,
  },
  ID: {
    name: "Identify",
    mn: "Таних",
    color: "text-sky-700 dark:text-sky-300",
    bg: "bg-sky-500",
    icon: ScanSearch,
  },
  PR: {
    name: "Protect",
    mn: "Хамгаалах",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500",
    icon: ShieldCheck,
  },
  DE: {
    name: "Detect",
    mn: "Илрүүлэх",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-500",
    icon: Activity,
  },
  RS: {
    name: "Respond",
    mn: "Хариу үйлдэл",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-500",
    icon: Bell,
  },
  RC: {
    name: "Recover",
    mn: "Сэргээх",
    color: "text-lime-700 dark:text-lime-300",
    bg: "bg-lime-500",
    icon: RotateCcw,
  },
};

const CRITICALITY_COLORS: Record<string, string> = {
  Critical:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
  High: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300",
  Medium:
    "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300",
  Low: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
};

const ASSET_CRITICALITY_OPTIONS = [
  "Tier 0 (Life/Safety)",
  "Tier 1 (Mission Critical)",
  "Tier 2 (Business Critical)",
  "Tier 3 (Important)",
];

const ASSET_TYPE_OPTIONS = [
  "Application",
  "Database",
  "Endpoint Fleet",
  "Identity",
  "Network",
  "SaaS Tenant",
  "Service",
  "Storage",
];

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({
  current,
  onNavigate,
}: {
  current: number;
  onNavigate: (step: number) => void;
}) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STEPS.map((step, index) => {
        const stepNum = index + 1;
        const done = stepNum < current;
        const active = stepNum === current;
        return (
          <div key={stepNum} className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => onNavigate(stepNum)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                active
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                  : done
                    ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  active
                    ? "bg-white text-slate-950 dark:bg-slate-950 dark:text-white"
                    : done
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : stepNum}
              </span>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold leading-tight">
                  {step.label}
                </p>
                <p
                  className={`text-[10px] leading-tight ${active ? "text-white/70 dark:text-slate-950/70" : "text-muted-foreground"}`}
                >
                  {step.sublabel}
                </p>
              </div>
            </button>
            {index < STEPS.length - 1 && (
              <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-muted-foreground/40" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Departments ──────────────────────────────────────────────────────

function Step1Departments({
  departments,
  selected,
  onToggle,
  onAdd,
  onDelete,
}: {
  departments: ScopeDepartment[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onAdd: (form: {
    department_name: string;
    owner_name: string;
    criticality: string;
    notes: string;
  }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    department_name: "",
    owner_name: "",
    criticality: "Medium",
    notes: "",
  });
  const [adding, setAdding] = useState(false);

  async function handleAdd() {
    if (!form.department_name.trim()) return;
    setAdding(true);
    await onAdd(form);
    setForm({
      department_name: "",
      owner_name: "",
      criticality: "Medium",
      notes: "",
    });
    setShowForm(false);
    setAdding(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Хэлтэснүүд</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Scope-д орох хэлтэснүүдийг нэмж, шалгаарай. Тэмдэглэгдсэн хэлтэснүүд
          дараагийн алхамд хэрэглэгдэнэ.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-slate-950 dark:text-slate-50">
            {selected.size}
          </span>{" "}
          / {departments.length} хэлтэс сонгогдсон
        </span>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Хэлтэс нэмэх
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900">
          <p className="mb-3 text-sm font-semibold">Шинэ хэлтэс</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium">
                Хэлтсийн нэр *
              </label>
              <Input
                value={form.department_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department_name: e.target.value }))
                }
                placeholder="Жнь: Мэдээллийн технологи"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Хариуцагч
              </label>
              <Input
                value={form.owner_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, owner_name: e.target.value }))
                }
                placeholder="Нэр, гарын үсэг"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Ач холбогдол
              </label>
              <select
                value={form.criticality}
                onChange={(e) =>
                  setForm((f) => ({ ...f, criticality: e.target.value }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {["Critical", "High", "Medium", "Low"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Тэмдэглэл
              </label>
              <Input
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Нэмэлт мэдээлэл"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={adding || !form.department_name.trim()}
            >
              {adding ? "Нэмж байна…" : "Нэмэх"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Болих
            </Button>
          </div>
        </div>
      )}

      {departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Building2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Хэлтэс байхгүй байна
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Дээрх товч дарж хэлтэс нэмнэ үү
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => {
            const isSelected = selected.has(dept.id);
            const critColor =
              CRITICALITY_COLORS[dept.criticality ?? ""] ??
              CRITICALITY_COLORS.Low;
            return (
              <div
                key={dept.id}
                className={`relative rounded-xl border p-4 transition-all cursor-pointer ${
                  isSelected
                    ? "border-emerald-300 bg-emerald-50/60 ring-2 ring-emerald-200 dark:border-emerald-700 dark:bg-emerald-950/20 dark:ring-emerald-800"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950"
                }`}
                onClick={() => onToggle(dept.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        isSelected
                          ? "bg-emerald-500"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      <Building2
                        className={`h-4 w-4 ${isSelected ? "text-white" : "text-muted-foreground"}`}
                      />
                    </div>
                    <p className="text-sm font-semibold leading-tight truncate">
                      {dept.department_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(dept.id);
                    }}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {dept.owner_name && (
                  <p className="mt-2 text-xs text-muted-foreground truncate">
                    <Users className="mr-1 inline h-3 w-3" />
                    {dept.owner_name}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {dept.criticality && (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${critColor}`}
                    >
                      {dept.criticality}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {dept.asset_count} хөрөнгө
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {dept.process_count} процесс
                  </span>
                </div>
                {isSelected && (
                  <div className="absolute right-2 top-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Business Processes ───────────────────────────────────────────────

function Step2Processes({
  processes,
  selected,
  onToggle,
  onAdd,
  onDelete,
  departments,
  selectedDeptIds,
}: {
  processes: ScopeBusinessProcess[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onAdd: (form: {
    process_name: string;
    business_function: string;
    business_owner: string;
    criticality: string;
    description: string;
  }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  departments: ScopeDepartment[];
  selectedDeptIds: Set<number>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    process_name: "",
    business_function: "",
    business_owner: "",
    criticality: "High",
    description: "",
  });
  const [adding, setAdding] = useState(false);

  const selectedDeptNames = useMemo(
    () =>
      new Set(
        departments
          .filter((d) => selectedDeptIds.has(d.id))
          .map((d) => d.department_name.toLowerCase()),
      ),
    [departments, selectedDeptIds],
  );

  async function handleAdd() {
    if (!form.process_name.trim()) return;
    setAdding(true);
    await onAdd(form);
    setForm({
      process_name: "",
      business_function: "",
      business_owner: "",
      criticality: "High",
      description: "",
    });
    setShowForm(false);
    setAdding(false);
  }

  const critBadge = (c: string | null) => {
    const color = CRITICALITY_COLORS[c ?? ""] ?? CRITICALITY_COLORS.Low;
    return (
      <span
        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}
      >
        {c ?? "—"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Бизнесийн процессууд</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Scope-д орох хэлтэсүүдийн бүх үндсэн бизнесийн процессуудыг нэмж,
          сонгоно уу.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-slate-950 dark:text-slate-50">
            {selected.size}
          </span>{" "}
          / {processes.length} процесс сонгогдсон
        </span>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Процесс нэмэх
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900">
          <p className="mb-3 text-sm font-semibold">Шинэ бизнесийн процесс</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium">
                Процессийн нэр *
              </label>
              <Input
                value={form.process_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, process_name: e.target.value }))
                }
                placeholder="Жнь: Цалин хөлс боловсруулах"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Хэлтэс / Функц
              </label>
              <select
                value={form.business_function}
                onChange={(e) =>
                  setForm((f) => ({ ...f, business_function: e.target.value }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Сонгох —</option>
                {departments
                  .filter((d) => selectedDeptIds.has(d.id))
                  .map((d) => (
                    <option key={d.id} value={d.department_name}>
                      {d.department_name}
                    </option>
                  ))}
                {[
                  "Operations",
                  "Sales",
                  "Finance",
                  "HR",
                  "IT",
                  "Customer Service",
                  "Compliance",
                ].map((fn) => (
                  <option key={fn} value={fn}>
                    {fn}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Хариуцагч
              </label>
              <Input
                value={form.business_owner}
                onChange={(e) =>
                  setForm((f) => ({ ...f, business_owner: e.target.value }))
                }
                placeholder="Процессийн эзэн"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Ач холбогдол
              </label>
              <select
                value={form.criticality}
                onChange={(e) =>
                  setForm((f) => ({ ...f, criticality: e.target.value }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {["Critical", "High", "Medium", "Low"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Тайлбар</label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Товч тайлбар"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={adding || !form.process_name.trim()}
            >
              {adding ? "Нэмж байна…" : "Нэмэх"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Болих
            </Button>
          </div>
        </div>
      )}

      {processes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Database className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Процесс байхгүй байна
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Дээрх товч дарж процесс нэмнэ үү
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {processes.map((proc) => {
            const isSelected = selected.has(proc.id);
            const fnName = proc.business_function;
            const isLinkedToDept =
              fnName && selectedDeptNames.has(fnName.toLowerCase());
            return (
              <div
                key={proc.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                  isSelected
                    ? "border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200 dark:border-emerald-700 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950"
                }`}
                onClick={() => onToggle(proc.id)}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isSelected
                      ? "bg-emerald-500"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  {isSelected ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <CircleDashed className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {proc.process_name}
                    </p>
                    {proc.process_code && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {proc.process_code}
                      </span>
                    )}
                    {isLinkedToDept && (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
                        {fnName}
                      </span>
                    )}
                  </div>
                  {proc.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                      {proc.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {critBadge(proc.criticality)}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(proc.id);
                    }}
                    className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Assets ───────────────────────────────────────────────────────────

function Step3Assets({
  assets,
  selected,
  onToggle,
  onAdd,
  departments,
  selectedDeptIds,
}: {
  assets: ScopeAsset[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  onAdd: (form: {
    asset_name: string;
    asset_type: string;
    department: string;
    criticality: string;
    internet_exposed: boolean;
  }) => Promise<void>;
  departments: ScopeDepartment[];
  selectedDeptIds: Set<number>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    asset_name: "",
    asset_type: "Application",
    department: "",
    criticality: "Tier 2 (Business Critical)",
    internet_exposed: false,
  });
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  async function handleAdd() {
    if (!form.asset_name.trim()) return;
    setAdding(true);
    await onAdd(form);
    setForm({
      asset_name: "",
      asset_type: "Application",
      department: "",
      criticality: "Tier 2 (Business Critical)",
      internet_exposed: false,
    });
    setShowForm(false);
    setAdding(false);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q
      ? assets.filter(
          (a) =>
            a.asset_name.toLowerCase().includes(q) ||
            (a.asset_type ?? "").toLowerCase().includes(q) ||
            (a.department ?? "").toLowerCase().includes(q),
        )
      : assets;
  }, [assets, search]);

  const critBadge = (c: string | null) => {
    const key = c?.includes("Tier 0")
      ? "Critical"
      : c?.includes("Tier 1")
        ? "High"
        : c?.includes("Tier 2")
          ? "Medium"
          : "Low";
    const color = CRITICALITY_COLORS[key] ?? CRITICALITY_COLORS.Low;
    return (
      <span
        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${color}`}
      >
        {c ?? "—"}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Үндсэн бизнесийн хөрөнгүүд</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Байгууллагын мэдээллийн технологийн хөрөнгүүдийг нэмж, scope-д орох
          хөрөнгүүдийг сонгоно уу.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Хөрөнгө хайх…"
            className="pl-8"
          />
          <ScanSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          <span className="font-semibold text-slate-950 dark:text-slate-50">
            {selected.size}
          </span>{" "}
          / {assets.length} сонгогдсон
        </span>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          Хөрөнгө нэмэх
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900">
          <p className="mb-3 text-sm font-semibold">Шинэ хөрөнгө</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium">
                Хөрөнгийн нэр *
              </label>
              <Input
                value={form.asset_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, asset_name: e.target.value }))
                }
                placeholder="Жнь: HR Management System"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Хөрөнгийн төрөл
              </label>
              <select
                value={form.asset_type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, asset_type: e.target.value }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {ASSET_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">Хэлтэс</label>
              <select
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">— Сонгох —</option>
                {departments
                  .filter((d) => selectedDeptIds.has(d.id))
                  .map((d) => (
                    <option key={d.id} value={d.department_name}>
                      {d.department_name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">
                Ач холбогдлын зэрэглэл
              </label>
              <select
                value={form.criticality}
                onChange={(e) =>
                  setForm((f) => ({ ...f, criticality: e.target.value }))
                }
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {ASSET_CRITICALITY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input
                type="checkbox"
                id="internet_exposed"
                checked={form.internet_exposed}
                onChange={(e) =>
                  setForm((f) => ({ ...f, internet_exposed: e.target.checked }))
                }
                className="h-4 w-4 rounded border-input"
              />
              <label htmlFor="internet_exposed" className="text-sm">
                Интернетэд холбогдсон
              </label>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={adding || !form.asset_name.trim()}
            >
              {adding ? "Нэмж байна…" : "Нэмэх"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowForm(false)}
            >
              Болих
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <Database className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            {search
              ? "Хайлтад тохирох хөрөнгө олдсонгүй"
              : "Хөрөнгө байхгүй байна"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((asset) => {
            const isSelected = selected.has(asset.id);
            return (
              <div
                key={asset.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                  isSelected
                    ? "border-emerald-300 bg-emerald-50/60 ring-1 ring-emerald-200 dark:border-emerald-700 dark:bg-emerald-950/20"
                    : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950"
                }`}
                onClick={() => onToggle(asset.id)}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    isSelected
                      ? "bg-emerald-500"
                      : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  {isSelected ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <Database className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {asset.asset_name}
                    </p>
                    {asset.asset_type && (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        {asset.asset_type}
                      </span>
                    )}
                    {asset.internet_exposed && (
                      <span className="flex items-center gap-0.5 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-800 dark:bg-orange-950/30">
                        <Globe2 className="h-2.5 w-2.5" />
                        Internet
                      </span>
                    )}
                  </div>
                  {asset.department && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {asset.department}
                    </p>
                  )}
                </div>
                <div className="shrink-0">{critBadge(asset.criticality)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Step 4: NIST CSF Subcategories ──────────────────────────────────────────

function Step4NistCsf({
  rows,
  draft,
  onChange,
}: {
  rows: ScopeRow[];
  draft: Record<
    string,
    { scope_status: ScopeStatus; exclusion_reason: string }
  >;
  onChange: (id: string, status: ScopeStatus, reason?: string) => void;
}) {
  const [expandedFns, setExpandedFns] = useState<Set<string>>(
    new Set(FUNCTION_ORDER),
  );
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => {
    const q = search.toLowerCase();
    const filteredRows = q
      ? rows.filter(
          (r) =>
            r.subcategory_id.toLowerCase().includes(q) ||
            r.title.toLowerCase().includes(q),
        )
      : rows;

    const fnMap = new Map<
      string,
      { rows: ScopeRow[]; byCategory: Map<string, ScopeRow[]> }
    >();
    for (const row of filteredRows) {
      if (!fnMap.has(row.function_code)) {
        fnMap.set(row.function_code, { rows: [], byCategory: new Map() });
      }
      const fn = fnMap.get(row.function_code)!;
      fn.rows.push(row);
      if (!fn.byCategory.has(row.category_code))
        fn.byCategory.set(row.category_code, []);
      fn.byCategory.get(row.category_code)!.push(row);
    }
    return fnMap;
  }, [rows, search]);

  const inScopeCount = useMemo(
    () =>
      Object.values(draft).filter((d) => d.scope_status === "in_scope").length,
    [draft],
  );

  function toggleFn(code: string) {
    setExpandedFns((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">NIST CSF 2.0 Дэд ангилал</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Байгууллагын scope-д орох NIST CSF дэд ангилалуудыг сонгоно уу. Заавал
          орох ангилалууд автоматаар тэмдэглэгдсэн байна.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Код эсвэл нэрээр хайх…"
            className="pl-8"
          />
          <ScanSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 dark:bg-slate-950">
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          <span className="text-sm font-semibold">{inScopeCount}</span>
          <span className="text-xs text-muted-foreground">
            / {rows.length} scope-д
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {FUNCTION_ORDER.map((fnCode) => {
          const meta = FUNCTION_META[fnCode];
          const fnData = grouped.get(fnCode);
          if (!fnData) return null;
          const Icon = meta.icon;
          const isExpanded = expandedFns.has(fnCode);
          const fnInScope = fnData.rows.filter((r) => {
            const d = draft[r.subcategory_id];
            return d?.scope_status === "in_scope" || r.is_mandatory;
          }).length;

          return (
            <div key={fnCode} className="overflow-hidden rounded-xl border">
              <button
                type="button"
                onClick={() => toggleFn(fnCode)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50"
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg}`}
                >
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold">
                    {fnCode} — {meta.mn}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {meta.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${meta.color}`}>
                    {fnInScope} / {fnData.rows.length}
                  </span>
                  <ChevronRight
                    className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </div>
              </button>

              {isExpanded && (
                <div className="border-t">
                  {Array.from(fnData.byCategory.entries()).map(
                    ([catCode, catRows]) => (
                      <div key={catCode}>
                        <div className="bg-muted/30 px-4 py-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            {catCode} — {catRows[0]?.category_name}
                          </span>
                        </div>
                        <div className="divide-y">
                          {catRows.map((row) => {
                            const d = draft[row.subcategory_id] ?? {
                              scope_status: row.scope_status,
                              exclusion_reason: "",
                            };
                            const status = row.is_mandatory
                              ? "in_scope"
                              : d.scope_status;
                            const missingReason =
                              status === "out_of_scope" &&
                              !d.exclusion_reason.trim();

                            return (
                              <div
                                key={row.subcategory_id}
                                className={`px-4 py-3 ${
                                  missingReason
                                    ? "bg-rose-50/50 dark:bg-rose-950/10"
                                    : ""
                                }`}
                              >
                                <div className="grid gap-3 xl:grid-cols-[1fr_280px]">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                                        {row.subcategory_id}
                                      </span>
                                      {row.is_mandatory && (
                                        <Badge className="gap-1 rounded-md border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                                          <LockKeyhole className="h-3 w-3" />
                                          Заавал
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="mt-1 text-sm font-medium">
                                      {row.title}
                                    </p>
                                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                      {row.outcome}
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    {row.is_mandatory ? (
                                      <div className="flex h-9 items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                                        <LockKeyhole className="h-3.5 w-3.5" />
                                        Scope-д заавал орно
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-3 gap-0.5 rounded-md border bg-background p-0.5">
                                        {(
                                          [
                                            "in_scope",
                                            "out_of_scope",
                                            "undecided",
                                          ] as ScopeStatus[]
                                        ).map((s) => {
                                          const labels: Record<
                                            ScopeStatus,
                                            string
                                          > = {
                                            in_scope: "Оруулах",
                                            out_of_scope: "Хасах",
                                            undecided: "Дараа",
                                          };
                                          const icons: Record<
                                            ScopeStatus,
                                            React.ElementType
                                          > = {
                                            in_scope: CheckCircle2,
                                            out_of_scope: XCircle,
                                            undecided: CircleDashed,
                                          };
                                          const BtnIcon = icons[s];
                                          return (
                                            <button
                                              key={s}
                                              type="button"
                                              onClick={() =>
                                                onChange(row.subcategory_id, s)
                                              }
                                              className={`flex h-8 items-center justify-center gap-1 rounded px-1 text-xs font-medium transition-colors ${
                                                status === s
                                                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                                                  : "text-muted-foreground hover:bg-muted"
                                              }`}
                                            >
                                              <BtnIcon className="h-3.5 w-3.5 shrink-0" />
                                              <span className="hidden sm:block truncate">
                                                {labels[s]}
                                              </span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {status === "out_of_scope" &&
                                      !row.is_mandatory && (
                                        <div>
                                          <Textarea
                                            value={d.exclusion_reason}
                                            onChange={(e) =>
                                              onChange(
                                                row.subcategory_id,
                                                "out_of_scope",
                                                e.target.value,
                                              )
                                            }
                                            rows={2}
                                            placeholder="Хамрахгүй шалтгаан…"
                                            className="min-h-16 resize-y text-xs"
                                          />
                                          {missingReason && (
                                            <p className="mt-1 flex items-center gap-1 text-[11px] text-rose-600 dark:text-rose-400">
                                              <AlertTriangle className="h-3 w-3" />
                                              Шалтгаан оруулна уу
                                            </p>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 5: Review ───────────────────────────────────────────────────────────

function Step5Review({
  departments,
  selectedDeptIds,
  processes,
  selectedProcessIds,
  assets,
  selectedAssetIds,
  rows,
  draft,
}: {
  departments: ScopeDepartment[];
  selectedDeptIds: Set<number>;
  processes: ScopeBusinessProcess[];
  selectedProcessIds: Set<number>;
  assets: ScopeAsset[];
  selectedAssetIds: Set<number>;
  rows: ScopeRow[];
  draft: Record<
    string,
    { scope_status: ScopeStatus; exclusion_reason: string }
  >;
}) {
  const selectedDepts = departments.filter((d) => selectedDeptIds.has(d.id));
  const selectedProcs = processes.filter((p) => selectedProcessIds.has(p.id));
  const selectedAssets = assets.filter((a) => selectedAssetIds.has(a.id));
  const inScopeRows = rows.filter((r) => {
    const d = draft[r.subcategory_id];
    return r.is_mandatory || d?.scope_status === "in_scope";
  });
  const missingReasons = rows.filter((r) => {
    const d = draft[r.subcategory_id];
    return (
      !r.is_mandatory &&
      d?.scope_status === "out_of_scope" &&
      !d.exclusion_reason.trim()
    );
  });
  const criticalAssets = selectedAssets.filter(
    (a) =>
      (a.criticality ?? "").toLowerCase().includes("tier 0") ||
      (a.criticality ?? "").toLowerCase().includes("tier 1"),
  );

  const tiles = [
    {
      label: "Хэлтэс",
      value: selectedDepts.length,
      total: departments.length,
      icon: Building2,
      color: "bg-violet-500",
    },
    {
      label: "Процесс",
      value: selectedProcs.length,
      total: processes.length,
      icon: Database,
      color: "bg-sky-500",
    },
    {
      label: "Хөрөнгө",
      value: selectedAssets.length,
      total: assets.length,
      icon: ShieldCheck,
      color: "bg-emerald-500",
    },
    {
      label: "NIST CSF дэд ангилал",
      value: inScopeRows.length,
      total: rows.length,
      icon: CheckCircle2,
      color: "bg-amber-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Scope хянах</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Бүх мэдээллийг хянаж, баталгаажуулна уу. Хадгалах товч дарахад scope
          тогтоогдоно.
        </p>
      </div>

      {missingReasons.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/20">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="text-sm font-semibold text-rose-700 dark:text-rose-400">
              {missingReasons.length} дэд ангилалд хасах шалтгаан оруулаагүй
              байна
            </p>
            <p className="mt-0.5 text-xs text-rose-600 dark:text-rose-400">
              4-р алхам руу буцаж шалтгааныг оруулна уу.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              key={tile.label}
              className="rounded-xl border bg-white p-4 shadow-sm dark:bg-slate-950"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tile.color}`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground">
                    {tile.label}
                  </p>
                  <p className="text-2xl font-bold leading-none">
                    {tile.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    / {tile.total} нийт
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-4 dark:bg-slate-950">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Building2 className="h-4 w-4 text-violet-500" />
            Сонгогдсон хэлтэснүүд ({selectedDepts.length})
          </h3>
          {selectedDepts.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Хэлтэс сонгоогүй байна
            </p>
          ) : (
            <div className="space-y-1.5">
              {selectedDepts.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{d.department_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {d.asset_count} хөрөнгө
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4 dark:bg-slate-950">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Database className="h-4 w-4 text-sky-500" />
            Сонгогдсон процессууд ({selectedProcs.length})
          </h3>
          {selectedProcs.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Процесс сонгоогүй байна
            </p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {selectedProcs.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="truncate">{p.process_name}</span>
                  <span
                    className={`ml-2 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CRITICALITY_COLORS[p.criticality ?? ""] ?? CRITICALITY_COLORS.Low}`}
                  >
                    {p.criticality}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4 dark:bg-slate-950">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Сонгогдсон хөрөнгүүд ({selectedAssets.length})
          </h3>
          {selectedAssets.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Хөрөнгө сонгоогүй байна
            </p>
          ) : (
            <>
              {criticalAssets.length > 0 && (
                <p className="mb-2 text-[11px] font-medium text-rose-600 dark:text-rose-400">
                  {criticalAssets.length} критик хөрөнгө
                </p>
              )}
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedAssets.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="truncate">{a.asset_name}</span>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground">
                      {a.asset_type}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="rounded-xl border bg-white p-4 dark:bg-slate-950">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4 text-amber-500" />
            NIST CSF функцүүд
          </h3>
          <div className="space-y-2">
            {FUNCTION_ORDER.map((fnCode) => {
              const meta = FUNCTION_META[fnCode];
              const fnRows = rows.filter((r) => r.function_code === fnCode);
              const fnInScope = fnRows.filter((r) => {
                const d = draft[r.subcategory_id];
                return r.is_mandatory || d?.scope_status === "in_scope";
              }).length;
              const Icon = meta.icon;
              return (
                <div key={fnCode} className="flex items-center gap-2">
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded ${meta.bg}`}
                  >
                    <Icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="flex-1 text-xs font-medium">{meta.mn}</span>
                  <span className={`text-xs font-semibold ${meta.color}`}>
                    {fnInScope}/{fnRows.length}
                  </span>
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className={`h-full ${meta.bg}`}
                      style={{
                        width: `${fnRows.length ? Math.round((fnInScope / fnRows.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 6: Risk Scope Summary ───────────────────────────────────────────────

type RiskScopeEntry = {
  risk_id: number;
  risk_code: string;
  asset_name: string | null;
  asset_type: string | null;
  threat_name: string | null;
  risk_title: string;
  inherent_risk_score: number | null;
  inherent_risk_level: string | null;
  nist_csf_function: string | null;
  status: string | null;
};

const RISK_LEVEL_META: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  Critical: {
    label: "Критик",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-500",
    border: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30",
  },
  High: {
    label: "Өндөр",
    color: "text-orange-700 dark:text-orange-300",
    bg: "bg-orange-500",
    border:
      "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30",
  },
  Medium: {
    label: "Дунд",
    color: "text-yellow-700 dark:text-yellow-300",
    bg: "bg-yellow-400",
    border:
      "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30",
  },
  Low: {
    label: "Бага",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-500",
    border:
      "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30",
  },
};

function Step6RiskScope({
  selectedAssetIds,
}: {
  selectedAssetIds: Set<number>;
}) {
  const [risks, setRisks] = useState<RiskScopeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/risk-register");
        const data = await res.json();
        setRisks((data.risks ?? []) as RiskScopeEntry[]);
      } catch {
        setRisks([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Filter to in-scope assets only (if we have selected asset ids, filter; else show all)
  const scopedRisks = useMemo(() => {
    if (selectedAssetIds.size === 0) return risks;
    return risks.filter((r) => {
      // risk_register has asset_id — but we only have asset_name here; show all if can't filter
      return true;
    });
  }, [risks, selectedAssetIds]);

  const byLevel = useMemo(() => {
    const counts: Record<string, number> = {
      Critical: 0,
      High: 0,
      Medium: 0,
      Low: 0,
      Unknown: 0,
    };
    for (const r of scopedRisks) {
      const lvl = r.inherent_risk_level ?? "Unknown";
      counts[lvl] = (counts[lvl] ?? 0) + 1;
    }
    return counts;
  }, [scopedRisks]);

  const byFunction = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of scopedRisks) {
      const fn = r.nist_csf_function || "Тодорхойгүй";
      map[fn] = (map[fn] ?? 0) + 1;
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [scopedRisks]);

  const byAsset = useMemo(() => {
    const map: Record<string, { count: number; highestLevel: string }> = {};
    const levelOrder = ["Critical", "High", "Medium", "Low"];
    for (const r of scopedRisks) {
      const name = r.asset_name ?? "Тодорхойгүй";
      if (!map[name]) map[name] = { count: 0, highestLevel: "Low" };
      map[name].count += 1;
      const lvl = r.inherent_risk_level ?? "Low";
      if (
        levelOrder.indexOf(lvl) < levelOrder.indexOf(map[name].highestLevel)
      ) {
        map[name].highestLevel = lvl;
      }
    }
    return Object.entries(map)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8);
  }, [scopedRisks]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
      </div>
    );
  }

  const total = scopedRisks.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Эрсдэлийн дүгнэлт</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Тодорхойлогдсон эрсдэлүүдийн хураангуй. Эрсдэлийн бүртгэлд
            үргэлжлүүлнэ үү.
          </p>
        </div>
        <a href="/risk-register">
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-300"
          >
            Эрсдэлийн бүртгэл
            <ArrowRight className="h-4 w-4" />
          </button>
        </a>
      </div>

      {/* Risk level tiles */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(["Critical", "High", "Medium", "Low"] as const).map((lvl) => {
          const meta = RISK_LEVEL_META[lvl];
          const count = byLevel[lvl] ?? 0;
          return (
            <div key={lvl} className={`rounded-xl border p-4 ${meta.border}`}>
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}
                >
                  {meta.label}
                </span>
                <div className={`h-2 w-2 rounded-full ${meta.bg}`} />
              </div>
              <p className={`mt-2 text-3xl font-bold ${meta.color}`}>{count}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {total > 0 ? Math.round((count / total) * 100) : 0}% нийт
                эрсдэлийн
              </p>
            </div>
          );
        })}
      </div>

      {/* No risks state */}
      {total === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
          <ShieldAlert className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">
            Эрсдэл тодорхойлогдоогүй байна
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Эрсдэлийн бүртгэл хуудсанд очиж эрсдэлүүдийг нэмнэ үү
          </p>
          <a href="/risk-register" className="mt-4">
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Эрсдэл нэмэх <ArrowRight className="h-4 w-4" />
            </button>
          </a>
        </div>
      )}

      {total > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Risks by NIST function */}
          <div className="rounded-xl border bg-white p-4 dark:bg-slate-950">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              NIST CSF функцээр ({total} эрсдэл)
            </h3>
            <div className="space-y-3">
              {byFunction.map(([fn, count]) => {
                const fnCode = fn.split(" ")[0] as string;
                const meta = FUNCTION_META[fnCode];
                const pct = Math.round((count / total) * 100);
                const Icon = meta?.icon ?? ShieldAlert;
                return (
                  <div key={fn} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {meta ? (
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded ${meta.bg}`}
                          >
                            <Icon className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <div className="flex h-5 w-5 items-center justify-center rounded bg-slate-400">
                            <ShieldAlert className="h-3 w-3 text-white" />
                          </div>
                        )}
                        <span className="font-medium">
                          {meta ? `${fnCode} — ${meta.mn}` : fn}
                        </span>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${meta?.bg ?? "bg-slate-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risks by asset */}
          <div className="rounded-xl border bg-white p-4 dark:bg-slate-950">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <Database className="h-4 w-4 text-sky-500" />
              Хамгийн их эрсдэлтэй хөрөнгүүд
            </h3>
            <div className="space-y-2">
              {byAsset.map(([assetName, info]) => {
                const meta =
                  RISK_LEVEL_META[info.highestLevel] ?? RISK_LEVEL_META.Low;
                return (
                  <div
                    key={assetName}
                    className="flex items-center gap-3 rounded-lg border p-2.5"
                  >
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full ${meta.bg}`}
                    />
                    <span className="flex-1 truncate text-sm font-medium">
                      {assetName}
                    </span>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.border} ${meta.color}`}
                    >
                      {info.count} эрсдэл
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent risks list */}
          <div className="rounded-xl border bg-white p-4 dark:bg-slate-950 lg:col-span-2">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Сүүлийн эрсдэлүүд
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {scopedRisks.slice(0, 10).map((r) => {
                const lvl = r.inherent_risk_level ?? "Low";
                const meta = RISK_LEVEL_META[lvl] ?? RISK_LEVEL_META.Low;
                return (
                  <div
                    key={r.risk_id}
                    className="flex items-center gap-3 rounded-lg border p-2.5"
                  >
                    <div
                      className={`h-2 w-2 shrink-0 rounded-full ${meta.bg}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {r.risk_title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.asset_name} • {r.threat_name}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {r.inherent_risk_score != null && (
                        <span className="text-xs font-bold text-muted-foreground">
                          {r.inherent_risk_score}/25
                        </span>
                      )}
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.border} ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                  </div>
                );
              })}
              {scopedRisks.length > 10 && (
                <p className="pt-1 text-center text-xs text-muted-foreground">
                  + {scopedRisks.length - 10} эрсдэл байна
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CsfScopePage() {
  const [data, setData] = useState<ScopeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  // Selections
  const [selectedDeptIds, setSelectedDeptIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedProcessIds, setSelectedProcessIds] = useState<Set<number>>(
    new Set(),
  );
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<number>>(
    new Set(),
  );

  // NIST CSF draft
  const [nistDraft, setNistDraft] = useState<
    Record<string, { scope_status: ScopeStatus; exclusion_reason: string }>
  >({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/csf-scope");
      const payload = (await res.json()) as ScopeResponse;
      if (!res.ok) throw new Error("Мэдээлэл уншиж чадсангүй");
      setData(payload);

      // Init selections from saved assessment scope
      const scope = payload.assessment_scope;
      setSelectedDeptIds(
        new Set((scope.selected_department_ids ?? []).map(Number)),
      );
      setSelectedProcessIds(
        new Set((scope.selected_business_process_ids ?? []).map(Number)),
      );
      setSelectedAssetIds(
        new Set((scope.selected_asset_ids ?? []).map(Number)),
      );

      // Init NIST draft
      const initDraft: Record<
        string,
        { scope_status: ScopeStatus; exclusion_reason: string }
      > = {};
      for (const row of payload.rows) {
        initDraft[row.subcategory_id] = {
          scope_status: row.scope_status,
          exclusion_reason: row.exclusion_reason ?? "",
        };
      }
      setNistDraft(initDraft);
    } catch {
      setMessage({ tone: "error", text: "Мэдээлэл уншиж чадсангүй" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Save current step selections ──────────────────────────────────────────

  async function saveSelections() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/csf-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessment_scope: {
            assessment_name:
              data?.assessment_scope.assessment_name ??
              "2026 SME Cybersecurity Risk Assessment",
            assessment_type:
              data?.assessment_scope.assessment_type ?? "Asset-based",
            selected_department_ids: Array.from(selectedDeptIds),
            selected_business_process_ids: Array.from(selectedProcessIds),
            selected_asset_ids: Array.from(selectedAssetIds),
            status: "Draft",
          },
        }),
      });
      if (!res.ok) throw new Error("Хадгалж чадсангүй");
      const payload = (await res.json()) as ScopeResponse;
      setData(payload);
      setMessage({ tone: "success", text: "Хадгалагдлаа" });
    } catch {
      setMessage({ tone: "error", text: "Хадгалж чадсангүй" });
    } finally {
      setSaving(false);
    }
  }

  async function saveNistScope() {
    setSaving(true);
    setMessage(null);
    try {
      const updates = Object.entries(nistDraft)
        .filter(([, d]) => d.scope_status !== "undecided")
        .map(([id, d]) => ({
          subcategory_id: id,
          scope_status: d.scope_status,
          exclusion_reason: d.exclusion_reason,
        }));

      const res = await fetch("/api/csf-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Хадгалж чадсангүй");
      setData((prev) => (prev ? { ...prev, rows: payload.rows } : prev));
      setMessage({ tone: "success", text: "NIST CSF scope хадгалагдлаа" });
    } catch (err) {
      setMessage({
        tone: "error",
        text: err instanceof Error ? err.message : "Хадгалж чадсангүй",
      });
    } finally {
      setSaving(false);
    }
  }

  async function finalizeScope() {
    setSaving(true);
    setMessage(null);
    try {
      // Save selections + NIST scope together
      const updates = Object.entries(nistDraft)
        .filter(([, d]) => d.scope_status !== "undecided")
        .map(([id, d]) => ({
          subcategory_id: id,
          scope_status: d.scope_status,
          exclusion_reason: d.exclusion_reason,
        }));

      const res = await fetch("/api/csf-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates,
          assessment_scope: {
            assessment_name:
              data?.assessment_scope.assessment_name ??
              "2026 SME Cybersecurity Risk Assessment",
            assessment_type:
              data?.assessment_scope.assessment_type ?? "Asset-based",
            selected_department_ids: Array.from(selectedDeptIds),
            selected_business_process_ids: Array.from(selectedProcessIds),
            selected_asset_ids: Array.from(selectedAssetIds),
            status: "Active",
          },
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "Хадгалж чадсангүй");
      setData(payload);
      setMessage({ tone: "success", text: "Scope амжилттай тогтоогдлоо!" });
    } catch (err) {
      setMessage({
        tone: "error",
        text: err instanceof Error ? err.message : "Хадгалж чадсангүй",
      });
    } finally {
      setSaving(false);
    }
  }

  // ── Entity mutations ──────────────────────────────────────────────────────

  async function addDepartment(form: {
    department_name: string;
    owner_name: string;
    criticality: string;
    notes: string;
  }) {
    const res = await fetch("/api/csf-scope", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ department: form }),
    });
    const payload = (await res.json()) as ScopeResponse;
    if (!res.ok) throw new Error("Хэлтэс нэмж чадсангүй");
    setData(payload);
    // Auto-select the new department
    const newDept = payload.departments.find(
      (d) => d.department_name === form.department_name,
    );
    if (newDept) setSelectedDeptIds((prev) => new Set([...prev, newDept.id]));
  }

  async function deleteDepartment(id: number) {
    const res = await fetch(`/api/csf-scope?department_id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setSelectedDeptIds((prev) => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
      await fetchData();
    }
  }

  async function addProcess(form: {
    process_name: string;
    business_function: string;
    business_owner: string;
    criticality: string;
    description: string;
  }) {
    const res = await fetch("/api/business-processes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error ?? "Процесс нэмж чадсангүй");
    await fetchData();
    // Auto-select the new process
    if (payload.id)
      setSelectedProcessIds((prev) => new Set([...prev, payload.id]));
  }

  async function deleteProcess(id: number) {
    await fetch(`/api/business-processes?id=${id}`, { method: "DELETE" });
    setSelectedProcessIds((prev) => {
      const s = new Set(prev);
      s.delete(id);
      return s;
    });
    await fetchData();
  }

  async function addAsset(form: {
    asset_name: string;
    asset_type: string;
    department: string;
    criticality: string;
    internet_exposed: boolean;
  }) {
    const res = await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const payload = await res.json();
    if (!res.ok) throw new Error(payload.error ?? "Хөрөнгө нэмж чадсангүй");
    await fetchData();
    if (payload.id)
      setSelectedAssetIds((prev) => new Set([...prev, payload.id]));
  }

  function toggleDept(id: number) {
    setSelectedDeptIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
      }
      return s;
    });
  }

  function toggleProcess(id: number) {
    setSelectedProcessIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
      }
      return s;
    });
  }

  function toggleAsset(id: number) {
    setSelectedAssetIds((prev) => {
      const s = new Set(prev);
      if (s.has(id)) {
        s.delete(id);
      } else {
        s.add(id);
      }
      return s;
    });
  }

  function onNistChange(id: string, status: ScopeStatus, reason?: string) {
    setNistDraft((prev) => ({
      ...prev,
      [id]: {
        scope_status: status,
        exclusion_reason:
          reason !== undefined ? reason : (prev[id]?.exclusion_reason ?? ""),
      },
    }));
  }

  async function handleNext() {
    if (step === 1 || step === 2 || step === 3) {
      await saveSelections();
    } else if (step === 4) {
      await saveNistScope();
    }
    if (step < 6) setStep(step + 1);
  }

  function handlePrev() {
    setMessage(null);
    setStep((s) => Math.max(1, s - 1));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <AlertTriangle className="h-10 w-10 text-rose-500" />
        <p className="text-sm text-muted-foreground">
          Мэдээлэл уншиж чадсангүй
        </p>
        <Button size="sm" onClick={fetchData}>
          Дахин оролдох
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Эрсдэлийн үнэлгээний хамрах хүрээ
        </h1>
      </div>

      {/* Step indicator */}
      <div className="rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-950">
        <StepIndicator current={step} onNavigate={setStep} />
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            message.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
              : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
          }`}
        >
          {message.tone === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Step content */}
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-950">
        {step === 1 && (
          <Step1Departments
            departments={data.departments}
            selected={selectedDeptIds}
            onToggle={toggleDept}
            onAdd={addDepartment}
            onDelete={deleteDepartment}
          />
        )}
        {step === 2 && (
          <Step2Processes
            processes={data.business_processes}
            selected={selectedProcessIds}
            onToggle={toggleProcess}
            onAdd={addProcess}
            onDelete={deleteProcess}
            departments={data.departments}
            selectedDeptIds={selectedDeptIds}
          />
        )}
        {step === 3 && (
          <Step3Assets
            assets={data.assets}
            selected={selectedAssetIds}
            onToggle={toggleAsset}
            onAdd={addAsset}
            departments={data.departments}
            selectedDeptIds={selectedDeptIds}
          />
        )}
        {step === 4 && (
          <Step4NistCsf
            rows={data.rows}
            draft={nistDraft}
            onChange={onNistChange}
          />
        )}
        {step === 5 && (
          <Step5Review
            departments={data.departments}
            selectedDeptIds={selectedDeptIds}
            processes={data.business_processes}
            selectedProcessIds={selectedProcessIds}
            assets={data.assets}
            selectedAssetIds={selectedAssetIds}
            rows={data.rows}
            draft={nistDraft}
          />
        )}
        {step === 6 && <Step6RiskScope selectedAssetIds={selectedAssetIds} />}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={step === 1 || saving}
        >
          ← Өмнөх
        </Button>
        <span className="text-xs text-muted-foreground">
          {step} / {STEPS.length}
        </span>
        {step < 5 ? (
          <Button onClick={handleNext} disabled={saving}>
            {saving ? "Хадгалж байна…" : "Дараах →"}
          </Button>
        ) : step === 5 ? (
          <Button
            onClick={async () => {
              await finalizeScope();
              setStep(6);
            }}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {saving ? "Хадгалж байна…" : "Scope батлах & Дүгнэлт харах ✓"}
          </Button>
        ) : (
          <a href="/risk-register">
            <Button className="bg-slate-900 text-white hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950">
              Эрсдэлийн бүртгэл рүү шилжих
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
