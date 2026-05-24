"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  Save,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Row = {
  risk_register_id: number;
  risk_title: string;
  risk_description: string | null;
  asset_id: number | null;
  asset_name: string | null;
  asset_type: string | null;
  criticality: string | null;
  nist_csf_function: string | null;
  nist_csf_category: string | null;
  applicable_asset_types: string | null;
  likelihood: number | null;
  impact: number | null;
  risk_score: number | null;
  risk_level: string | null;
};

const FUNCTIONS = [
  { value: "Govern", label: "Govern (Засаглал)" },
  { value: "Identify", label: "Identify (Таних)" },
  { value: "Protect", label: "Protect (Хамгаалах)" },
  { value: "Detect", label: "Detect (Илрүүлэх)" },
  { value: "Respond", label: "Respond (Хариу үйлдэл)" },
  { value: "Recover", label: "Recover (Сэргээх)" },
];

const CATEGORIES_BY_FUNCTION: Record<string, string[]> = {
  Govern: ["GV.OC", "GV.RM", "GV.RR", "GV.PO", "GV.OV", "GV.SC"],
  Identify: ["ID.AM", "ID.RA", "ID.IM"],
  Protect: ["PR.AA", "PR.AT", "PR.DS", "PR.PS", "PR.IR"],
  Detect: ["DE.CM", "DE.AE"],
  Respond: ["RS.MA", "RS.AN", "RS.CO", "RS.MI"],
  Recover: ["RC.RP", "RC.CO"],
};

const ASSET_TYPE_OPTIONS = [
  "Server",
  "Database",
  "Application",
  "Network",
  "Storage",
  "Endpoint",
  "Identity",
  "Cloud Service",
  "Data",
  "People",
];

const LEVEL_COLOR: Record<string, string> = {
  Critical: "bg-rose-100 text-rose-700 border-rose-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function calcLevel(L: number, I: number): string {
  const s = L * I;
  if (s <= 4) return "Low";
  if (s <= 9) return "Medium";
  if (s <= 16) return "High";
  return "Critical";
}

