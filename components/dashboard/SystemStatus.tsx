"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

interface SystemComponent {
  name: string;
  status: "online" | "offline" | "partial";
  lastCheck: string;
}

const components: SystemComponent[] = [
  { name: "Vulnerability Scanner", status: "online", lastCheck: "2 minutes ago" },
  { name: "Asset Inventory", status: "online", lastCheck: "5 minutes ago" },
  { name: "Compliance Checker", status: "online", lastCheck: "10 minutes ago" },
  { name: "Data Collector", status: "partial", lastCheck: "30 seconds ago" },
];

function getStatusColor(status: string) {
  switch (status) {
    case "online":
      return "bg-green-100 text-green-700";
    case "offline":
      return "bg-red-100 text-red-700";
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "online":
      return "Online";
    case "offline":
      return "Offline";
    default:
      return "Partial";
  }
}

export function SystemStatus() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">System Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {components.map((component) => (
            <div
              key={component.name}
              className="flex items-center justify-between rounded-lg border p-2"
            >
              <div>
                <p className="text-sm font-medium">{component.name}</p>
                <p className="text-xs text-muted-foreground">
                  Checked {component.lastCheck}
                </p>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(component.status)}`}>
                {getStatusText(component.status)}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
