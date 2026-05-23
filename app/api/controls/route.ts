import { pool } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// ─── Control Catalog CTL-0001 – CTL-0032 ─────────────────────────────────────

type ControlSeed = {
  control_id: string;
  control_name: string;
  control_statement: string;
  control_type: string;
  control_status: string;
  nist_function: string;
  category_code: string;
  category_name: string;
  csf_subcategory_ids: string;
  cis_control: string;
  primary_tools: string;
  control_owner_role: string;
};

const CTL_CONTROLS: ControlSeed[] = [
  { control_id: "CTL-0001", control_name: "Cybersecurity policy & risk governance",           control_statement: "The organization SHALL maintain an approved cybersecurity policy suite and a documented risk management methodology aligned to enterprise risk management, reviewed at least annually and upon material change.",                                                                                                                nist_function: "Govern",   category_code: "GV.PO", category_name: "Policy",                                              control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "GV.PO-01; GV.PO-02; GV.RM-06",         cis_control: "CIS 17: Incident Response Management",          primary_tools: "ServiceNow GRC; SharePoint",                                    control_owner_role: "CISO" },
  { control_id: "CTL-0002", control_name: "Third-party security due diligence & contract controls", control_statement: "The organization SHALL perform risk-based security due diligence for service providers and embed cybersecurity requirements (including incident notification, audit rights, and logging/monitoring expectations) in contracts prior to onboarding.",                                                             nist_function: "Govern",   category_code: "GV.SC", category_name: "Supply Chain Risk Management",                      control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "GV.SC-05; GV.SC-06; GV.SC-07",         cis_control: "CIS 15: Service Provider Management",           primary_tools: "ServiceNow Vendor Risk; Contract Repository",                   control_owner_role: "Head of Procurement" },
  { control_id: "CTL-0003", control_name: "MFA & conditional access baseline",                control_statement: "The organization SHALL enforce MFA and conditional access policies for all workforce identities, with stricter controls for privileged roles and high-risk sign-ins.",                                                                                                                                               nist_function: "Protect",  category_code: "PR.AA", category_name: "Identity Management, Authentication, and Access Control", control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "PR.AA-03; PR.AA-05",                    cis_control: "CIS 6: Access Control Management",              primary_tools: "Entra ID; Microsoft Sentinel; Intune",                          control_owner_role: "CISO" },
  { control_id: "CTL-0004", control_name: "Privileged access management (PIM + break-glass)", control_statement: "The organization SHALL control privileged access using just-in-time elevation, approval workflows, and separation of duties; standing privileged accounts SHALL be minimized and monitored.",                                                                                                                        nist_function: "Protect",  category_code: "PR.AA", category_name: "Identity Management, Authentication, and Access Control", control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "PR.AA-01; PR.AA-05",                    cis_control: "CIS 5: Account Management",                     primary_tools: "Entra PIM; Microsoft Sentinel; ServiceNow",                     control_owner_role: "CISO" },
  { control_id: "CTL-0005", control_name: "Joiner-Mover-Leaver account lifecycle",            control_statement: "The organization SHALL provision, modify, and deprovision accounts based on HR-authoritative records, ensuring removal of access within defined SLAs upon termination or role change.",                                                                                                                             nist_function: "Protect",  category_code: "PR.AA", category_name: "Identity Management, Authentication, and Access Control", control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "PR.AA-01; PR.AA-02",                    cis_control: "CIS 5: Account Management",                     primary_tools: "ServiceNow; Entra ID; HRIS",                                    control_owner_role: "CIO" },
  { control_id: "CTL-0006", control_name: "Access reviews for Tier-0/Tier-1 systems",         control_statement: "The organization SHALL perform periodic access reviews for Tier-0 and Tier-1 systems, verifying least privilege and separation of duties, with documented remediation of inappropriate access.",                                                                                                                    nist_function: "Protect",  category_code: "PR.AA", category_name: "Identity Management, Authentication, and Access Control", control_type: "Detective",   control_status: "Implemented",          csf_subcategory_ids: "PR.AA-05",                              cis_control: "CIS 6: Access Control Management",              primary_tools: "Entra Access Reviews; ServiceNow GRC",                          control_owner_role: "CISO" },
  { control_id: "CTL-0007", control_name: "Enterprise asset inventory & CMDB reconciliation", control_statement: "The organization SHALL maintain an accurate inventory of enterprise assets and reconcile authoritative sources to identify unmanaged or unauthorized assets for remediation.",                                                                                                                                       nist_function: "Identify", category_code: "ID.AM", category_name: "Asset Management",                                     control_type: "Preventive",  control_status: "Partially Implemented", csf_subcategory_ids: "ID.AM-01; ID.AM-02; ID.AM-08",          cis_control: "CIS 1: Inventory and Control of Enterprise Assets", primary_tools: "ServiceNow CMDB; Intune; Azure Resource Graph; Sentinel",       control_owner_role: "CIO" },
  { control_id: "CTL-0008", control_name: "Data classification & labeling (Purview)",         control_statement: "The organization SHALL classify and label data based on sensitivity and enforce handling requirements (sharing restrictions, retention, and DLP) consistent with the data classification standard.",                                                                                                                  nist_function: "Protect",  category_code: "PR.DS", category_name: "Data Security",                                       control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "PR.DS-01; PR.DS-02",                    cis_control: "CIS 3: Data Protection",                        primary_tools: "Microsoft Purview; M365 Defender; ServiceNow GRC",              control_owner_role: "DPO" },
  { control_id: "CTL-0009", control_name: "Business impact analysis & service tiering",       control_statement: "The organization SHALL perform and maintain a business impact analysis (BIA) and service tiering model to define RTO/RPO and resilience requirements for critical services.",                                                                                                                                       nist_function: "Govern",   category_code: "GV.OC", category_name: "Organizational Context",                            control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "GV.OC-04; GV.OC-05",                   cis_control: "CIS 11: Data Recovery",                         primary_tools: "ServiceNow Service Catalog; Confluence",                        control_owner_role: "COO" },
  { control_id: "CTL-0010", control_name: "Secure configuration baselines (CIS Benchmarks)",  control_statement: "The organization SHALL define and enforce secure configuration baselines for servers and endpoints, with continuous compliance monitoring and documented exception handling.",                                                                                                                                        nist_function: "Protect",  category_code: "PR.PS", category_name: "Platform Security",                                   control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "PR.PS-01",                              cis_control: "CIS 4: Secure Configuration of Enterprise Assets and Software", primary_tools: "Intune; Group Policy; Ansible; ServiceNow",                    control_owner_role: "CIO" },
  { control_id: "CTL-0011", control_name: "Vulnerability management & remediation SLAs",      control_statement: "The organization SHALL perform authenticated vulnerability scanning and remediate vulnerabilities within defined SLAs based on severity and asset criticality.",                                                                                                                                                     nist_function: "Protect",  category_code: "PR.PS", category_name: "Platform Security",                                   control_type: "Detective",   control_status: "Implemented",          csf_subcategory_ids: "PR.PS-02",                              cis_control: "CIS 7: Continuous Vulnerability Management",    primary_tools: "Tenable; ServiceNow; Sentinel",                                 control_owner_role: "CIO" },
  { control_id: "CTL-0012", control_name: "Endpoint detection & response (EDR) coverage",     control_statement: "The organization SHALL deploy and maintain EDR on endpoints and servers, monitor detections, and tune policies to reduce dwell time while minimizing business disruption.",                                                                                                                                         nist_function: "Detect",   category_code: "DE.CM", category_name: "Continuous Monitoring",                             control_type: "Detective",   control_status: "Implemented",          csf_subcategory_ids: "DE.CM-09; DE.AE-03",                    cis_control: "CIS 10: Malware Defenses",                      primary_tools: "CrowdStrike Falcon; Microsoft Sentinel; ServiceNow SecOps",     control_owner_role: "CISO" },
  { control_id: "CTL-0013", control_name: "Email security and phishing protection",           control_statement: "The organization SHALL implement layered email protections and phishing defenses, and track user susceptibility through simulation campaigns.",                                                                                                                                                                     nist_function: "Protect",  category_code: "PR.AT", category_name: "Awareness and Training",                            control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "PR.AT-01",                              cis_control: "CIS 9: Email and Web Browser Protections",      primary_tools: "M365 Defender for Office 365; Sentinel; Awareness platform",   control_owner_role: "CISO" },
  { control_id: "CTL-0014", control_name: "Backups, immutability, and restore testing",       control_statement: "The organization SHALL maintain protected backups for Tier-1 services, including immutable copies, and test restores at least quarterly to validate RTO/RPO objectives.",                                                                                                                                           nist_function: "Protect",  category_code: "PR.DS", category_name: "Data Security",                                       control_type: "Corrective",  control_status: "Implemented",          csf_subcategory_ids: "PR.DS-11; RC.RP-03; RC.RP-05",          cis_control: "CIS 11: Data Recovery",                         primary_tools: "Commvault; ServiceNow Change; Confluence",                      control_owner_role: "COO" },
  { control_id: "CTL-0015", control_name: "Network segmentation & firewall rule governance",  control_statement: "The organization SHALL manage network segmentation and firewall rules using documented standards, change control, and periodic rule reviews for Tier-0 and Tier-1 segments.",                                                                                                                                        nist_function: "Protect",  category_code: "PR.IR", category_name: "Technology Infrastructure Resilience",              control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "PR.IR-01; DE.CM-01",                    cis_control: "CIS 12: Network Infrastructure Management",     primary_tools: "Panorama; ServiceNow; Sentinel",                                control_owner_role: "CIO" },
  { control_id: "CTL-0016", control_name: "Centralized logging, retention and integrity",     control_statement: "The organization SHALL centralize security-relevant logs, enforce retention and integrity protections, and ensure logs support detection, investigations, and regulatory requirements.",                                                                                                                              nist_function: "Protect",  category_code: "PR.PS", category_name: "Platform Security",                                   control_type: "Detective",   control_status: "Implemented",          csf_subcategory_ids: "PR.PS-04; DE.CM-09",                    cis_control: "CIS 8: Audit Log Management",                   primary_tools: "Microsoft Sentinel; Azure Monitor; ServiceNow SecOps",          control_owner_role: "CISO" },
  { control_id: "CTL-0017", control_name: "Encryption and key management",                    control_statement: "The organization SHALL protect Restricted and Confidential data using strong cryptography for data at rest and in transit, with controlled key management and periodic reviews.",                                                                                                                                    nist_function: "Protect",  category_code: "PR.DS", category_name: "Data Security",                                       control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "PR.DS-01; PR.DS-02",                    cis_control: "CIS 3: Data Protection",                        primary_tools: "Azure Key Vault; AWS KMS; Qualys SSL scan",                     control_owner_role: "CISO" },
  { control_id: "CTL-0018", control_name: "Cloud security posture management (policy-as-code)", control_statement: "The organization SHALL continuously assess cloud configurations against baseline policies and respond to deviations through automated enforcement or tracked remediation.",                                                                                                                                        nist_function: "Protect",  category_code: "PR.PS", category_name: "Platform Security",                                   control_type: "Detective",   control_status: "Implemented",          csf_subcategory_ids: "PR.PS-01; PR.IR-01",                    cis_control: "CIS 4: Secure Configuration of Enterprise Assets and Software", primary_tools: "Defender for Cloud; Azure Policy; AWS Config; Sentinel",       control_owner_role: "CISO" },
  { control_id: "CTL-0019", control_name: "SOC monitoring, triage and alert tuning",          control_statement: "The organization SHALL operate a 24x7 monitoring capability to detect and analyze adverse events, with documented alert triage SLAs and tuning governance.",                                                                                                                                                       nist_function: "Detect",   category_code: "DE.CM", category_name: "Continuous Monitoring",                             control_type: "Detective",   control_status: "Implemented",          csf_subcategory_ids: "DE.CM-01; DE.AE-03; DE.AE-04",          cis_control: "CIS 13: Network Monitoring and Defense",        primary_tools: "Microsoft Sentinel; CrowdStrike; ServiceNow SecOps",            control_owner_role: "CISO" },
  { control_id: "CTL-0020", control_name: "Threat intelligence ingestion and correlation",    control_statement: "The organization SHALL ingest relevant threat intelligence and correlate it with telemetry to improve detection, prioritization, and response.",                                                                                                                                                                    nist_function: "Detect",   category_code: "DE.AE", category_name: "Adverse Event Analysis",                          control_type: "Detective",   control_status: "Implemented",          csf_subcategory_ids: "DE.AE-03; DE.AE-02",                    cis_control: "CIS 13: Network Monitoring and Defense",        primary_tools: "Sentinel; MISP; ISAC feeds",                                    control_owner_role: "CISO" },
  { control_id: "CTL-0021", control_name: "Incident response plan and playbooks",             control_statement: "The organization SHALL maintain an incident response plan and tested playbooks for priority scenarios (ransomware, cloud compromise, data breach), executed in coordination with relevant third parties when an incident is declared.",                                                                               nist_function: "Respond",  category_code: "RS.MA", category_name: "Incident Management",                               control_type: "Corrective",  control_status: "Implemented",          csf_subcategory_ids: "RS.MA-01; RS.MA-03; ID.IM-04",          cis_control: "CIS 17: Incident Response Management",          primary_tools: "ServiceNow SecOps; Confluence; M365 Teams",                     control_owner_role: "CISO" },
  { control_id: "CTL-0022", control_name: "Incident triage and escalation SLAs",              control_statement: "The organization SHALL triage and validate incident reports, categorize severity, and escalate according to defined SLAs and on-call procedures.",                                                                                                                                                                 nist_function: "Respond",  category_code: "RS.MA", category_name: "Incident Management",                               control_type: "Detective",   control_status: "Implemented",          csf_subcategory_ids: "RS.MA-02; RS.MA-03; RS.MA-04",          cis_control: "CIS 17: Incident Response Management",          primary_tools: "ServiceNow SecOps; Sentinel; Teams",                            control_owner_role: "CISO" },
  { control_id: "CTL-0023", control_name: "Incident analysis & forensics readiness",          control_statement: "The organization SHALL maintain forensics readiness (logging, tooling, chain-of-custody) and perform incident analysis to determine root cause and scope.",                                                                                                                                                         nist_function: "Respond",  category_code: "RS.AN", category_name: "Incident Analysis",                                control_type: "Detective",   control_status: "Implemented",          csf_subcategory_ids: "RS.AN-08; DE.AE-04",                    cis_control: "CIS 17: Incident Response Management",          primary_tools: "ServiceNow SecOps; Sentinel; Forensics toolkit",                control_owner_role: "CISO" },
  { control_id: "CTL-0024", control_name: "Containment and eradication procedures",           control_statement: "The organization SHALL contain and eradicate confirmed incidents using approved methods (isolation, credential reset, malicious artifact removal) and validate completion prior to recovery.",                                                                                                                        nist_function: "Respond",  category_code: "RS.MI", category_name: "Incident Mitigation",                              control_type: "Corrective",  control_status: "Implemented",          csf_subcategory_ids: "RS.MI-01; RS.MI-02",                    cis_control: "CIS 17: Incident Response Management",          primary_tools: "CrowdStrike; Panorama; ServiceNow SecOps",                      control_owner_role: "CISO" },
  { control_id: "CTL-0025", control_name: "Breach notification and incident communications",  control_statement: "The organization SHALL coordinate incident communications and notifications with Legal, DPO, and Corporate Communications in accordance with regulatory and contractual requirements.",                                                                                                                               nist_function: "Respond",  category_code: "RS.CO", category_name: "Incident Response Reporting and Communication", control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "RS.CO-02; RS.CO-03; GV.OC-03",          cis_control: "CIS 17: Incident Response Management",          primary_tools: "ServiceNow; Legal case management; Teams",                      control_owner_role: "General Counsel" },
  { control_id: "CTL-0026", control_name: "Recovery plan execution and validation",           control_statement: "The organization SHALL execute recovery activities once initiated, restore services in line with RTO/RPO, and validate the integrity of restored assets prior to returning to normal operations.",                                                                                                                    nist_function: "Recover",  category_code: "RC.RP", category_name: "Incident Recovery Plan Execution",                 control_type: "Corrective",  control_status: "Implemented",          csf_subcategory_ids: "RC.RP-01; RC.RP-05; RC.RP-06",          cis_control: "CIS 11: Data Recovery",                         primary_tools: "ServiceNow; Commvault; Confluence",                             control_owner_role: "COO" },
  { control_id: "CTL-0027", control_name: "Post-incident lessons learned & continuous improvement", control_statement: "The organization SHALL conduct post-incident reviews for material incidents and exercises, identify control/process improvements, and track actions to completion.",                                                                                                                                           nist_function: "Identify", category_code: "ID.IM", category_name: "Improvement",                                     control_type: "Corrective",  control_status: "Implemented",          csf_subcategory_ids: "ID.IM-03; ID.IM-01",                    cis_control: "CIS 17: Incident Response Management",          primary_tools: "Confluence; Jira; ServiceNow GRC",                              control_owner_role: "CISO" },
  { control_id: "CTL-0028", control_name: "Secure SDLC (SAST/DAST, dependency scanning)",    control_statement: "The organization SHALL integrate secure software development practices into the SDLC, including code review, automated scanning, and remediation of identified weaknesses prior to release.",                                                                                                                        nist_function: "Protect",  category_code: "PR.PS", category_name: "Platform Security",                                   control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "PR.PS-06; ID.RA-09",                    cis_control: "CIS 16: Application Software Security",         primary_tools: "Azure DevOps; Snyk; OWASP ZAP; Jira",                          control_owner_role: "CIO" },
  { control_id: "CTL-0029", control_name: "Penetration testing and remediation validation",   control_statement: "The organization SHALL perform penetration testing for internet-facing and Tier-1 applications at least annually and after major change, and validate remediation of critical findings.",                                                                                                                            nist_function: "Identify", category_code: "ID.IM", category_name: "Improvement",                                     control_type: "Detective",   control_status: "Implemented",          csf_subcategory_ids: "ID.IM-02; ID.RA-04",                    cis_control: "CIS 18: Penetration Testing",                   primary_tools: "External pen test vendor; Jira; ServiceNow GRC",                control_owner_role: "CISO" },
  { control_id: "CTL-0030", control_name: "Security awareness and role-based training",       control_statement: "The organization SHALL deliver security awareness training for all workforce members and role-based training for specialized roles, tracking completion and effectiveness over time.",                                                                                                                                 nist_function: "Protect",  category_code: "PR.AT", category_name: "Awareness and Training",                            control_type: "Preventive",  control_status: "Implemented",          csf_subcategory_ids: "PR.AT-01; PR.AT-02",                    cis_control: "CIS 14: Security Awareness and Skills Training", primary_tools: "LMS; Awareness platform",                                       control_owner_role: "CIO" },
  { control_id: "CTL-0031", control_name: "Log source onboarding for Tier-1 applications",   control_statement: "The organization SHALL onboard mandatory Tier-1 application and cloud logs to the SIEM, validate parsing and use-cases, and periodically revalidate coverage after major changes.",                                                                                                                                 nist_function: "Detect",   category_code: "DE.CM", category_name: "Continuous Monitoring",                             control_type: "Detective",   control_status: "Partially Implemented", csf_subcategory_ids: "DE.CM-06; DE.CM-09; DE.AE-03",          cis_control: "CIS 8: Audit Log Management",                   primary_tools: "Microsoft Sentinel; Azure Monitor; AWS CloudTrail",             control_owner_role: "CISO" },
  { control_id: "CTL-0032", control_name: "Vendor continuous monitoring and annual reassessment", control_statement: "The organization SHALL continuously monitor critical suppliers for cybersecurity issues and reassess them at least annually or upon material change, tracking residual risk and remediation.",                                                                                                                    nist_function: "Govern",   category_code: "GV.SC", category_name: "Supply Chain Risk Management",                      control_type: "Detective",   control_status: "Implemented",          csf_subcategory_ids: "GV.SC-07; DE.CM-06",                    cis_control: "CIS 15: Service Provider Management",           primary_tools: "ServiceNow Vendor Risk; External monitoring service",           control_owner_role: "COO" },
];

