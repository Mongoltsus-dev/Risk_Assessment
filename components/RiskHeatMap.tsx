"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";

export interface HeatMapRisk {
  risk_id: number;
  risk_title: string;
  asset_name: string;
  nist_csf_function: string;
  department_control_owner?: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  risk_level: string;
  residual_risk_score: number | null;
  residual_risk_level: string | null;
}

interface Props {
  risks?: HeatMapRisk[];
}

type MatrixMode = "inherent" | "residual";

type MatrixPoint = {
  likelihood: number;
  impact: number;
  score: number;
  level: keyof typeof ZONE;
};

type SelectedCell = {
  likelihood: number;
  impact: number;
} | null;

const MATRIX_ROWS = [5, 4, 3, 2, 1];
const MATRIX_COLUMNS = [1, 2, 3, 4, 5];

const ZONE = {
  Critical: {
    fill: "bg-rose-500/30 dark:bg-rose-500/35",
    border: "border-rose-500/30",
    text: "text-rose-700 dark:text-rose-200",
    badge: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  },
  High: {
    fill: "bg-orange-500/25 dark:bg-orange-500/30",
    border: "border-orange-500/30",
    text: "text-orange-700 dark:text-orange-200",
    badge: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  },
  Medium: {
    fill: "bg-amber-400/30 dark:bg-amber-400/25",
    border: "border-amber-500/30",
    text: "text-amber-700 dark:text-amber-200",
    badge: "bg-amber-400/10 text-amber-600 border-amber-500/20",
  },
  Low: {
    fill: "bg-emerald-500/20 dark:bg-emerald-500/25",
    border: "border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-200",
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
} as const;

const LEVEL_LABELS: Record<keyof typeof ZONE, string> = {
  Critical: "Ноцтой",
  High: "Өндөр",
  Medium: "Дунд",
  Low: "Бага",
};

function scoreLevel(score: number): keyof typeof ZONE {
  if (score >= 17) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

function clampFactor(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(5, Math.round(value)));
}

function getMatrixPoint(risk: HeatMapRisk, mode: MatrixMode): MatrixPoint {
  const inherentLikelihood = clampFactor(risk.likelihood);
  const inherentImpact = clampFactor(risk.impact);

  if (mode === "inherent" || risk.residual_risk_score == null) {
    return {
      likelihood: inherentLikelihood,
      impact: inherentImpact,
      score: risk.risk_score,
      level: scoreLevel(risk.risk_score),
    };
  }

  const residualScore = Math.max(1, Math.min(25, risk.residual_risk_score));

  return {
    likelihood: clampFactor(Math.ceil(residualScore / inherentImpact)),
    impact: inherentImpact,
    score: residualScore,
    level: scoreLevel(residualScore),
  };
}

function cellKey(likelihood: number, impact: number) {
  return `${likelihood}-${impact}`;
}

export function RiskHeatMap({ risks = [] }: Props) {
  const [mode, setMode] = useState<MatrixMode>("inherent");
  const [selectedCell, setSelectedCell] = useState<SelectedCell>(null);

  const risksByCell = risks.reduce<Map<string, HeatMapRisk[]>>((map, risk) => {
    const point = getMatrixPoint(risk, mode);
    const key = cellKey(point.likelihood, point.impact);
    map.set(key, [...(map.get(key) ?? []), risk]);
    return map;
  }, new Map());

  const selectedRisks = selectedCell
    ? (risksByCell.get(cellKey(selectedCell.likelihood, selectedCell.impact)) ??
      [])
    : risks
        .slice()
        .sort(
          (left, right) =>
            getMatrixPoint(right, mode).score -
            getMatrixPoint(left, mode).score,
        )
        .slice(0, 8);

  const levelCounts = risks.reduce<Record<keyof typeof ZONE, number>>(
    (counts, risk) => {
      const level = getMatrixPoint(risk, mode).level;
      return { ...counts, [level]: counts[level] + 1 };
    },
    { Critical: 0, High: 0, Medium: 0, Low: 0 },
  );

  return (
    <Card className="app-risk-surface shadow-none">
      <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-lg">Эрсдэлийн дулааны матриц</CardTitle>
        </div>
        <div className="flex w-fit rounded-lg border bg-muted/40 p-0.5">
          {[
            ["inherent", "Анхдагч"],
            ["residual", "Үлдэгдэл"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value as MatrixMode);
                setSelectedCell(null);
              }}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                mode === value
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 xl:grid-cols-[minmax(26rem,1fr)_22rem]">
          <div className="overflow-x-auto pb-2">
            <div className="mx-auto w-fit min-w-0">
              <div className="ml-10 mb-2 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Магадлал
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-100 w-4 shrink-0 items-center justify-center text-xs font-bold uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl] rotate-180">
                  Нөлөө
                </div>
                <div>
                  <div className="grid grid-cols-[1.5rem_repeat(5,4.75rem)] gap-2">
                    {MATRIX_ROWS.map((impact) => (
                      <div key={impact} className="contents">
                        <div className="flex h-19 items-center justify-center text-xs font-bold text-muted-foreground">
                          {impact}
                        </div>
                        {MATRIX_COLUMNS.map((likelihood) => {
                          const score = likelihood * impact;
                          const level = scoreLevel(score);
                          const cellRisks =
                            risksByCell.get(cellKey(likelihood, impact)) ?? [];
                          const selected =
                            selectedCell?.likelihood === likelihood &&
                            selectedCell?.impact === impact;

                          return (
                            <button
                              key={cellKey(likelihood, impact)}
                              type="button"
                              onClick={() =>
                                setSelectedCell(
                                  selected ? null : { likelihood, impact },
                                )
                              }
                              className={`relative flex h-19 w-19 flex-col justify-between rounded-lg border p-2.5 text-left transition-all ${ZONE[level].fill} ${ZONE[level].border} ${
                                selected
                                  ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-background"
                                  : "hover:-translate-y-0.5 hover:shadow-sm"
                              }`}
                            >
                              <span className="text-[11px] font-semibold text-muted-foreground">
                                {score}
                              </span>
                              <span
                                className={`self-center text-2xl font-black leading-none ${ZONE[level].text}`}
                              >
                                {cellRisks.length || ""}
                              </span>
                              <span className="text-center text-[10px] font-semibold text-muted-foreground">
                                {cellRisks.length === 1
                                  ? "эрсдэл"
                                  : cellRisks.length > 1
                                    ? "эрсдэл"
                                    : `${likelihood} x ${impact}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-[1.5rem_repeat(5,4.75rem)] gap-2">
                    <div />
                    {MATRIX_COLUMNS.map((likelihood) => (
                      <div
                        key={likelihood}
                        className="text-center text-xs font-bold text-muted-foreground"
                      >
                        {likelihood}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border app-risk-surface p-4">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">
                  {selectedCell
                    ? `Магадлал ${selectedCell.likelihood}, нөлөө ${selectedCell.impact}`
                    : `${mode === "inherent" ? "Анхдагч" : "Үлдэгдэл"} эрсдэлийн хураангуй`}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedCell
                    ? `Энэ нүдэнд ${selectedRisks.length} эрсдэл байна`
                    : "Одоогийн бүртгэл дэх хамгийн өндөр оноотой эрсдэлүүд"}
                </p>
              </div>
              {selectedCell && (
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  Арилгах
                </button>
              )}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              {(["Critical", "High", "Medium", "Low"] as const).map((level) => (
                <div
                  key={level}
                  className={`rounded-lg border px-3 py-2 ${ZONE[level].badge}`}
                >
                  <p className="text-lg font-black leading-none">
                    {levelCounts[level]}
                  </p>
                  <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider">
                    {LEVEL_LABELS[level]}
                  </p>
                </div>
              ))}
            </div>

            {risks.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Харуулах эрсдэл алга.
              </div>
            ) : selectedRisks.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                Энэ нүдэнд эрсдэл алга.
              </div>
            ) : (
              <div className="space-y-2">
                {selectedRisks.map((risk) => {
                  const point = getMatrixPoint(risk, mode);
                  return (
                    <div
                      key={risk.risk_id}
                      className="rounded-lg border border-border/70 bg-background/40 px-3 py-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold">
                            {risk.risk_title}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {risk.asset_name}
                          </p>
                        </div>
                        <Badge
                          className={`${ZONE[point.level].badge} shrink-0 border text-[10px]`}
                        >
                          {point.score}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
