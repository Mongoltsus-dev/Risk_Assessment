import { pool } from "@/lib/db";
import { persistResidualRisk } from "@/lib/residual-risk";
import { NextRequest, NextResponse } from "next/server";

type AssessmentBody = {
  id?: number;
  asset_id?: number | null;
  threat_id?: number | null;
  vulnerability_id?: number | null;
  risk_register_id?: number | null;
  scf_control_id?: string | null;
  control_name?: string | null;
  nist_csf_function?: string | null;
  nist_csf_category?: string | null;
  implementation_status?: string | null;
  effectiveness_rating?: number | null;
  maturity_level?: number | null;
  implemented_answer?: string | null;
  asset_coverage_answer?: string | null;
  evidence_answer?: string | null;
  review_answer?: string | null;
  gap_answer?: string | null;
  control_score?: number | null;
  risk_reduction_percent?: number | null;
  evidence?: string | null;
  gaps?: string | null;
  owner?: string | null;
  assessor?: string | null;
  next_review_at?: string | null;
};

async function ensureControlAssessmentSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS control_assessments (
      id SERIAL PRIMARY KEY,
      asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
      threat_id INTEGER REFERENCES threats(id) ON DELETE SET NULL,
      vulnerability_id INTEGER REFERENCES vulnerabilities(id) ON DELETE SET NULL,
      risk_register_id INTEGER REFERENCES risk_register(id) ON DELETE SET NULL,
      scf_control_id VARCHAR(50),
      control_name VARCHAR(255) NOT NULL,
      nist_csf_function VARCHAR(100),
      nist_csf_category VARCHAR(100),
      implementation_status VARCHAR(50) DEFAULT 'Not Implemented',
      effectiveness_rating INTEGER,
      maturity_level INTEGER,
      implemented_answer VARCHAR(50),
      asset_coverage_answer VARCHAR(50),
      evidence_answer VARCHAR(50),
      review_answer VARCHAR(50),
      gap_answer VARCHAR(50),
      control_score NUMERIC(4,2),
      risk_reduction_percent INTEGER,
      evidence TEXT,
      gaps TEXT,
      owner VARCHAR(255),
      assessor VARCHAR(255),
      assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      next_review_at DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const columns = [
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS threat_id INTEGER REFERENCES threats(id) ON DELETE SET NULL",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS vulnerability_id INTEGER REFERENCES vulnerabilities(id) ON DELETE SET NULL",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS risk_register_id INTEGER REFERENCES risk_register(id) ON DELETE SET NULL",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS scf_control_id VARCHAR(50)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS control_name VARCHAR(255)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS nist_csf_function VARCHAR(100)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS nist_csf_category VARCHAR(100)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS implementation_status VARCHAR(50) DEFAULT 'Not Implemented'",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS effectiveness_rating INTEGER",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS maturity_level INTEGER",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS implemented_answer VARCHAR(50)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS asset_coverage_answer VARCHAR(50)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS evidence_answer VARCHAR(50)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS review_answer VARCHAR(50)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS gap_answer VARCHAR(50)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS control_score NUMERIC(4,2)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS risk_reduction_percent INTEGER",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS evidence TEXT",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS gaps TEXT",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS owner VARCHAR(255)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS assessor VARCHAR(255)",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS assessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS next_review_at DATE",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    "ALTER TABLE control_assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  ];

  for (const statement of columns) {
    await pool.query(statement);
  }

  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_control_assessments_asset ON control_assessments(asset_id)",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_control_assessments_vulnerability ON control_assessments(vulnerability_id)",
  );
  await pool.query(
    "CREATE INDEX IF NOT EXISTS idx_control_assessments_risk ON control_assessments(risk_register_id)",
  );
}

