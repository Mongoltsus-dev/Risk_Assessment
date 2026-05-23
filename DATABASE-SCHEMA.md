# Database Schema: Visual & SQL

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NIST CSF 2.0 RISK SYSTEM                          │
└─────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────┐
                                    │   ASSETS     │
                                    │  (Phase 1)   │
                                    │──────────────│
                                    │ id (PK)      │
                                    │ asset_name   │
                                    │ asset_type   │
                                    │ criticality  │  ◄─── Asset Criticality
                                    │ data_class.  │       (feeds into impact)
                                    │ business_own │
                                    │ rto_hours    │
                                    │ rpo_hours    │
                                    └──────┬───────┘
                                           │
                                           │ (has many)
                                           │
        ┌──────────────────────────────────┴────────────────────────────────┐
        │                                                                    │
        ▼                                                                    │
┌──────────────────────┐          ┌─────────────────────────────────────┐   │
│  THREAT_CATALOG      │          │   RISK_REGISTER (Phase 2)           │   │
│                      │  ◄───┐   │                                     │   │
│──────────────────────│      │   │─────────────────────────────────────│   │
│ id (PK)              │      │   │ id (PK)                             │   │
│ threat_id (MITRE)    │      └───┤ risk_id (Unique)                    │   │
│ threat_name          │          │ asset_id (FK) ────────────────┐    │   │
│ threat_source        │          │ threat_id (FK) ──────┐        │    │   │
│ threat_category      │          │ risk_title           │        │    │   │
│ STRIDE_category      │          │ vulnerability_desc   │        │    │   │
│ nist_csf_function    │          │ threat_actor         │        │    │   │
│ applicable_types[]   │          │ attack_vector        │        │    │   │
│                      │          │ nist_csf_function    │        │    │   │
│                      │          │ nist_csf_category    │        │    │   │
│                      │          │ department_owner     │        │    │   │
│                      │          │ status (Open/etc)    │        │    │   │
│                      │          │ created_at           │        │    │   │
│                      │          └─────────────────────────────────────┘   │
│                      │                                  │                │
└──────────┬───────────┘                                  │                │
           │                                              │                │
           ├──────────────────────────────────────────────┘                │
           │                                                              │
           ▼                                                              ▼
    ┌──────────────────────────────────┐         ┌──────────────────────────┐
    │ THREAT_ASSET_TYPE_MAPPING        │         │  RISK_ANALYSIS (Phase 3) │
    │ (Pre-mapping: 70% coverage)      │         │   (5x5 Matrix Scoring)   │
    │──────────────────────────────────│         │──────────────────────────│
    │ id (PK)                          │         │ id (PK)                  │
    │ asset_type (idx)                 │         │ risk_id (FK, Unique)     │
    │ threat_id (FK, idx)              │         │ likelihood (1-5)         │
    │ applicability_score (1-5)        │         │ likelihood_label         │
    │ is_applicable (boolean)          │         │ likelihood_rationale     │
    │                                  │         │                          │
    │ Example:                         │         │ impact (1-5)             │
    │ Hardware + T1110 = 4/5           │         │ impact_label             │
    │ Software + T1110 = 5/5           │         │ impact_rationale         │
    │ Data + T1110 = 2/5               │         │                          │
    └──────────────────────────────────┘         │ risk_score (L × I)       │
                                                 │ risk_level (Low/Med/etc) │
                                                 │ conf_impact, integ, avail│
                                                 │ business_impact_desc     │
                                                 │ assessed_by              │
                                                 │ assessment_date          │
                                                 │                          │
                                                 └────────────┬─────────────┘
                                                              │
                                              ┌──────────────┤
                                              │              │
                                              │              ▼
                                              │    ┌──────────────────────────┐
                                              │    │  CONTROL_RECOMMENDATIONS  │
                                              │    │ (Phase 4 - SCF Controls) │
                                              │    │──────────────────────────│
                                              │    │ id (PK)                  │
                                              │    │ risk_analysis_id (FK)    │
                                              │    │ risk_register_id (FK)    │
                                              │    │ scf_control_id (FK) ────┐
                                              │    │ scf_domain               │
                                              │    │ implementation_priority  │
                                              │    │ recommendation_rationale │
                                              │    │ implementation_status    │
                                              │    │ assigned_to              │
                                              │    │ target_impl_date         │
                                              │    │ actual_impl_date         │
                                              │    │                          │
                                              │    └──────────────┬───────────┘
                                              │                   │
                                              └───────────┬───────┘
                                                          │
                                                          ▼
                                            ┌──────────────────────────┐
                                            │   SCF_CONTROLS           │
                                            │ (25+ Seeded Controls)   │
                                            │──────────────────────────│
                                            │ id (PK)                  │
                                            │ scf_control_id (Unique)  │
                                            │ scf_domain               │
                                            │ scf_control_name         │
                                            │ scf_description          │
                                            │ nist_csf_function        │
                                            │ nist_csf_category        │
                                            │ implementation_note      │
                                            │ priority (1=highest)     │
                                            │ is_active                │
                                            │                          │
                                            │ Examples:                │
                                            │ - IAM-01 (Identity)      │
                                            │ - DAT-01 (Data Encrypt)  │
                                            │ - MON-01 (Monitoring)    │
                                            │ - IRO-01 (Inc. Response) │
                                            └──────────────────────────┘
