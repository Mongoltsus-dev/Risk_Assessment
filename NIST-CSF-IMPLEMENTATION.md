# NIST CSF 2.0 Risk Assessment System - Implementation Guide

## Architecture Overview

This system follows a **4-phase risk assessment workflow** based on NIST CSF 2.0 and the Secure Controls Framework (SCF):

```
Phase 1: Asset Registry (IDENTIFY - ID.AM)
    ↓
Phase 2: Risk Identification (IDENTIFY - ID.RA)
    ├─ Threat Catalog (MITRE ATT&CK)
    └─ Risk Register (Asset + Threat)
    ↓
Phase 3: Risk Analysis & Scoring (GOVERN - GV.RM)
    └─ 5×5 Risk Matrix (Likelihood × Impact)
    ↓
Phase 4: Control Recommendations (ALL FUNCTIONS)
    └─ SCF Controls (Preventive, Detect, Corrective)
```

---

## 📦 Components Implemented

### 1. Database Schema (7 Migration Files)

Located in: `c:\my-app\database\migrations\`

**Core Tables:**

| Table                       | Purpose              | Key Fields                                                            |
| --------------------------- | -------------------- | --------------------------------------------------------------------- |
| `assets`                    | IT asset inventory   | asset_code, criticality, data_classification, business_owner, RTO/RPO |
| `threat_catalog`            | Threat library       | threat_id (MITRE), threat_name, threat_source, applicable_asset_types |
| `risk_register`             | Risk inventory       | risk_id, asset_id, threat_id, vulnerability_description, status       |
| `risk_analysis`             | Risk scoring         | likelihood (1-5), impact (1-5), risk_score, risk_level                |
| `scf_controls`              | Control library      | scf_control_id, scf_domain, nist_csf_function, implementation_note    |
| `control_recommendations`   | Recommended controls | risk_analysis_id, scf_control_id, implementation_priority, status     |
| `threat_asset_type_mapping` | Pre-mapping          | asset_type, threat_id, applicability_score (1-5)                      |

**Helper Function:**

- `calculate_risk_level(score INT)` - Converts score to Low/Medium/High/Critical

### 2. API Endpoints

#### **GET /api/threats**

- Fetch threats (optionally filtered by asset_type)
- Supports pre-mapping: threats relevant to asset types
- Uses `threat_asset_type_mapping` for applicability scoring

```bash
GET /api/threats?asset_type=Hardware
# Returns: threats pre-mapped to Hardware asset type
```

#### **POST /api/risk-register**

- Create risk (Asset + Threat link)
- Requires: asset_id, threat_id, risk_title
- Returns: unique risk_id (e.g., RISK-1712345678)

#### **POST /api/risk-analysis**

- Score risks using 5×5 matrix
- Input: risk_id, likelihood (1-5), impact (1-5)
- Calculates: risk_score = likelihood × impact (1-25)
- Determines: risk_level via helper function

**Risk Level Thresholds:**

- 1-4: Low
- 5-9: Medium
- 10-16: High
- 17-25: Critical

#### **POST /api/control-recommendations**

- Generate SCF controls for a risk
- Strategy: Match NIST CSF function → top 10 relevant controls
- Filters by risk level priority (Critical > High > Medium > Low)

#### **GET /api/assessments** _(Refactored)_

- Consolidated view: Asset + Risk + Score + Controls
- Single query joins all 4 phases

#### **POST /api/assessments** _(New)_

- Orchestrates complete workflow in transaction:
  1. Create risk_register entry
  2. Score risk (risk_analysis)
  3. Generate control recommendations
  4. Return full assessment

---

## 🎯 Threat Catalog (Pre-populated)

10 sample threats included:

| MITRE ID | Threat               | Category       | NIST Function | Applicable Asset Types       |
| -------- | -------------------- | -------------- | ------------- | ---------------------------- |
| T1110    | Brute Force          | Initial Access | PROTECT       | Hardware, Software, Services |
| T1566    | Phishing             | Initial Access | PROTECT       | All                          |
| T1200    | Supply Chain         | Initial Access | GOVERN        | Hardware, Software, Data     |
| T1583    | Vulnerability Search | Reconnaissance | IDENTIFY      | Hardware, Software           |
| T1530    | Cloud Data Exfil     | Exfiltration   | DETECT        | Data, Hardware               |
| T1567    | Cloud Storage Exfil  | Exfiltration   | DETECT        | Data                         |
| T1486    | Ransomware           | Impact         | RESPOND       | Hardware, Data               |
| T1601    | Misconfiguration     | Execution      | PROTECT       | Hardware, Software, Services |
| T1078    | Weak Encryption      | Policy         | PROTECT       | Data                         |

**Threat Asset Mapping:** Pre-mapped ~70% of threats to asset types with applicability scores (1-5)

---

## 🎲 Risk Scoring: 5×5 Matrix

**Likelihood Scale (1-5):**

- 1 = Rare - May occur in exceptional circumstances
- 2 = Unlikely - Could happen but probably won't
- 3 = Possible - Could happen
- 4 = Likely - Probably will occur
- 5 = Very Likely - Almost certain to occur

**Impact Scale (1-5):**

- 1 = Negligible - No significant consequences
- 2 = Minor - Limited impact on operations
- 3 = Moderate - Noticeable impact
- 4 = Major - Significant business impact
- 5 = Critical - Severe business/compliance impact

**Formula:** Risk Score = Likelihood × Impact (1-25)

**Color Coding:**

- 1-4 (Low): 🟢 Green
- 5-9 (Medium): 🟡 Amber
- 10-16 (High): 🟠 Orange
- 17-25 (Critical): 🔴 Red

---

## 🛡️ SCF Control Integration

**Mapping Strategy:**

1. Identify NIST CSF function from threat
2. Find all SCF controls for that function
3. Filter by risk level (Critical gets all Critical + High controls)
4. Rank by priority field (1 = highest)
5. Return top 5-10 most relevant controls

**SCF Domains Included:**

- Governance, Risk Management, Asset Management
- Identity & Access, Security Awareness, Data Protection
- Configuration Management, Business Continuity
- Security Monitoring, Incident Response, Recovery

**25+ Controls Seeded** with implementation notes

---

## ⚙️ Setup & Usage

### Step 1: Run Database Migrations

```bash
cd c:\my-app
node scripts/migrate.js
```

This will:

- Create all 7 tables
- Seed threat catalog (10 threats)
- Seed SCF controls (25+)
- Seed threat-asset mappings

### Step 2: Test API Workflow

```bash
# 1. Get assets (assuming assets already registered)
curl http://localhost:3000/api/assets

