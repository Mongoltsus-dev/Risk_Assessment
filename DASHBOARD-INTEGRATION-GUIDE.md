# Enterprise Dashboard Integration Guide

## Overview

This guide explains how to integrate the new enterprise-grade dashboard components into your NIST CSF-based cybersecurity risk assessment system.

## New Components Created

### 1. **ExecutiveDashboard** (`components/ExecutiveDashboard.tsx`)

Enterprise health metrics for C-suite and board reporting.

**Features:**

- Circular security health gauge (0-100 score)
- Risk distribution by severity (Critical, High, Medium, Low)
- Control implementation progress bar
- NIST CSF compliance percentage
- Color-coded health status (Excellent/Good/Fair/Poor/Critical)
- Trend indicators (↑↓→)

**Data Requirements:**

```typescript
interface ExecutiveDashboardProps {
  securityHealthScore?: number; // 0-100
  riskDistribution?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  controlImplementation?: number; // percentage
  nistCompliance?: number; // percentage
}
```

---

### 2. **RiskHeatMap** (`components/RiskHeatMap.tsx`)

Visual asset risk ranking with threat/control gap analysis.

**Features:**

- Heat map grid of assets sorted by risk score
- Risk score progress bars (color-coded by severity)
- Selected asset detail panel
- Threat count vs control count gap tracking
- Asset type icons and criticality badges
- Interactive click-to-select functionality

**Data Requirements:**

```typescript
interface Asset {
  id: string;
  name: string;
  type: string; // e.g., "Database", "Web App"
  criticality: "Critical" | "High" | "Medium" | "Low";
  riskScore: number; // 0-25
  threatCount: number;
  controlCount: number;
}
```

---

### 3. **ComplianceDashboard** (`components/ComplianceDashboard.tsx`)

NIST CSF function compliance tracking and control gap analysis.

**Features:**

- Overall compliance score (0-100%)
- 5 NIST function cards (IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER)
- Force selection and detailed view of individual functions
- Control implementation tracking per function
- Risk coverage metrics
- Control category breakdown by maturity level

**Data Requirements:**

```typescript
interface NISTFunction {
  name: string;
  shortName: string;
  compliance: number; // 0-100
  controlsImplemented: number;
  controlsTotal: number;
  description: string;
  riskCoverage: number; // 0-100
  icon: string; // emoji
}
```

---

### 4. **ThreatTimeline** (`components/ThreatTimeline.tsx`)

Historical view of risk identification and control implementation events.

**Features:**

- Timeline visualization with severity color coding
- Event filtering by severity (critical/high/medium/low)
- Event filtering by type (risk_identified, risk_resolved, control_implemented, threat_detected)
- Timeline statistics (total events, critical count, risks resolved, controls implemented)
- Days-since calculation for quick reference

**Data Requirements:**

```typescript
interface TimelineEvent {
  id: string;
  date: string; // ISO format: "2024-01-15"
  type:
    | "risk_identified"
    | "risk_resolved"
    | "control_implemented"
    | "threat_detected";
  title: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  assetName: string;
  threatName?: string;
  controlName?: string;
  details: string;
}
```

---

## Main Dashboard Page

**Location:** `app/(shared-layout)/dashboard/page.tsx`

A unified dashboard page with 4 tabs:

1. **Executive Summary** - ExecutiveDashboard
2. **Risk Heat Map** - RiskHeatMap
3. **NIST CSF Compliance** - ComplianceDashboard
4. **Event Timeline** - ThreatTimeline

Features:

- Tab-based navigation with icons and descriptions
- Smooth fade-in animations between views
- Footer with last update time and refresh info
- Fully responsive design (mobile + desktop)

---

## API Endpoint

**Location:** `app/api/dashboard/route.ts`

Provides aggregated metrics for all dashboard components.

**Endpoint:** `GET /api/dashboard`

**Response:**

```typescript
interface DashboardMetrics {
  organizationHealth: {
    score: number; // 0-100
    status: "excellent" | "good" | "fair" | "poor" | "critical";
    trend: "improving" | "stable" | "declining";
  };
  riskSummary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  complianceStatus: {
    overall: number; // 0-100 percentage
    byFunction: {
      identify: number;
      protect: number;
      detect: number;
      respond: number;
      recover: number;
    };
  };
  controlStatus: {
    implemented: number;
    inProgress: number;
    planned: number;
    total: number;
    implementationRate: number; // percentage
  };
  assetMetrics: {
    total: number;
    byCriticality: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
    atRisk: number;
  };
  threatMetrics: {
    identified: number;
    mitigated: number;
    unmitigated: number;
  };
}
```

---

## Integration Steps

### Step 1: Verify Components Are In Place

All components should already be created:

- ✅ `components/ExecutiveDashboard.tsx`
- ✅ `components/RiskHeatMap.tsx`
- ✅ `components/ComplianceDashboard.tsx`
- ✅ `components/ThreatTimeline.tsx`
- ✅ `app/(shared-layout)/dashboard/page.tsx`
- ✅ `app/api/dashboard/route.ts`

### Step 2: Update Navigation

Add a link to the dashboard in your main navigation (likely in `components/web/Navbar.tsx`):

