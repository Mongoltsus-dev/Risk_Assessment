"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, TrendingUp } from "lucide-react";

interface RiskScoreCardProps {
  score: number;
  trend: "up" | "down";
  lastUpdated: string;
}

export function RiskScoreCard({
  score,
  trend,
  lastUpdated,
}: RiskScoreCardProps) {
  const getColorClass = () => {
    if (score >= 80) return "text-red-600";
    if (score >= 60) return "text-orange-600";
    if (score >= 40) return "text-yellow-600";
    return "text-green-600";
  };

  const getStatusMessage = () => {
    if (score >= 80) return "Critical Risk";
    if (score >= 60) return "High Risk";
    if (score >= 40) return "Medium Risk";
    return "Low Risk";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">
          Overall Risk Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-end justify-between">
          <div>
            <div className={`text-4xl font-bold ${getColorClass()}`}>
              {score}
              <span className="text-lg">/100</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {getStatusMessage()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {trend === "down" ? (
              <TrendingDown className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingUp className="h-5 w-5 text-red-600" />
            )}
            <span
              className={trend === "down" ? "text-green-600" : "text-red-600"}
            >
              {trend === "down" ? "Improving" : "Worsening"}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Last updated: {lastUpdated}
        </p>
      </CardContent>
    </Card>
  );
}
