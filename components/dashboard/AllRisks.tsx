"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ChevronRight, Filter, Search } from "lucide-react";
import { useEffect, useState } from "react";

interface Risk {
  id: string;
  category_name: string;
  nist_csf_function: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  business_impact: string;
  status: "open" | "in-progress" | "resolved";
  created_at: string;
}

export function AllRisks() {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [filteredRisks, setFilteredRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [functionFilter, setFunctionFilter] = useState<string>("all");

  useEffect(() => {
    fetchRisks();
  }, []);

  useEffect(() => {
    filterRisks();
  }, [risks, searchTerm, severityFilter, functionFilter]);

  const fetchRisks = async () => {
    try {
      // API endpoint removed - initialize with empty data
      setRisks([]);
    } catch (error) {
      console.error("Error fetching risks:", error);
      setRisks([]);
    } finally {
      setLoading(false);
    }
  };

  const filterRisks = () => {
    let filtered = risks;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (risk) =>
          risk.category_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          risk.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          risk.business_impact.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Severity filter
    if (severityFilter !== "all") {
      filtered = filtered.filter((risk) => risk.severity === severityFilter);
    }

    // NIST CSF Function filter
    if (functionFilter !== "all") {
      filtered = filtered.filter(
        (risk) => risk.nist_csf_function === functionFilter,
      );
    }

    setFilteredRisks(filtered);
  };

  const getSeverityColor = (severity: string) => {
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
  };

  const getFunctionColor = (func: string) => {
    const colors: Record<string, string> = {
      Identify: "bg-blue-100 text-blue-800",
      Protect: "bg-purple-100 text-purple-800",
      Detect: "bg-indigo-100 text-indigo-800",
      Respond: "bg-orange-100 text-orange-800",
      Recover: "bg-green-100 text-green-800",
    };
    return colors[func] || "bg-gray-100 text-gray-800";
  };

  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sortedFilteredRisks = [...filteredRisks].sort(
    (a, b) =>
      severityOrder[a.severity as keyof typeof severityOrder] -
      severityOrder[b.severity as keyof typeof severityOrder],
  );

  return (
    <Card>
      <CardHeader className="pb-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">All Security Risks</CardTitle>
          <span className="text-sm text-muted-foreground">
            {sortedFilteredRisks.length} risks
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search risks by name or impact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={functionFilter} onValueChange={setFunctionFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="NIST Function" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Functions</SelectItem>
                <SelectItem value="Identify">Identify</SelectItem>
                <SelectItem value="Protect">Protect</SelectItem>
                <SelectItem value="Detect">Detect</SelectItem>
                <SelectItem value="Respond">Respond</SelectItem>
                <SelectItem value="Recover">Recover</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Risks List */}
        <div className="space-y-3">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading risks...
            </div>
          ) : sortedFilteredRisks.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              {risks.length === 0
                ? "No risks found. Add risk categories to get started."
                : "No risks match your filters."}
            </div>
          ) : (
            sortedFilteredRisks.map((risk) => (
              <div
                key={risk.id}
                className="flex items-start justify-between rounded-lg border p-4 hover:bg-muted/50 transition cursor-pointer group"
              >
                <div className="flex gap-3 flex-1 min-w-0">
                  <AlertTriangle className="h-5 w-5 mt-1 shrink-0 text-orange-600" />
                  <div className="min-w-0">
                    <div className="flex gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold">
                        {risk.category_name}
                      </p>
                      <Badge
                        className={getFunctionColor(risk.nist_csf_function)}
                      >
                        {risk.nist_csf_function}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {risk.description}
                    </p>
                    <p className="text-xs text-muted-foreground italic">
                      Impact: {risk.business_impact}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Badge className={getSeverityColor(risk.severity)}>
                    {risk.severity}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary Stats */}
        {sortedFilteredRisks.length > 0 && (
          <div className="mt-6 pt-4 border-t grid grid-cols-4 gap-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">
                {
                  sortedFilteredRisks.filter((r) => r.severity === "critical")
                    .length
                }
              </p>
              <p className="text-xs text-muted-foreground">Critical</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {
                  sortedFilteredRisks.filter((r) => r.severity === "high")
                    .length
                }
              </p>
              <p className="text-xs text-muted-foreground">High</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">
                {
                  sortedFilteredRisks.filter((r) => r.severity === "medium")
                    .length
                }
              </p>
              <p className="text-xs text-muted-foreground">Medium</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {sortedFilteredRisks.filter((r) => r.severity === "low").length}
              </p>
              <p className="text-xs text-muted-foreground">Low</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
