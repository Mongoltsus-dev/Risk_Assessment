import { pool } from "./db";

function calcRiskLevel(score: number): string {
  if (score <= 4) return "Low";
  if (score <= 9) return "Medium";
  if (score <= 16) return "High";
  return "Critical";
}

export async function persistResidualRisk(riskRegisterId: number): Promise<{
  inherent_score: number;
  residual_score: number;
  residual_level: string;
  control_count: number;
} | null> {
  const analysisRow = await pool.query(
    `SELECT COALESCE(inherent_risk_score, risk_score, 0) AS inherent_score
     FROM risk_analysis WHERE risk_register_id = $1`,
    [riskRegisterId],
  );
  if (analysisRow.rows.length === 0) return null;

  const inherentScore = Number(analysisRow.rows[0].inherent_score);

  const controlsResult = await pool.query(
    `SELECT risk_reduction_percent FROM control_assessments
     WHERE risk_register_id = $1 AND risk_reduction_percent > 0`,
    [riskRegisterId],
  );

  // Multiplicative reduction — each control independently reduces remaining risk
  let remaining = 1.0;
  for (const row of controlsResult.rows) {
    remaining *= 1 - Math.min(80, Number(row.risk_reduction_percent)) / 100;
  }
  // Total reduction capped at 80% (risk can never be fully eliminated)
  remaining = Math.max(0.2, remaining);

  const residualScore = Math.max(1, Math.round(inherentScore * remaining));
  const residualLevel = calcRiskLevel(residualScore);

  await pool.query(
    `UPDATE risk_analysis
     SET residual_risk_score    = $1,
         residual_risk_level    = $2,
         residual_calculated_at = NOW(),
         updated_at             = NOW()
     WHERE risk_register_id = $3`,
    [residualScore, residualLevel, riskRegisterId],
  );

  return {
    inherent_score: inherentScore,
    residual_score: residualScore,
    residual_level: residualLevel,
    control_count: controlsResult.rows.length,
  };
}
