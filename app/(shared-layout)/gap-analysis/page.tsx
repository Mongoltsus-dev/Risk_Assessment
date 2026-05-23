"use client";

import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type GapRow = {
  risk_register_id: number;
  risk_title: string;
  risk_description: string | null;
  nist_csf_function: string | null;
  nist_csf_category: string | null;
  asset_id: number | null;
  asset_name: string | null;
  asset_type: string | null;
  risk_score: number;
  risk_level: string;
  residual_risk_score: number | null;
  residual_risk_level: string | null;
  category_has_implemented_control: boolean;
  implemented_count: number;
  total_recommended: number;
};

type Suggestion = { control_id: string; control_name: string; status: string };

type GapResponse = {
  total_risks: number;
  uncovered_count: number;
  covered_count: number;
  uncovered: GapRow[];
  covered: GapRow[];
  suggestions_by_category: Record<string, Suggestion[]>;
};

const LEVEL_COLOR: Record<string, string> = {
  Critical: "bg-rose-100 text-rose-700 border-rose-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Unknown: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function GapAnalysisPage() {
  const [data, setData] = useState<GapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"uncovered" | "covered">("uncovered");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/risks/gap-analysis");
      if (r.ok) setData(await r.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const rowsByCategory = useMemo(() => {
    const src = tab === "uncovered" ? data?.uncovered ?? [] : data?.covered ?? [];
    const grouped: Record<string, GapRow[]> = {};
    for (const r of src) {
      const k = r.nist_csf_category ?? "(untagged)";
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(r);
    }
    return grouped;
  }, [data, tab]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-6 py-4 dark:bg-slate-950">
        <div className="flex items-start justify-between">
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
            <h1 className="mt-1 text-xl font-bold">Хяналтын дутагдалын тайлан</h1>
            <p className="text-xs text-muted-foreground">
              Хэрэгжүүлсэн хяналтгүй (Implemented control байхгүй) NIST CSF
              ангилалд багтах эрсдэлүүд. Эдгээр нь бодлого/хяналтын дутагдалтай
              эрсдэлүүд юм.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Шинэчлэх
          </Button>
        </div>

        {data && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div className="rounded-lg border bg-rose-50 p-3 dark:bg-rose-950/30">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-rose-600" />
                <p className="text-[10px] font-semibold uppercase text-rose-700">
                  Хяналтгүй
                </p>
              </div>
              <p className="mt-1 text-2xl font-bold text-rose-700">
                {data.uncovered_count}
              </p>
            </div>
            <div className="rounded-lg border bg-emerald-50 p-3 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <p className="text-[10px] font-semibold uppercase text-emerald-700">
                  Хяналттай
                </p>
              </div>
              <p className="mt-1 text-2xl font-bold text-emerald-700">
                {data.covered_count}
              </p>
            </div>
            <div className="rounded-lg border bg-slate-50 p-3 dark:bg-slate-900">
              <p className="text-[10px] font-semibold uppercase text-slate-600">
                Нийт эрсдэл
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-700 dark:text-slate-300">
                {data.total_risks}
              </p>
            </div>
          </div>
        )}

        <div className="mt-3 flex gap-1 border-b">
          {(["uncovered", "covered"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === t
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "uncovered" ? "Хяналтгүй эрсдэл" : "Хяналттай эрсдэл"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="p-6 text-center text-muted-foreground">Уншиж байна...</div>
        ) : !data ? (
          <div className="p-6 text-center text-muted-foreground">
            Өгөгдөл олдсонгүй.
          </div>
        ) : Object.keys(rowsByCategory).length === 0 ? (
          <div className="rounded-lg border bg-emerald-50 p-6 text-center dark:bg-emerald-950/30">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              {tab === "uncovered"
                ? "Хяналтгүй эрсдэл алга. Бүх эрсдэл хяналтад орсон."
                : "Энэ ангилалд эрсдэл алга."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(rowsByCategory).map(([category, rows]) => {
              const suggestions = data.suggestions_by_category[category] ?? [];
              return (
                <div
                  key={category}
                  className="rounded-lg border bg-white shadow-sm dark:bg-slate-950"
                >
                  <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2 dark:bg-slate-900">
                    <div>
                      <p className="text-sm font-bold">{category}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {rows.length} эрсдэл · {suggestions.length} санал болгох хяналт
                      </p>
                    </div>
                    {tab === "uncovered" && (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        <AlertTriangle className="mr-1 inline h-3 w-3" />
                        Бодлого хэрэгжээгүй
                      </span>
                    )}
                  </div>

                  <table className="w-full text-xs">
                    <thead className="bg-slate-50/50 dark:bg-slate-900/40">
                      <tr className="text-left text-[10px] uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-2">Эрсдэл</th>
                        <th className="px-4 py-2">Хөрөнгө</th>
                        <th className="px-4 py-2 text-center">Оноо</th>
                        <th className="px-4 py-2 text-center">Хяналт</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.risk_register_id} className="border-t">
                          <td className="px-4 py-2 font-medium">
                            <div className="max-w-md truncate" title={r.risk_title}>
                              {r.risk_title}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-muted-foreground">
                            {r.asset_name ?? "—"}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span
                              className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${
                                LEVEL_COLOR[r.risk_level] ?? LEVEL_COLOR.Unknown
                              }`}
                            >
                              {r.risk_score} · {r.risk_level}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center text-[11px]">
                            {r.implemented_count} / {r.total_recommended}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {tab === "uncovered" && suggestions.length > 0 && (
                    <div className="border-t bg-blue-50/40 px-4 py-2 dark:bg-blue-950/20">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                        Санал болгох хяналтууд ({category})
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {suggestions.map((s) => (
                          <li
                            key={s.control_id}
                            className="flex items-center gap-2 text-[11px]"
                          >
                            <span className="font-mono text-blue-700">
                              {s.control_id}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">
                              {s.control_name}
                            </span>
                            <span
                              className={`ml-auto rounded px-1.5 py-0 text-[9px] font-bold ${
                                s.status?.toLowerCase().includes("implement")
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {s.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
