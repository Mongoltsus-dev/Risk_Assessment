"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle } from "lucide-react";

interface ComplianceStandard {
  name: string;
  percentage: number;
  status: "met" | "pending" | "failed";
}

const standards: ComplianceStandard[] = [
  { name: "NIST CSF", percentage: 85, status: "met" },
];

function getStatusIcon(status: string) {
  if (status === "met") {
    return <CheckCircle className="h-4 w-4 text-green-600" />;
  }
  return <Circle className="h-4 w-4 text-gray-400" />;
}

function getProgressColor(percentage: number) {
  if (percentage >= 80) return "bg-green-500";
  if (percentage >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

export function ComplianceStatus() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">NIST CSF Alignment</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {standards.map((standard) => (
            <div key={standard.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(standard.status)}
                  <span className="text-sm font-medium">{standard.name}</span>
                </div>
                <span className="text-sm font-semibold">
                  {standard.percentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressColor(
                    standard.percentage,
                  )}`}
                  style={{ width: `${standard.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
