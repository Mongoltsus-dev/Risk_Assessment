# NIST CSF Threats Implementation Guide

## Overview

This guide covers the complete integration of NIST CSF-aligned threats into your risk management system. The implementation adds:

- **47 NIST CSF Threats** across 9 threat categories
- **19 Asset Types** (SaaS, Database, Application, Network, etc.)
- **Asset-Threat Mapping** showing which threats apply to each asset type with risk levels
- **Dynamic Threat Display** in the asset registration form

## What's Been Added

### 1. Database Schema Changes

Three new tables have been created:

#### `asset_types` Table

Stores the categories of assets in your system.

```sql
Columns:
- id (INTEGER PRIMARY KEY)
- type_name (VARCHAR UNIQUE) - e.g., "Database", "Application", "Network"
- description (TEXT)
- created_at (TIMESTAMP)
```

**19 Asset Types Added:**

- SaaS Tenant
- Identity Provider
- Application
- Network
- Endpoint Fleet
- Database
- Infrastructure
- API
- Message Queue
- Cache System
- File Storage
- Backup System
- Monitoring/Logging
- VPN/Remote Access
- Load Balancer
- Container Orchestration
- Web Server
- Email System
- Collaboration Platform

#### `threats` Table

Stores all NIST CSF aligned threats.

```sql
Columns:
- id (INTEGER PRIMARY KEY)
- threat_name (VARCHAR) - e.g., "SQL Injection", "Ransomware Attack"
- description (TEXT)
- threat_type (VARCHAR) - e.g., "Malware", "Application", "Network"
- likelihood_level (INTEGER 1-5) - 1=Low, 5=Very High
- potential_impact (VARCHAR)
- nist_category (VARCHAR) - NIST CSF reference
- created_at (TIMESTAMP)
```

**47 Threats Added** Including:

- Critical: Ransomware Attack, SQL Injection, DDoS Attack, Unpatched Vulnerabilities
- High: Malware, Phishing, Privilege Escalation, Configuration Error
- Medium: Insider Threat, Zero-Day Exploits, Business Logic Flaws
- Low: Unvalidated Redirects

#### `asset_threat_mapping` Table

Links asset types to threats with risk levels.

```sql
Columns:
- id (INTEGER PRIMARY KEY)
- asset_type_id (INTEGER FK → asset_types.id)
- threat_id (INTEGER FK → threats.id)
- risk_level (VARCHAR) - Critical, High, Medium, Low
- mitigation_notes (TEXT) - How to mitigate this threat for this asset type
- created_at (TIMESTAMP)
```

## Step 1: Run the Migration

### Option A: Using psql (Command Line)

```bash
psql -U your_username -d your_database -f database/migrations/006_add_threats_and_types.sql
```

### Option B: Using a Migration Tool

If you're using a migration system, run:

```javascript
// Example with node-pg-migrate or similar
npm run migrate up
```

### Option C: Using VS Code SQL Tools

1. Open [database/migrations/006_add_threats_and_types.sql](database/migrations/006_add_threats_and_types.sql)
2. Select all SQL text (Ctrl+A)
3. Use SQL Tools extension or execute against your database

**Verify Migration Success:**

```sql
-- Check tables were created
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('asset_types', 'threats', 'asset_threat_mapping');

-- Should return 3 rows

-- Check data was inserted
SELECT COUNT(*) as asset_type_count FROM asset_types;  -- Should be 19
SELECT COUNT(*) as threat_count FROM threats;           -- Should be 47
SELECT COUNT(*) as mapping_count FROM asset_threat_mapping;  -- Should be ~120+
```

## Step 2: Updated AddAssetModal Component

The asset registration form has been enhanced with:

### New Features

1. **Asset Type Selector**
   - Dropdown with all 19 asset types
   - Required field (marked with \*)
   - Positioned right after asset name

2. **Dynamic Threat Display**
   - Shows automatically when asset type is selected
   - Displays up to 10 most critical threats
   - Color-coded risk levels:
     - **Red**: Critical
     - **Orange**: High
     - **Yellow**: Medium
     - **Green**: Low

