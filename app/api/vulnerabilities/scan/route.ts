import { pool } from "@/lib/db";
import { getAssetTypeMappingNames } from "@/lib/asset-type-mapping";
import { NextResponse } from "next/server";

type AssetRow = {
  id: number;
  asset_name: string;
  asset_type_id: number | null;
  asset_type: string | null;
  criticality: string | null;
  data_classification: string | null;
  access_level: string | null;
  authentication_method: string | null;
  supports_critical_service: boolean | null;
  internet_exposed: boolean | null;
  mfa_enabled: boolean | null;
  encryption_enabled: boolean | null;
  backup_enabled: boolean | null;
  logging_enabled: boolean | null;
};

type ThreatRow = {
  id: number;
  threat_name: string;
  description: string | null;
  threat_type: string | null;
  likelihood_level: number | null;
  risk_level: string | null;
};

type Finding = {
  asset_id: number;
  threat_id: number | null;
  title: string;
  description: string;
  vulnerability_type: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  cvss_score: number | null;
  reference_url: string | null;
};

async function ensureVulnerabilityThreatSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS assets (
      id SERIAL PRIMARY KEY,
      asset_type_id INTEGER,
      asset_type VARCHAR(100),
      asset_name VARCHAR(255) NOT NULL,
      criticality VARCHAR(100) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS asset_types (
      id SERIAL PRIMARY KEY,
      type_name VARCHAR(100) UNIQUE NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS threats (
      id SERIAL PRIMARY KEY,
      threat_name VARCHAR(255) NOT NULL,
      description TEXT,
      threat_type VARCHAR(100),
      likelihood_level INTEGER DEFAULT 3,
      potential_impact VARCHAR(50),
      nist_category VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS asset_threat_mapping (
      id SERIAL PRIMARY KEY,
      asset_type_id INTEGER REFERENCES asset_types(id) ON DELETE CASCADE,
      threat_id INTEGER REFERENCES threats(id) ON DELETE CASCADE,
      risk_level VARCHAR(50) DEFAULT 'Medium',
      mitigation_notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(asset_type_id, threat_id)
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vulnerabilities (
      id SERIAL PRIMARY KEY,
      asset_id INTEGER REFERENCES assets(id) ON DELETE CASCADE,
      threat_id INTEGER REFERENCES threats(id) ON DELETE SET NULL,
      cve_id VARCHAR(100),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      vulnerability_type VARCHAR(100),
      severity VARCHAR(50) NOT NULL,
      cvss_score NUMERIC(3,1),
      status VARCHAR(50) DEFAULT 'open',
      discovered_at TIMESTAMPTZ DEFAULT NOW(),
      remediated_at TIMESTAMPTZ,
      remediation_notes TEXT,
      reference_url TEXT,
      source VARCHAR(100) DEFAULT 'auto_scan',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await pool.query(
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS access_level VARCHAR(50)`,
  );
  await pool.query(
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS authentication_method VARCHAR(50)`,
  );
  await pool.query(
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS supports_critical_service BOOLEAN DEFAULT FALSE`,
  );
  await pool.query(
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS data_classification VARCHAR(50)`,
  );
  await pool.query(
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS internet_exposed BOOLEAN DEFAULT FALSE`,
  );
  await pool.query(
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE`,
  );
  await pool.query(
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS encryption_enabled BOOLEAN DEFAULT FALSE`,
  );
  await pool.query(
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS backup_enabled BOOLEAN DEFAULT FALSE`,
  );
  await pool.query(
    `ALTER TABLE assets ADD COLUMN IF NOT EXISTS logging_enabled BOOLEAN DEFAULT FALSE`,
  );
  await pool.query(
    `ALTER TABLE vulnerabilities
       ADD COLUMN IF NOT EXISTS threat_id INTEGER REFERENCES threats(id) ON DELETE SET NULL`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_vulnerabilities_threat_id ON vulnerabilities(threat_id)`,
  );
  await pool.query(
    `CREATE INDEX IF NOT EXISTS idx_vulnerabilities_asset_threat ON vulnerabilities(asset_id, threat_id)`,
  );
}

const isHighValue = (a: AssetRow) =>
  a.criticality === "Critical" ||
  a.criticality === "High" ||
  a.criticality?.includes("Tier 0") ||
  a.criticality?.includes("Tier 1") ||
  a.supports_critical_service === true ||
  ["Restricted", "Confidential", "PII", "PHI"].includes(
    a.data_classification ?? "",
  );

const isPubliclyReachable = (a: AssetRow) =>
  a.internet_exposed === true ||
  ["Public web access", "Public API exposed"].includes(a.access_level ?? "");

function threatMatches(threat: ThreatRow, pattern: RegExp) {
  return pattern.test(
    `${threat.threat_name} ${threat.description ?? ""} ${threat.threat_type ?? ""}`.toLowerCase(),
  );
}

function matchingThreats(threats: ThreatRow[], pattern: RegExp, limit = 2) {
  return threats
    .filter((threat) => threatMatches(threat, pattern))
    .slice(0, limit);
}

function threatContext(threat: ThreatRow | null) {
  return threat
    ? ` Related mapped threat: ${threat.threat_name}.`
    : " No specific mapped threat was linked to this finding.";
}

const THREAT_NAME_MN: Record<string, string> = {
  "Data Exfiltration": "өгөгдөл гадагш алдагдах",
  "Unauthorized Access": "зөвшөөрөлгүй хандалт",
  "Credential Theft": "нэвтрэх эрхийн мэдээлэл алдагдах",
  "Denial of Service": "үйлчилгээ тасалдах",
  "DDoS Attack": "DDoS халдлага",
  Malware: "хортой кодын халдлага",
  Ransomware: "ransomware халдлага",
  "Privilege Escalation": "эрхийн түвшин нэмэгдүүлэх халдлага",
};

function threatNameMn(threat: ThreatRow | null) {
  if (!threat) return "гадаад халдлагын";
  return THREAT_NAME_MN[threat.threat_name] ?? threat.threat_name;
}

function addThreatAwareFinding(
  findings: Finding[],
  threats: ThreatRow[],
  pattern: RegExp,
  build: (threat: ThreatRow | null) => Finding,
) {
  const relatedThreats = matchingThreats(threats, pattern);
  if (relatedThreats.length === 0) {
    findings.push(build(null));
    return;
  }

  for (const threat of relatedThreats) {
    findings.push(build(threat));
  }
}

// Heuristics derived from asset posture and the asset's mapped threat scenarios.
function deriveFindings(a: AssetRow, threats: ThreatRow[]): Finding[] {
  const findings: Finding[] = [];
  const publiclyReachable = isPubliclyReachable(a);
  const authMethod = a.authentication_method ?? "";

  // Weak Authentication — MFA disabled
  if (a.mfa_enabled === false || authMethod === "Password only") {
    const isCritical = publiclyReachable || isHighValue(a);
    addThreatAwareFinding(
      findings,
      threats,
      /credential|account takeover|brute force|password|phish/,
      (threat) => ({
        asset_id: a.id,
        threat_id: threat?.id ?? null,
        title: threat
          ? `MFA gap exposes ${a.asset_name} to ${threat.threat_name}`
          : `MFA not enabled on ${a.asset_name}`,
        description: `${
          authMethod === "Password only"
            ? "Authentication is password-only."
            : "Multi-factor authentication is disabled."
        } ${
          publiclyReachable
            ? "Asset is internet-exposed, which dramatically raises the risk of credential-based compromise."
            : "Without MFA, a compromised password is enough for an attacker to gain access."
        }${threatContext(threat)} NIST CSF: PR.AA-03.`,
        vulnerability_type: "Weak Authentication",
        severity: isCritical ? "Critical" : "High",
        cvss_score: isCritical ? 9.1 : 7.5,
        reference_url: "https://csrc.nist.gov/projects/cybersecurity-framework",
      }),
    );
  }

  if (publiclyReachable) {
    addThreatAwareFinding(
      findings,
      threats,
      /denial|ddos|internet|exposed|recon|scan|remote|unauthori|unauthoriz/,
      (threat) => ({
        asset_id: a.id,
        threat_id: threat?.id ?? null,
        title: threat
          ? `${a.asset_name} нь нийтийн интернетээс хандах боломжтой тул ${threatNameMn(threat)} эрсдэл нэмэгдсэн`
          : `${a.asset_name} нь нийтийн интернетээс хандах боломжтой халдлагын гадаргуутай байна`,
        description: `${a.asset_name} хөрөнгө нийтийн интернетээс${
          a.access_level ? ` (${a.access_level})` : ""
        } хандах боломжтой тул гадаад халдлагын зам нэмэгдэж байна. Холбогдох аюул занал: ${
          threat ? threatNameMn(threat) : "тодорхой аюул занал холбогдоогүй"
        }. NIST CSF: PR.IR / DE.CM.`,
        vulnerability_type: "Misconfiguration",
        severity:
          a.mfa_enabled === false || isHighValue(a) ? "Critical" : "High",
        cvss_score: a.mfa_enabled === false || isHighValue(a) ? 9.0 : 7.2,
        reference_url: null,
      }),
    );
  }

  if (a.encryption_enabled === false) {
    const isCritical =
      isHighValue(a) ||
      ["Restricted", "Confidential", "PII", "PHI"].includes(
        a.data_classification ?? "",
      );
    addThreatAwareFinding(
      findings,
      threats,
      /data|exfiltrat|encryption|mitm|intercept|disclosure/,
      (threat) => ({
        asset_id: a.id,
        threat_id: threat?.id ?? null,
        title: threat
          ? `Missing encryption enables ${threat.threat_name} on ${a.asset_name}`
          : `Encryption not enabled on ${a.asset_name}`,
        description: `Data on this asset is not encrypted${
          a.data_classification
            ? ` (classification: ${a.data_classification})`
            : ""
        }. Sensitive data should be encrypted at rest and in transit.${threatContext(threat)} NIST CSF: PR.DS-01 / PR.DS-02.`,
        vulnerability_type: "Misconfiguration",
        severity: isCritical ? "High" : "Medium",
        cvss_score: isCritical ? 7.4 : 5.3,
        reference_url: null,
      }),
    );
  }

  if (a.backup_enabled === false) {
    const isCritical = isHighValue(a);
    addThreatAwareFinding(
      findings,
      threats,
      /ransomware|backup|corruption|destruction|impact|recover|availability/,
      (threat) => ({
        asset_id: a.id,
        threat_id: threat?.id ?? null,
        title: threat
          ? `Backup gap increases ${threat.threat_name} impact on ${a.asset_name}`
          : `No backups configured for ${a.asset_name}`,
        description: `Backups are not enabled, leaving the asset vulnerable to ransomware, accidental deletion, and disaster scenarios.${threatContext(threat)} NIST CSF: PR.DS-11 / RC.RP-03.`,
        vulnerability_type: "Misconfiguration",
        severity: isCritical ? "High" : "Medium",
        cvss_score: isCritical ? 7.1 : 5.0,
        reference_url: null,
      }),
    );
  }

  if (a.logging_enabled === false) {
    addThreatAwareFinding(
      findings,
      threats,
      /monitor|log|tamper|evasion|detect|lateral|command|control|malware/,
      (threat) => ({
        asset_id: a.id,
        threat_id: threat?.id ?? null,
        title: threat
          ? `Insufficient logging limits detection of ${threat.threat_name} on ${a.asset_name}`
          : `Insufficient logging on ${a.asset_name}`,
        description: `Security events are not being collected or shipped to a SIEM. Without logs, attacks cannot be detected or investigated.${threatContext(threat)} NIST CSF: DE.CM-01 / DE.CM-09.`,
        vulnerability_type: "Misconfiguration",
        severity: isHighValue(a) ? "High" : "Medium",
        cvss_score: isHighValue(a) ? 6.5 : 4.3,
        reference_url: null,
      }),
    );
  }

  return findings;
}

async function getThreatsForAsset(asset: AssetRow) {
  const assetTypeNames = getAssetTypeMappingNames(asset.asset_type).map((type) =>
    type.toLowerCase(),
  );
  const result = await pool.query<ThreatRow>(
    `SELECT
            t.id,
            t.threat_name,
            t.description,
            t.threat_type,
            t.likelihood_level,
            COALESCE(atm.risk_level, 'Unknown') AS risk_level
       FROM threats t
       JOIN asset_threat_mapping atm ON atm.threat_id = t.id
  LEFT JOIN asset_types at ON at.id = atm.asset_type_id
      WHERE (atm.asset_type_id = $1 AND $1 IS NOT NULL)
         OR lower(COALESCE(at.type_name, '')) = lower(COALESCE($2, ''))
         OR lower(COALESCE(at.type_name, '')) = ANY($3::text[])
      ORDER BY
        CASE COALESCE(atm.risk_level, 'Unknown')
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END,
        t.likelihood_level DESC NULLS LAST,
        t.threat_name`,
    [asset.asset_type_id, asset.asset_type, assetTypeNames],
  );

  const seen = new Set<number>();
  return result.rows.filter((threat) => {
    if (seen.has(threat.id)) return false;
    seen.add(threat.id);
    return true;
  });
}

export async function POST() {
  try {
    await ensureVulnerabilityThreatSchema();

    const { rows: assets } = await pool.query<AssetRow>(`
            SELECT id, asset_name, asset_type_id, asset_type, criticality, data_classification,
              access_level, authentication_method, supports_critical_service,
              internet_exposed, mfa_enabled, encryption_enabled, backup_enabled,
             logging_enabled
        FROM assets
       WHERE COALESCE(status, 'Active') <> 'Retired'
    `);

    let created = 0;
    let skipped = 0;
    let threatLinked = 0;

    for (const asset of assets) {
      const threats = await getThreatsForAsset(asset);
      const findings = deriveFindings(asset, threats);
      for (const f of findings) {
        const existing = await pool.query(
          `SELECT id FROM vulnerabilities
            WHERE asset_id = $1
              AND COALESCE(threat_id, 0) = COALESCE($2, 0)
              AND title = $3
              AND status IN ('open','in_progress')
            LIMIT 1`,
          [f.asset_id, f.threat_id, f.title],
        );

        if (existing.rows.length > 0) {
          skipped++;
          continue;
        }

        await pool.query(
          `INSERT INTO vulnerabilities
             (asset_id, threat_id, title, description, vulnerability_type, severity,
              cvss_score, reference_url, source, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'auto_scan','open')`,
          [
            f.asset_id,
            f.threat_id,
            f.title,
            f.description,
            f.vulnerability_type,
            f.severity,
            f.cvss_score,
            f.reference_url,
          ],
        );
        created++;
        if (f.threat_id) threatLinked++;
      }
    }

    return NextResponse.json({
      message: "Scan complete",
      assets_scanned: assets.length,
      findings_created: created,
      findings_skipped_existing: skipped,
      findings_linked_to_threats: threatLinked,
    });
  } catch (error) {
    console.error("Vulnerability scan error:", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