function normalizeInteger(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeNumber(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value: unknown) {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function GET(req: NextRequest) {
  try {
    await ensureControlAssessmentSchema();

    const { searchParams } = new URL(req.url);
    const assetId = searchParams.get("asset_id");
    const vulnerabilityId = searchParams.get("vulnerability_id");
    const status = searchParams.get("status");

    const params: (string | number)[] = [];
    const where: string[] = [];

    if (assetId) {
      params.push(Number(assetId));
      where.push(`ca.asset_id = $${params.length}`);
    }
    if (vulnerabilityId) {
      params.push(Number(vulnerabilityId));
      where.push(`ca.vulnerability_id = $${params.length}`);
    }
    if (status && status !== "all") {
      params.push(status);
      where.push(`ca.implementation_status = $${params.length}`);
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT ca.*,
              a.asset_name,
              t.threat_name,
              v.title AS vulnerability_title,
              v.severity AS vulnerability_severity,
              rr.risk_title,
              ra.risk_score,
              ra.risk_level
         FROM control_assessments ca
    LEFT JOIN assets a ON a.id = ca.asset_id
    LEFT JOIN threats t ON t.id = ca.threat_id
    LEFT JOIN vulnerabilities v ON v.id = ca.vulnerability_id
    LEFT JOIN risk_register rr ON rr.id = ca.risk_register_id
    LEFT JOIN risk_analysis ra ON ra.risk_register_id = ca.risk_register_id
        ${whereClause}
        ORDER BY ca.updated_at DESC, ca.created_at DESC`,
      params,
    );

    return NextResponse.json({ assessments: result.rows });
  } catch (error) {
    console.error("Fetch control assessments error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureControlAssessmentSchema();

    const body = (await req.json()) as AssessmentBody;
    const controlName = normalizeText(body.control_name);

    if (!controlName) {
      return NextResponse.json(
        { message: "control_name is required" },
        { status: 400 },
      );
    }

    const result = await pool.query(
      `INSERT INTO control_assessments
         (asset_id, threat_id, vulnerability_id, risk_register_id,
          scf_control_id, control_name, nist_csf_function, nist_csf_category,
         implementation_status, effectiveness_rating, maturity_level,
         implemented_answer, asset_coverage_answer, evidence_answer,
         review_answer, gap_answer, control_score, risk_reduction_percent,
         evidence, gaps, owner, assessor, next_review_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,'Not Implemented'),$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       RETURNING *`,
      [
        normalizeInteger(body.asset_id),
        normalizeInteger(body.threat_id),
        normalizeInteger(body.vulnerability_id),
        normalizeInteger(body.risk_register_id),
        normalizeText(body.scf_control_id),
        controlName,
        normalizeText(body.nist_csf_function),
        normalizeText(body.nist_csf_category),
        normalizeText(body.implementation_status),
        normalizeInteger(body.effectiveness_rating),
        normalizeInteger(body.maturity_level),
        normalizeText(body.implemented_answer),
        normalizeText(body.asset_coverage_answer),
        normalizeText(body.evidence_answer),
        normalizeText(body.review_answer),
        normalizeText(body.gap_answer),
        normalizeNumber(body.control_score),
        normalizeInteger(body.risk_reduction_percent),
        normalizeText(body.evidence),
        normalizeText(body.gaps),
        normalizeText(body.owner),
        normalizeText(body.assessor),
        normalizeText(body.next_review_at),
      ],
    );

    const riskRegisterId = result.rows[0].risk_register_id;
    if (riskRegisterId) {
      await persistResidualRisk(Number(riskRegisterId)).catch(() => null);
    }

    return NextResponse.json(
      { assessment: result.rows[0], message: "Control assessment created" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create control assessment error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await ensureControlAssessmentSchema();

    const { searchParams } = new URL(req.url);
    const riskRegisterId = searchParams.get("risk_register_id");

    if (!riskRegisterId) {
      return NextResponse.json(
        { message: "risk_register_id is required" },
        { status: 400 },
      );
    }

    await pool.query(
      "DELETE FROM control_assessments WHERE risk_register_id = $1",
      [Number(riskRegisterId)],
    );

    return NextResponse.json({ message: "Control assessments deleted" });
  } catch (error) {
    console.error("Delete control assessments error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await ensureControlAssessmentSchema();

    const body = (await req.json()) as AssessmentBody;
    const id = normalizeInteger(body.id);

    if (!id) {
      return NextResponse.json({ message: "id is required" }, { status: 400 });
    }

    const allowed: Array<keyof AssessmentBody> = [
      "asset_id",
      "threat_id",
      "vulnerability_id",
      "risk_register_id",
      "scf_control_id",
      "control_name",
      "nist_csf_function",
      "nist_csf_category",
      "implementation_status",
      "effectiveness_rating",
      "maturity_level",
      "implemented_answer",
      "asset_coverage_answer",
      "evidence_answer",
      "review_answer",
      "gap_answer",
      "control_score",
      "risk_reduction_percent",
      "evidence",
      "gaps",
      "owner",
      "assessor",
      "next_review_at",
    ];

    const sets: string[] = [];
    const values: unknown[] = [];

    for (const key of allowed) {
      if (!(key in body)) continue;
      const value = [
        "asset_id",
        "threat_id",
        "vulnerability_id",
        "risk_register_id",
        "effectiveness_rating",
        "maturity_level",
        "risk_reduction_percent",
      ].includes(key)
        ? normalizeInteger(body[key])
        : key === "control_score"
          ? normalizeNumber(body[key])
          : normalizeText(body[key]);
      values.push(value);
      sets.push(`${key} = $${values.length}`);
    }

    if (sets.length === 0) {
      return NextResponse.json(
        { message: "No fields to update" },
        { status: 400 },
      );
    }

    sets.push("assessed_at = CURRENT_TIMESTAMP");
    sets.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    const result = await pool.query(
      `UPDATE control_assessments
          SET ${sets.join(", ")}
        WHERE id = $${values.length}
        RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    const updatedRiskRegisterId = result.rows[0].risk_register_id;
    if (updatedRiskRegisterId) {
      await persistResidualRisk(Number(updatedRiskRegisterId)).catch(() => null);
    }

    return NextResponse.json({
      assessment: result.rows[0],
      message: "Control assessment updated",
    });
  } catch (error) {
    console.error("Update control assessment error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
