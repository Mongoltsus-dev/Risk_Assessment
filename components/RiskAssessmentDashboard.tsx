import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import React, { useEffect, useState } from "react";

interface Asset {
  id: number;
  asset_code: string;
  asset_name: string;
  asset_type: string;
  criticality: string;
  data_classification: string;
  rto_hours?: number;
  rpo_hours?: number;
}

interface RiskData {
  id: number;
  risk_id: string;
  risk_title: string;
  threat_name: string;
  threat_category: string;
  threat_source: string;
  likelihood: number;
  likelihood_label: string;
  impact: number;
  impact_label: string;
  risk_score: number;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  control_count: number;
  controls: any[];
  status: string;
}

interface AssessmentSummary {
  totalRisks: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

interface RiskAssessmentDashboardProps {
  assetId: number;
}

export const RiskAssessmentDashboard: React.FC<
  RiskAssessmentDashboardProps
> = ({ assetId }) => {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [risks, setRisks] = useState<RiskData[]>([]);
  const [summary, setSummary] = useState<AssessmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedRisk, setSelectedRisk] = useState<RiskData | null>(null);
  const [filter, setFilter] = useState<
    "all" | "critical" | "high" | "medium" | "low"
  >("all");

  useEffect(() => {
    fetchAssessment();
  }, [assetId]);

