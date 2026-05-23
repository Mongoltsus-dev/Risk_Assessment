import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import React, { useState } from "react";

interface RiskAssessmentWorkflowProps {
  assetId: number;
  assetName: string;
}

interface AssessmentPhase {
  status: "Pending" | "In Progress" | "Completed";
  description: string;
}

interface Risk {
  riskId: string;
  threatName: string;
  likelihood: number;
  likelihoodLabel: string;
  impact: number;
  impactLabel: string;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  controlsCount: number;
  controls: any[];
}

interface Assessment {
  assetId: number;
  asset: {
    name: string;
    type: string;
    criticality: string;
    dataClassification: string;
  };
  phases: {
    phase1: AssessmentPhase;
    phase2: AssessmentPhase;
    phase3: AssessmentPhase;
    phase4: AssessmentPhase;
  };
  risks: Risk[];
  summary: {
    totalRisks: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    totalControls: number;
  };
}

export const RiskAssessmentWorkflow: React.FC<RiskAssessmentWorkflowProps> = ({
  assetId,
  assetName,
}) => {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAssessment = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/complete-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asset_id: assetId,
          assessed_by_user: "Current User",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to start assessment");
      }

      const data = await response.json();
      setAssessment(data.assessment);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
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
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getPhaseIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return "✓";
      case "In Progress":
        return "⟳";
      default:
        return "○";
    }
  };

  if (!assessment) {
    return (
      <Card className="p-8">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Start Risk Assessment</h2>
          <p className="text-gray-600">
            Analyze {assetName} to identify risks, calculate scores, and get
            control recommendations.
          </p>
          <Button
            onClick={startAssessment}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? "Running Assessment..." : "Start Complete Assessment"}
          </Button>
          {error && <p className="text-red-600">{error}</p>}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Phase Progress */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Assessment Progress</h3>
        <div className="grid grid-cols-4 gap-4">
          {Object.entries(assessment.phases).map(([key, phase]) => (
            <div key={key} className="border rounded-lg p-4 text-center">
              <div className="text-3xl mb-2">{getPhaseIcon(phase.status)}</div>
              <div className="text-sm font-semibold">{phase.description}</div>
              <div className="text-xs text-gray-600 mt-1">{phase.status}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Risk Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Risk Summary</h3>
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <div className="text-3xl font-bold">
              {assessment.summary.totalRisks}
            </div>
            <div className="text-sm text-gray-600">Total Risks</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center border border-red-200">
            <div className="text-3xl font-bold text-red-700">
              {assessment.summary.criticalCount}
            </div>
            <div className="text-sm text-red-600">Critical</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg text-center border border-orange-200">
            <div className="text-3xl font-bold text-orange-700">
              {assessment.summary.highCount}
            </div>
            <div className="text-sm text-orange-600">High</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg text-center border border-yellow-200">
            <div className="text-3xl font-bold text-yellow-700">
              {assessment.summary.mediumCount}
            </div>
            <div className="text-sm text-yellow-600">Medium</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
            <div className="text-3xl font-bold text-green-700">
              {assessment.summary.lowCount}
            </div>
            <div className="text-sm text-green-600">Low</div>
          </div>
        </div>
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm">
            <strong>{assessment.summary.totalControls}</strong> controls
            recommended across all risks
          </p>
        </div>
      </Card>

      {/* Identified Risks Details */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Identified Risks</h3>
        <div className="space-y-4">
          {assessment.risks.map((risk) => (
            <div
              key={risk.riskId}
              className={`border-l-4 ${getRiskColor(risk.riskLevel).split(" ")[0]} p-4 rounded-lg`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="font-semibold text-lg">{risk.threatName}</h4>
                  <p className="text-sm text-gray-600">{risk.riskId}</p>
                </div>
                <Badge className={`${getRiskColor(risk.riskLevel)}`}>
                  {risk.riskLevel}
                </Badge>
              </div>

              {/* Risk Scoring Matrix */}
              <div className="grid grid-cols-4 gap-3 mb-3">
                <div className="bg-white p-2 rounded border">
                  <div className="text-xs text-gray-600">Likelihood</div>
                  <div className="text-lg font-bold">{risk.likelihood}/5</div>
                  <div className="text-xs">{risk.likelihoodLabel}</div>
                </div>
                <div className="bg-white p-2 rounded border">
                  <div className="text-xs text-gray-600">Impact</div>
                  <div className="text-lg font-bold">{risk.impact}/5</div>
                  <div className="text-xs">{risk.impactLabel}</div>
                </div>
                <div
                  className={`${getRiskColor(risk.riskLevel)} p-2 rounded border`}
                >
                  <div className="text-xs font-semibold">Risk Score</div>
                  <div className="text-lg font-bold">{risk.riskScore}/25</div>
                </div>
                <div className="bg-blue-50 p-2 rounded border border-blue-200">
                  <div className="text-xs text-blue-600">Controls</div>
                  <div className="text-lg font-bold text-blue-700">
                    {risk.controlsCount}
                  </div>
                </div>
              </div>

              {/* Recommended Controls */}
              {risk.controls.length > 0 && (
                <div className="border-t pt-3">
                  <p className="text-sm font-semibold mb-2">
                    Recommended Controls:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {risk.controls.slice(0, 5).map((control) => (
                      <Badge
                        key={control.id}
                        className="border border-gray-300 bg-white text-gray-700 text-xs"
                      >
                        {control.controlName || control.controlId}
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
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