# 2. Get threats for an asset type
curl "http://localhost:3000/api/threats?asset_type=Hardware"

# 3. Create assessment (all-in-one)
curl -X POST http://localhost:3000/api/assessments \
  -H "Content-Type: application/json" \
  -d '{
    "asset_id": 1,
    "threat_id": "T1110",
    "risk_title": "Brute Force Attack on Database",
    "vulnerability_description": "Weak password policy",
    "likelihood": 3,
    "impact": 4,
    "department_control_owner": "IT Security",
    "assessed_by": "john@company.com"
  }'

# Returns:
# {
#   "assessment": {
#     "risk_code": "RISK-1712345678",
#     "risk_level": "High",
#     "risk_score": 12,
#     "control_count": 8
#   }
# }

# 4. Get assessment with controls
curl "http://localhost:3000/api/assessments?asset_id=1"
```

### Step 3: Update Assessments UI

The form needs:

- [x] Asset selector
- [ ] **Threat selector** (filtered by asset type) ← **TODO: Update UI**
- [x] Risk title input
- [ ] **Likelihood slider (1-5)** ← **TODO: Add sliders**
- [ ] **Impact slider (1-5)** ← **TODO: Add sliders**
- [x] Control owner input
- [ ] **Risk level display** (auto-calculated) ← **TODO: Real-time calc**
- [ ] **Control recommendations display** ← **TODO: Show controls**

---

## 📝 Key Files & Locations

```
c:\my-app\
├── database/migrations/          # ← 7 SQL files (ready to run)
│   ├── 001_create_assets_table.sql
│   ├── 002_create_threat_catalog.sql
│   ├── 003_create_risk_register.sql
│   ├── 004_create_risk_analysis.sql
│   ├── 005_create_scf_controls_mapping.sql
│   ├── 006_create_threat_asset_mapping.sql
│   └── 007_populate_scf_controls.sql
│
├── app/api/
│   ├── threats/route.ts                ← NEW
│   ├── risk-register/route.ts          ← NEW
│   ├── risk-analysis/route.ts          ← NEW
│   ├── control-recommendations/route.ts ← NEW
│   └── assessments/route.ts            ← UPDATED
│
└── app/(shared-layout)/assessments/
    └── page.tsx                        ← Need to update form
