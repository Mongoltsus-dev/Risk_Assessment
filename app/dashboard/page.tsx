"use client";

import { useAuth } from "@/app/context/AuthContext";
import { ComplianceDashboard } from "@/components/ComplianceDashboard";
import { ExecutiveDashboard } from "@/components/ExecutiveDashboard";
import { RiskHeatMap } from "@/components/RiskHeatMap";
import { ThreatTimeline } from "@/components/ThreatTimeline";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type DashboardView = "executive" | "risks" | "compliance" | "timeline";

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeView, setActiveView] = useState<DashboardView>("executive");

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!user) {
      router.push("/auth/login");
    }
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const navItems = [
    {
      id: "executive" as DashboardView,
      label: "Executive Summary",
      icon: "📊",
      description: "Organization security health metrics",
    },
    {
      id: "risks" as DashboardView,
      label: "Risk Heat Map",
      icon: "🔥",
      description: "Asset risk visualization",
    },
    {
      id: "compliance" as DashboardView,
      label: "NIST CSF Compliance",
      icon: "✓",
      description: "Compliance status by function",
    },
    {
      id: "timeline" as DashboardView,
      label: "Event Timeline",
      icon: "📅",
      description: "Risk & control history",
    },
  ];

  return (
    <div className="space-y-8 pb-8">
      {/* Page Header */}
      <div className="border-b border-slate-700 pb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Security Dashboard
        </h1>
        <p className="text-gray-400">
          Welcome, {user.name}! Monitor your organization's cybersecurity
          posture and compliance status.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-col md:flex-row gap-2 overflow-x-auto pb-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveView(item.id)}
            className={`px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
              activeView === item.id
                ? "bg-linear-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                : "bg-slate-800 text-gray-400 hover:bg-slate-700 border border-slate-700"
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <div className="text-left">
              <p className="text-sm font-semibold">{item.label}</p>
              <p className="text-xs opacity-75 hidden md:block">
                {item.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="animate-in fade-in duration-300">
        {activeView === "executive" && (
          <div>
            <ExecutiveDashboard />
          </div>
        )}

        {activeView === "risks" && (
          <div>
            <RiskHeatMap />
          </div>
        )}

        {activeView === "compliance" && (
          <div>
            <ComplianceDashboard />
          </div>
        )}

        {activeView === "timeline" && (
          <div>
            <ThreatTimeline />
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-700 pt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <p className="text-gray-400 text-sm">Last Updated</p>
          <p className="text-white font-semibold">
            {new Date().toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Data Refresh Rate</p>
          <p className="text-white font-semibold">Every 5 minutes</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm">Support</p>
          <p className="text-white font-semibold">security@organization.com</p>
        </div>
      </div>
    </div>
  );
}
