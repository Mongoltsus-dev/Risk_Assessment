# Assets Management Setup (NIST CSF Phase 1)

## Overview

The Assets table is the foundation of your NIST CSF implementation. It stores information about all organizational assets that will be analyzed for risks and controls.

## Database Setup

### Option 1: Using psql (Recommended)

1. **Connect to your database:**

```bash
psql postgresql://username:password@localhost:5432/cybeguardx
```

2. **Run the migration:**

```sql
\i database/migrations/002_create_assets_table.sql
```

3. **Verify the table was created:**

```sql
\dt assets
```

### Option 2: Using Node.js Script

```bash
npm run migrate
```

This will automatically run all migration files in the `database/migrations/` directory.

## Assets Table Schema

| Column                      | Type         | Description                                               |
| --------------------------- | ------------ | --------------------------------------------------------- |
| `id`                        | SERIAL       | Primary key                                               |
| `asset_type_id`             | INTEGER      | FK to `asset_types`                                       |
| `asset_type`                | VARCHAR(100) | Asset type name                                           |
| `owner_id`                  | INTEGER      | FK to user                                                |
| `asset_code`                | VARCHAR(50)  | Unique identifier (auto-generated: AST-001, AST-002, ...) |
| `asset_name`                | VARCHAR(255) | Human-readable name (e.g., "Database Server")             |
| `business_owner`            | VARCHAR(255) | Who owns the asset                                        |
| `technical_owner`           | VARCHAR(255) | Who maintains it                                          |
| `department`                | VARCHAR(255) | Owning department                                         |
| `data_classification`       | VARCHAR(50)  | Public, Internal, Confidential, Restricted                |
| `access_level`              | VARCHAR(50)  | Internal only, VPN required, Public web access, Public API exposed |
| `authentication_method`     | VARCHAR(50)  | Password only, Password + MFA, SSO, Federated identity    |
| `supports_critical_service` | BOOLEAN      | Supports a critical business service                      |
| `hosting`                   | VARCHAR(100) | SaaS, Azure, AWS, GCP, On-Prem, Hybrid                    |
| `rto_hours`                 | NUMERIC      | Recovery Time Objective                                   |
| `rpo_hours`                 | NUMERIC      | Recovery Point Objective                                  |
| `criticality`               | VARCHAR(100) | Tier 0-3 (Life/Safety → Important)                        |
| `internet_exposed`          | BOOLEAN      | Reachable from the public internet                        |
| `backup_enabled`            | BOOLEAN      | Backups configured                                        |
| `encryption_enabled`        | BOOLEAN      | Data encrypted at rest / in transit                       |
| `mfa_enabled`               | BOOLEAN      | MFA enforced for access                                   |
| `logging_enabled`           | BOOLEAN      | Security logging enabled                                  |
| `status`                    | VARCHAR(50)  | Active, Inactive, Deprecated, Planned, Retired            |
| `created_at`                | TIMESTAMP    | When created                                              |
| `updated_at`                | TIMESTAMP    | When last updated                                         |

## Asset Type Categories (NIST CSF)

```
Hardware     → Servers, workstations, network devices, printers
Software     → Applications, operating systems, libraries
Data         → Databases, files, documents, configurations
Services     → Cloud services, third-party integrations, support
People       → Roles, responsibilities, skillsets
```

## Criticality Levels (Impact Tiering)

```
Tier 0 (Life/Safety)        → Human life, health, or safety systems
Tier 1 (Mission Critical)   → Core business operations cannot function
Tier 2 (Business Critical)  → Significant business impact if unavailable
Tier 3 (Important)          → Nice-to-have; work-arounds available
```

## Data Classification

```
Public          → Can be shared with anyone
Internal        → For internal use only
Confidential    → Sensitive; restricted access
Restricted      → Highly sensitive; must be protected
```

## Using the Assets UI

### Adding an Asset

1. Navigate to **Setup → Assets**
2. Click **+ Add Asset**
3. Fill in required fields:
   - Asset Name
   - Asset Type
   - Criticality Level
4. Fill in optional details for better risk analysis
5. Click **Create Asset**

### Asset Information is Used For:

- **Risk Analysis** → Assets are linked to threats; criticality affects risk scoring
- **Impact Assessment** → Asset criticality + threat = impact level
- **Control Recommendations** → Assets needing specific controls
- **Compliance Reporting** → Asset inventory for audits

## Example Assets to Add

```
1. Active Directory (Software, Tier 1, Critical)
2. Database Server (Hardware, Tier 1, Confidential)
3. Email System (SaaS, Tier 2, Internal/Confidential)
4. Endpoint Devices (Hardware, Tier 2, Internal/Confidential)
5. Financial Application (Software, Tier 1, Restricted)
6. Customer Portal (Software, Tier 2, Internal/Confidential)
7. File Storage (Data, Tier 2, Confidential)
8. VPN/Network (Hardware, Tier 1, Internal)
```

## Next Steps

After setting up assets:

1. **Phase 2** → Create Risk Register (link assets to threats)
2. **Phase 3** → Risk Analysis (assess likelihood and impact)
3. **Phase 4** → Control Recommendations (NIST SCF controls)