```typescript
<Link href="/dashboard" className="...">
  📊 Dashboard
</Link>
```

### Step 3: Connect to Real Data

Currently, the components use mock data. To connect to real data:

#### For ExecutiveDashboard:

```typescript
// In the component or a parent wrapper:
const { data: metrics } = useSWR('/api/dashboard', fetcher);

<ExecutiveDashboard
  securityHealthScore={metrics?.organizationHealth.score}
  riskDistribution={...}
  // ... other props
/>
```

#### For RiskHeatMap:

```typescript
// Query assets with risk data
const { data: assets } = useSWR("/api/assets?include=risks", fetcher);
const riskAssets = assets.map((asset) => ({
  id: asset.id,
  name: asset.name,
  type: asset.asset_type,
  criticality: asset.criticality,
  riskScore: asset.riskScore, // from risk_analysis
  threatCount: asset.threatCount,
  controlCount: asset.controlCount,
}));
```

#### For ComplianceDashboard:

```typescript
// Query NIST function compliance
const { data: functions } = useSWR("/api/compliance/nist-functions", fetcher);
// Functions should match the NISTFunction interface
```

#### For ThreatTimeline:

```typescript
// Query events from your timeline data
const { data: events } = useSWR("/api/timeline/events", fetcher);
// Filter events based on selection
```

### Step 4: Implement Database Queries

In your backend, implement these queries:

```sql
-- Get organization health score
SELECT
  ROUND(
    (
      (SELECT COUNT(*) FROM control_recommendations WHERE implementation_status = 'Implemented')::float /
      (SELECT COUNT(*) FROM control_recommendations)
    ) * 100
  )::int as health_score;

-- Get risk summary
SELECT
  risk_level,
  COUNT(*) as count
FROM risk_analysis
GROUP BY risk_level;

-- Get NIST function compliance
SELECT
  scf_controls.nist_function,
  COUNT(DISTINCT control_recommendations.control_id) as implemented,
  COUNT(DISTINCT scf_controls.id) as total,
  ROUND(
    (COUNT(DISTINCT control_recommendations.control_id)::float /
     COUNT(DISTINCT scf_controls.id)) * 100
  )::int as compliance_pct
FROM scf_controls
LEFT JOIN control_recommendations ON
  scf_controls.id = control_recommendations.control_id AND
  control_recommendations.implementation_status = 'Implemented'
GROUP BY scf_controls.nist_function;

-- Get assets with risk data
SELECT
  a.id,
  a.name,
  a.asset_type,
  a.criticality,
  MAX(ra.risk_score) as risk_score,
  COUNT(rr.threat_id) as threat_count,
  COUNT(cr.control_id) as control_count
FROM assets a
LEFT JOIN risk_analysis ra ON a.id = ra.asset_id
LEFT JOIN risk_register rr ON a.id = rr.asset_id
LEFT JOIN control_recommendations cr ON rr.id = cr.risk_id
GROUP BY a.id, a.name, a.asset_type, a.criticality
ORDER BY risk_score DESC;
```

### Step 5: Add Refresh Intervals

Implement auto-refresh for real-time updates:

```typescript
// In dashboard page or component:
const { data, mutate } = useSWR("/api/dashboard", fetcher, {
  refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  revalidateOnFocus: true,
});
```

---

## Styling & Theme

All components follow the established dark theme:

- **Primary Colors:** Cyan (`#06b6d4`), Blue (`#3b82f6`)
- **Background:** Slate 800-900
- **Text:** White/Gray gradients
- **Accent Colors:** Red (Critical), Orange (High), Yellow (Medium), Green (Low)

---

## Performance Considerations

1. **API Calls:** Implement pagination and filtering on large datasets
2. **Caching:** Use SWR or React Query for efficient data caching
3. **Lazy Loading:** Load components only when tabs are selected
4. **Database Indices:** Ensure indices on:
   - `risk_analysis.asset_id`
   - `control_recommendations.status`
   - `risk_register.threat_id`

---

## Next Steps

1. ✅ Components created and tested
2. 🔄 **Next:** Connect components to real API endpoint (/api/dashboard)
3. 🔄 **Next:** Implement database queries for real metrics
4. 🔄 **Next:** Add navigation links to main app
5. 🔄 **Next:** Set up auto-refresh intervals
6. 🔄 **Next:** Test with production data

---

## File Structure Summary

```
app/
  (shared-layout)/
    dashboard/
      page.tsx          ← Main dashboard page with tabs
  api/
    dashboard/
      route.ts          ← Metrics API endpoint

components/
  ExecutiveDashboard.tsx     ← Health metrics & gauges
  RiskHeatMap.tsx            ← Asset risk visualization
  ComplianceDashboard.tsx     ← NIST CSF compliance
  ThreatTimeline.tsx         ← Event history timeline
```

---

## Troubleshooting

| Issue                    | Solution                                              |
| ------------------------ | ----------------------------------------------------- |
| Components not rendering | Verify all imports in dashboard page                  |
| Missing data             | Ensure mock data is replaced with real API calls      |
| Styling looks wrong      | Verify Tailwind CSS is properly configured            |
| Performance issues       | Check database query execution plans and add indices  |
| Data not updating        | Implement SWR refresh intervals and mutation triggers |