  const fetchAssessment = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/complete-assessment?asset_id=${assetId}`,
      );
      if (response.ok) {
        const data = await response.json();
        setAsset(data.asset);
        setRisks(data.risks);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("Failed to fetch assessment:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredRisks = () => {
    if (filter === "all") return risks;
    return risks.filter((r) => r.risk_level.toLowerCase() === filter);
  };

  const getRiskColor = (level: string): string => {
    switch (level) {
      case "Critical":
        return "bg-red-100 text-red-800 border-red-300";
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "Medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "Low":
        return "bg-green-100 text-green-800 border-green-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <p>Loading assessment...</p>
      </Card>
    );
  }

  const filteredRisks = getFilteredRisks();

  return (
    <div className="space-y-6">
      {/* Asset Information */}
      <Card className="p-6 border-blue-200">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold mb-2">{asset?.asset_name}</h2>
            <p className="text-gray-600 mb-3">{asset?.asset_code}</p>
            <div className="flex gap-3 flex-wrap">
              <Badge className="bg-blue-600">{asset?.asset_type}</Badge>
              <Badge className="bg-purple-600">{asset?.criticality}</Badge>
              <Badge className="border border-gray-300 bg-white text-gray-700">
                {asset?.data_classification}
              </Badge>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">RTO / RPO</div>
            <div className="font-semibold">
              {asset?.rto_hours}h / {asset?.rpo_hours}h
            </div>
          </div>
        </div>
      </Card>

      {/* Risk Summary Stats */}
      {summary && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Risk Summary</h3>
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center border">
              <div className="text-3xl font-bold">{summary.totalRisks}</div>
              <div className="text-sm text-gray-600 mt-1">Total Risks</div>
            </div>
            <div
              className={`p-4 rounded-lg text-center border ${getRiskColor("Critical")}`}
            >
              <div className="text-3xl font-bold">{summary.criticalCount}</div>
              <div className="text-sm font-semibold">Critical</div>
            </div>
            <div
              className={`p-4 rounded-lg text-center border ${getRiskColor("High")}`}
            >
              <div className="text-3xl font-bold">{summary.highCount}</div>
              <div className="text-sm font-semibold">High</div>
            </div>
            <div
              className={`p-4 rounded-lg text-center border ${getRiskColor("Medium")}`}
            >
              <div className="text-3xl font-bold">{summary.mediumCount}</div>
              <div className="text-sm font-semibold">Medium</div>
            </div>
            <div
              className={`p-4 rounded-lg text-center border ${getRiskColor("Low")}`}
            >
              <div className="text-3xl font-bold">{summary.lowCount}</div>
              <div className="text-sm font-semibold">Low</div>
            </div>
          </div>
        </Card>
      )}

      {/* Risk Filter Buttons */}
      <div className="flex gap-2">
        {["all", "critical", "high", "medium", "low"].map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f as any)}
            size="sm"
          >
            {f === "all"
              ? "All Risks"
              : `${f.charAt(0).toUpperCase() + f.slice(1)}`}
            {f !== "all" && (
              <>
                {" "}
                ({risks.filter((r) => r.risk_level.toLowerCase() === f).length})
              </>
            )}
          </Button>
        ))}
      </div>

      {/* Risk List */}
      <div className="space-y-3">
        {filteredRisks.map((risk) => (
          <Card
            key={risk.id}
            className={`cursor-pointer hover:shadow-lg transition-shadow border-l-4 ${
              getRiskColor(risk.risk_level).split(" ")[0]
            }`}
            onClick={() =>
              setSelectedRisk(selectedRisk?.id === risk.id ? null : risk)
            }
          >
            <div className="p-4">
              {/* Risk Header */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-semibold text-lg">{risk.threat_name}</h4>
                  <p className="text-sm text-gray-600">{risk.risk_id}</p>
                </div>
                <Badge className={getRiskColor(risk.risk_level)}>
                  {risk.risk_level}
                </Badge>
              </div>

              {/* Risk Scoring */}
              <div className="grid grid-cols-5 gap-2 mb-3">
                <div className="bg-gray-50 p-2 rounded text-center text-sm">
                  <div className="text-xs text-gray-600">Likelihood</div>
                  <div className="font-bold">{risk.likelihood}/5</div>
                  <div className="text-xs">{risk.likelihood_label}</div>
                </div>
                <div className="bg-gray-50 p-2 rounded text-center text-sm">
                  <div className="text-xs text-gray-600">Impact</div>
                  <div className="font-bold">{risk.impact}/5</div>
                  <div className="text-xs">{risk.impact_label}</div>
                </div>
                <div
                  className={`p-2 rounded text-center text-sm border ${getRiskColor(risk.risk_level)}`}
                >
                  <div className="text-xs font-semibold">Score</div>
                  <div className="font-bold">{risk.risk_score}/25</div>
                </div>
                <div className="bg-blue-50 p-2 rounded text-center text-sm border border-blue-200">
                  <div className="text-xs text-blue-600">Threat</div>
                  <div className="font-bold text-blue-700">
                    {risk.threat_category}
                  </div>
                </div>
                <div className="bg-green-50 p-2 rounded text-center text-sm border border-green-200">
                  <div className="text-xs text-green-600">Controls</div>
                  <div className="font-bold text-green-700">
                    {risk.control_count}
                  </div>
                </div>
              </div>

              {/* Threat Details */}
              <div className="text-sm text-gray-600">
                <span className="font-semibold">Source:</span>{" "}
                {risk.threat_source}
              </div>

              {/* Expanded Details */}
              {selectedRisk?.id === risk.id && (
                <div className="border-t mt-4 pt-4 space-y-3">
                  <div>
                    <h5 className="font-semibold text-sm mb-2">
                      Risk Description
                    </h5>
                    <p className="text-sm text-gray-700">{risk.risk_title}</p>
                  </div>

                  {/* Top Controls */}
                  {risk.controls && risk.controls.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-sm mb-2">
                        Recommended Controls ({risk.controls.length})
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {risk.controls.slice(0, 5).map((control) => (
                          <Badge
                            key={control.id}
                            className="border border-gray-300 bg-white text-gray-700 text-xs"
                          >
                            {control.scf_control_name || control.controlName}
                          </Badge>
                        ))}
                        {risk.controls.length > 5 && (
                          <Badge className="border border-gray-300 bg-white text-gray-700 text-xs">
                            +{risk.controls.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    View Full Analysis & Controls
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredRisks.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-gray-600">
            No {filter !== "all" ? filter : ""} risks found
          </p>
        </Card>
      )}
    </div>
  );
};
