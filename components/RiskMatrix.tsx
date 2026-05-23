import { Card } from "@/components/ui/card";
import React from "react";

interface RiskMatrixProps {
  likelihood: number;
  impact: number;
  riskScore: number;
  riskLevel: "Low" | "Medium" | "High" | "Critical";
  likelihoodLabel: string;
  impactLabel: string;
}

export const RiskMatrix: React.FC<RiskMatrixProps> = ({
  likelihood,
  impact,
  riskScore,
  riskLevel,
  likelihoodLabel,
  impactLabel,
}) => {
  // 5x5 risk matrix
  const matrix = Array.from({ length: 5 }, (_, i) => i + 1).reverse();

  const getCellColor = (l: number, i: number): string => {
    const score = l * i;
    if (score <= 4) return "bg-green-100 border-green-300";
    if (score <= 9) return "bg-yellow-100 border-yellow-300";
    if (score <= 16) return "bg-orange-100 border-orange-300";
    return "bg-red-100 border-red-300";
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">
          Risk Assessment Matrix (5×5)
        </h3>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border p-2 bg-gray-100 text-sm font-semibold">
                  Impact →
                </th>
                {Array.from({ length: 5 }, (_, i) => (
                  <th
                    key={`impact-${i}`}
                    className="border p-2 bg-gray-100 text-sm font-semibold"
                  >
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2 bg-gray-100 font-semibold text-sm">
                  ↑ Likelihood
                </td>
              </tr>
              {matrix.map((likelihoodVal) => (
                <tr key={`likelihood-${likelihoodVal}`}>
                  <td className="border p-2 bg-gray-100 font-semibold text-sm text-center w-20">
                    {likelihoodVal}
                  </td>
                  {Array.from({ length: 5 }, (_, i) => {
                    const impactVal = i + 1;
                    const score = likelihoodVal * impactVal;
                    const isSelected =
                      likelihood === likelihoodVal && impact === impactVal;

                    return (
                      <td
                        key={`cell-${likelihoodVal}-${impactVal}`}
                        className={`border p-3 text-center font-bold cursor-pointer transition-all ${getCellColor(
                          likelihoodVal,
                          impactVal,
                        )} ${isSelected ? "ring-2 ring-blue-500 ring-offset-2" : ""}`}
                      >
                        <div className="text-lg">{score}</div>
                        <div className="text-xs text-gray-600">
                          {getRiskLevelText(score)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-green-100 border border-green-300 rounded"></div>
            <span className="text-sm">Low (1-4)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-yellow-100 border border-yellow-300 rounded"></div>
            <span className="text-sm">Medium (5-9)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-100 border border-orange-300 rounded"></div>
            <span className="text-sm">High (10-16)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-sm">Critical (17-25)</span>
          </div>
        </div>
      </Card>

      {/* Selected Risk Details */}
      <Card className="p-6 border border-blue-200">
        <h4 className="font-semibold mb-4">Current Risk Assessment</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">Likelihood</div>
            <div className="text-2xl font-bold text-blue-700">
              {likelihood}/5
            </div>
            <div className="text-xs text-gray-600">{likelihoodLabel}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-blue-200">
            <div className="text-sm text-gray-600 mb-1">Impact</div>
            <div className="text-2xl font-bold text-blue-700">{impact}/5</div>
            <div className="text-xs text-gray-600">{impactLabel}</div>
          </div>
          <div
            className={`p-4 rounded-lg border-2 ${getRiskColorClass(riskLevel)}`}
          >
            <div className="text-sm font-semibold mb-1">Risk Score</div>
            <div className="text-2xl font-bold">{riskScore}/25</div>
            <div className="text-xs font-semibold">{riskLevel}</div>
          </div>
        </div>
      </Card>

      {/* Risk Level Explanation */}
      <Card className="p-6">
        <h4 className="font-semibold mb-3">Risk Score Interpretation</h4>
        <div className="space-y-2 text-sm">
          <p>
            <strong>Risk Score = Likelihood × Impact</strong>
          </p>
          <ul className="space-y-1 ml-4">
            <li>
              <strong className="text-green-700">Low (1-4):</strong> Minimal
              threat to operations
            </li>
            <li>
              <strong className="text-yellow-700">Medium (5-9):</strong>{" "}
              Moderate concern, remediation recommended
            </li>
            <li>
              <strong className="text-orange-700">High (10-16):</strong>{" "}
              Significant risk, prioritize remediation
            </li>
            <li>
              <strong className="text-red-700">Critical (17-25):</strong> Urgent
              action required
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

function getRiskLevelText(score: number): string {
  if (score <= 4) return "Low";
  if (score <= 9) return "Medium";
  if (score <= 16) return "High";
  return "Critical";
}

function getRiskColorClass(level: string): string {
  switch (level) {
    case "Critical":
      return "bg-red-100 border-red-300";
    case "High":
      return "bg-orange-100 border-orange-300";
    case "Medium":
      return "bg-yellow-100 border-yellow-300";
    case "Low":
      return "bg-green-100 border-green-300";
    default:
      return "bg-gray-100 border-gray-300";
  }
}
