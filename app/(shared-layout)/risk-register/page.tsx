"use client";

import { useAuth } from "@/app/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Database,
  FileText,
  Globe2,
  Layers,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type RiskLevel = "Low" | "Medium" | "High" | "Critical" | "Unknown";
type Method = "asset_threat" | "manual" | "framework";

type ThreatOption = {
  id: number;
  threat_name: string;
  description: string | null;
  threat_type: string | null;
  likelihood_level: number | null;
  potential_impact: string | null;
  nist_category: string | null;
  risk_level: RiskLevel | null;
  mitigation_notes: string | null;
  is_related: boolean;
};

type AssetOption = {
  id: number;
  asset_name: string;
  asset_type: string | null;
  criticality: string | null;
  data_classification: string | null;
  internet_exposed: boolean;
};

type AssetThreatMapping = {
  asset_id: number;
  asset_name: string;
  asset_type: string | null;
  criticality: string | null;
  internet_exposed: boolean;
  mapped_threat_count: number;
  highest_risk: string;
  threats: ThreatOption[];
};

type WizardRisk = {
  key: string;
  asset_id: number;
  asset_name: string;
  asset_type: string | null;
  asset_criticality: string | null;
  threat_id: number;
  threat_name: string;
  threat_type: string | null;
  nist_category: string | null;
  risk_title: string;
  vulnerability_description: string;
  key_controls: string;
  risk_owner: string;
  dept_owner: string;
  nist_csf_function: string;
  nist_csf_category: string;
  likelihood: number;
  impact: number;
  saved: boolean;
  db_id?: number;
};

type SavedRisk = {
  risk_id: number;
  risk_code: string;
  asset_name: string | null;
  threat_name: string | null;
  risk_title: string;
  inherent_likelihood: number;
  inherent_impact: number;
  inherent_risk_score: number;
  inherent_risk_level: RiskLevel;
  residual_risk_level: RiskLevel | null;
  status: string | null;
  created_at: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { label: "Аргачлал", sublabel: "Аргачлал сонгох" },
  { label: "Аюул холбох", sublabel: "Аюул ба хөрөнгийн холбоо" },
  { label: "Эмзэг байдал", sublabel: "Эмзэг байдал & хяналт" },
  { label: "Үнэлгээ", sublabel: "Магадлал ба нөлөөлөл" },
  { label: "Хадгалах", sublabel: "Хянах & батлах" },
];

const LIKELIHOOD_LABELS: Record<number, string> = {
  1: "Маш бага",
  2: "Бага",
  3: "Дундаж",
  4: "Их",
  5: "Маш их",
};

const IMPACT_LABELS: Record<number, string> = {
  1: "Мэдэгдэхгүй",
  2: "Бага",
  3: "Дунд",
  4: "Их",
  5: "Маш их",
};

const LEVEL_STYLE: Record<string, string> = {
  Critical: "border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300",
  High: "border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-900 dark:bg-orange-950/50 dark:text-orange-300",
  Medium: "border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
  Low: "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  Unknown: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
  None: "border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300",
};