3. **Threat Information Card**
   - **Threat Name** - Bold heading
   - **Risk Level Badge** - Color-coded
   - **Description** - Full threat description
   - **Mitigation Notes** - How to mitigate for this asset type
   - **Scrollable** - For asset types with many threats

4. **Loading State**
   - Shows "Loading related threats..." while fetching
   - Prevents race conditions

### Form Flow

```
Asset Name Input
    ↓
Asset Type Select (NEW) ← Triggers threat fetch
    ↓
Related Threats Display (NEW) ← Shows threats for selected type
    ↓
Criticality Select
Status Select
    ↓
Asset Code / Asset Value
Department / Location
    ↓
CIA Triad Levels
Internet Exposed / Backup Options
Encryption / MFA / Logging
    ↓
Description
Submit Button
```

## Step 3: API Endpoint Changes

The `/api/threats` endpoint has been updated:

### GET /api/threats

Fetch threats with optional filtering.

**Query Parameters:**

- `assetType` (optional) - Filter by asset type name
  - Example: `/api/threats?assetType=Database`
- `assetTypeId` (optional) - Filter by asset type ID
  - Example: `/api/threats?assetTypeId=6`

**Response Example:**

```json
{
  "success": true,
  "threats": [
    {
      "id": 1,
      "threat_name": "SQL Injection",
      "description": "Inserting malicious SQL code to manipulate database queries",
      "threat_type": "Application",
      "likelihood_level": 4,
      "potential_impact": "Data Breach",
      "risk_level": "Critical",
      "mitigation_notes": "Use parameterized queries and ORM frameworks"
    },
    {
      "id": 9,
      "threat_name": "Ransomware Attack",
      "description": "Malicious software that encrypts data and demands payment for decryption",
      "threat_type": "Malware",
      "likelihood_level": 5,
      "potential_impact": "Critical Data Loss",
      "risk_level": "Critical",
      "mitigation_notes": "Implement automated backups with immutable storage"
    }
  ],
  "count": 14
}
```

**Response Ordering:**
Threats are ordered by:

1. Risk Level (Critical → High → Medium → Low)
2. Likelihood Level (5 → 1)
3. Threat Name (alphabetical)

## Step 4: Example Usage

### Registering a Database Asset

1. Click "Add Asset" button
2. Enter:
   - Asset Name: "Production Database"
   - Asset Type: **Select "Database"**
3. System automatically fetches and displays related database threats:
   - SQL Injection (Critical)
   - Ransomware Attack (Critical)
   - Unpatched Vulnerabilities (Critical)
   - Weak Password/Authentication (High)
   - Configuration Error (High)
   - ... and more
4. Continue filling out other fields
5. Submit form

### Registering an Application Asset

1. Click "Add Asset" button
2. Enter:
   - Asset Name: "Customer Portal"
   - Asset Type: **Select "Application"**
3. System displays application-specific threats:
   - Cross-Site Scripting (XSS) (High)
   - SQL Injection (Critical)
   - Broken Authentication (Critical)
   - Broken Access Control (High)
   - ... and more

## Threat Categories Covered

### By Asset Type

| Asset Type            | Key Threats                                 | Count |
| --------------------- | ------------------------------------------- | ----- |
| **Database**          | SQL Injection, Ransomware, Unpatched Vulns  | 14    |
| **Application**       | XSS, Authentication, Access Control         | 17    |
| **Network**           | DDoS, MITM, DoS, Lateral Movement           | 8     |
| **Endpoint Fleet**    | Malware, Ransomware, Phishing               | 8     |
| **Identity Provider** | Credential Stuffing, Weak Auth, Brute Force | 7     |
| **API**               | API Abuse, Auth Flaws, Data Exposure        | 7     |
| **Infrastructure**    | Various (inherited from base threats)       | Mixed |
| **SaaS**              | Various (inherited from base threats)       | Mixed |
| **Other Types**       | General applicability                       | Mixed |

### By NIST CSF Function