// ─── Schema + seed ────────────────────────────────────────────────────────────

async function ensureNistControls() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS nist_controls (
      id                  SERIAL PRIMARY KEY,
      control_id          VARCHAR(20)  NOT NULL UNIQUE,
      control_name        VARCHAR(255),
      control_statement   TEXT,
      control_type        VARCHAR(20),
      control_status      VARCHAR(30),
      category_code       VARCHAR(10)  NOT NULL,
      category_name       VARCHAR(120) NOT NULL,
      nist_function       VARCHAR(20)  NOT NULL,
      description         TEXT         NOT NULL,
      csf_subcategory_ids TEXT,
      cis_control         VARCHAR(150),
      primary_tools       TEXT,
      control_owner_role  VARCHAR(100),
      is_active           BOOLEAN      DEFAULT TRUE,
      created_at          TIMESTAMP    DEFAULT NOW()
    )
  `);

  // Add new columns to existing DBs (idempotent)
  for (const col of [
    "ADD COLUMN IF NOT EXISTS control_name       VARCHAR(255)",
    "ADD COLUMN IF NOT EXISTS control_statement  TEXT",
    "ADD COLUMN IF NOT EXISTS control_type       VARCHAR(20)",
    "ADD COLUMN IF NOT EXISTS control_status     VARCHAR(30)",
    "ADD COLUMN IF NOT EXISTS csf_subcategory_ids TEXT",
    "ADD COLUMN IF NOT EXISTS cis_control        VARCHAR(150)",
    "ADD COLUMN IF NOT EXISTS primary_tools      TEXT",
    "ADD COLUMN IF NOT EXISTS control_owner_role VARCHAR(100)",
  ]) {
    await pool.query(`ALTER TABLE nist_controls ${col}`);
  }

  // Re-seed if not using CTL-style IDs yet
  const { rows: check } = await pool.query(
    "SELECT COUNT(*) FROM nist_controls WHERE control_id LIKE 'CTL-%'",
  );
  if (parseInt(check[0].count) >= CTL_CONTROLS.length) return;

  await pool.query("DELETE FROM nist_controls");
  for (const c of CTL_CONTROLS) {
    await pool.query(
      `INSERT INTO nist_controls
         (control_id, control_name, control_statement, control_type, control_status,
          category_code, category_name, nist_function, description,
          csf_subcategory_ids, cis_control, primary_tools, control_owner_role)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (control_id) DO NOTHING`,
      [
        c.control_id, c.control_name, c.control_statement, c.control_type, c.control_status,
        c.category_code, c.category_name, c.nist_function, c.control_statement,
        c.csf_subcategory_ids, c.cis_control, c.primary_tools, c.control_owner_role,
      ],
    );
  }
}

async function tableExists(tableName: string) {
  const result = await pool.query("SELECT to_regclass($1) AS name", [tableName]);
  return Boolean(result.rows[0]?.name);
}

async function columnExists(tableName: string, columnName: string) {
  const result = await pool.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name   = $1
        AND column_name  = $2
      LIMIT 1`,
    [tableName, columnName],
  );
  return result.rows.length > 0;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type NistControlRow = {
  id: number;
  control_id: string;
  control_name: string | null;
  control_statement: string | null;
  control_type: string | null;
  control_status: string | null;
  category_code: string;
  category_name: string;
  nist_function: string;
  description: string;
  csf_subcategory_ids: string | null;
  cis_control: string | null;
  primary_tools: string | null;
  control_owner_role: string | null;
};

