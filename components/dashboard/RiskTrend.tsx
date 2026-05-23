"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";

type TrendPoint = {
  snapshot_date: string;
  avg_risk_score: string | number;
  total_risks: number;
  critical_risks: number;
  high_risks: number;
};

export function RiskTrend() {
  const [history, setHistory] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/risk-trends?days=7")
      .then((response) => response.json())
      .then((data) => setHistory(data.history || []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const data = useMemo(
    () =>
      history.map((item) => ({
        day: new Date(item.snapshot_date).toLocaleDateString(undefined, {
          weekday: "short",
        }),
        score: Number(item.avg_risk_score ?? 0),
        totalRisks: Number(item.total_risks ?? 0),
        highRiskCount:
          Number(item.critical_risks ?? 0) + Number(item.high_risks ?? 0),
      })),
    [history],
  );

  const maxScore = 100;
  const firstScore = data[0]?.score ?? 0;
  const lastScore = data[data.length - 1]?.score ?? 0;
  const direction =
    lastScore < firstScore
      ? "Improving"
      : lastScore > firstScore
        ? "Worsening"
        : "Stable";

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Risk Score Trend (7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            Loading trend data...
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
            No trend snapshots available yet.
          </div>
        ) : (
          <>
            <div className="h-40 flex items-end justify-between gap-2">
              {data.map((item, idx) => {
                const heightPercent = Math.max(
                  8,
                  (item.score / maxScore) * 100,
                );
                return (
                  <div
                    key={`${item.day}-${idx}`}
                    className="flex-1 flex flex-col items-center gap-1"
                    title={`${item.totalRisks} total risks, ${item.highRiskCount} high or critical`}
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {item.score.toFixed(1)}
                    </div>
                    <div
                      className="w-full rounded-t bg-linear-to-t from-orange-500 to-orange-400 transition-all hover:opacity-80"
                      style={{ height: `${heightPercent}px` }}
                    />
                    <div className="text-xs font-medium text-muted-foreground">
                      {item.day}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              {direction} trend based on persisted daily snapshots
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
