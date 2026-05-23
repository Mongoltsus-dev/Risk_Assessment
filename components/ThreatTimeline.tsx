import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import React, { useState } from "react";

interface TimelineEvent {
  id: string;
  date: string;
  type:
    | "risk_identified"
    | "risk_resolved"
    | "control_implemented"
    | "threat_detected";
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  assetName: string;
  threatName?: string;
  controlName?: string;
  details: string;
}

export const ThreatTimeline: React.FC = () => {
  const [timelineEvents] = useState<TimelineEvent[]>([
    {
      id: "ev1",
      date: "2024-01-15",
      type: "risk_identified",
      title: "SQL Injection Vulnerability Identified",
      description:
        "Potential SQL injection vulnerability in customer portal API",
      severity: "critical",
      assetName: "Web Application",
      threatName: "T1110 - Brute Force",
      controlName: "Input Validation & Sanitization",
      details:
        "Automated risk assessment identified weak input validation in 3 API endpoints",
    },
    {
      id: "ev2",
      date: "2024-01-18",
      type: "control_implemented",
      title: "Control Implemented: Data Encryption",
      description: "Implemented AES-256 encryption for sensitive data storage",
      severity: "high",
      assetName: "Database Server",
      controlName: "Data Encryption at Rest",
      details:
        "Successfully deployed encryption controls across production database with 0% downtime",
    },
    {
      id: "ev3",
      date: "2024-01-22",
      type: "threat_detected",
      title: "Anomalous Login Activity Detected",
      description:
        "Multiple failed login attempts detected on Active Directory",
      severity: "high",
      assetName: "Active Directory",
      threatName: "T1078 - Valid Accounts",
      details:
        "542 failed login attempts from 15 unique IP addresses over 2 hours",
    },
    {
      id: "ev4",
      date: "2024-01-25",
      type: "risk_identified",
      title: "Unpatched Software Vulnerability",
      description: "Apache Log4j vulnerability (CVE-2021-44228) detected",
      severity: "critical",
      assetName: "Production Database",
      threatName: "T1566 - Phishing",
      controlName: "Patch Management",
      details:
        "Asset is running vulnerable Log4j version 2.14.1, requires immediate patching",
    },
    {
      id: "ev5",
      date: "2024-01-28",
      type: "risk_resolved",
      title: "Risk Remediated: Email Security",
      description: "SPF/DKIM/DMARC email authentication configured",
      severity: "medium",
      assetName: "Email Server",
      threatName: "T1566 - Phishing",
      controlName: "Email Security Controls",
      details:
        "Implemented email authentication protocols reducing phishing vectors by 87%",
    },
    {
      id: "ev6",
      date: "2024-02-02",
      type: "control_implemented",
      title: "MFA Deployed Enterprise-Wide",
      description:
        "Multi-factor authentication implemented for all user accounts",
      severity: "high",
      assetName: "Identity & Access",
      controlName: "Multi-Factor Authentication",
      details:
        "100% of 450 user accounts now require MFA (Authenticator app + SMS)",
    },
    {
      id: "ev7",
      date: "2024-02-05",
      type: "threat_detected",
      title: "Data Exfiltration Attempt Blocked",
      description: "Suspicious outbound data transfer detected and blocked",
      severity: "critical",
      assetName: "Customer Data Lake",
      threatName: "T1567 - Exfiltration",
      details:
        "DLP policy blocked 14GB transfer to unauthorized external IP address",
    },
    {
      id: "ev8",
      date: "2024-02-10",
      type: "control_implemented",
      title: "Incident Response Plan Updated",
      description: "Comprehensive incident response playbook deployed",
      severity: "medium",
      assetName: "Organization",
      controlName: "Incident Response Plan",
      details:
        "New IR plan covers 12 scenarios with defined escalation paths and contact lists",
    },
  ]);

  const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);

  const filteredEvents = timelineEvents.filter((event) => {
    if (filterSeverity && event.severity !== filterSeverity) return false;
    if (filterType && event.type !== filterType) return false;
    return true;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-400 bg-red-900 border-red-700";
      case "high":
        return "text-orange-400 bg-orange-900 border-orange-700";
      case "medium":
        return "text-yellow-400 bg-yellow-900 border-yellow-700";
      case "low":
        return "text-green-400 bg-green-900 border-green-700";
      default:
        return "text-gray-400 bg-gray-900 border-gray-700";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "risk_identified":
        return "⚠️";
      case "risk_resolved":
        return "✅";
      case "control_implemented":
        return "🛡️";
      case "threat_detected":
        return "🚨";
      default:
        return "📋";
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "risk_identified":
        return "Risk Identified";
      case "risk_resolved":
        return "Risk Resolved";
      case "control_implemented":
        return "Control Implemented";
      case "threat_detected":
        return "Threat Detected";
      default:
        return "Event";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card className="p-6 border-slate-700">
        <h3 className="text-white font-semibold mb-4">
          Timeline & Event History
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Severity Filter */}
          <div>
            <p className="text-gray-400 text-xs mb-3">Filter by Severity</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterSeverity(null)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  filterSeverity === null
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-700 text-gray-400 hover:bg-slate-600"
                }`}
              >
                All Events
              </button>
              {["critical", "high", "medium", "low"].map((severity) => (
                <button
                  key={severity}
                  onClick={() =>
                    setFilterSeverity(
                      filterSeverity === severity ? null : severity,
                    )
                  }
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all capitalize ${
                    filterSeverity === severity
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-700 text-gray-400 hover:bg-slate-600"
                  }`}
                >
                  {severity}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <p className="text-gray-400 text-xs mb-3">Filter by Event Type</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterType(null)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  filterType === null
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-700 text-gray-400 hover:bg-slate-600"
                }`}
              >
                All Types
              </button>
              {[
                "risk_identified",
                "risk_resolved",
                "control_implemented",
                "threat_detected",
              ].map((type) => (
                <button
                  key={type}
                  onClick={() =>
                    setFilterType(filterType === type ? null : type)
                  }
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    filterType === type
                      ? "bg-cyan-600 text-white"
                      : "bg-slate-700 text-gray-400 hover:bg-slate-600"
                  }`}
                >
                  {getTypeLabel(type)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <Card className="p-6 border-slate-700">
        <div className="space-y-6">
          {filteredEvents.map((event, index) => (
            <div key={event.id} className="relative">
              {/* Timeline connector */}
              {index < filteredEvents.length - 1 && (
                <div className="absolute left-7 top-16 w-0.5 h-12 bg-linear-to-b from-cyan-500 to-slate-700"></div>
              )}

              {/* Event card */}
              <div className="flex gap-4">
                {/* Timeline dot */}
                <div className="flex flex-col items-center pt-1 shrink-0">
                  <div
                    className={`w-4 h-4 rounded-full bg-cyan-500 ring-4 ring-slate-800`}
                  ></div>
                </div>

                {/* Event content */}
                <div className="flex-1 pb-2">
                  <div
                    className={`p-4 rounded-lg border transition-all hover:bg-slate-700/50 ${getSeverityColor(event.severity)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {getTypeIcon(event.type)}
                        </span>
                        <div>
                          <h4 className="text-white font-semibold">
                            {event.title}
                          </h4>
                          <p className="text-xs text-gray-300 mt-1">
                            {event.description}
                          </p>
                        </div>
                      </div>
                      <Badge className="shrink-0 bg-slate-700 text-gray-300 border-slate-600">
                        {getDaysSince(event.date)} days ago
                      </Badge>
                    </div>

                    <div className="mt-3 pt-3 border-t border-opacity-20">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <p className="text-gray-400">Date</p>
                          <p className="text-white font-semibold">
                            {formatDate(event.date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Asset</p>
                          <p className="text-white font-semibold">
                            {event.assetName}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-400">Event Type</p>
                          <p className="text-white font-semibold">
                            {getTypeLabel(event.type)}
                          </p>
                        </div>
                      </div>

                      {event.threatName && (
                        <div className="mt-3 pt-3 border-t border-opacity-20">
                          <p className="text-gray-400 text-xs">Threat</p>
                          <p className="text-white font-semibold text-sm">
                            {event.threatName}
                          </p>
                        </div>
                      )}

                      {event.controlName && (
                        <div className="mt-2">
                          <p className="text-gray-400 text-xs">Control</p>
                          <p className="text-white font-semibold text-sm">
                            {event.controlName}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-opacity-20">
                        <p className="text-gray-400 text-xs mb-2">Details</p>
                        <p className="text-gray-200 text-sm">{event.details}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">
              No events match the selected filters
            </p>
          </div>
        )}
      </Card>

      {/* Statistics */}
      <Card className="p-6 border-slate-700">
        <h3 className="text-white font-semibold mb-6">Timeline Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
            <p className="text-gray-400 text-xs mb-2">Total Events</p>
            <p className="text-3xl font-bold text-cyan-400">
              {timelineEvents.length}
            </p>
            <p className="text-xs text-gray-500 mt-2">Past 30 days</p>
          </div>

          <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
            <p className="text-gray-400 text-xs mb-2">Critical Events</p>
            <p className="text-3xl font-bold text-red-400">
              {timelineEvents.filter((e) => e.severity === "critical").length}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              Requiring immediate action
            </p>
          </div>

          <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
            <p className="text-gray-400 text-xs mb-2">Risks Resolved</p>
            <p className="text-3xl font-bold text-green-400">
              {timelineEvents.filter((e) => e.type === "risk_resolved").length}
            </p>
            <p className="text-xs text-gray-500 mt-2">Mitigated this month</p>
          </div>

          <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
            <p className="text-gray-400 text-xs mb-2">Controls Implemented</p>
            <p className="text-3xl font-bold text-blue-400">
              {
                timelineEvents.filter((e) => e.type === "control_implemented")
                  .length
              }
            </p>
            <p className="text-xs text-gray-500 mt-2">Deployed this month</p>
          </div>
        </div>
      </Card>
    </div>
  );
};
