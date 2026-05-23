import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import React, { useState } from "react";

interface Control {
  id: number;
  scf_control_id: string;
  scf_control_name: string;
  scf_description: string;
  scf_domain: string;
  implementation_priority: "Critical" | "High" | "Medium" | "Low";
  implementation_effort: "Easy" | "Medium" | "Hard";
  typical_cost?: string;
  implementation_status?: string;
  recommendation_rationale: string;
}

interface ControlRecommendationsProps {
  controls: Control[];
  riskLevel: string;
  onImplement?: (controlId: string) => void;
}

export const ControlRecommendations: React.FC<ControlRecommendationsProps> = ({
  controls,
  riskLevel,
  onImplement,
}) => {
  const [expandedControl, setExpandedControl] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  const filteredControls = filterPriority
    ? controls.filter((c) => c.implementation_priority === filterPriority)
    : controls;

  const getCategoryColor = (domain: string): string => {
    const colorMap: Record<string, string> = {
      "Identity & Access Management":
        "bg-blue-100 text-blue-800 border-blue-300",
      "Data Protection": "bg-purple-100 text-purple-800 border-purple-300",
      "Network Security": "bg-cyan-100 text-cyan-800 border-cyan-300",
      "Monitoring & Logging": "bg-green-100 text-green-800 border-green-300",
      "Patch Management": "bg-orange-100 text-orange-800 border-orange-300",
      "Incident Response": "bg-red-100 text-red-800 border-red-300",
      Recovery: "bg-indigo-100 text-indigo-800 border-indigo-300",
    };
    return colorMap[domain] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "Critical":
        return "bg-red-500 text-white";
      case "High":
        return "bg-orange-500 text-white";
      case "Medium":
        return "bg-yellow-500 text-white";
      case "Low":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getEffortIcon = (effort: string): string => {
    switch (effort) {
      case "Easy":
        return "🟢";
      case "Medium":
        return "🟡";
      case "Hard":
        return "🔴";
      default:
        return "⚪";
    }
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-semibold">
              Recommended Controls ({filteredControls.length})
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {controls.length} total controls recommended for this {riskLevel}{" "}
              risk
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilterPriority(null)}
            className={filterPriority ? "" : "hidden"}
          >
            Clear Filter
          </Button>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          {["Critical", "High", "Medium", "Low"].map((priority) => {
            const count = controls.filter(
              (c) => c.implementation_priority === priority,
            ).length;
            return (
              <Button
                key={priority}
                size="sm"
                variant={filterPriority === priority ? "default" : "outline"}
                onClick={() =>
                  setFilterPriority(
                    filterPriority === priority ? null : priority,
                  )
                }
                className={
                  filterPriority === priority ? getPriorityColor(priority) : ""
                }
              >
                {priority} ({count})
              </Button>
            );
          })}
        </div>

        {/* Controls List */}
        <div className="space-y-3">
          {filteredControls.map((control) => (
            <div
              key={control.id}
              className="border rounded-lg hover:shadow-md transition-shadow"
            >
              {/* Control Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedControl(
                    expandedControl === control.scf_control_id
                      ? null
                      : control.scf_control_id,
                  )
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-sm">
                        {control.scf_control_id} - {control.scf_control_name}
                      </h4>
                      <Badge
                        className={`text-xs ${getCategoryColor(
                          control.scf_domain,
                        )}`}
                      >
                        {control.scf_domain}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      {control.scf_description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={getPriorityColor(
                        control.implementation_priority,
                      )}
                    >
                      {control.implementation_priority}
                    </Badge>
                    <span className="text-xl">
                      {expandedControl === control.scf_control_id ? "▼" : "▶"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedControl === control.scf_control_id && (
                <div className="border-t p-4 bg-gray-50 space-y-4">
                  {/* Recommendation Rationale */}
                  <div>
                    <h5 className="font-semibold text-sm mb-2">
                      Why This Control?
                    </h5>
                    <p className="text-sm text-gray-700">
                      {control.recommendation_rationale}
                    </p>
                  </div>

                  {/* Implementation Details */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-600 mb-1">
                        Implementation Effort
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {getEffortIcon(control.implementation_effort)}
                        </span>
                        <span className="text-sm font-semibold">
                          {control.implementation_effort}
                        </span>
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-600 mb-1">
                        Estimated Cost
                      </div>
                      <div className="text-sm font-semibold">
                        {control.typical_cost || "Not Specified"}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border">
                      <div className="text-xs text-gray-600 mb-1">Status</div>
                      <Badge className="text-xs border border-gray-300 bg-white text-gray-700">
                        {control.implementation_status || "Not Started"}
                      </Badge>
                    </div>
                  </div>

                  {/* Action Button */}
                  {onImplement && (
                    <Button
                      size="sm"
                      onClick={() => onImplement(control.scf_control_id)}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      Mark as Implementing
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {filteredControls.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">
              No controls found for selected priority
            </p>
          </div>
        )}
      </Card>

      {/* Implementation Roadmap */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Implementation Roadmap</h4>
        <div className="space-y-3">
          {["Critical", "High", "Medium", "Low"].map((priority) => {
            const priorityControls = controls.filter(
              (c) => c.implementation_priority === priority,
            );
            if (priorityControls.length === 0) return null;

            const easyCount = priorityControls.filter(
              (c) => c.implementation_effort === "Easy",
            ).length;
            const mediumCount = priorityControls.filter(
              (c) => c.implementation_effort === "Medium",
            ).length;
            const hardCount = priorityControls.filter(
              (c) => c.implementation_effort === "Hard",
            ).length;

            return (
              <div key={priority} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">
                    {priority} Priority
                  </span>
                  <span className="text-xs text-gray-600">
                    {priorityControls.length} control(s)
                  </span>
                </div>
                <div className="flex gap-2 text-xs">
                  {easyCount > 0 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                      🟢 {easyCount} Easy
                    </span>
                  )}
                  {mediumCount > 0 && (
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                      🟡 {mediumCount} Medium
                    </span>
                  )}
                  {hardCount > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded">
                      🔴 {hardCount} Hard
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
