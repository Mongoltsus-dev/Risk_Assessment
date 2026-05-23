import { pool } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/generate-recommendations
 * Intelligently generates control recommendations for a risk
 *
 * Strategy:
 * 1. Analyze the risk (threat type, asset type, risk level)
 * 2. Match NIST CSF function to relevant SCF domains
 * 3. Filter controls by implementation priority and risk level
 * 4. Return prioritized recommendations
 */
export async function POST(req: NextRequest) {
  try {
    const { risk_analysis_id, risk_register_id, force_regenerate } =
      await req.json();

    if (!risk_analysis_id || !risk_register_id) {
      return NextResponse.json(
        {
          error: "risk_analysis_id and risk_register_id are required",
        },
        { status: 400 },
      );
    }

    // Check if recommendations already exist
    if (!force_regenerate) {
      const existingResult = await pool.query(
        `SELECT COUNT(*) as count FROM control_recommendations 
         WHERE risk_analysis_id = $1`,
        [risk_analysis_id],
      );

      if (existingResult.rows[0].count > 0) {
        // Return existing recommendations
        const existingRecs = await pool.query(
          `SELECT cr.*, sc.scf_control_name, sc.scf_description, sc.implementation_effort
           FROM control_recommendations cr
           LEFT JOIN scf_controls sc ON cr.scf_control_id = sc.scf_control_id
           WHERE cr.risk_analysis_id = $1
           ORDER BY 
             CASE cr.implementation_priority
               WHEN 'Critical' THEN 1
               WHEN 'High' THEN 2
               WHEN 'Medium' THEN 3
               ELSE 4
             END,
             sc.priority ASC`,
          [risk_analysis_id],
        );

        return NextResponse.json({
          success: true,
          recommendations: existingRecs.rows || [],
          count: existingResult.rows[0].count,
          message: "Existing recommendations returned",
        });
      }
    }

    // Get risk and asset details
    const riskDetailsResult = await pool.query(
      `SELECT ra.*, rr.threat_id, rr.nist_csf_function, rr.asset_id, a.asset_type, a.criticality
       FROM risk_analysis ra
       LEFT JOIN risk_register rr ON ra.risk_id = rr.id
       LEFT JOIN assets a ON rr.asset_id = a.id
       WHERE ra.id = $1`,
      [risk_analysis_id],
    );

    if (riskDetailsResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Risk analysis not found" },
        { status: 404 },
      );
    }

    const riskAnalysis = riskDetailsResult.rows[0];
    const riskLevel = riskAnalysis.risk_level;
    const nistFunction = riskAnalysis.nist_csf_function;
    const threatId = riskAnalysis.threat_id;

    // Determine priority based on risk level
    const priorityMappings = {
      Critical: ["Critical", "High", "Medium"],
      High: ["High", "Medium"],
      Medium: ["Medium", "Low"],
      Low: ["Low"],
    };

    const applicablePriorities = priorityMappings[
      riskLevel as keyof typeof priorityMappings
    ] || ["Medium"];

    // Get threat information for intelligence mapping
    const threatResult = await pool.query(
      `SELECT stride_category FROM threat_catalog WHERE threat_id = $1`,
      [threatId],
    );

    const strideCategory = threatResult.rows[0]?.stride_category || "";

    // Get relevant controls based on NIST function and risk level
    const controlsQuery = `
      SELECT sc.*,
             $1::varchar as applied_priority
      FROM scf_controls sc
      WHERE sc.nist_csf_function = $2
        AND sc.is_active = true
        AND sc.priority IN (${applicablePriorities.map((_, i) => `$${i + 3}`).join(",")})
      ORDER BY 
        sc.priority ASC,
        CASE 
          WHEN sc.scf_domain IN ('Identity & Access Management', 'Data Protection', 'Monitoring & Logging') THEN 1
          WHEN sc.scf_domain IN ('Network Security', 'Patch Management') THEN 2
          ELSE 3
        END
      LIMIT 15
    `;

    const controlParams = [riskLevel, nistFunction, ...applicablePriorities];
    const controlsResult = await pool.query(controlsQuery, controlParams);

    const recommendations = [];

    // Create recommendation entries for each control
    for (const control of controlsResult.rows) {
      const rationale = generateRationale(
        control.scf_control_name,
        riskLevel,
        strideCategory,
      );

      const recResult = await pool.query(
        `INSERT INTO control_recommendations (
          risk_analysis_id, risk_register_id, scf_control_id, scf_domain,
          implementation_priority, recommendation_rationale, implementation_status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'Not Started')
        RETURNING *`,
        [
          risk_analysis_id,
          risk_register_id,
          control.scf_control_id,
          control.scf_domain,
          riskLevel === "Critical"
            ? "Critical"
            : riskLevel === "High"
              ? "High"
              : "Medium",
          rationale,
        ],
      );

      recommendations.push({
        id: recResult.rows[0].id,
        controlId: control.scf_control_id,
        controlName: control.scf_control_name,
        description: control.scf_description,
        domain: control.scf_domain,
        priority:
          riskLevel === "Critical"
            ? "Critical"
            : riskLevel === "High"
              ? "High"
              : "Medium",
        effort: control.implementation_effort,
        cost: control.typical_cost,
        rationale: rationale,
      });
    }

    return NextResponse.json({
      success: true,
      riskLevel,
      nistFunction,
      recommendationsCount: recommendations.length,
      recommendations,
      message: `Generated ${recommendations.length} recommended controls for ${riskLevel} risk`,
    });
  } catch (err: any) {
    console.error("Error generating recommendations:", err);
    return NextResponse.json(
      { error: "Failed to generate recommendations", details: err.message },
      { status: 500 },
    );
  }
}

