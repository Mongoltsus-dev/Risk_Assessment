"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ChevronRight } from "lucide-react";

interface Risk {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  affectedAssets: number;
  discoveredDate: string;
}

const topRisks: Risk[] = [
  {
    id: "1",
    title: "Unpatched SQL Server Vulnerability (CVE-2024-1234)",
    severity: "critical",
    affectedAssets: 5,
    discoveredDate: "2024-01-15",
  },
  {
    id: "2",
    title: "Weak Password Policy Configuration",
    severity: "high",
    affectedAssets: 42,
    discoveredDate: "2024-01-10",
  },
  {
    id: "3",
    title: "Exposed API Keys in Public Repository",
    severity: "critical",
    affectedAssets: 3,
    discoveredDate: "2024-01-08",
  },
  {
    id: "4",
    title: "Missing SSL/TLS Certificates",
    severity: "high",
    affectedAssets: 12,
    discoveredDate: "2024-01-05",
  },
  {
    id: "5",
    title: "Outdated Third-Party Dependencies",
    severity: "medium",
    affectedAssets: 8,
    discoveredDate: "2024-01-01",
  },
];

function getSeverityColor(severity: string) {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-green-100 text-green-800";
  }
}

export function TopRisks() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Top Risk Findings</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {topRisks.map((risk) => (
            <div
              key={risk.id}
              className="flex items-start justify-between rounded-lg border p-3 hover:bg-muted/50 transition cursor-pointer"
            >
              <div className="flex gap-3 flex-1 min-w-0">
                <AlertTriangle className="h-4 w-4 mt-1 shrink-0 text-orange-600" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{risk.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {risk.affectedAssets} assets • {risk.discoveredDate}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <Badge className={getSeverityColor(risk.severity)}>
                  {risk.severity}
                </Badge>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