```

---

## Table Details

### 1. ASSETS (Phase 1)

```sql
CREATE TABLE assets (
  id SERIAL PRIMARY KEY,
  asset_type_id INTEGER,                  -- FK to asset_types
  asset_type VARCHAR(100),                -- Asset type name
  owner_id INTEGER,                       -- FK to user
  asset_name VARCHAR(255) NOT NULL,       -- "Database Server", "Active Directory", etc.
  asset_code VARCHAR(50) UNIQUE,          -- Auto-generated: AST-001, AST-002, ...
  business_owner VARCHAR(255),            -- Who owns the asset
  technical_owner VARCHAR(255),           -- Who maintains it
  department VARCHAR(255),                -- Owning department
  data_classification VARCHAR(50),        -- Public, Internal, Confidential, Restricted
  access_level VARCHAR(50),               -- Internal only, VPN required, public web/API
  authentication_method VARCHAR(50),      -- Password only, MFA, SSO, federated identity
  supports_critical_service BOOLEAN,      -- Feeds business impact scoring
  hosting VARCHAR(100),                   -- SaaS, Azure, AWS, GCP, On-Prem, Hybrid
  rto_hours NUMERIC(10,2),                -- Recovery Time Objective
  rpo_hours NUMERIC(10,2),                -- Recovery Point Objective
  criticality VARCHAR(100) NOT NULL,      -- Tier 0-3 (Life/Safety → Important)
  -- Security posture (booleans)
  internet_exposed BOOLEAN DEFAULT FALSE, -- Reachable from public internet
  backup_enabled BOOLEAN DEFAULT FALSE,   -- Backups configured
  encryption_enabled BOOLEAN DEFAULT FALSE, -- Data encrypted
  mfa_enabled BOOLEAN DEFAULT FALSE,      -- MFA enforced
  logging_enabled BOOLEAN DEFAULT FALSE,  -- Security logging on
  status VARCHAR(50) DEFAULT 'Active',    -- Active, Inactive, Deprecated, Planned, Retired
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Critical Field:** `criticality` - Used later to Weight Risk Impact

---

### 2. THREAT_CATALOG (Reference Data)

```sql
CREATE TABLE threat_catalog (
  id SERIAL PRIMARY KEY,
  threat_id VARCHAR(50) UNIQUE,      -- "T1110", "T1566", etc. (MITRE ATT&CK)
  threat_name VARCHAR(255),          -- "Brute Force Attack", "Phishing", etc.
  threat_source VARCHAR(100),        -- "External Attacker", "Insider", "Malware"
  threat_category VARCHAR(100),      -- "Initial Access", "Exploitation", etc.
  description TEXT,                  -- Detailed threat description
  stride_category VARCHAR(50),       -- Spoofing, Tampering, Repudiation, etc.
  nist_csf_function VARCHAR(50),     -- Identify, Protect, Detect, Respond, Recover
  applicable_asset_types TEXT[],     -- ['Hardware', 'Software', 'Data']
  reference_url VARCHAR(500),        -- Link to MITRE or documentation
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pre-populated (10 threats)
-- INSERT INTO threat_catalog VALUES
-- ('T1110', 'Brute Force', 'External', 'Initial Access', ...),
-- ('T1566', 'Phishing', 'External', 'Initial Access', ...),
-- ... etc
```

**Purpose:** Central threat library - same threats across all assessments

---

### 3. THREAT_ASSET_TYPE_MAPPING (Pre-mapping Strategy)

```sql
CREATE TABLE threat_asset_type_mapping (
  id SERIAL PRIMARY KEY,
  asset_type VARCHAR(100),           -- "Hardware", "Software", etc.
  threat_id VARCHAR(50) FK,          -- Links to threat_catalog.threat_id
  applicability_score INT (1-5),     -- How applicable? 5=essential, 1=unlikely
  is_applicable BOOLEAN,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Examples:
-- INSERT INTO threat_asset_type_mapping VALUES
-- (1, 'Hardware', 'T1110', 4, true, 'Brute force applies to servers'),
-- (2, 'Software', 'T1110', 5, true, 'High risk for apps'),
-- (3, 'Hardware', 'T1566', 3, true, 'Lower risk via email'),
-- ... 70+ mappings total
```

**Purpose:** When user selects "Hardware" asset, suggest top threats:

```sql
SELECT tc.* FROM threat_catalog tc
INNER JOIN threat_asset_type_mapping tatm
  ON tc.threat_id = tatm.threat_id
WHERE tatm.asset_type = 'Hardware'
  AND tatm.is_applicable = true
ORDER BY tatm.applicability_score DESC;
-- Returns: T1601 (5/5), T1200 (5/5), T1110 (4/5), etc.
```

---

### 4. RISK_REGISTER (Phase 2 - Risk Identification)

```sql
CREATE TABLE risk_register (
  id SERIAL PRIMARY KEY,
  risk_id VARCHAR(50) UNIQUE,        -- "RISK-1712345678" (auto-generated)
  asset_id INT FK REFERENCES assets(id),
  threat_id VARCHAR(50) FK REFERENCES threat_catalog(threat_id),

  -- Risk Description
  risk_title VARCHAR(255),           -- "Brute force attack on database"
  risk_description TEXT,             -- Longer explanation
  vulnerability_description TEXT,    -- "Weak password policy allows guessing"
  threat_actor VARCHAR(100),         -- "External attacker", "Malicious insider"
  attack_vector VARCHAR(100),        -- "Network-based", "Physical attack"

  -- NIST CSF Context
  nist_csf_function VARCHAR(50),     -- Inherited from threat or overridden
  nist_csf_category VARCHAR(50),

  -- Ownership
  department_control_owner VARCHAR(255),  -- "IT Security Team"
  risk_owner VARCHAR(255),                -- "CISO"

  -- Status Tracking
  status VARCHAR(50) DEFAULT 'Open', -- Open, Ongoing Assessment, Mitigated, Accepted, Deferred
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example Row:
-- risk_id='RISK-1712345678'
-- asset_id=1 (Database Server)
-- threat_id='T1110' (Brute Force)
-- risk_title='Brute Force on Database Server'
-- vulnerability_description='No account lockout policy, weak password requirements'
-- nist_csf_function='Protect'
-- status='Open'
```

**Purpose:** Central risk inventory - links Asset to Threat

---

### 5. RISK_ANALYSIS (Phase 3 - Risk Scoring)

```sql
CREATE TABLE risk_analysis (
  id SERIAL PRIMARY KEY,
  risk_id INT FK REFERENCES risk_register(id), -- UNIQUE

  -- Likelihood Score (1-5)
  likelihood INT (1-5),              -- 1=Rare, 5=Very Likely
  likelihood_label VARCHAR(50),      -- "Possible", "Likely", etc.
  likelihood_rationale TEXT,         -- "Why this score?"

  -- Impact Score (1-5)
  impact INT (1-5),                  -- 1=Negligible, 5=Critical
  impact_label VARCHAR(50),          -- "Minor", "Critical", etc.
  impact_rationale TEXT,             -- "Why this score?"

  -- Calculated Risk Level
  risk_score INT,                    -- likelihood × impact (1-25)
  risk_level VARCHAR(50),            -- "Low" (1-4), "Medium" (5-9), "High" (10-16), "Critical" (17-25)

  -- CIA Triad Assessment
  confidentiality_impact VARCHAR(50),-- Confidentiality impact?
  integrity_impact VARCHAR(50),      -- Integrity impact?
  availability_impact VARCHAR(50),   -- Availability impact?
  business_impact_description TEXT,  -- Combined impact statement

  -- Optional Weighting
  asset_criticality_weight DECIMAL(2,1) DEFAULT 1.0,  -- 0.5-2.0 multiplier

  -- Assessment Info
  assessed_by VARCHAR(255),          -- Who assessed?
  assessment_date TIMESTAMP,
  next_review_date TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example Row:
-- risk_id=1
-- likelihood=4 (Likely - many brute force tools exist)
-- impact=5 (Critical - database is critical asset)
-- risk_score=20 (4 × 5)
-- risk_level='Critical'
-- confidentiality_impact='High'
-- integrity_impact='High'
-- availability_impact='Critical'
```

**Formula:**

```
Risk Score = Likelihood × Impact
    = 4 × 5 = 20 (out of 25)

20 ≥ 17  →  risk_level = 'Critical'  →  🔴 Red
```

**Risk Level Thresholds:**

```
1-4 = Low       🟢
5-9 = Medium    🟡
10-16 = High    🟠
17-25 = Critical 🔴
```

---

### 6. SCF_CONTROLS (Reference Data)

```sql
CREATE TABLE scf_controls (
  id SERIAL PRIMARY KEY,
  scf_control_id VARCHAR(50) UNIQUE, -- "IAM-01", "DAT-01", "MON-01", etc.
  scf_domain VARCHAR(100),           -- "Access Control", "Cryptography", etc.
  scf_control_name VARCHAR(255),     -- "Identity & Access Management"
  scf_description TEXT,              -- Detailed description
  nist_csf_function VARCHAR(50),     -- Govern, Identify, Protect, Detect, Respond, Recover
  nist_csf_category VARCHAR(50),     -- "GV.OC", "ID.AM", "PR.AA", etc.
  implementation_note TEXT,          -- Actionable guidance
  priority INT DEFAULT 3,            -- 1 (highest) to 5 (lowest)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Examples (25+ total):
-- INSERT INTO scf_controls VALUES
-- ('IAM-01', 'Access Control', 'Identity & Access Management',
--  'Implement identity lifecycle management, MFA, RBAC, least privilege',
--  'Protect', 'PR.AA', 'Deploy MFA on all systems', 1),
-- ('DAT-01', 'Data Protection', 'Data Security & Encryption',
--  'Classify, encrypt at rest and in transit',
--  'Protect', 'PR.DS', 'Enable TLS 1.2+, AES-256', 1),
-- ('MON-01', 'Monitoring', 'Continuous Security Monitoring',
--  'Deploy SIEM, EDR, network monitoring',
--  'Detect', 'DE.CM', 'Configure SIEM with correlation rules', 1),
-- ... etc
```

**Purpose:** Central control library (similar to threat_catalog)

---

### 7. CONTROL_RECOMMENDATIONS (Phase 4)

```sql
CREATE TABLE control_recommendations (
  id SERIAL PRIMARY KEY,
  risk_analysis_id INT FK REFERENCES risk_analysis(id),  -- Links to scoring
  risk_register_id INT FK REFERENCES risk_register(id),  -- Links to risk
  scf_control_id VARCHAR(50) FK REFERENCES scf_controls(scf_control_id),
  scf_domain VARCHAR(100),           -- Cached for performance

  -- Recommendation Details
  recommendation_rationale TEXT,     -- "Why this control?"
  implementation_priority VARCHAR(50), -- Critical, High, Medium, Low (based on risk_level)
  estimated_effort VARCHAR(50),      -- "Days", "Weeks"

  -- Implementation Tracking
  implementation_status VARCHAR(50) DEFAULT 'Not Started',
  -- Not Started, In Progress, Implemented, Deferred
  assigned_to VARCHAR(255),          -- Who is responsible?
  target_implementation_date DATE,
  actual_implementation_date DATE,

  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example Row:
-- risk_analysis_id=1
-- risk_register_id=1
-- scf_control_id='IAM-01'
-- recommendation_rationale='Implement MFA to prevent brute force attacks'
-- implementation_priority='Critical' (because risk_level is Critical)
-- implementation_status='Not Started'
-- assigned_to='IT Security Manager'
```

**Purpose:** Track which controls to implement and their progress

---

## Key Queries

### Get All Open Risks with Scores

```sql
SELECT
  rr.risk_id,
  a.asset_name,
  tc.threat_name,
  ra.likelihood_label,
  ra.impact_label,
  ra.risk_level,
  ra.risk_score,
  COUNT(cr.id) as control_count
FROM risk_register rr
LEFT JOIN assets a ON rr.asset_id = a.id
LEFT JOIN threat_catalog tc ON rr.threat_id = tc.threat_id
LEFT JOIN risk_analysis ra ON rr.id = ra.risk_id
LEFT JOIN control_recommendations cr ON ra.id = cr.risk_analysis_id
WHERE rr.status = 'Open'
GROUP BY rr.id, a.id, tc.threat_id, ra.id
ORDER BY ra.risk_score DESC;
```

### Get Critical Risks Needing Action

```sql
SELECT
  rr.risk_id,
  a.asset_name,
  tc.threat_name,
  ra.risk_level,
  ra.risk_score,
  sc.scf_control_id,
  sc.scf_control_name,
  cr.implementation_status
FROM risk_register rr
LEFT JOIN assets a ON rr.asset_id = a.id
LEFT JOIN threat_catalog tc ON rr.threat_id = tc.threat_id
LEFT JOIN risk_analysis ra ON rr.id = ra.risk_id
LEFT JOIN control_recommendations cr ON ra.id = cr.risk_analysis_id
LEFT JOIN scf_controls sc ON cr.scf_control_id = sc.scf_control_id
WHERE ra.risk_level = 'Critical'
  AND cr.implementation_status != 'Implemented'
ORDER BY rr.risk_id, sc.priority;
```

### Get Threats Pre-mapped to Asset Type

```sql
SELECT
  tc.*,
  tatm.applicability_score
FROM threat_catalog tc
INNER JOIN threat_asset_type_mapping tatm
  ON tc.threat_id = tatm.threat_id
WHERE tatm.asset_type = $1
  AND tatm.is_applicable = true
ORDER BY tatm.applicability_score DESC;
-- Returns threats for given asset_type, ordered by relevance
```

---

## Summary

```
ASSETS
  ├─ RISK_REGISTER (with pre-mapped THREAT_CATALOG via THREAT_ASSET_TYPE_MAPPING)
  │  └─ RISK_ANALYSIS (5×5 Scoring)
  │     └─ CONTROL_RECOMMENDATIONS (with SCF_CONTROLS)
```

**This structure enables:**

- ✅ Asset-to-threat linking
- ✅ Risk pre-assessment (pre-mapped threats)
- ✅ Risk quantification (5×5 matrix)
- ✅ Control recommendations (by NIST function + risk level)
- ✅ Control tracking (implementation progress)
- ✅ Audit trail (who assessed, when, what controls)