export default function TriagePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<number, Partial<Row>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterUntagged, setFilterUntagged] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/risks/bulk-update");
      const d = await r.json();
      setRows(d.rows ?? []);
      setEdits({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const filtered = useMemo(() => {
    if (!filterUntagged) return rows;
    return rows.filter(
      (r) =>
        !r.nist_csf_function ||
        !r.applicable_asset_types ||
        !r.likelihood ||
        !r.impact,
    );
  }, [rows, filterUntagged]);

  function updateEdit(id: number, patch: Partial<Row>) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function effective(row: Row): Row {
    return { ...row, ...edits[row.risk_register_id] };
  }

  async function save() {
    const patches = Object.entries(edits)
      .map(([id, patch]) => {
        const row = rows.find((r) => r.risk_register_id === Number(id));
        if (!row) return null;
        const e = { ...row, ...patch };
        return {
          risk_register_id: Number(id),
          nist_csf_function: e.nist_csf_function ?? null,
          nist_csf_category: e.nist_csf_category ?? null,
          applicable_asset_types: e.applicable_asset_types ?? null,
          likelihood: e.likelihood ?? null,
          impact: e.impact ?? null,
        };
      })
      .filter(Boolean);

    if (patches.length === 0) {
      setMessage("No changes to save.");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const r = await fetch("/api/risks/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patches }),
      });
      const d = await r.json();
      if (r.ok) {
        setMessage(`Saved ${d.updated} risks.`);
        await fetchRows();
      } else {
        setMessage(`Error: ${d.error ?? "save failed"}`);
      }
    } finally {
      setSaving(false);
    }
  }

  const untaggedCount = rows.filter(
    (r) => !r.nist_csf_function || !r.applicable_asset_types,
  ).length;
  const dirtyCount = Object.keys(edits).length;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-6 py-4 dark:bg-slate-950">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link
                href="/risk-register"
                className="flex items-center gap-1 hover:underline"
              >
                <ArrowLeft className="h-3 w-3" />
                Эрсдэлийн бүртгэл
              </Link>
            </div>
            <h1 className="mt-1 text-xl font-bold">Эрсдэлийн ангилал (Triage)</h1>
            <p className="text-xs text-muted-foreground">
              Эрсдэл бүрд NIST CSF функц, ангилал, холбогдох хөрөнгийн төрөл,
              магадлал/нөлөөг тохируулна уу. Энэ өгөгдөл нь хөрөнгүүдэд risk-ийг
              зураглах болон үйлдсэн хяналт шалгахад ашиглагдана.
            </p>
            <div className="mt-2 flex gap-3 text-xs">
              <span className="text-muted-foreground">
                Нийт: <strong>{rows.length}</strong>
              </span>
              <span
                className={untaggedCount > 0 ? "text-amber-700" : "text-emerald-700"}
              >
                Ангилаагүй: <strong>{untaggedCount}</strong>
              </span>
              <span className="text-blue-700">
                Хадгалаагүй: <strong>{dirtyCount}</strong>
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterUntagged((v) => !v)}
            >
              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
              {filterUntagged ? "Бүгдийг харах" : "Зөвхөн ангилаагүй"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Шинэчлэх
            </Button>
            <Button
              size="sm"
              onClick={save}
              disabled={saving || dirtyCount === 0}
            >
              <Save className="mr-1 h-3.5 w-3.5" />
              {saving ? "Хадгалж байна..." : `Хадгалах (${dirtyCount})`}
            </Button>
          </div>
        </div>
        {message && (
          <div className="mt-2 rounded border bg-blue-50 px-3 py-1.5 text-xs dark:bg-blue-950/40">
            {message}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        <div className="overflow-x-auto rounded-lg border bg-white shadow-sm dark:bg-slate-950">
          <table className="w-full text-xs">
            <thead className="bg-slate-100 dark:bg-slate-900">
              <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Эрсдэлийн нэр</th>
                <th className="px-3 py-2">Хөрөнгө</th>
                <th className="px-3 py-2">CSF функц</th>
                <th className="px-3 py-2">Ангилал</th>
                <th className="px-3 py-2">Хамаарах төрөл</th>
                <th className="px-3 py-2 text-center">Магадлал (L)</th>
                <th className="px-3 py-2 text-center">Нөлөө (I)</th>
                <th className="px-3 py-2 text-center">Оноо</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-foreground">
                    Уншиж байна...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-6 text-center text-muted-foreground">
                    Эрсдэл алга.
                  </td>
                </tr>
              ) : (
                filtered.map((raw) => {
                  const r = effective(raw);
                  const L = r.likelihood ?? 0;
                  const I = r.impact ?? 0;
                  const score = L && I ? L * I : 0;
                  const level = score ? calcLevel(L, I) : "Unknown";
                  const isDirty = edits[r.risk_register_id] !== undefined;
                  return (
                    <tr
                      key={r.risk_register_id}
                      className={`border-t ${isDirty ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                    >
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.risk_register_id}
                      </td>
                      <td className="px-3 py-2 font-medium">
                        <div className="max-w-xs truncate" title={r.risk_title}>
                          {r.risk_title}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        <div className="max-w-[140px] truncate">
                          {r.asset_name ?? "—"}
                          {r.asset_type && (
                            <span className="ml-1 text-[10px]">({r.asset_type})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={r.nist_csf_function ?? ""}
                          onValueChange={(v) =>
                            updateEdit(r.risk_register_id, {
                              nist_csf_function: v,
                              nist_csf_category: null,
                            })
                          }
                        >
                          <SelectTrigger className="h-7 w-[140px] text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {FUNCTIONS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={r.nist_csf_category ?? ""}
                          onValueChange={(v) =>
                            updateEdit(r.risk_register_id, { nist_csf_category: v })
                          }
                          disabled={!r.nist_csf_function}
                        >
                          <SelectTrigger className="h-7 w-[100px] text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {(CATEGORIES_BY_FUNCTION[r.nist_csf_function ?? ""] ?? []).map(
                              (c) => (
                                <SelectItem key={c} value={c}>
                                  {c}
                                </SelectItem>
                              ),
                            )}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className="h-7 w-[180px] text-xs"
                          placeholder="Server, Database, ..."
                          value={r.applicable_asset_types ?? ""}
                          onChange={(e) =>
                            updateEdit(r.risk_register_id, {
                              applicable_asset_types: e.target.value,
                            })
                          }
                          list={`asset-types-${r.risk_register_id}`}
                        />
                        <datalist id={`asset-types-${r.risk_register_id}`}>
                          {ASSET_TYPE_OPTIONS.map((t) => (
                            <option key={t} value={t} />
                          ))}
                        </datalist>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Select
                          value={String(r.likelihood ?? "")}
                          onValueChange={(v) =>
                            updateEdit(r.risk_register_id, {
                              likelihood: Number(v),
                            })
                          }
                        >
                          <SelectTrigger className="mx-auto h-7 w-[60px] text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Select
                          value={String(r.impact ?? "")}
                          onValueChange={(v) =>
                            updateEdit(r.risk_register_id, {
                              impact: Number(v),
                            })
                          }
                        >
                          <SelectTrigger className="mx-auto h-7 w-[60px] text-xs">
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {score > 0 ? (
                          <span
                            className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${LEVEL_COLOR[level] ?? ""}`}
                          >
                            {score} · {level}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && rows.length > 0 && (
          <div className="mt-4 rounded-lg border bg-emerald-50 p-3 text-xs dark:bg-emerald-950/40">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <div>
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                  Дараагийн алхам
                </p>
                <p className="mt-1 text-emerald-700 dark:text-emerald-400">
                  Бүх эрсдэлийг ангилсаны дараа{" "}
                  <Link href="/risk-register" className="underline">
                    Эрсдэлийн бүртгэл
                  </Link>{" "}
                  хуудаснаас «Хөрөнгүүд рүү зураглах» товчийг дарж бүх 7 хөрөнгөдөө
                  тохирох эрсдэлүүдийг автомат үүсгэнэ үү. Дараа нь{" "}
                  <Link href="/gap-analysis" className="underline">
                    Хяналтын дутагдалын тайлан
                  </Link>{" "}
                  -г шалгаарай.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
