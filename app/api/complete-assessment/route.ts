import { pool } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

type AssessmentControl = {
  id: number;
  controlId: string;
  controlName: string;
  domain: string;
  priority: string;
  status: string;
};

type AssessmentRisk = {
  riskId: string;
  registerId: number;
  threatName: string;
  threatCategory: string;
  threatSource: string;
  threatening: string;
  likelihood: number;
  likelihoodLabel: string;
  impact: number;
  impactLabel: string;
  riskScore: number;
  riskLevel: string;
  controlsCount: number;
  controls: AssessmentControl[];
};

/**
 * POST /api/complete-assessment
 *
 * Complete 4-phase Risk Assessment Workflow:
 * Phase 1: Asset identified (input: asset_id)
 * Phase 2: Risks identified (automatic: threats mapped to asset type)
 * Phase 3: Risks analyzed (automatic: likelihood × impact scoring)
 * Phase 4: Controls recommended (automatic: NIST controls generated)
 *
 * Returns: Full assessment with all risks and recommendations
 */
export async function POST(req: NextRequest) {
  const client = await pool.connect();

  try {
    const { asset_id, assessed_by_user } = await req.json();

    if (!asset_id) {
      return NextResponse.json(
        { error: "asset_id is required" },
        { status: 400 },
      );
    }

    // Start transaction for atomicity
    await client.query("BEGIN");

    // PHASE 1: Get Asset (already exists)
    const assetResult = await client.query(
      `SELECT id, asset_code, asset_name, asset_type, criticality,
              data_classification, access_level, authentication_method,
              supports_critical_service, rto_hours, rpo_hours
        FROM assets WHERE id = $1`,
      [asset_id],
    );

    if (assetResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const asset = assetResult.rows[0];
    const assessment = {
      assetId: asset.id,
      asset: {
        code: asset.asset_code,
        name: asset.asset_name,
        type: asset.asset_type,
        criticality: asset.criticality,
        dataClassification: asset.data_classification,
        accessLevel: asset.access_level,
        authenticationMethod: asset.authentication_method,
        supportsCriticalService: asset.supports_critical_service,
        rtoHours: asset.rto_hours,
        rpoHours: asset.rpo_hours,
      },
      phases: {
        phase1: {
          status: "Completed",
          description: "Asset Registry",
        },
        phase2: {
          status: "In Progress",
          description: "Risk Identification",
        },
        phase3: {
          status: "Pending",
          description: "Risk Analysis & Scoring",
        },
        phase4: {
          status: "Pending",
          description: "Control Recommendations",
        },
      },
      risks: [] as AssessmentRisk[],
      summary: {
        totalRisks: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        lowCount: 0,
        totalControls: 0,
      },
    };

    // PHASE 2: Risk Identification - Find applicable threats
    const threatsResult = await client.query(
      `SELECT DISTINCT tc.*, tatm.applicability_score
        FROM threat_catalog tc
        INNER JOIN threat_asset_type_mapping tatm ON tc.threat_id = tatm.threat_id
        WHERE tatm.asset_type = $1 AND tatm.is_applicable = true AND tc.is_active = true
        ORDER BY tatm.applicability_score DESC`,
      [asset.asset_type],
    );

    assessment.phases.phase2.status = "Completed";

    // PHASE 3 & 4: Risk Analysis and Control Recommendations
    assessment.phases.phase3.status = "In Progress";
    assessment.phases.phase4.status = "In Progress";

    for (const threat of threatsResult.rows) {
      // Create unique risk ID
      const riskId = `RISK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create risk_register entry
      const riskRegisterResult = await client.query(
        `INSERT INTO risk_register (
          risk_id, asset_id, threat_id, risk_title, vulnerability_description,
          threat_actor, attack_vector, nist_csf_function, nist_csf_category
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, risk_id`,
        [
          riskId,
          asset_id,
          threat.threat_id,
          `${threat.threat_name} - ${asset.asset_name}`,
          threat.description,
          threat.threat_source,
          "Network-based" +
            (threat.stride_category === "Spoofing" ? ", Email" : ""),
          threat.nist_csf_function,
          threat.nist_csf_category,
        ],
      );

      const riskRegisterId = riskRegisterResult.rows[0].id;

      // Calculate initial likelihood and impact
      const { likelihood, impact } = calculateRiskScores(
        asset,
        threat.stride_category,
      );

      const riskScore = likelihood * impact;
      const riskLevel =
        riskScore <= 4
          ? "Low"
          : riskScore <= 9
            ? "Medium"
            : riskScore <= 16
              ? "High"
              : "Critical";

      // Create risk_analysis entry
      const analysisResult = await client.query(
        `INSERT INTO risk_analysis (
          risk_id, likelihood, likelihood_label, impact, impact_label,
          confidentiality_impact, integrity_impact, availability_impact,
          business_impact_description, assessed_by, assessment_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
        RETURNING id, risk_score, risk_level`,
        [
          riskRegisterId,
          likelihood,
          getLikelihoodLabel(likelihood),
          impact,
          getImpactLabel(impact),
          getConfidentialityImpact(threat.stride_category),
          getIntegrityImpact(threat.stride_category),
          getAvailabilityImpact(threat.stride_category),
          `Risk to ${asset.asset_name} (${asset.criticality} criticality) from ${threat.threat_name}`,
          assessed_by_user || "System",
        ],
      );

      const riskAnalysisId = analysisResult.rows[0].id;

      // Get recommended controls for this risk
      const controlsResult = await client.query(
        `SELECT sc.* FROM scf_controls sc
         WHERE sc.nist_csf_function = $1 AND sc.is_active = true
         ORDER BY sc.priority ASC
         LIMIT 10`,
        [threat.nist_csf_function],
      );

      const controls: AssessmentControl[] = [];

      // Create control recommendations
      for (const control of controlsResult.rows) {
        const recResult = await client.query(
          `INSERT INTO control_recommendations (
            risk_analysis_id, risk_register_id, scf_control_id, scf_domain,
            implementation_priority, recommendation_rationale
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *`,
          [
            riskAnalysisId,
            riskRegisterId,
            control.scf_control_id,
            control.scf_domain,
            riskLevel,
            `${control.scf_control_name} recommended to mitigate ${threat.threat_name}`,
          ],
        );

        controls.push({
          id: recResult.rows[0].id,
          controlId: control.scf_control_id,
          controlName: control.scf_control_name,
          domain: control.scf_domain,
          priority: riskLevel,
          status: "Not Started",
        });
      }

      // Add to assessment
      assessment.risks.push({
        riskId: riskId,
        registerId: riskRegisterId,
        threatName: threat.threat_name,
        threatCategory: threat.threat_category,
        threatSource: threat.threat_source,
        threatening: threat.threat_source,
        likelihood: likelihood,
        likelihoodLabel: getLikelihoodLabel(likelihood),
        impact: impact,
        impactLabel: getImpactLabel(impact),
        riskScore: riskScore,
        riskLevel: riskLevel,
        controlsCount: controls.length,
        controls: controls,
      });

      // Update summary counts
      assessment.summary.totalRisks++;
      assessment.summary[
        (riskLevel.toLowerCase() + "Count") as keyof typeof assessment.summary
      ] =
        (assessment.summary[
          (riskLevel.toLowerCase() + "Count") as keyof typeof assessment.summary
        ] as number) + 1;
      assessment.summary.totalControls += controls.length;
    }

    assessment.phases.phase3.status = "Completed";
    assessment.phases.phase4.status = "Completed";

    // Commit transaction
    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      assessment,
      message: `Complete assessment finished: Identified ${assessment.summary.totalRisks} risks with ${assessment.summary.totalControls} recommended controls`,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    console.error("Error completing assessment:", err);
    return NextResponse.json(
      {
        error: "Failed to complete assessment",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/**
 * GET /api/complete-assessment
 * Fetch full assessment for an asset
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("asset_id");

    if (!assetId) {
      return NextResponse.json(
        { error: "asset_id is required" },
        { status: 400 },
      );
    }

    // Get asset
    const assetResult = await pool.query(`SELECT * FROM assets WHERE id = $1`, [
      assetId,
    ]);

    if (assetResult.rows.length === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const asset = assetResult.rows[0];

    // Get all risks and their analysis/controls
    const risksResult = await pool.query(
      `SELECT 
        rr.id, rr.risk_id, rr.risk_title, rr.asset_id,
        tc.threat_name, tc.threat_category, tc.threat_source,
        ra.likelihood, ra.likelihood_label, ra.impact, ra.impact_label,
        ra.risk_score, ra.risk_level, ra.id as analysis_id,
        COUNT(cr.id) as control_count
       FROM risk_register rr
       LEFT JOIN threat_catalog tc ON rr.threat_id = tc.threat_id
       LEFT JOIN risk_analysis ra ON rr.id = ra.risk_id
       LEFT JOIN control_recommendations cr ON ra.id = cr.risk_analysis_id
       WHERE rr.asset_id = $1
       GROUP BY rr.id, tc.threat_name, tc.threat_category, tc.threat_source,
                ra.id, ra.likelihood, ra.likelihood_label, ra.impact, ra.impact_label,
                ra.risk_score, ra.risk_level
       ORDER BY ra.risk_score DESC NULLS LAST`,
      [assetId],
    );

    // Get controls for each risk
    const risks = [];
    for (const risk of risksResult.rows) {
      const controlsResult = await pool.query(
        `SELECT cr.*, sc.scf_control_name, sc.scf_domain
         FROM control_recommendations cr
         LEFT JOIN scf_controls sc ON cr.scf_control_id = sc.scf_control_id
         WHERE cr.risk_analysis_id = $1
         ORDER BY cr.implementation_priority`,
        [risk.analysis_id],
      );

      risks.push({
        ...risk,
        controls: controlsResult.rows || [],
      });
    }

    // Calculate summary
    const summary = {
      totalRisks: risks.length,
      criticalCount: risks.filter((r) => r.risk_level === "Critical").length,
      highCount: risks.filter((r) => r.risk_level === "High").length,
      mediumCount: risks.filter((r) => r.risk_level === "Medium").length,
      lowCount: risks.filter((r) => r.risk_level === "Low").length,
    };

    return NextResponse.json({
      asset,
      risks,
      summary,
    });
  } catch (err: unknown) {
    console.error("Error fetching assessment:", err);
    return NextResponse.json(
      { error: "Failed to fetch assessment" },
      { status: 500 },
    );
  }
}

// Helper functions
function calculateRiskScores(
  asset: Record<string, unknown>,
  strideCategory: string,
): { likelihood: number; impact: number } {
  const normalizedCriticality = String(asset.criticality ?? "").toLowerCase();
  let impact = 3;
  if (normalizedCriticality.includes("tier 0")) impact = 5;
  else if (normalizedCriticality.includes("tier 1")) impact = 4;
  else if (normalizedCriticality.includes("tier 2")) impact = 3;
  else if (normalizedCriticality.includes("critical")) impact = 5;
  else if (normalizedCriticality.includes("high")) impact = 4;
  else if (normalizedCriticality.includes("low")) impact = 2;

  let likelihood = 3;
  if (
    strideCategory === "Elevation" ||
    strideCategory === "Denial of Service"
  ) {
    likelihood = 4;
  } else if (strideCategory === "Info Disclosure") {
    likelihood = 4;
  } else if (strideCategory === "Tampering") {
    likelihood = 2;
  }

  const accessLevel = String(asset.access_level ?? "").toLowerCase();
  const authenticationMethod = String(
    asset.authentication_method ?? "",
  ).toLowerCase();
  const dataClassification = String(
    asset.data_classification ?? "",
  ).toLowerCase();

  if (accessLevel.includes("public api")) likelihood += 2;
  else if (accessLevel.includes("public web")) likelihood += 1;
  else if (accessLevel.includes("vpn")) likelihood -= 1;

  if (authenticationMethod === "password only") likelihood += 1;
  else if (
    authenticationMethod.includes("mfa") ||
    authenticationMethod.includes("sso") ||
    authenticationMethod.includes("federated")
  ) {
    likelihood -= 1;
  }

  if (["restricted", "confidential"].includes(dataClassification)) impact += 1;
  if (asset.supports_critical_service === true) impact += 1;

  likelihood = Math.min(5, Math.max(1, likelihood));
  impact = Math.min(5, Math.max(1, impact));

  return { likelihood, impact };
}

function getLikelihoodLabel(score: number): string {
  const labels = ["", "Rare", "Unlikely", "Possible", "Likely", "Very Likely"];
  return labels[score] || "Possible";
}

function getImpactLabel(score: number): string {
  const labels = ["", "Negligible", "Minor", "Moderate", "Major", "Critical"];
  return labels[score] || "Moderate";
}

function getConfidentialityImpact(strideCategory: string): string {
  return ["Info Disclosure", "Spoofing"].includes(strideCategory)
    ? "High"
    : "Medium";
}

function getIntegrityImpact(strideCategory: string): string {
  return ["Tampering", "Elevation"].includes(strideCategory)
    ? "High"
    : "Medium";
}

function getAvailabilityImpact(strideCategory: string): string {
  return strideCategory === "Denial of Service" ? "Critical" : "Medium";
}
