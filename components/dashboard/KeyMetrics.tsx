"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertTriangle,
  CheckCircle,
  Shield,
  Zap,
} from "lucide-react";

interface MetricItem {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  status?: string;
}

const metrics: MetricItem[] = [
  {
    label: "Critical Vulnerabilities",
    value: 8,
    icon: <AlertTriangle className="h-5 w-5" />,
    color: "bg-red-100 text-red-700",
    status: "Require immediate attention",
  },
  {
    label: "Assets Monitored",
    value: 127,
    icon: <Shield className="h-5 w-5" />,
    color: "bg-blue-100 text-blue-700",
    status: "Active",
  },
  {
    label: "Compliance Status",
    value: 85,
    icon: <CheckCircle className="h-5 w-5" />,
    color: "bg-green-100 text-green-700",
    status: "% of requirements met",
  },
  {
    label: "Recent Incidents",
    value: 3,
    icon: <Zap className="h-5 w-5" />,
    color: "bg-orange-100 text-orange-700",
    status: "This month",
  },
];

export function KeyMetrics() {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, idx) => (
        <Card key={idx}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-3xl font-bold">{metric.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metric.status}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${metric.color}`}>
                {metric.icon}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