type RecommendationRow = {
  id: number;
  scf_control_id: string | null;
  control_name: string | null;
  nist_function: string | null;
  nist_csf_function: string | null;
  nist_csf_category: string | null;
  implementation_priority: string | null;
  priority: string | null;
  implementation_status: string | null;
  assigned_to: string | null;
  risk_register_id: number | null;
  risk_title: string | null;
  asset_name: string | null;
  risk_score: number | null;
  risk_level: string | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_SCORE: Record<string, number> = {
  existing: 100,
  partial: 50,
  not_started: 0,
};

async function recomputeCE(riskRegisterId: number) {
  const { rows } = await pool.query<{ implementation_status: string }>(
    `SELECT implementation_status FROM control_recommendations WHERE risk_register_id = $1`,
    [riskRegisterId],
  );
  if (rows.length === 0) return;
  const ce = Math.round(
    rows.reduce((sum, r) => sum + (STATUS_SCORE[r.implementation_status ?? "not_started"] ?? 0), 0) /
      rows.length,
  );
  await pool.query(
    `UPDATE risk_analysis
        SET control_effectiveness  = $1,
            residual_risk_score    = ROUND(inherent_risk_score * (1 - $1::numeric / 100)),
            residual_risk_level    = CASE
              WHEN ROUND(inherent_risk_score * (1 - $1::numeric / 100)) <= 4  THEN 'Low'
              WHEN ROUND(inherent_risk_score * (1 - $1::numeric / 100)) <= 9  THEN 'Medium'
              WHEN ROUND(inherent_risk_score * (1 - $1::numeric / 100)) <= 16 THEN 'High'
              ELSE 'Critical'
            END,
            residual_calculated_at = NOW(),
            updated_at             = NOW()
      WHERE risk_register_id = $2`,
    [ce, riskRegisterId],
  );
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const riskId = req.nextUrl.searchParams.get("risk_id");

  // Fast path: return only recs for one risk (no full NIST load)
  if (riskId) {
    try {
      const { rows } = await pool.query(
        `SELECT id, control_name, nist_function, priority, implementation_status, assigned_to,
                evidence_file_path, evidence_original_name, evidence_uploaded_at,
                approval_status, approved_by, approved_at, approval_notes
           FROM control_recommendations
          WHERE risk_register_id = $1
          ORDER BY id ASC`,
        [Number(riskId)],
      );
      return NextResponse.json({ recommendations: rows });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json({ message }, { status: 500 });
    }
  }

  // Management view: all recs with risk + asset + catalog info
  if (req.nextUrl.searchParams.get("all") === "true") {
    try {
      const { rows } = await pool.query(
        `SELECT cr.id, cr.control_name, cr.nist_function, cr.priority,
                cr.implementation_status, cr.assigned_to,
                cr.evidence_file_path, cr.evidence_original_name, cr.evidence_uploaded_at,
                cr.approval_status, cr.approved_by, cr.approved_at, cr.approval_notes,
                cr.risk_register_id, cr.created_at,
                rr.risk_title, rr.risk_code,
                ra.inherent_risk_score, ra.inherent_risk_level,
                a.asset_name,
                nc.cis_control,
                nc.control_type  AS catalog_control_type,
                nc.category_code AS catalog_category_code
           FROM control_recommendations cr
           LEFT JOIN risk_register rr ON rr.id = cr.risk_register_id
           LEFT JOIN risk_analysis  ra ON ra.risk_register_id = cr.risk_register_id
           LEFT JOIN assets          a ON a.id = rr.asset_id
           LEFT JOIN nist_controls  nc ON nc.control_id = SPLIT_PART(cr.control_name, ' – ', 1)
          ORDER BY cr.approval_status ASC, cr.id DESC`,
      );
      return NextResponse.json({ recommendations: rows });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      return NextResponse.json({ message }, { status: 500 });
    }
  }

  try {
    await ensureNistControls();

    const controlsResult = await pool.query<NistControlRow>(
      `SELECT id, control_id, control_name, control_statement, control_type, control_status,
              category_code, category_name, nist_function, description,
              csf_subcategory_ids, cis_control, primary_tools, control_owner_role
         FROM nist_controls
        WHERE COALESCE(is_active, true) = true
        ORDER BY nist_function, category_code, control_id`,
    );

    const hasRecommendations = await tableExists("control_recommendations");
    if (!hasRecommendations) {
      return NextResponse.json({
        controls: controlsResult.rows,
        recommendations: [],
      });
    }

    const [
      hasControlName, hasNistFunction, hasPriority,
      hasImplementationPriority, hasImplementationStatus,
      hasAssignedTo, hasScfControlId, hasRiskRegisterId,
    ] = await Promise.all([
      columnExists("control_recommendations", "control_name"),
      columnExists("control_recommendations", "nist_function"),
      columnExists("control_recommendations", "priority"),
      columnExists("control_recommendations", "implementation_priority"),
      columnExists("control_recommendations", "implementation_status"),
      columnExists("control_recommendations", "assigned_to"),
      columnExists("control_recommendations", "scf_control_id"),
      columnExists("control_recommendations", "risk_register_id"),
    ]);

    const hasRiskRegister = await tableExists("risk_register");
    const hasRiskAnalysis  = await tableExists("risk_analysis");
    const hasAssets        = await tableExists("assets");

    const [
      hasRiskTitle, hasRiskFunction, hasRiskCategory,
      hasRiskAssetId, hasRaRiskRegisterId, hasRaRiskId,
      hasRaScore, hasRaLevel, hasAssetName,
    ] = await Promise.all([
      hasRiskRegister ? columnExists("risk_register", "risk_title")        : Promise.resolve(false),
      hasRiskRegister ? columnExists("risk_register", "nist_csf_function") : Promise.resolve(false),
      hasRiskRegister ? columnExists("risk_register", "nist_csf_category") : Promise.resolve(false),
      hasRiskRegister ? columnExists("risk_register", "asset_id")          : Promise.resolve(false),
      hasRiskAnalysis ? columnExists("risk_analysis",  "risk_register_id") : Promise.resolve(false),
      hasRiskAnalysis ? columnExists("risk_analysis",  "risk_id")          : Promise.resolve(false),
      hasRiskAnalysis ? columnExists("risk_analysis",  "risk_score")       : Promise.resolve(false),
      hasRiskAnalysis ? columnExists("risk_analysis",  "risk_level")       : Promise.resolve(false),
      hasAssets       ? columnExists("assets",         "asset_name")       : Promise.resolve(false),
    ]);

    const riskRegisterJoin =
      hasRiskRegister && hasRiskRegisterId
        ? "LEFT JOIN risk_register rr ON rr.id = cr.risk_register_id"
        : "";
    const riskAnalysisJoin =
      hasRiskAnalysis && hasRiskRegisterId && hasRaRiskRegisterId
        ? "LEFT JOIN risk_analysis ra ON ra.risk_register_id = cr.risk_register_id"
        : hasRiskAnalysis && hasRiskRegisterId && hasRaRiskId
        ? "LEFT JOIN risk_analysis ra ON ra.risk_id = cr.risk_register_id"
        : "";
    const assetsJoin =
      hasAssets && hasAssetName && hasRiskRegister && hasRiskRegisterId && hasRiskAssetId
        ? "LEFT JOIN assets a ON a.id = rr.asset_id"
        : "";

    const recommendationsResult = await pool.query<RecommendationRow>(
      `SELECT cr.id,
              ${hasScfControlId         ? "cr.scf_control_id"          : "NULL::varchar"}  AS scf_control_id,
              ${hasControlName          ? "cr.control_name"             : "NULL::varchar"}  AS control_name,
              ${hasNistFunction         ? "cr.nist_function"            : "NULL::varchar"}  AS nist_function,
              ${hasRiskFunction         ? "rr.nist_csf_function"        : "NULL::varchar"}  AS nist_csf_function,
              ${hasRiskCategory         ? "rr.nist_csf_category"        : "NULL::varchar"}  AS nist_csf_category,
              ${hasImplementationPriority ? "cr.implementation_priority" : "NULL::varchar"} AS implementation_priority,
              ${hasPriority             ? "cr.priority"                 : "NULL::varchar"}  AS priority,
              ${hasImplementationStatus ? "cr.implementation_status"    : "NULL::varchar"}  AS implementation_status,
              ${hasAssignedTo           ? "cr.assigned_to"              : "NULL::varchar"}  AS assigned_to,
              ${hasRiskRegisterId       ? "cr.risk_register_id"         : "NULL::integer"}  AS risk_register_id,
              ${hasRiskTitle            ? "rr.risk_title"               : "NULL::varchar"}  AS risk_title,
              ${assetsJoin              ? "a.asset_name"                : "NULL::varchar"}  AS asset_name,
              ${riskAnalysisJoin && hasRaScore ? "ra.risk_score"        : "NULL::integer"}  AS risk_score,
              ${riskAnalysisJoin && hasRaLevel ? "ra.risk_level"        : "NULL::varchar"}  AS risk_level
         FROM control_recommendations cr
              ${riskRegisterJoin}
              ${riskAnalysisJoin}
              ${assetsJoin}
        ORDER BY cr.id DESC`,
    );

    return NextResponse.json({
      controls: controlsResult.rows,
      recommendations: recommendationsResult.rows,
    });
  } catch (error) {
    console.error("Controls API error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ─── POST — create control rec ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { risk_register_id, control_name, nist_function, priority } =
      await req.json();
    if (!risk_register_id || !control_name) {
      return NextResponse.json({ message: "risk_register_id and control_name required" }, { status: 400 });
    }
    const { rows } = await pool.query(
      `INSERT INTO control_recommendations (risk_register_id, control_name, nist_function, priority, implementation_status)
       VALUES ($1, $2, $3, $4, 'not_started')
       RETURNING id, control_name, nist_function, priority, implementation_status, assigned_to`,
      [risk_register_id, control_name, nist_function ?? null, priority ?? "Medium"],
    );
    await recomputeCE(Number(risk_register_id));
    return NextResponse.json({ recommendation: rows[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ─── PATCH — update status or approval ───────────────────────────────────────

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });

    // Approval update
    if (body.approval_status !== undefined) {
      const { approval_status, approved_by, approval_notes } = body;
      const { rows } = await pool.query(
        `UPDATE control_recommendations
            SET approval_status = $1,
                approved_by     = $2,
                approved_at     = CASE WHEN $1 = 'approved' THEN NOW() ELSE NULL END,
                approval_notes  = $3
          WHERE id = $4
          RETURNING id, risk_register_id, approval_status, approved_by, approved_at, approval_notes`,
        [approval_status, approved_by ?? null, approval_notes ?? null, id],
      );
      if (rows.length === 0) return NextResponse.json({ message: "Not found" }, { status: 404 });
      return NextResponse.json({ recommendation: rows[0] });
    }

    // Status update
    const { implementation_status } = body;
    if (!implementation_status) {
      return NextResponse.json({ message: "implementation_status or approval_status required" }, { status: 400 });
    }
    const { rows } = await pool.query(
      `UPDATE control_recommendations
          SET implementation_status = $1
        WHERE id = $2
        RETURNING id, risk_register_id, control_name, nist_function, priority, implementation_status, assigned_to`,
      [implementation_status, id],
    );
    if (rows.length === 0) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    await recomputeCE(Number(rows[0].risk_register_id));
    return NextResponse.json({ recommendation: rows[0] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

// ─── DELETE — remove control rec ─────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ message: "id required" }, { status: 400 });
    const { rows } = await pool.query(
      `DELETE FROM control_recommendations WHERE id = $1 RETURNING risk_register_id`,
      [Number(id)],
    );
    if (rows.length === 0) return NextResponse.json({ message: "Not found" }, { status: 404 });
    await recomputeCE(Number(rows[0].risk_register_id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}

