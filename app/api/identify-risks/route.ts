import { pool } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/identify-risks
 * Automatically identifies all relevant risks for a given asset
 *
 * Workflow:
 * 1. Get asset details
 * 2. Find all applicable threats for asset type
 * 3. Create risk_register entries for each applicable threat
 * 4. Auto-calculate risk_analysis with initial likelihood/impact
 * 5. Generate control recommendations
 * 6. Return full assessment
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

    // Start transaction
    await client.query("BEGIN");

    // Step 1: Get asset details
    const assetResult = await client.query(
      `SELECT id, asset_name, asset_type, criticality, data_classification,
              access_level, authentication_method,
              supports_critical_service, rto_hours, rpo_hours
       FROM assets WHERE id = $1`,
      [asset_id],
    );

    if (assetResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const asset = assetResult.rows[0];

    // Step 2: Find applicable threats for this asset type
    const threatsResult = await client.query(
      `SELECT DISTINCT tc.*, tatm.applicability_score
       FROM threat_catalog tc
       INNER JOIN threat_asset_type_mapping tatm ON tc.threat_id = tatm.threat_id
       WHERE tatm.asset_type = $1 AND tatm.is_applicable = true AND tc.is_active = true
       ORDER BY tatm.applicability_score DESC`,
      [asset.asset_type],
    );

    const applicableThreats = threatsResult.rows;
    const createdRisks = [];

    // Step 3 & 4: Create risks and auto-score them
    for (const threat of applicableThreats) {
      // Generate unique risk ID
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
          "To Be Determined", // Will be determined during risk analysis
          threat.nist_csf_function,
          threat.nist_csf_category,
        ],
      );

      const riskRegisterId = riskRegisterResult.rows[0].id;

      // Calculate initial likelihood and impact based on asset criticality
      const { likelihood, impact } = calculateInitialRiskScores(
        asset,
        threat.applicable_asset_types,
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

      // Step 5: Generate control recommendations for this risk
      const controlsResult = await client.query(
        `SELECT sc.*, 
                CASE WHEN ra.risk_level = 'Critical' THEN 'Critical'
                     WHEN ra.risk_level = 'High' THEN 'High'
                     WHEN ra.risk_level = 'Medium' THEN 'Medium'
                     ELSE 'Low'
                END as priority
         FROM scf_controls sc
         LEFT JOIN risk_analysis ra ON ra.id = $1
         WHERE sc.nist_csf_function = $2 AND sc.is_active = true
         ORDER BY sc.priority ASC
         LIMIT 10`,
        [riskAnalysisId, threat.nist_csf_function],
      );

      // Insert control recommendations
      for (const control of controlsResult.rows) {
        await client.query(
          `INSERT INTO control_recommendations (
            risk_analysis_id, risk_register_id, scf_control_id, scf_domain,
            implementation_priority, recommendation_rationale
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            riskAnalysisId,
            riskRegisterId,
            control.scf_control_id,
            control.scf_domain,
            control.priority,
            `${control.scf_control_name} recommended to mitigate ${threat.threat_name} risk to ${asset.asset_name}. ${control.scf_description}`,
          ],
        );
      }

      createdRisks.push({
        riskId,
        riskRegisterId,
        threat: threat.threat_name,
        likelihood,
        impact,
        riskScore,
        riskLevel,
        controlsCount: controlsResult.rows.length,
      });
    }

    // Commit transaction
    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        name: asset.asset_name,
        type: asset.asset_type,
        criticality: asset.criticality,
      },
      risksIdentified: createdRisks.length,
      risks: createdRisks,
      message: `Automatically identified and analyzed ${createdRisks.length} risks for asset "${asset.asset_name}"`,
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    console.error("Error identifying risks:", err);
    return NextResponse.json(
      {
        error: "Failed to identify risks",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

/**
 * Calculate initial risk scores based on asset criticality and threat type
 */
function calculateInitialRiskScores(
  asset: Record<string, unknown>,
  applicableTypes: string[],
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

  // Adjust likelihood based on STRIDE category and threat probability
  let likelihood = 3; // Default: Possible

  if (
    strideCategory === "Elevation" ||
    strideCategory === "Denial of Service"
  ) {
    likelihood = 4; // More likely with modern threats
  } else if (strideCategory === "Spoofing") {
    likelihood = 3; // Phishing-type attacks
  } else if (strideCategory === "Info Disclosure") {
    likelihood = 4; // Data breaches are common
  } else if (strideCategory === "Tampering") {
    likelihood = 2; // Harder to execute
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
  if (strideCategory === "Info Disclosure" || strideCategory === "Spoofing") {
    return "High";
  }
  return "Medium";
}

function getIntegrityImpact(strideCategory: string): string {
  if (strideCategory === "Tampering" || strideCategory === "Elevation") {
    return "High";
  }
  return "Medium";
}

function getAvailabilityImpact(strideCategory: string): string {
  if (strideCategory === "Denial of Service") {
    return "Critical";
  }
  return "Medium";
}
