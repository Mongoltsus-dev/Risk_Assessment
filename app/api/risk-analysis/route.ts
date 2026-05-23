import { pool } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Helper function to calculate risk level
function calculateRiskLevel(score: number): string {
  if (score <= 4) return "Low";
  if (score <= 9) return "Medium";
  if (score <= 16) return "High";
  return "Critical";
}

const LIKELIHOOD_LABELS = [
  "",
  "Rare",
  "Unlikely",
  "Possible",
  "Likely",
  "Very Likely",
];

const IMPACT_LABELS = [
  "",
  "Negligible",
  "Minor",
  "Moderate",
  "Major",
  "Critical",
];

// GET - Fetch risk analysis scores
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const riskId = searchParams.get("risk_id");
    const riskLevel = searchParams.get("risk_level"); // Filter by Low, Medium, High, Critical

    let query = `
      SELECT ra.*, rr.risk_id, rr.asset_id, rr.risk_title,
            a.asset_name, a.asset_type, a.criticality
      FROM risk_analysis ra
      LEFT JOIN risk_register rr ON ra.risk_id = rr.id
      LEFT JOIN assets a ON rr.asset_id = a.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (riskId) {
      query += ` AND ra.risk_id = $${params.length + 1}`;
      params.push(riskId);
    }

    if (riskLevel) {
      query += ` AND ra.risk_level = $${params.length + 1}`;
      params.push(riskLevel);
    }

    query += ` ORDER BY ra.risk_score DESC, ra.created_at DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      analyses: result.rows || [],
      count: result.rows?.length || 0,
    });
  } catch (err: any) {
    console.error("Error fetching risk analysis:", err);
    return NextResponse.json(
      { error: "Failed to fetch risk analysis" },
      { status: 500 },
    );
  }
}

// POST - Create or update risk analysis (5x5 scoring)
export async function POST(req: NextRequest) {
  try {
    const {
      risk_id,
      likelihood,
      likelihood_rationale,
      impact,
      impact_rationale,
      confidentiality_impact,
      integrity_impact,
      availability_impact,
      business_impact_description,
      assessed_by,
      asset_criticality_weight,
    } = await req.json();

    // Validate required fields
    if (!risk_id || !likelihood || !impact) {
      return NextResponse.json(
        { error: "risk_id, likelihood, and impact are required" },
        { status: 400 },
      );
    }

    // Validate ranges (1-5)
    if (likelihood < 1 || likelihood > 5 || impact < 1 || impact > 5) {
      return NextResponse.json(
        { error: "Likelihood and impact must be between 1 and 5" },
        { status: 400 },
      );
    }

    // Get risk details
    const riskResult = await pool.query(
      "SELECT * FROM risk_register WHERE id = $1",
      [risk_id],
    );

    if (riskResult.rows.length === 0) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }

    const risk = riskResult.rows[0];

    // Calculate risk score and level
    const riskScore = likelihood * impact;
    const riskLevel = calculateRiskLevel(riskScore);

    // Check if analysis already exists
    const existingResult = await pool.query(
      "SELECT id FROM risk_analysis WHERE risk_id = $1",
      [risk_id],
    );

    let result;
    if (existingResult.rows.length > 0) {
      // Update existing analysis
      result = await pool.query(
        `UPDATE risk_analysis SET
          likelihood = $1,
          likelihood_label = $2,
          likelihood_rationale = $3,
          impact = $4,
          impact_label = $5,
          impact_rationale = $6,
          risk_score = $7,
          risk_level = $8,
          confidentiality_impact = $9,
          integrity_impact = $10,
          availability_impact = $11,
          business_impact_description = $12,
          assessed_by = $13,
          assessment_date = CURRENT_TIMESTAMP,
          asset_criticality_weight = $14,
          updated_at = CURRENT_TIMESTAMP
        WHERE risk_id = $15
        RETURNING *`,
        [
          likelihood,
          LIKELIHOOD_LABELS[likelihood],
          likelihood_rationale || null,
          impact,
          IMPACT_LABELS[impact],
          impact_rationale || null,
          riskScore,
          riskLevel,
          confidentiality_impact || null,
          integrity_impact || null,
          availability_impact || null,
          business_impact_description || null,
          assessed_by || null,
          asset_criticality_weight || 1.0,
          risk_id,
        ],
      );
    } else {
      // Insert new analysis
      result = await pool.query(
        `INSERT INTO risk_analysis (
          risk_id, likelihood, likelihood_label, likelihood_rationale,
          impact, impact_label, impact_rationale,
          risk_score, risk_level,
          confidentiality_impact, integrity_impact, availability_impact,
          business_impact_description, assessed_by, assessment_date,
          asset_criticality_weight, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
          CURRENT_TIMESTAMP, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING *`,
        [
          risk_id,
          likelihood,
          LIKELIHOOD_LABELS[likelihood],
          likelihood_rationale || null,
          impact,
          IMPACT_LABELS[impact],
          impact_rationale || null,
          riskScore,
          riskLevel,
          confidentiality_impact || null,
          integrity_impact || null,
          availability_impact || null,
          business_impact_description || null,
          assessed_by || null,
          asset_criticality_weight || 1.0,
        ],
      );
    }

    const analysis = result.rows[0];

    return NextResponse.json({
      message: "Risk analysis scored successfully",
      analysis: {
        id: analysis.id,
        risk_id: risk.risk_id,
        asset_name: risk.asset_name?.slice(0, 50),
        likelihood_label: analysis.likelihood_label,
        impact_label: analysis.impact_label,
        risk_score: analysis.risk_score,
        risk_level: analysis.risk_level,
      },
    });
  } catch (error: unknown) {
    console.error("Risk analysis creation error:", error);

    const message =
      error instanceof Error ? error.message : "Failed to create risk analysis";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
