"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FileText,
  RefreshCw,
  Settings,
  Zap,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";

const actions = [
  {
    icon: <ShieldAlert className="h-5 w-5" />,
    label: "Risk Assessments",
    description: "Map assets to risks and score them",
    href: "/risk-register",
  },
  {
    icon: <RefreshCw className="h-5 w-5" />,
    label: "Run New Scan",
    description: "Initiate a comprehensive security scan",
  },
  {
    icon: <FileText className="h-5 w-5" />,
    label: "Generate Report",
    description: "Create an executive summary report",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    label: "View All Issues",
    description: "Open detailed findings dashboard",
  },
  {
    icon: <Settings className="h-5 w-5" />,
    label: "Configure Scan",
    description: "Customize scan parameters",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {actions.map((action, idx) => {
            const buttonContent = (
              <Button
                key={idx}
                variant="outline"
                className="h-auto flex flex-col items-start gap-2 p-4 hover:bg-muted w-full"
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="text-muted-foreground">{action.icon}</div>
                  <span className="font-medium text-sm">{action.label}</span>
                </div>
                <span className="text-xs text-muted-foreground text-left whitespace-normal">
                  {action.description}
                </span>
              </Button>
            );

            return action.href ? (
              <Link href={action.href} key={idx} className="w-full block">
                {buttonContent}
              </Link>
            ) : (
              <div key={idx}>{buttonContent}</div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