// NIST CSF framework-based risk templates
const FRAMEWORK_RISKS: Array<{
  function_code: string;
  function_mn: string;
  category_code: string;
  category_name: string;
  risk_title: string;
  vulnerability_description: string;
}> = [
  { function_code: "GV", function_mn: "Засаглал", category_code: "GV.RM", category_name: "Risk Management Strategy", risk_title: "Эрсдэлийн удирдлагын бодлого байхгүй", vulnerability_description: "Байгууллагад кибер эрсдэлийн удирдлагын албан ёсны бодлого, журам байхгүй." },
  { function_code: "GV", function_mn: "Засаглал", category_code: "GV.SC", category_name: "Supply Chain Risk", risk_title: "Нийлүүлэлтийн сүлжээний эрсдэл", vulnerability_description: "Гуравдагч этгээдийн үйлчилгээ болон нийлүүлэгчдийн мэдээллийн аюулгүй байдал хангалтгүй." },
  { function_code: "ID", function_mn: "Таних", category_code: "ID.AM", category_name: "Asset Management", risk_title: "Бүртгэлгүй хөрөнгөөс үүдэх эрсдэл", vulnerability_description: "Мэдээллийн технологийн хөрөнгийн бүртгэл бүрэн биш, хуучирсан хөрөнгүүд байж болзошгүй." },
  { function_code: "ID", function_mn: "Таних", category_code: "ID.RA", category_name: "Risk Assessment", risk_title: "Тогтмол эрсдэлийн үнэлгээ хийгдэхгүй байна", vulnerability_description: "Байгууллагын эрсдэлийн үнэлгээ тогтмол хийгдэхгүй, шинэ аюулыг цаг тухайд нь илрүүлэхгүй." },
  { function_code: "PR", function_mn: "Хамгаалах", category_code: "PR.AA", category_name: "Identity & Access Control", risk_title: "Хандалтын эрхийн зохисгүй удирдлага", vulnerability_description: "Хэрэглэгчийн хандалтын эрх хяналтгүй, хуучирсан хандалтын эрх идэвхтэй байна." },
  { function_code: "PR", function_mn: "Хамгаалах", category_code: "PR.DS", category_name: "Data Security", risk_title: "Мэдээлэл шифрлэгдэхгүй байна", vulnerability_description: "Нууц мэдээлэл дамжуулах болон хадгалах явцад шифрлэгдэхгүй, задрах эрсдэлтэй." },
  { function_code: "PR", function_mn: "Хамгаалах", category_code: "PR.AT", category_name: "Awareness & Training", risk_title: "Мэдлэг дутмаглал - Фишинг халдлага", vulnerability_description: "Ажилтнуудын кибер аюулгүй байдлын сургалт хангалтгүй, фишинг халдлагад өртөх магадлал өндөр." },
  { function_code: "PR", function_mn: "Хамгаалах", category_code: "PR.PS", category_name: "Platform Security", risk_title: "Тохируулгын алдаанаас үүдэх эрсдэл", vulnerability_description: "Системийн тохируулга буруу, хамгаалалтын нөөц идэвхжүүлэгдэхгүй байна." },
  { function_code: "DE", function_mn: "Илрүүлэх", category_code: "DE.CM", category_name: "Continuous Monitoring", risk_title: "Системийн үйл ажиллагааны хяналт хангалтгүй", vulnerability_description: "Аюулт үйлдлийг цаг тухайд нь илрүүлэх тасралтгүй хяналтын механизм байхгүй." },
  { function_code: "DE", function_mn: "Илрүүлэх", category_code: "DE.AE", category_name: "Adverse Event Analysis", risk_title: "Аюулт үйлдлийн шинжилгээ хийгдэхгүй", vulnerability_description: "Аюулт үйлдлийг илрүүлсний дараа шинжилгээ хийх журам байхгүй." },
  { function_code: "RS", function_mn: "Хариу үйлдэл", category_code: "RS.MA", category_name: "Incident Management", risk_title: "Аюулт явдлын хариу үйлдлийн төлөвлөгөөгүй", vulnerability_description: "Кибер аюулт явдалд хариу үйлдэл үзүүлэх журам, нэгжийн бэлэн байдал хангалтгүй." },
  { function_code: "RS", function_mn: "Хариу үйлдэл", category_code: "RS.CO", category_name: "Communication", risk_title: "Аюулт явдлын мэдэгдлийн журамгүй", vulnerability_description: "Аюулт явдал гарсан үед хэн нэгэнд хэзээ мэдэгдэх талаар тодорхой журам байхгүй." },
  { function_code: "RC", function_mn: "Сэргээх", category_code: "RC.RP", category_name: "Recovery Execution", risk_title: "Системийн сэргээлтийн төлөвлөгөөгүй", vulnerability_description: "Мэдээллийн систем доголдсон үед сэргээх тодорхой журам, тест хийгдэхгүй байна." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcLevel(score: number): RiskLevel {
  if (score <= 4) return "Low";
  if (score <= 9) return "Medium";
  if (score <= 16) return "High";
  return "Critical";
}

function levelEmoji(level: string) {
  if (level === "Critical") return "🔴";
  if (level === "High") return "🟠";
  if (level === "Medium") return "🟡";
  if (level === "Low") return "🟢";
  return "⚪";
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

function StepIndicator({ current, onNavigate }: { current: number; onNavigate: (s: number) => void }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => onNavigate(n)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors ${
                active ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950"
                  : done ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active ? "bg-white text-slate-950 dark:bg-slate-950 dark:text-white"
                  : done ? "bg-emerald-500 text-white"
                  : "bg-muted text-muted-foreground"
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : n}
              </span>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold leading-tight">{step.label}</p>
                <p className={`text-[10px] leading-tight ${active ? "text-white/70 dark:text-slate-950/70" : "text-muted-foreground"}`}>
                  {step.sublabel}
                </p>
              </div>
            </button>
            {i < STEPS.length - 1 && <ChevronRight className="mx-1 h-4 w-4 shrink-0 text-muted-foreground/40" />}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: Method Selection ─────────────────────────────────────────────────

function Step1Method({ method, onChange }: { method: Method | null; onChange: (m: Method) => void }) {
  const options: Array<{ value: Method; icon: React.ElementType; title: string; description: string; badges: string[] }> = [
    {
      value: "asset_threat",
      icon: Layers,
      title: "Хөрөнгө & Аюул суурилсан",
      description: "Системд бүртгэгдсэн IT хөрөнгүүдийг авч, тэдэнд тохирох аюулуудыг автоматаар холбоно. Аюулын каталогоос хамгийн тохирохыг санал болгоно.",
      badges: ["Автомат", "Хөрөнгийн каталог", "Аюулын сан"],
    },
    {
      value: "manual",
      icon: Pencil,
      title: "Гараар нэмэх",
      description: "Хөрөнгө болон аюулыг өөрөө сонгон, эрсдэлийн мэдээллийг гараар оруулна. Тодорхой нэг хөрөнгийн эрсдэлийг хурдан нэмэхэд тохиромжтой.",
      badges: ["Уян хатан", "Гараар"],
    },
    {
      value: "framework",
      icon: BookOpen,
      title: "Framework суурилсан",
      description: "NIST CSF 2.0 функцүүдээс сонгоно. Тус функцийн стандарт эрсдэлийн жишиг загваруудаас ажлынхаа чиглэлийг авна.",
      badges: ["NIST CSF 2.0", "Загварчлал"],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Эрсдэлийн үнэлгээний аргачлал</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Байгууллагынхаа кибер эрсдэлийг үнэлэх аргачлалыг сонгоно уу. Та дараа нь өөрчилж болно.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = method === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-xl border p-5 text-left transition-all ${
                active
                  ? "border-slate-900 bg-slate-900 text-white ring-2 ring-slate-900/20 dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                  : "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950"
              }`}
            >
              <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl ${active ? "bg-white/20 dark:bg-slate-900/20" : "bg-slate-100 dark:bg-slate-800"}`}>
                <Icon className={`h-6 w-6 ${active ? "text-white dark:text-slate-950" : "text-slate-700 dark:text-slate-300"}`} />
              </div>
              <p className="text-sm font-bold leading-tight">{opt.title}</p>
              <p className={`mt-2 text-xs leading-relaxed ${active ? "text-white/80 dark:text-slate-950/70" : "text-muted-foreground"}`}>
                {opt.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {opt.badges.map((b) => (
                  <span
                    key={b}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      active ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-950" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {b}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 2: Connect Threats ──────────────────────────────────────────────────

function Step2AssetThreat({
  mappings,
  selected,
  onToggle,
  loading,
}: {
  mappings: AssetThreatMapping[];
  selected: Set<string>;
  onToggle: (key: string) => void;
  loading: boolean;
}) {
  const [expandedAssets, setExpandedAssets] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  function toggleAsset(id: number) {
    setExpandedAssets((prev) => {
      const s = new Set(prev);
      if (s.has(id)) { s.delete(id); } else { s.add(id); }
      return s;
    });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return mappings;
    return mappings.filter((m) =>
      m.asset_name.toLowerCase().includes(q) ||
      (m.asset_type ?? "").toLowerCase().includes(q) ||
      m.threats.some((t) => t.threat_name.toLowerCase().includes(q))
    );
  }, [mappings, search]);

  if (loading) return <div className="flex h-40 items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-4 border-slate-200 border-t-slate-700" /></div>;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Хөрөнгө & Аюул холбох</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Систем нь хөрөнгийн төрлөөс хамааран тохирох аюулуудыг санал болгов. Үнэлгээнд оруулах хосуудыг тэмдэглэнэ үү.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Хөрөнгө эсвэл аюулаар хайх…" className="pl-8" />
          <SlidersHorizontal className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        </div>
        <span className="shrink-0 text-sm text-muted-foreground">
          <span className="font-semibold text-slate-950 dark:text-slate-50">{selected.size}</span> хос сонгогдсон
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Database className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Хөрөнгө олдсонгүй. Эхлээд Хөрөнгүүд хуудаст хөрөнгө нэмнэ үү.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((asset) => {
            const expanded = expandedAssets.has(asset.asset_id);
            const selectedCount = asset.threats.filter((t) => selected.has(`${asset.asset_id}-${t.id}`)).length;
            return (
              <div key={asset.asset_id} className="overflow-hidden rounded-xl border dark:border-slate-800">
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/40"
                  onClick={() => toggleAsset(asset.asset_id)}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800`}>
                    <Database className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold">{asset.asset_name}</span>
                      {asset.asset_type && (
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">{asset.asset_type}</span>
                      )}
                      {asset.internet_exposed && (
                        <span className="flex items-center gap-0.5 rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-[10px] font-medium text-orange-700 dark:border-orange-800 dark:bg-orange-950/30">
                          <Globe2 className="h-2.5 w-2.5" />Internet
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{asset.threats.length} аюул холбогдсон · {selectedCount > 0 && <span className="font-medium text-emerald-600">{selectedCount} сонгогдсон</span>}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${LEVEL_STYLE[asset.highest_risk] ?? LEVEL_STYLE.Unknown}`}>
                    {levelEmoji(asset.highest_risk)} {asset.highest_risk}
                  </span>
                  {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
                </div>
                {expanded && (
                  <div className="border-t dark:border-slate-800">
                    <div className="flex items-center justify-between border-b bg-muted/30 px-4 py-1.5 dark:border-slate-800">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Аюулууд</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const allSelected = asset.threats.every((t) => selected.has(`${asset.asset_id}-${t.id}`));
                          asset.threats.forEach((t) => onToggle(`${asset.asset_id}-${t.id}`));
                          void allSelected;
                        }}
                        className="text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400"
                      >
                        Бүгдийг сонгох
                      </button>
                    </div>
                    <div className="divide-y dark:divide-slate-800">
                      {asset.threats.map((threat) => {
                        const key = `${asset.asset_id}-${threat.id}`;
                        const isSelected = selected.has(key);
                        return (
                          <div
                            key={threat.id}
                            className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${isSelected ? "bg-emerald-50/50 dark:bg-emerald-950/10" : "hover:bg-muted/30"}`}
                            onClick={() => onToggle(key)}
                          >
                            <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isSelected ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600"}`}>
                              {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-medium">{threat.threat_name}</span>
                                {threat.threat_type && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400">{threat.threat_type}</span>
                                )}
                              </div>
                              {threat.description && (
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{threat.description}</p>
                              )}
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${LEVEL_STYLE[threat.risk_level ?? "Unknown"] ?? LEVEL_STYLE.Unknown}`}>
                              {threat.risk_level ?? "Unknown"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
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

function Step2Manual({
  assets,
  threats,
  risks,
  onAdd,
  onRemove,
}: {
  assets: AssetOption[];
  threats: ThreatOption[];
  risks: WizardRisk[];
  onAdd: (risk: WizardRisk) => void;
  onRemove: (key: string) => void;
}) {
  const [form, setForm] = useState({ asset_id: "", threat_id: "", risk_title: "" });

  function handleAdd() {
    const asset = assets.find((a) => a.id === Number(form.asset_id));
    const threat = threats.find((t) => t.id === Number(form.threat_id));
    if (!asset || !threat || !form.risk_title.trim()) return;
    onAdd({
      key: uid(),
      asset_id: asset.id,
      asset_name: asset.asset_name,
      asset_type: asset.asset_type,
      asset_criticality: asset.criticality,
      threat_id: threat.id,
      threat_name: threat.threat_name,
      threat_type: threat.threat_type,
      nist_category: threat.nist_category,
      risk_title: form.risk_title,
      vulnerability_description: "",
      key_controls: "",
      risk_owner: "",
      dept_owner: "",
      nist_csf_function: "",
      nist_csf_category: threat.nist_category ?? "",
      likelihood: 3,
      impact: 3,
      saved: false,
    });
    setForm({ asset_id: "", threat_id: "", risk_title: "" });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Гараар эрсдэл нэмэх</h2>
        <p className="mt-1 text-sm text-muted-foreground">Хөрөнгө болон аюулыг сонгоод, эрсдэлийн гарчиг оруулна уу.</p>
      </div>
      <div className="rounded-xl border bg-slate-50 p-4 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium">Хөрөнгө *</label>
            <select
              value={form.asset_id}
              onChange={(e) => setForm((f) => ({ ...f, asset_id: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Сонгох —</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>{a.asset_name} {a.asset_type ? `(${a.asset_type})` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium">Аюул *</label>
            <select
              value={form.threat_id}
              onChange={(e) => setForm((f) => ({ ...f, threat_id: e.target.value }))}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">— Сонгох —</option>
              {threats.map((t) => (
                <option key={t.id} value={t.id}>{t.threat_name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium">Эрсдэлийн гарчиг *</label>
            <Input
              value={form.risk_title}
              onChange={(e) => setForm((f) => ({ ...f, risk_title: e.target.value }))}
              placeholder="Жнь: Хэрэглэгчийн нууц үг алдагдах эрсдэл"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!form.asset_id || !form.threat_id || !form.risk_title.trim()}
          >
            <Plus className="h-4 w-4" /> Нэмэх
          </Button>
        </div>
      </div>

      {risks.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-12">
          <ShieldAlert className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Эрсдэл нэмэгдэхгүй байна</p>
        </div>
      ) : (
        <div className="space-y-2">
          {risks.map((r) => (
            <div key={r.key} className="flex items-center gap-3 rounded-lg border bg-white p-3 dark:bg-slate-950">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{r.risk_title}</p>
                <p className="text-xs text-muted-foreground">{r.asset_name} → {r.threat_name}</p>
              </div>
              <button type="button" onClick={() => onRemove(r.key)} className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Step2Framework({
  risks,
  onToggle,
}: {
  risks: WizardRisk[];
  onToggle: (key: string) => void;
}) {
  const selectedKeys = new Set(risks.map((r) => r.key));
  const [expandedFns, setExpandedFns] = useState<Set<string>>(new Set(["GV", "ID", "PR"]));
  const FN_META: Record<string, { mn: string; color: string }> = {
    GV: { mn: "Засаглал", color: "bg-violet-500" },
    ID: { mn: "Таних", color: "bg-sky-500" },
    PR: { mn: "Хамгаалах", color: "bg-emerald-500" },
    DE: { mn: "Илрүүлэх", color: "bg-amber-500" },
    RS: { mn: "Хариу үйлдэл", color: "bg-rose-500" },
    RC: { mn: "Сэргээх", color: "bg-lime-500" },
  };
  const byFunction = FRAMEWORK_RISKS.reduce((acc, r) => {
    if (!acc[r.function_code]) acc[r.function_code] = [];
    acc[r.function_code].push(r);
    return acc;
  }, {} as Record<string, typeof FRAMEWORK_RISKS>);

  function toggleFn(fn: string) {
    setExpandedFns((prev) => { const s = new Set(prev); if (s.has(fn)) { s.delete(fn); } else { s.add(fn); } return s; });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">NIST CSF суурилсан эрсдэлийн жагсаалт</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          NIST CSF 2.0 функцийн стандарт эрсдэлийн загваруудаас үнэлгээнд оруулахыг сонгоно уу.
        </p>
      </div>
      <div className="space-y-2">
        {Object.entries(byFunction).map(([fn, items]) => {
          const meta = FN_META[fn] ?? { mn: fn, color: "bg-slate-500" };
          const expanded = expandedFns.has(fn);
          const selectedInFn = items.filter((item) => {
            const key = `fw-${item.category_code}-${item.risk_title.slice(0, 20)}`;
            return selectedKeys.has(key);
          }).length;
          return (
            <div key={fn} className="overflow-hidden rounded-xl border dark:border-slate-800">
              <button
                type="button"
                onClick={() => toggleFn(fn)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
              >
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${meta.color}`}>
                  <span className="text-xs font-bold text-white">{fn}</span>
                </div>
                <span className="flex-1 text-sm font-semibold">{meta.mn}</span>
                {selectedInFn > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">{selectedInFn} сонгогдсон</span>}
                {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>
              {expanded && (
                <div className="divide-y border-t dark:divide-slate-800 dark:border-slate-800">
                  {items.map((item) => {
                    const key = `fw-${item.category_code}-${item.risk_title.slice(0, 20)}`;
                    const isSelected = selectedKeys.has(key);
                    return (
                      <div
                        key={key}
                        className={`flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors ${isSelected ? "bg-emerald-50/50 dark:bg-emerald-950/10" : "hover:bg-muted/30"}`}
                        onClick={() => onToggle(key)}
                      >
                        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${isSelected ? "border-emerald-500 bg-emerald-500" : "border-slate-300 dark:border-slate-600"}`}>
                          {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">{item.category_code}</span>
                            <span className="text-sm font-medium">{item.risk_title}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{item.vulnerability_description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 3: Vulnerabilities & Controls ──────────────────────────────────────

function Step3Vuln({
  risks,
  onChange,
}: {
  risks: WizardRisk[];
  onChange: (key: string, field: keyof WizardRisk, value: string) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(risks.slice(0, 3).map((r) => r.key)));

  function toggleCard(key: string) {
    setExpanded((prev) => { const s = new Set(prev); if (s.has(key)) { s.delete(key); } else { s.add(key); } return s; });
  }

  const CSF_FUNCTIONS = ["Govern", "Identify", "Protect", "Detect", "Respond", "Recover"];
  const CSF_CATEGORIES = ["GV.OC","GV.RM","GV.RR","GV.PO","GV.SC","ID.AM","ID.RA","PR.AA","PR.AT","PR.DS","PR.PS","PR.IR","DE.CM","DE.AE","RS.MA","RS.AN","RS.CO","RS.MI","RC.RP","RC.CO"];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Эмзэг байдал & Одоогийн хяналт</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Тус бүр эрсдэлд өнөөгийн эмзэг байдал болон хэрэгжиж буй хяналтыг тодорхойлно уу.
        </p>
      </div>
      <div className="space-y-2">
        {risks.map((r, i) => {
          const isExpanded = expanded.has(r.key);
          return (
            <div key={r.key} className="overflow-hidden rounded-xl border dark:border-slate-800">
              <div
                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted/40"
                onClick={() => toggleCard(r.key)}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">{r.risk_title}</p>
                  <p className="text-xs text-muted-foreground">{r.asset_name} → {r.threat_name}</p>
                </div>
                {(r.vulnerability_description || r.key_controls) && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                )}
                {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </div>
              {isExpanded && (
                <div className="border-t px-4 py-4 dark:border-slate-800">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-medium">Эмзэг байдлын тайлбар</label>
                      <Textarea
                        value={r.vulnerability_description}
                        onChange={(e) => onChange(r.key, "vulnerability_description", e.target.value)}
                        rows={3}
                        placeholder="Ямар эмзэг байдал байна вэ? Жнь: Нууц үг дангаараа ашигладаг, MFA байхгүй..."
                        className="resize-y text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Одоогийн хяналт</label>
                      <Textarea
                        value={r.key_controls}
                        onChange={(e) => onChange(r.key, "key_controls", e.target.value)}
                        rows={3}
                        placeholder="Одоо ямар хяналт хэрэгжиж байна вэ? Жнь: Антивирус суулгасан, гар утасны баталгаажуулалт нэвтрүүлсэн..."
                        className="resize-y text-sm"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Эрсдэлийн эзэн</label>
                      <Input
                        value={r.risk_owner}
                        onChange={(e) => onChange(r.key, "risk_owner", e.target.value)}
                        placeholder="Хариуцах этгээд"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">Хариуцах хэлтэс</label>
                      <Input
                        value={r.dept_owner}
                        onChange={(e) => onChange(r.key, "dept_owner", e.target.value)}
                        placeholder="Жнь: Мэдээллийн технологийн хэлтэс"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">NIST CSF Функц</label>
                      <select
                        value={r.nist_csf_function}
                        onChange={(e) => onChange(r.key, "nist_csf_function", e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">— Сонгох —</option>
                        {CSF_FUNCTIONS.map((fn) => <option key={fn} value={fn}>{fn}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium">NIST CSF Категори</label>
                      <select
                        value={r.nist_csf_category}
                        onChange={(e) => onChange(r.key, "nist_csf_category", e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="">— Сонгох —</option>
                        {CSF_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Step 4: Likelihood & Impact ─────────────────────────────────────────────

function ScoreSelector({
  label,
  value,
  onChange,
  labels,
  colors,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  labels: Record<number, string>;
  colors: Record<number, string>;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className="grid grid-cols-5 gap-1">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`flex flex-col items-center rounded-lg border p-2 text-center transition-all ${
              value === v
                ? `${colors[v]} ring-2 ring-offset-1`
                : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900"
            }`}
          >
            <span className="text-lg font-bold leading-none">{v}</span>
            <span className={`mt-1 text-[9px] font-medium leading-tight ${value === v ? "" : "text-muted-foreground"}`}>
              {labels[v]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

const LIKELIHOOD_COLORS: Record<number, string> = {
  1: "border-emerald-300 bg-emerald-50 text-emerald-800 ring-emerald-200",
  2: "border-lime-300 bg-lime-50 text-lime-800 ring-lime-200",
  3: "border-amber-300 bg-amber-50 text-amber-800 ring-amber-200",
  4: "border-orange-300 bg-orange-50 text-orange-800 ring-orange-200",
  5: "border-red-300 bg-red-50 text-red-800 ring-red-200",
};

const IMPACT_COLORS: Record<number, string> = {
  1: "border-emerald-300 bg-emerald-50 text-emerald-800 ring-emerald-200",
  2: "border-lime-300 bg-lime-50 text-lime-800 ring-lime-200",
  3: "border-amber-300 bg-amber-50 text-amber-800 ring-amber-200",
  4: "border-orange-300 bg-orange-50 text-orange-800 ring-orange-200",
  5: "border-red-300 bg-red-50 text-red-800 ring-red-200",
};

function Step4Score({
  risks,
  onChange,
}: {
  risks: WizardRisk[];
  onChange: (key: string, field: "likelihood" | "impact", value: number) => void;
}) {
  const [current, setCurrent] = useState(0);
  const risk = risks[current];

  if (!risk) return null;

  const score = risk.likelihood * risk.impact;
  const level = calcLevel(score);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold">Магадлал & Нөлөөлөл үнэлгээ</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Тус бүр эрсдэлийн магадлал (1–5) болон нөлөөллийг (1–5) үнэлнэ. Оноо = Магадлал × Нөлөөлөл.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full bg-slate-900 dark:bg-slate-100 transition-all" style={{ width: `${((current + 1) / risks.length) * 100}%` }} />
        </div>
        <span className="shrink-0 text-sm font-medium">{current + 1} / {risks.length}</span>
      </div>

      {/* Risk list mini nav */}
      <div className="flex gap-1.5 flex-wrap">
        {risks.map((r, i) => {
          const s = r.likelihood * r.impact;
          const lv = calcLevel(s);
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setCurrent(i)}
              className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-xs font-bold transition-colors ${
                i === current
                  ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-950"
                  : LEVEL_STYLE[lv]
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>

      {/* Score card */}
      <div className="rounded-xl border bg-white p-5 shadow-sm dark:bg-slate-950">
        <div className="mb-4">
          <p className="text-xs font-semibold text-muted-foreground">{risk.asset_name} → {risk.threat_name}</p>
          <h3 className="mt-1 text-base font-bold">{risk.risk_title}</h3>
          {risk.vulnerability_description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{risk.vulnerability_description}</p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ScoreSelector
            label="Магадлал"
            value={risk.likelihood}
            onChange={(v) => onChange(risk.key, "likelihood", v)}
            labels={LIKELIHOOD_LABELS}
            colors={LIKELIHOOD_COLORS}
          />
          <ScoreSelector
            label="Нөлөөлөл"
            value={risk.impact}
            onChange={(v) => onChange(risk.key, "impact", v)}
            labels={IMPACT_LABELS}
            colors={IMPACT_COLORS}
          />
        </div>

        <div className="mt-5 flex items-center gap-4 rounded-xl border-2 p-4 dark:border-slate-700">
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground">Магадлал</p>
            <p className="text-3xl font-black">{risk.likelihood}</p>
          </div>
          <X className="h-5 w-5 text-muted-foreground" />
          <div className="text-center">
            <p className="text-xs font-medium text-muted-foreground">Нөлөөлөл</p>
            <p className="text-3xl font-black">{risk.impact}</p>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1 text-center">
            <p className="text-xs font-medium text-muted-foreground">Эрсдэлийн оноо</p>
            <p className="text-3xl font-black">{score}</p>
          </div>
          <div className={`rounded-xl border-2 px-4 py-2 text-center font-bold ${LEVEL_STYLE[level]}`}>
            <p className="text-lg">{levelEmoji(level)}</p>
            <p className="text-xs font-bold">{level}</p>
          </div>
        </div>

        <div className="mt-4 flex justify-between">
          <Button variant="outline" size="sm" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}>
            ← Өмнөх
          </Button>
          <Button size="sm" onClick={() => setCurrent((c) => Math.min(risks.length - 1, c + 1))} disabled={current === risks.length - 1}>
            Дараах →
          </Button>
        </div>
      </div>

      {/* Score matrix reference */}
      <div className="rounded-xl border bg-white p-4 dark:bg-slate-950">
        <p className="mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">5×5 Эрсдэлийн матриц</p>
        <div className="overflow-x-auto">
          <table className="w-full text-center text-[11px]">
            <thead>
              <tr>
                <th className="p-1 text-muted-foreground">M \ N</th>
                {[1, 2, 3, 4, 5].map((i) => <th key={i} className="p-1 font-semibold">{i}</th>)}
              </tr>
            </thead>
            <tbody>
              {[5, 4, 3, 2, 1].map((l) => (
                <tr key={l}>
                  <td className="p-1 font-semibold">{l}</td>
                  {[1, 2, 3, 4, 5].map((i) => {
                    const s = l * i;
                    const lv = calcLevel(s);
                    const current_cell = risk.likelihood === l && risk.impact === i;
                    return (
                      <td
                        key={i}
                        className={`rounded p-1 font-bold ${
                          current_cell ? "ring-2 ring-slate-900 dark:ring-slate-100" : ""
                        } ${LEVEL_STYLE[lv]}`}
                      >
                        {s}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
            {[["Low", "1–4"], ["Medium", "5–9"], ["High", "10–16"], ["Critical", "17–25"]].map(([lv, range]) => (
              <span key={lv} className={`rounded-full border px-2 py-0.5 font-semibold ${LEVEL_STYLE[lv]}`}>{lv} ({range})</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Review & Save ────────────────────────────────────────────────────

function Step5Review({
  risks,
  savedRisks,
  saving,
  saved,
  onSave,
}: {
  risks: WizardRisk[];
  savedRisks: SavedRisk[];
  saving: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  const byLevel = risks.reduce((acc, r) => {
    const lv = calcLevel(r.likelihood * r.impact);
    acc[lv] = (acc[lv] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sorted = [...risks].sort((a, b) => (b.likelihood * b.impact) - (a.likelihood * a.impact));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Хянах & Хадгалах</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Бүх эрсдэлийг хянаад баталгаажуулна уу. &ldquo;Хадгалах&rdquo; дарахад систем эрсдэлийн бүртгэлд нэмнэ.
        </p>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["Critical", "High", "Medium", "Low"] as const).map((lv) => (
          <div key={lv} className={`rounded-xl border p-3 text-center ${LEVEL_STYLE[lv]}`}>
            <p className="text-2xl font-black">{byLevel[lv] ?? 0}</p>
            <p className="text-xs font-semibold">{lv}</p>
          </div>
        ))}
      </div>

      {/* Risk list */}
      <div className="space-y-2">
        {sorted.map((r, i) => {
          const score = r.likelihood * r.impact;
          const level = calcLevel(score);
          return (
            <div key={r.key} className={`rounded-lg border p-3 ${r.saved ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold dark:bg-slate-800">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{r.risk_title}</span>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${LEVEL_STYLE[level]}`}>
                      {levelEmoji(level)} {level}
                    </span>
                    {r.saved && <span className="text-[10px] font-semibold text-emerald-600">✓ Хадгалагдсан</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{r.asset_name} → {r.threat_name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>Магадлал: <strong>{r.likelihood}</strong> ({LIKELIHOOD_LABELS[r.likelihood]})</span>
                    <span>Нөлөөлөл: <strong>{r.impact}</strong> ({IMPACT_LABELS[r.impact]})</span>
                    <span>Оноо: <strong>{score}</strong></span>
                  </div>
                  {r.vulnerability_description && (
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      <span className="font-medium">Эмзэг байдал:</span> {r.vulnerability_description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!saved && risks.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={onSave}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            size="lg"
          >
            {saving ? (
              <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Хадгалж байна…</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />{risks.length} эрсдэл хадгалах</>
            )}
          </Button>
        </div>
      )}

      {saved && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Амжилттай хадгалагдлаа!</p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">{risks.length} эрсдэл эрсдэлийн бүртгэлд нэмэгдлээ.</p>
          </div>
        </div>
      )}

      {/* Existing risks history */}
      {savedRisks.length > 0 && (
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <FileText className="h-4 w-4" />
            Өмнөх үнэлгээнүүд ({savedRisks.length})
          </h3>
          <div className="overflow-hidden rounded-xl border dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Эрсдэл</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground hidden md:table-cell">Хөрөнгө</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Оноо</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">Түвшин</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground hidden sm:table-cell">Төлөв</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {savedRisks.slice(0, 20).map((r) => (
                  <tr key={r.risk_id} className="hover:bg-muted/30">
                    <td className="px-4 py-2">
                      <p className="font-medium line-clamp-1">{r.risk_title}</p>
                      <p className="text-xs text-muted-foreground">{r.risk_code}</p>
                    </td>
                    <td className="px-4 py-2 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">{r.asset_name ?? "—"}</p>
                    </td>
                    <td className="px-4 py-2 text-center font-bold">{r.inherent_risk_score}</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${LEVEL_STYLE[r.inherent_risk_level]}`}>
                        {levelEmoji(r.inherent_risk_level)} {r.inherent_risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-center hidden sm:table-cell">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] dark:bg-slate-800">{r.status ?? "Open"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RiskAssessmentPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<Method | null>(null);

  // Data
  const [assetMappings, setAssetMappings] = useState<AssetThreatMapping[]>([]);
  const [allAssets, setAllAssets] = useState<AssetOption[]>([]);
  const [allThreats, setAllThreats] = useState<ThreatOption[]>([]);
  const [savedRisks, setSavedRisks] = useState<SavedRisk[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Wizard state
  const [selectedPairKeys, setSelectedPairKeys] = useState<Set<string>>(new Set());
  const [wizardRisks, setWizardRisks] = useState<WizardRisk[]>([]);
  const [frameworkKeys, setFrameworkKeys] = useState<Set<string>>(new Set());

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [mappingsRes, assetsRes, threatsRes, risksRes] = await Promise.all([
        fetch("/api/threats/by-asset"),
        fetch("/api/assets"),
        fetch("/api/threats"),
        fetch("/api/risk-register"),
      ]);
      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        setAssetMappings(data.assets ?? []);
      }
      if (assetsRes.ok) {
        const data = await assetsRes.json();
        setAllAssets(data.assets ?? []);
      }
      if (threatsRes.ok) {
        const data = await threatsRes.json();
        const threats = Array.isArray(data) ? data : (data.threats ?? []);
        setAllThreats(threats);
      }
      if (risksRes.ok) {
        const data = await risksRes.json();
        setSavedRisks(data.risks ?? []);
      }
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Build wizard risks when step 2 selections change
  function buildRisksFromPairs() {
    const risks: WizardRisk[] = [];
    for (const key of selectedPairKeys) {
      const [assetIdStr, threatIdStr] = key.split("-");
      const assetId = Number(assetIdStr);
      const threatId = Number(threatIdStr);
      const asset = assetMappings.find((a) => a.asset_id === assetId);
      const threat = asset?.threats.find((t) => t.id === threatId);
      if (!asset || !threat) continue;
      risks.push({
        key,
        asset_id: assetId,
        asset_name: asset.asset_name,
        asset_type: asset.asset_type,
        asset_criticality: asset.criticality,
        threat_id: threatId,
        threat_name: threat.threat_name,
        threat_type: threat.threat_type,
        nist_category: threat.nist_category,
        risk_title: `${threat.threat_name} — ${asset.asset_name}`,
        vulnerability_description: threat.description ?? "",
        key_controls: threat.mitigation_notes ?? "",
        risk_owner: "",
        dept_owner: "",
        nist_csf_function: "",
        nist_csf_category: threat.nist_category ?? "",
        likelihood: Math.max(1, Math.min(5, threat.likelihood_level ?? 3)),
        impact: asset.criticality?.toLowerCase().includes("tier 0") ? 5
          : asset.criticality?.toLowerCase().includes("tier 1") ? 4
          : asset.criticality?.toLowerCase().includes("tier 2") ? 3
          : 3,
        saved: false,
      });
    }
    return risks;
  }

  function buildRisksFromFramework() {
    const risks: WizardRisk[] = [];
    for (const key of frameworkKeys) {
      const template = FRAMEWORK_RISKS.find((t) => `fw-${t.category_code}-${t.risk_title.slice(0, 20)}` === key);
      if (!template) continue;
      risks.push({
        key,
        asset_id: 0,
        asset_name: "Байгууллагын ерөнхий",
        asset_type: null,
        asset_criticality: null,
        threat_id: 0,
        threat_name: template.category_name,
        threat_type: "Framework",
        nist_category: template.category_code,
        risk_title: template.risk_title,
        vulnerability_description: template.vulnerability_description,
        key_controls: "",
        risk_owner: "",
        dept_owner: "",
        nist_csf_function: template.function_mn,
        nist_csf_category: template.category_code,
        likelihood: 3,
        impact: 3,
        saved: false,
      });
    }
    return risks;
  }

  function handleTogglePair(key: string) {
    setSelectedPairKeys((prev) => {
      const s = new Set(prev);
      if (s.has(key)) { s.delete(key); } else { s.add(key); }
      return s;
    });
  }

  function handleToggleFramework(key: string) {
    setFrameworkKeys((prev) => {
      const s = new Set(prev);
      if (s.has(key)) { s.delete(key); } else { s.add(key); }
      return s;
    });
  }

  function handleAddManualRisk(risk: WizardRisk) {
    setWizardRisks((prev) => [...prev, risk]);
  }

  function handleRemoveManualRisk(key: string) {
    setWizardRisks((prev) => prev.filter((r) => r.key !== key));
  }

  function handleVulnChange(key: string, field: keyof WizardRisk, value: string) {
    setWizardRisks((prev) => prev.map((r) => r.key === key ? { ...r, [field]: value } : r));
  }

  function handleScoreChange(key: string, field: "likelihood" | "impact", value: number) {
    setWizardRisks((prev) => prev.map((r) => r.key === key ? { ...r, [field]: value } : r));
  }

  function getCurrentRisks(): WizardRisk[] {
    if (method === "asset_threat") return buildRisksFromPairs();
    if (method === "framework") return buildRisksFromFramework();
    return wizardRisks;
  }

  function prepareStep3Or4() {
    const current = getCurrentRisks();
    // Merge with existing wizard risks to preserve edits
    const existingByKey = new Map(wizardRisks.map((r) => [r.key, r]));
    const merged = current.map((r) => existingByKey.get(r.key) ?? r);
    setWizardRisks(merged);
  }

  async function handleNext() {
    setMessage(null);
    if (step === 1 && !method) {
      setMessage({ tone: "error", text: "Аргачлал сонгоно уу" });
      return;
    }
    if (step === 2) {
      const count = method === "asset_threat" ? selectedPairKeys.size
        : method === "framework" ? frameworkKeys.size
        : wizardRisks.length;
      if (count === 0) {
        setMessage({ tone: "error", text: "Дор хаяж нэг эрсдэл сонгоно уу" });
        return;
      }
      prepareStep3Or4();
    }
    setStep((s) => Math.min(5, s + 1));
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    let successCount = 0;
    let errorCount = 0;

    for (const risk of wizardRisks) {
      if (risk.saved) continue;
      try {
        // Create risk register entry
        const rrRes = await fetch("/api/risk-register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asset_id: risk.asset_id || null,
            threat_id: risk.threat_id || null,
            risk_title: risk.risk_title,
            risk_description: risk.vulnerability_description,
            vulnerability_description: risk.vulnerability_description,
            key_controls: risk.key_controls,
            risk_owner: risk.risk_owner || null,
            department_control_owner: risk.dept_owner || null,
            nist_csf_function: risk.nist_csf_function || null,
            nist_csf_category: risk.nist_csf_category || null,
            assessed_by: user?.name ?? user?.email ?? null,
          }),
        });

        if (!rrRes.ok) { errorCount++; continue; }
        const rrData = await rrRes.json();
        const dbId: number = rrData.risk?.id ?? rrData.id;

        if (dbId) {
          // Create risk analysis
          await fetch("/api/risk-analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              risk_id: dbId,
              likelihood: risk.likelihood,
              impact: risk.impact,
              business_impact_description: risk.vulnerability_description,
              assessed_by: user?.name ?? user?.email ?? null,
            }),
          });

          setWizardRisks((prev) =>
            prev.map((r) => r.key === risk.key ? { ...r, saved: true, db_id: dbId } : r)
          );
          successCount++;
        }
      } catch {
        errorCount++;
      }
    }

    setSaving(false);
    if (errorCount === 0) {
      setSaved(true);
      setMessage({ tone: "success", text: `${successCount} эрсдэл амжилттай хадгалагдлаа!` });
      await fetchData();
    } else {
      setMessage({ tone: "error", text: `${successCount} амжилттай, ${errorCount} алдаатай.` });
    }
  }

  const currentRisks = step >= 3 ? wizardRisks : getCurrentRisks();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Эрсдэлийн үнэлгээ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Байгууллагын кибер эрсдэлийг 5 алхмаар тодорхойлж, үнэлнэ
        </p>
      </div>

      {/* Step indicator */}
      <div className="rounded-xl border bg-white p-3 shadow-sm dark:bg-slate-950">
        <StepIndicator current={step} onNavigate={(n) => { if (n < step) setStep(n); }} />
      </div>

      {/* Message */}
      {message && (
        <div className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
          message.tone === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
            : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300"
        }`}>
          {message.tone === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {/* Step content */}
      <div className="rounded-xl border bg-white p-6 shadow-sm dark:bg-slate-950">
        {step === 1 && <Step1Method method={method} onChange={setMethod} />}

        {step === 2 && method === "asset_threat" && (
          <Step2AssetThreat
            mappings={assetMappings}
            selected={selectedPairKeys}
            onToggle={handleTogglePair}
            loading={loadingData}
          />
        )}
        {step === 2 && method === "manual" && (
          <Step2Manual
            assets={allAssets}
            threats={allThreats}
            risks={wizardRisks}
            onAdd={handleAddManualRisk}
            onRemove={handleRemoveManualRisk}
          />
        )}
        {step === 2 && method === "framework" && (
          <Step2Framework
            risks={wizardRisks.filter((r) => r.threat_type === "Framework")}
            onToggle={handleToggleFramework}
          />
        )}

        {step === 3 && (
          <Step3Vuln risks={currentRisks} onChange={handleVulnChange} />
        )}

        {step === 4 && (
          <Step4Score risks={currentRisks} onChange={handleScoreChange} />
        )}

        {step === 5 && (
          <Step5Review
            risks={currentRisks}
            savedRisks={savedRisks}
            saving={saving}
            saved={saved}
            onSave={handleSave}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => { setMessage(null); setStep((s) => Math.max(1, s - 1)); }}
          disabled={step === 1}
        >
          ← Өмнөх
        </Button>
        <span className="text-xs text-muted-foreground">{step} / {STEPS.length}</span>
        {step < 5 ? (
          <Button onClick={handleNext}>Дараах →</Button>
        ) : (
          <Button variant="outline" onClick={() => { setStep(1); setMethod(null); setWizardRisks([]); setSelectedPairKeys(new Set()); setFrameworkKeys(new Set()); setSaved(false); setMessage(null); }}>
            <RefreshCw className="mr-2 h-4 w-4" />Шинэ үнэлгээ
          </Button>
        )}
      </div>
    </div>
  );
}
