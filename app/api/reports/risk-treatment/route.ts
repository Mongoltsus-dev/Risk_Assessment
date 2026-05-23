import { pool } from "@/lib/db";
import { NextResponse } from "next/server";

const LEVELS = ["Critical", "High", "Medium", "Low"] as const;
const TREATMENTS = ["Treat", "Transfer", "Tolerate", "Terminate"] as const;

function scoreToLevel(score: number): string {
  if (score >= 17) return "Critical";
  if (score >= 10) return "High";
  if (score >= 5) return "Medium";
  return "Low";
}

export async function GET() {
  try {
    const result = await pool.query(`
      SELECT
        rr.id                                                          AS risk_id,
        rr.risk_code,
        rr.risk_title,
        t.threat_name,
        rr.nist_csf_function,
        rr.nist_csf_category,
        rr.department_control_owner,
        CASE rr.risk_treatment
          WHEN 'Mitigate' THEN 'Treat'
          WHEN 'Accept'   THEN 'Tolerate'
          WHEN 'Avoid'    THEN 'Terminate'
          ELSE rr.risk_treatment
        END                                                            AS risk_treatment,
        rr.treatment_rationale,
        rr.treatment_owner,
        rr.treatment_date,
        rr.status,
        rr.created_at,
        a.asset_name,
        a.asset_type,
        a.criticality,
        COALESCE(ra.inherent_risk_score, ra.risk_score, 0)            AS inherent_score,
        COALESCE(ra.inherent_risk_level, ra.risk_level, 'Unknown')    AS inherent_level,
        COALESCE(ra.inherent_likelihood, ra.likelihood, 0)            AS inherent_likelihood,
        COALESCE(ra.inherent_impact,     ra.impact,     0)            AS inherent_impact,
        ra.residual_risk_score,
        ra.residual_risk_level,
        ra.inherent_review_status
      FROM  risk_register  rr
      LEFT JOIN assets       a  ON a.id  = rr.asset_id
      LEFT JOIN threats      t  ON t.id  = rr.threat_id
      LEFT JOIN risk_analysis ra ON ra.risk_register_id = rr.id
      ORDER BY
        CASE rr.risk_treatment
          WHEN 'Terminate' THEN 1
          WHEN 'Avoid'     THEN 1
          WHEN 'Treat'     THEN 2
          WHEN 'Mitigate'  THEN 2
          WHEN 'Transfer' THEN 3
          WHEN 'Tolerate' THEN 4
          WHEN 'Accept'   THEN 4
          ELSE 5
        END,
        COALESCE(ra.inherent_risk_score, 0) DESC
    `);

    const rows = result.rows;
    const total = rows.length;

    // Group by treatment (or Untreated)
    const byTreatment: Record<string, typeof rows> = {
      Treat: [],
      Transfer: [],
      Tolerate: [],
      Terminate: [],
      Untreated: [],
    };
    for (const row of rows) {
      const key = (TREATMENTS as readonly string[]).includes(row.risk_treatment)
        ? row.risk_treatment
        : "Untreated";
      byTreatment[key].push(row);
    }

    const treated = total - byTreatment.Untreated.length;
    const coverage_pct = total > 0 ? Math.round((treated / total) * 100) : 0;

    // Counts per treatment
    const counts: Record<string, number> = {};
    for (const key of Object.keys(byTreatment)) {
      counts[key] = byTreatment[key].length;
    }

    // Level × treatment cross-tab
    const levelMatrix: Record<string, Record<string, number>> = {};
    for (const level of LEVELS) {
      levelMatrix[level] = {
        Treat: 0,
        Transfer: 0,
        Tolerate: 0,
        Terminate: 0,
        Untreated: 0,
      };
    }
    for (const row of rows) {
      const level = (LEVELS as readonly string[]).includes(row.inherent_level)
        ? row.inherent_level
        : scoreToLevel(Number(row.inherent_score));
      const treatment = (TREATMENTS as readonly string[]).includes(
        row.risk_treatment,
      )
        ? row.risk_treatment
        : "Untreated";
      if (levelMatrix[level]) levelMatrix[level][treatment]++;
    }

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      total,
      treated,
      untreated: byTreatment.Untreated.length,
      coverage_pct,
      counts,
      by_treatment: byTreatment,
      level_matrix: levelMatrix,
    });
  } catch (err) {
    console.error("Risk treatment report error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to generate report";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
