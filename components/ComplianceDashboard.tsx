import { Card } from "@/components/ui/card";
import React, { useState } from "react";

interface NISTFunction {
  name: string;
  shortName: string;
  compliance: number;
  controlsImplemented: number;
  controlsTotal: number;
  description: string;
  riskCoverage: number;
  icon: string;
}

export const ComplianceDashboard: React.FC = () => {
  const [nistFunctions] = useState<NISTFunction[]>([
    {
      name: "Identify",
      shortName: "IDENTIFY",
      compliance: 85,
      controlsImplemented: 17,
      controlsTotal: 20,
      description: "Develop understanding of cybersecurity risks",
      riskCoverage: 92,
      icon: "🔍",
    },
    {
      name: "Protect",
      shortName: "PROTECT",
      compliance: 72,
      controlsImplemented: 14,
      controlsTotal: 19,
      description: "Safeguard against cyberattacks",
      riskCoverage: 78,
      icon: "🛡️",
    },
    {
      name: "Detect",
      shortName: "DETECT",
      compliance: 68,
      controlsImplemented: 12,
      controlsTotal: 18,
      description: "Monitor and identify security incidents",
      riskCoverage: 65,
      icon: "🚨",
    },
    {
      name: "Respond",
      shortName: "RESPOND",
      compliance: 62,
      controlsImplemented: 10,
      controlsTotal: 16,
      description: "Contain and remediate security incidents",
      riskCoverage: 58,
      icon: "🔧",
    },
    {
      name: "Recover",
      shortName: "RECOVER",
      compliance: 75,
      controlsImplemented: 15,
      controlsTotal: 20,
      description: "Restore systems to normal operations",
      riskCoverage: 82,
      icon: "♻️",
    },
  ]);

  const [selectedFunction, setSelectedFunction] = useState<NISTFunction | null>(
    nistFunctions[0],
  );

  const averageCompliance =
    Math.round(
      nistFunctions.reduce((sum, f) => sum + f.compliance, 0) /
        nistFunctions.length,
    ) || 0;

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 80) return "text-green-400";
    if (compliance >= 60) return "text-yellow-400";
    if (compliance >= 40) return "text-orange-400";
    return "text-red-400";
  };

  const getComplianceBgColor = (compliance: number) => {
    if (compliance >= 80) return "bg-green-900 border-green-700";
    if (compliance >= 60) return "bg-yellow-900 border-yellow-700";
    if (compliance >= 40) return "bg-orange-900 border-orange-700";
    return "bg-red-900 border-red-700";
  };

  return (
    <div className="space-y-6">
      {/* Overall Compliance Score */}
      <Card className="p-6 border-cyan-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm mb-2">
              Overall NIST CSF Compliance
            </p>
            <div className="flex items-baseline gap-3">
              <div className="text-5xl font-bold text-cyan-400">
                {averageCompliance}%
              </div>
              <div className="text-gray-400">
                <p className="text-xs">5 Functions</p>
                <p className="text-xs">78 Controls</p>
              </div>
            </div>
          </div>
          <div className="relative w-32 h-32">
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox="0 0 120 120"
            >
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#0f172a"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#22d3ee"
                strokeWidth="8"
                strokeDasharray={`${(averageCompliance / 100) * 314} 314`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-400">
                  {averageCompliance}
                </div>
                <div className="text-xs text-gray-400">Score</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* NIST Functions Grid */}
      <Card className="p-6 border-slate-700">
        <h3 className="text-white font-semibold mb-6">NIST CSF Functions</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-6">
          {nistFunctions.map((func) => (
            <div
              key={func.shortName}
              onClick={() => setSelectedFunction(func)}
              className={`cursor-pointer transition-all p-4 rounded-lg border ${
                selectedFunction?.shortName === func.shortName
                  ? "bg-slate-700 border-cyan-500 ring-2 ring-cyan-500"
                  : "bg-slate-700 border-slate-600 hover:border-slate-500"
              }`}
            >
              <div className="text-2xl mb-2">{func.icon}</div>
              <p className="text-white font-semibold text-sm mb-2">
                {func.name}
              </p>
              <p
                className={`text-lg font-bold ${getComplianceColor(func.compliance)}`}
              >
                {func.compliance}%
              </p>
              <div className="w-full bg-slate-600 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-linear-to-r from-cyan-400 to-blue-500 h-full"
                  style={{ width: `${func.compliance}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Selected Function Details */}
      {selectedFunction && (
        <Card className="p-6 border-slate-700">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overview */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{selectedFunction.icon}</span>
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {selectedFunction.name} ({selectedFunction.shortName})
                    </h3>
                    <p className="text-gray-400 text-sm">
                      {selectedFunction.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Compliance Details */}
              <div className="space-y-6">
                <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                  <p className="text-gray-400 text-xs mb-3">
                    Function Compliance Score
                  </p>
                  <div className="flex items-end gap-4">
                    <div>
                      <div className="text-3xl font-bold text-cyan-400">
                        {selectedFunction.compliance}%
                      </div>
                      <p className="text-xs text-gray-500">Compliant</p>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-slate-600 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-linear-to-r from-cyan-400 to-blue-500 h-full"
                          style={{ width: `${selectedFunction.compliance}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <p className="text-gray-400 text-xs mb-1">
                      Controls Implemented
                    </p>
                    <div className="text-2xl font-bold text-green-400">
                      {selectedFunction.controlsImplemented}/
                      {selectedFunction.controlsTotal}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round(
                        (selectedFunction.controlsImplemented /
                          selectedFunction.controlsTotal) *
                          100,
                      )}
                      % Complete
                    </p>
                  </div>

                  <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                    <p className="text-gray-400 text-xs mb-1">Risk Coverage</p>
                    <div className="text-2xl font-bold text-blue-400">
                      {selectedFunction.riskCoverage}%
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Of identified risks mitigated
                    </p>
                  </div>
                </div>
              </div>

              {/* Recommended Actions */}
              <div className="mt-6 border-t border-slate-600 pt-6">
                <h4 className="text-white font-semibold mb-3">Next Steps</h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 shrink-0"></div>
                    <span className="text-gray-400">
                      Implement remaining{" "}
                      {selectedFunction.controlsTotal -
                        selectedFunction.controlsImplemented}{" "}
                      controls
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 shrink-0"></div>
                    <span className="text-gray-400">
                      Close control gaps for{" "}
                      {Math.round(100 - selectedFunction.riskCoverage)}% of
                      unmitigated risks
                    </span>
                  </div>
                  <div className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5 shrink-0"></div>
                    <span className="text-gray-400">
                      Increase compliance to 90%+ through control maturation
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Side Panel - Control Breakdown */}
            <div className="bg-slate-700 p-4 rounded-lg border border-slate-600">
              <h4 className="text-white font-semibold mb-4">
                Control Categories
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-xs">
                      Identity & Access
                    </span>
                    <span className="text-green-400 text-xs font-semibold">
                      100%
                    </span>
                  </div>
                  <div className="w-full bg-slate-600 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full w-full"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-xs">
                      Data Protection
                    </span>
                    <span className="text-green-400 text-xs font-semibold">
                      80%
                    </span>
                  </div>
                  <div className="w-full bg-slate-600 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full w-4/5"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-xs">Monitoring</span>
                    <span className="text-yellow-400 text-xs font-semibold">
                      60%
                    </span>
                  </div>
                  <div className="w-full bg-slate-600 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-yellow-500 h-full w-3/5"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-xs">
                      Incident Response
                    </span>
                    <span className="text-orange-400 text-xs font-semibold">
                      50%
                    </span>
                  </div>
                  <div className="w-full bg-slate-600 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full w-1/2"></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-xs">Recovery</span>
                    <span className="text-green-400 text-xs font-semibold">
                      85%
                    </span>
                  </div>
                  <div className="w-full bg-slate-600 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: "85%" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