/**
 * GET /api/generate-recommendations
 * Fetch generated recommendations for a risk
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const riskAnalysisId = searchParams.get("risk_analysis_id");
    const riskLevel = searchParams.get("risk_level");

    if (!riskAnalysisId) {
      return NextResponse.json(
        { error: "risk_analysis_id is required" },
        { status: 400 },
      );
    }

    let query = `
      SELECT cr.*, sc.scf_control_name, sc.scf_description, sc.implementation_effort, sc.typical_cost
      FROM control_recommendations cr
      LEFT JOIN scf_controls sc ON cr.scf_control_id = sc.scf_control_id
      WHERE cr.risk_analysis_id = $1
    `;
    const params: any[] = [riskAnalysisId];

    if (riskLevel) {
      query += ` AND cr.implementation_priority = $${params.length + 1}`;
      params.push(riskLevel);
    }

    query += `
      ORDER BY 
        CASE cr.implementation_priority
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          ELSE 4
        END,
        sc.priority ASC
    `;

    const result = await pool.query(query, params);

    return NextResponse.json({
      recommendations: result.rows || [],
      count: result.rows?.length || 0,
    });
  } catch (err: any) {
    console.error("Error fetching recommendations:", err);
    return NextResponse.json(
      { error: "Failed to fetch recommendations" },
      { status: 500 },
    );
  }
}

/**
 * Generate intelligent rationale for why a control is recommended
 */
function generateRationale(
  controlName: string,
  riskLevel: string,
  strideCategory: string,
): string {
  const rationales: Record<string, string> = {
    "Multi-Factor Authentication (MFA)": `Critical security control to prevent unauthorized access. ${
      strideCategory === "Elevation"
        ? "Especially important for this privilege escalation risk."
        : ""
    }`,
    "Role-Based Access Control (RBAC)": `Implement least privilege access to limit exposure. ${
      strideCategory === "Elevation"
        ? "Essential to prevent unauthorized privilege acquisition."
        : ""
    }`,
    "Data Encryption in Transit": `Protect sensitive data from interception during transmission. ${
      strideCategory === "Info Disclosure"
        ? "Critical for preventing data exfiltration."
        : ""
    }`,
    "Data Encryption at Rest": `Ensure data confidentiality even if storage is compromised. ${
      strideCategory === "Info Disclosure"
        ? "Essential protection for sensitive data."
        : ""
    }`,
    "Centralized Logging": `Essential for detecting and investigating security incidents. ${
      riskLevel === "Critical" ? "Mandatory for critical risk response." : ""
    }`,
    "Real-time Alerting": `Enable rapid detection and response to threats. ${
      riskLevel === "Critical" ? "Critical for immediate threat detection." : ""
    }`,
    "Firewall Implementation": `Perimeter defense to block unauthorized network access. ${
      strideCategory === "Initial Access"
        ? "Key preventive control for this attack vector."
        : ""
    }`,
    "Network Segmentation": `Isolate critical assets to contain potential breaches. ${
      riskLevel === "Critical"
        ? "Essential for protecting critical systems."
        : ""
    }`,
    "Patch Management Program": `Keep systems updated with security patches. ${
      strideCategory === "Exploitation"
        ? "Critical for preventing known vulnerability exploitation."
        : ""
    }`,
    "Endpoint Detection & Response (EDR)": `Detect malicious activities on endpoints. ${
      riskLevel === "Critical" ? "Critical for advanced threat detection." : ""
    }`,
  };

  return (
    rationales[controlName] ||
    `${controlName} is recommended to mitigate this ${riskLevel.toLowerCase()} risk and reduce threat exposure.`
  );
}