| Category                                 | Threats                               | Focus           |
| ---------------------------------------- | ------------------------------------- | --------------- |
| **ID.RA** (Asset Mgmt & Risk Assessment) | Ransomware, Vulnerabilities, Zero-Day | Identification  |
| **PR.AT** (Awareness & Training)         | Phishing, Social Engineering          | Prevention      |
| **PR.IP** (Information Protection)       | Encryption, Configuration, Logging    | Protection      |
| **PR.AC** (Access Control)               | Weak Auth, Privilege Escalation       | Prevention      |
| **PR.DS** (Data Security)                | Data Exposure, Injection Attacks      | Data Protection |
| **DE.CM** (Continuous Monitoring)        | Malware, Insider Threats              | Detection       |
| **RS.AN** (Analysis)                     | DoS, Attack Detection                 | Response        |

## Future Enhancements

### Phase 2 (Recommended Next Steps)

1. **Risk Scoring Matrix**
   - Combine threat likelihood + asset criticality
   - Calculate overall asset risk score
   - Display heat map in dashboard

2. **Threat Details Modal**
   - Click on threat to see full details
   - View all asset types affected
   - See mitigation strategies
   - Link to external resources (CWE, CVE)

3. **Control Mapping**
   - Create `controls` table
   - Map controls to threats (which controls mitigate which threats)
   - Show required controls for each threat
   - Track control compliance

4. **Risk Assessment Workflow**
   - Create dedicated risk assessment module
   - Link threats to asset vulnerabilities
   - Calculate residual risk
   - Track remediation efforts

5. **Threat Intelligence Integration**
   - Feed from external threat databases
   - Update threat likelihood based on real incidents
   - Track active threat actors targeting your organization

### Phase 3 (Advanced)

1. **Threat Modeling**
   - Visual threat modeling tools
   - Attack trees and scenarios

2. **Incident Management**
   - Track threats as they become incidents
   - Measure detection and response times
   - Lessons learned database

3. **Compliance Reporting**
   - Map threats to compliance requirements
   - Generate risk reports for stakeholders
   - Track remediation deadlines

## Troubleshooting

### Threats Not Showing

**Problem:** Asset type selected but no threats appear

**Solutions:**

1. Verify migration ran successfully:

   ```sql
   SELECT COUNT(*) FROM threats;
   SELECT COUNT(*) FROM asset_threat_mapping;
   ```

2. Check browser console for errors (F12 → Console)

3. Verify asset type matches database:
   ```sql
   SELECT * FROM asset_types WHERE type_name = 'Database';
   ```

### Slow Threat Loading

**Problem:** Threats take several seconds to load

**Solutions:**

1. Check indexes were created:

   ```sql
   SELECT * FROM pg_indexes WHERE tablename IN ('asset_threat_mapping', 'threats', 'asset_types');
   ```

2. Add indexes if missing:
   ```sql
   CREATE INDEX idx_asset_threat_mapping_asset_type_id ON asset_threat_mapping(asset_type_id);
   CREATE INDEX idx_threats_threat_name ON threats(threat_name);
   ```

### Wrong Threats Displayed

**Problem:** Threats don't match asset type

**Solutions:**

1. Verify mapping exists:

   ```sql
   SELECT t.threat_name, atm.risk_level
   FROM asset_threat_mapping atm
   JOIN threats t ON atm.threat_id = t.id
   WHERE atm.asset_type_id = (SELECT id FROM asset_types WHERE type_name = 'Database');
   ```

2. Check asset type name in form matches database exactly

## Database Backup Recommendation

Before running the migration, backup your database:

```bash
pg_dump -U your_username your_database > backup_before_threats.sql
```

## Support & Questions

For questions about:

- **NIST CSF**: https://www.nist.gov/cyberframework
- **Threat Modeling**: https://owasp.org/www-community/Threat_Modeling
- **Database Migrations**: Check your specific database documentation

---

**Migration Created:** [database/migrations/006_add_threats_and_types.sql](database/migrations/006_add_threats_and_types.sql)

**Updated Components:**

- [components/assets/AddAssetModal.tsx](components/assets/AddAssetModal.tsx)
- [app/api/threats/route.ts](app/api/threats/route.ts)

**Status:** ✅ Ready for deployment
