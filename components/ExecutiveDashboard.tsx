import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import React, { useEffect, useState } from "react";

interface DashboardMetrics {
  totalAssets: number;
  totalRisks: number;
  criticalRisks: number;
  highRisks: number;
  averageRiskScore: number;
  controlImplementationRate: number;
  complianceScore: number;
}

interface SecurityHealth {
  score: number;
  status: "Critical" | "Poor" | "Fair" | "Good" | "Excellent";
  trend: "up" | "down" | "stable";
  lastUpdated: string;
}

export const ExecutiveDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalAssets: 0,
    totalRisks: 0,
    criticalRisks: 0,
    highRisks: 0,
    averageRiskScore: 0,
    controlImplementationRate: 0,
    complianceScore: 0,
  });

  const [securityHealth, setSecurityHealth] = useState<SecurityHealth>({
    score: 0,
    status: "Fair",
    trend: "stable",
    lastUpdated: new Date().toISOString(),
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // This will aggregate data from all assets and risks
      // In real implementation, create a /api/dashboard endpoint
      const mockData = {
        totalAssets: 12,
        totalRisks: 24,
        criticalRisks: 3,
        highRisks: 8,
        averageRiskScore: 13.2,
        controlImplementationRate: 67,
        complianceScore: 78,
      };
      setMetrics(mockData);
      calculateSecurityHealth(mockData);
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      setLoading(false);
    }
  };

  const calculateSecurityHealth = (data: DashboardMetrics) => {
    // Score based on multiple factors
    const riskScore =
      100 -
      (data.criticalRisks * 20 +
        data.highRisks * 5 +
        (data.totalRisks - data.criticalRisks - data.highRisks) * 1) /
        data.totalRisks;

    const controlScore = data.controlImplementationRate;
    const complianceWeight = data.complianceScore;

    const overallScore = (riskScore + controlScore + complianceWeight) / 3;

    let status: "Critical" | "Poor" | "Fair" | "Good" | "Excellent" = "Fair";
    if (overallScore >= 90) status = "Excellent";
    else if (overallScore >= 75) status = "Good";
    else if (overallScore >= 60) status = "Fair";
    else if (overallScore >= 40) status = "Poor";
    else status = "Critical";

    setSecurityHealth({
      score: Math.round(overallScore),
      status,
      trend:
        data.controlImplementationRate > 50 && data.complianceScore > 75
          ? "up"
          : "stable",
      lastUpdated: new Date().toISOString(),
    });
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case "Excellent":
        return "bg-green-100 text-green-900 border-green-300";
      case "Good":
        return "bg-emerald-100 text-emerald-900 border-emerald-300";
      case "Fair":
        return "bg-yellow-100 text-yellow-900 border-yellow-300";
      case "Poor":
        return "bg-orange-100 text-orange-900 border-orange-300";
      case "Critical":
        return "bg-red-100 text-red-900 border-red-300";
      default:
        return "bg-gray-100 text-gray-900 border-gray-300";
    }
  };

  if (loading) {
    return <Card className="p-8 text-center">Loading dashboard...</Card>;
  }

  return (
    <div className="space-y-6">
      {/* Security Health Score - Main Card */}
      <Card className="p-8 border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Health Score Gauge */}
          <div className="flex flex-col items-center justify-center">
            <div className="relative w-32 h-32 mb-4">
              <svg
                className="w-full h-full transform -rotate-90"
                viewBox="0 0 120 120"
              >
                {/* Background circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#334155"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={
                    securityHealth.status === "Excellent"
                      ? "#22c55e"
                      : securityHealth.status === "Good"
                        ? "#10b981"
                        : securityHealth.status === "Fair"
                          ? "#eab308"
                          : securityHealth.status === "Poor"
                            ? "#f97316"
                            : "#ef4444"
                  }
                  strokeWidth="8"
                  strokeDasharray={`${(securityHealth.score / 100) * 314} 314`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-4xl font-bold text-white">
                    {securityHealth.score}
                  </div>
                  <div className="text-xs text-gray-400">Security</div>
                </div>
              </div>
            </div>
            <Badge className={`${getHealthColor(securityHealth.status)}`}>
              {securityHealth.status}
            </Badge>
            <p className="text-xs text-gray-400 mt-2">
              Status:{" "}
              {securityHealth.trend === "up" ? "↑ Improving" : "→ Stable"}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Assets</p>
              <p className="text-3xl font-bold text-white">
                {metrics.totalAssets}
              </p>
              <p className="text-xs text-gray-500">Analyzed & Monitored</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Total Risks</p>
              <p className="text-3xl font-bold text-amber-400">
                {metrics.totalRisks}
              </p>
              <p className="text-xs text-gray-500">Identified & Tracked</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Critical Risks</p>
              <p className="text-3xl font-bold text-red-400">
                {metrics.criticalRisks}
              </p>
              <p className="text-xs text-gray-500">Require Immediate Action</p>
            </div>
          </div>

          {/* Health Metrics */}
          <div className="space-y-4">
            <div className="bg-slate-700 bg-opacity-50 p-4 rounded-lg">
              <p className="text-gray-400 text-xs mb-2">
                Control Implementation
              </p>
              <div className="flex items-end gap-2">
                <div className="text-2xl font-bold text-green-400">
                  {metrics.controlImplementationRate}%
                </div>
              </div>
              <div className="w-full bg-slate-600 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-linear-to-r from-green-400 to-emerald-500 h-full"
                  style={{ width: `${metrics.controlImplementationRate}%` }}
                />
              </div>
            </div>

            <div className="bg-slate-700 bg-opacity-50 p-4 rounded-lg">
              <p className="text-gray-400 text-xs mb-2">NIST CSF Compliance</p>
              <div className="flex items-end gap-2">
                <div className="text-2xl font-bold text-blue-400">
                  {metrics.complianceScore}%
                </div>
              </div>
              <div className="w-full bg-slate-600 h-2 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-linear-to-r from-blue-400 to-cyan-500 h-full"
                  style={{ width: `${metrics.complianceScore}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Risk Distribution */}
      <Card className="p-6 border-slate-700">
        <h3 className="text-white font-semibold mb-6">Risk Distribution</h3>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {metrics.criticalRisks}
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Critical</p>
                <p className="text-red-400 font-semibold text-sm">
                  {((metrics.criticalRisks / metrics.totalRisks) * 100).toFixed(
                    0,
                  )}
                  %
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {metrics.highRisks}
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs">High</p>
                <p className="text-orange-400 font-semibold text-sm">
                  {((metrics.highRisks / metrics.totalRisks) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {metrics.totalRisks -
                    metrics.criticalRisks -
                    metrics.highRisks >
                  0
                    ? metrics.totalRisks -
                      metrics.criticalRisks -
                      metrics.highRisks
                    : 0}
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Medium</p>
                <p className="text-yellow-400 font-semibold text-sm">
                  {(
                    ((metrics.totalRisks -
                      metrics.criticalRisks -
                      metrics.highRisks) /
                      metrics.totalRisks) *
                    100
                  ).toFixed(0)}
                  %
                </p>
              </div>
            </div>
          </div>

          <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 bg-opacity-20 rounded-lg flex items-center justify-center">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  0
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-xs">Low</p>
                <p className="text-green-400 font-semibold text-sm">0%</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