```

---

## 🔄 Workflow: Step-by-Step

### User Journey:

1. **Select Asset**
   - Lists all registered assets
   - Shows asset_type, criticality, classification

2. **Select Threat** _(Pre-mapped)_
   - System queries: `SELECT * FROM threat_catalog WHERE asset_type = $1`
   - Shows relevant threats (filtered by threat_asset_type_mapping)
   - Displays threat description, NIST CSF function

3. **Register Risk**
   - User enters:
     - Risk title
     - Vulnerability description (how threat exploits weaknesses)
     - Threat actor description
     - Attack vector

4. **Score Risk** _(5×5 Matrix)_
   - User moves sliders:
     - Likelihood (1-5): Considering threat history, controls
     - Impact (1-5): Considering CIA triad, asset value
   - System calculates: risk_score = likelihood × impact
   - System determines: risk_level (Low/Medium/High/Critical)

5. **Get Controls** _(Automatic)_
   - System recommends SCF controls:
     - Ranked by priority
     - Filtered by NIST CSF function
     - Top 5-10 most relevant
   - Display: Control ID, name, implementation note, priority

6. **Assign Owner**
   - Assign to department/person responsible for control implementation
   - Set target implementation date

---

## 🎯 Alignment with Design Reference

✅ **Data Model**: Asset → Risk → RiskAnalysis → ControlRecommendation

✅ **Risk Scoring**: 5×5 matrix with correct thresholds

✅ **SCF Integration**: Static mapping table (NIST CSF + risk level) → controls

✅ **Pre-mapping**: Threats pre-assigned to asset types via mapping table

✅ **Phases**:

- Phase 1: Asset registry ✅
- Phase 2: Risk identification ✅
- Phase 3: Risk analysis & scoring ✅
- Phase 4: Control advice ✅

---

## 📊 Database Queries Examples

**Get risks by NIST CSF function:**

```sql
SELECT rr.*, ra.risk_level, COUNT(cr.id) as control_count
FROM risk_register rr
LEFT JOIN risk_analysis ra ON rr.id = ra.risk_id
LEFT JOIN control_recommendations cr ON ra.id = cr.risk_analysis_id
WHERE rr.nist_csf_function = 'Protect'
GROUP BY rr.id
ORDER BY ra.risk_score DESC;
```

**Get open risks by risk level:**

```sql
SELECT rr.risk_id, a.asset_name, tc.threat_name, ra.risk_level
FROM risk_register rr
LEFT JOIN assets a ON rr.asset_id = a.id
LEFT JOIN threat_catalog tc ON rr.threat_id = tc.threat_id
LEFT JOIN risk_analysis ra ON rr.id = ra.risk_id
WHERE rr.status = 'Open' AND ra.risk_level = 'Critical'
ORDER BY ra.risk_score DESC;
```

---

## ✅ Checklist to Complete Implementation

- [x] Create database migrations
- [x] Implement threat catalog API
- [x] Implement risk register API
- [x] Implement risk analysis (5×5 matrix) API
- [x] Implement control recommendations API
- [x] Refactor assessments API to orchestrate all phases
- [ ] **Run migrations:** `node scripts/migrate.js`
- [ ] **Update assessments UI:**
  - Add threat selector (filter by asset type)
  - Add likelihood/impact sliders
  - Add real-time risk level calculation
  - Add control recommendations display
  - Add CIA triad impact selectors
  - Add risk scoring rationale fields
- [ ] **Test end-to-end workflow**
- [ ] Create controls dashboard (track implementation progress)
- [ ] Add risk matrix visualization (heatmap)
- [ ] Add audit trail (who assessed what, when)

---

## 🚀 Next Phase: Beyond IDENTIFY

Once this phase is stable, add:

- **PROTECT Phase**: Control implementation tracking
  - Assign controls to teams
  - Track implementation progress
  - Evidence collection for compliance

- **DETECT Phase**: Security monitoring
  - Link assessments to SIEM logs
  - Alert on risk increases
- **RESPOND Phase**: Incident management
  - Escalation based on risk assessment
  - Post-incident lessons learned

- **RECOVER Phase**: Business continuity
  - RTO/RPO tracking from assets
  - Recovery plan execution

---

## 📚 References

- NIST Cybersecurity Framework 2.0: https://nvlpubs.nist.gov/nistpubs/csf/
- MITRE ATT&CK: https://attack.mitre.org
- Secure Controls Framework: https://securecontrolsframework.com
- Risk Assessment: 5×5 Matrix Standard (ISO 31000)
