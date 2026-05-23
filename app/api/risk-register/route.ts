import { pool } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// GET - Fetch risk register entries
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("asset_id");
    const status = searchParams.get("status");
    const riskId = searchParams.get("risk_id");

    let query = `
      SELECT rr.*,
        tc.threat_name, tc.threat_source, tc.threat_category,
        a.asset_name, a.asset_type, a.criticality,
        ra.likelihood  AS inherent_likelihood,
        ra.impact      AS inherent_impact,
        ra.risk_score  AS inherent_risk_score,
        ra.risk_level  AS inherent_risk_level,
        ra.residual_risk_score,
        ra.residual_risk_level
      FROM risk_register rr
      LEFT JOIN threat_catalog tc ON rr.threat_id = tc.threat_id
      LEFT JOIN assets a ON rr.asset_id = a.id
      LEFT JOIN risk_analysis ra ON ra.risk_id = rr.id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (assetId) {
      query += ` AND rr.asset_id = $${params.length + 1}`;
      params.push(assetId);
    }

    if (status) {
      query += ` AND rr.status = $${params.length + 1}`;
      params.push(status);
    }

    if (riskId) {
      query += ` AND rr.id = $${params.length + 1}`;
      params.push(riskId);
    }

    query += ` ORDER BY rr.created_at DESC`;

    const result = await pool.query(query, params);

    return NextResponse.json({
      risks: result.rows || [],
      count: result.rows?.length || 0,
    });
  } catch (err: unknown) {
    console.error("Error fetching risk register:", err);
    return NextResponse.json(
      { error: "Failed to fetch risk register" },
      { status: 500 },
    );
  }
}

// POST - Create new risk in the register
export async function POST(req: NextRequest) {
  try {
    const {
      asset_id,
      threat_id,
      risk_title,
      risk_description,
      vulnerability_description,
      threat_actor,
      attack_vector,
      nist_csf_function,
      nist_csf_category,
      department_control_owner,
      risk_owner,
      notes,
    } = await req.json();

    // Validate required fields
    if (!asset_id || !threat_id || !risk_title) {
      return NextResponse.json(
        { error: "asset_id, threat_id, and risk_title are required" },
        { status: 400 },
      );
    }

    // Get asset and threat details
    const assetResult = await pool.query("SELECT * FROM assets WHERE id = $1", [
      asset_id,
    ]);

    if (assetResult.rows.length === 0) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const threatResult = await pool.query(
      "SELECT * FROM threat_catalog WHERE threat_id = $1",
      [threat_id],
    );

    if (threatResult.rows.length === 0) {
      return NextResponse.json({ error: "Threat not found" }, { status: 404 });
    }

    const threat = threatResult.rows[0];
    const asset = assetResult.rows[0];

    // Generate unique risk ID
    const riskCode = `RISK-${Date.now()}`;

    // Insert into risk_register
    const result = await pool.query(
      `INSERT INTO risk_register (
        risk_id, asset_id, threat_id, risk_title, risk_description,
        vulnerability_description, threat_actor, attack_vector,
        nist_csf_function, nist_csf_category,
        department_control_owner, risk_owner, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        riskCode,
        asset_id,
        threat_id,
        risk_title,
        risk_description || null,
        vulnerability_description || null,
        threat_actor || null,
        attack_vector || null,
        nist_csf_function || threat.nist_csf_function,
        nist_csf_category || null,
        department_control_owner || null,
        risk_owner || null,
        notes || null,
      ],
    );

    const newRisk = result.rows[0];

    return NextResponse.json({
      message: "Risk registered successfully",
      risk: {
        id: newRisk.id,
        risk_id: newRisk.risk_id,
        asset_name: asset.asset_name,
        threat_name: threat.threat_name,
        status: newRisk.status,
        nist_csf_function: newRisk.nist_csf_function,
      },
    });
  } catch (error: unknown) {
    console.error("Risk register creation error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create risk";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - Update risk treatment
export async function PATCH(req: NextRequest) {
  try {
    const {
      risk_register_id,
      risk_treatment,
      treatment_rationale,
      treatment_owner,
      treatment_date,
    } = await req.json();

    if (!risk_register_id) {
      return NextResponse.json(
        { error: "risk_register_id is required" },
        { status: 400 },
      );
    }

    const TREATMENT_ALIASES: Record<string, string> = {
      Reduce: "Mitigate",
      Treat: "Mitigate",
      Mitigate: "Mitigate",
      Accept: "Accept",
      Tolerate: "Accept",
      Transfer: "Transfer",
      Avoid: "Avoid",
      Terminate: "Avoid",
    };
    const normalizedTreatment = risk_treatment
      ? TREATMENT_ALIASES[String(risk_treatment)]
      : null;
    if (risk_treatment && !normalizedTreatment) {
      return NextResponse.json(
        { error: "Invalid risk_treatment value" },
        { status: 400 },
      );
    }

    // Ensure columns exist (idempotent)
    for (const ddl of [
      "ALTER TABLE risk_register ADD COLUMN IF NOT EXISTS risk_treatment VARCHAR(20)",
      "ALTER TABLE risk_register ADD COLUMN IF NOT EXISTS treatment_rationale TEXT",
      "ALTER TABLE risk_register ADD COLUMN IF NOT EXISTS treatment_owner VARCHAR(255)",
      "ALTER TABLE risk_register ADD COLUMN IF NOT EXISTS treatment_date DATE",
    ]) {
      await pool.query(ddl);
    }

    const result = await pool.query(
      `UPDATE risk_register
          SET risk_treatment      = $1,
              treatment_rationale = $2,
              treatment_owner     = $3,
              treatment_date      = $4,
              updated_at          = NOW()
        WHERE id = $5
        RETURNING *`,
      [
        normalizedTreatment,
        treatment_rationale?.trim() || null,
        treatment_owner?.trim() || null,
        treatment_date || null,
        risk_register_id,
      ],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, risk: result.rows[0] });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to update treatment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - Update risk status
export async function PUT(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const riskId = searchParams.get("id");

    if (!riskId) {
      return NextResponse.json(
        { error: "Risk ID is required" },
        { status: 400 },
      );
    }

    const { status, notes } = await req.json();

    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `UPDATE risk_register SET status = $1, notes = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 RETURNING *`,
      [status, notes || null, riskId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Risk not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Risk updated successfully",
      risk: result.rows[0],
    });
  } catch (error: unknown) {
    console.error("Risk update error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update risk";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
