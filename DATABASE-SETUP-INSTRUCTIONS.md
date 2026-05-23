-- ============================================================
-- QUICK START GUIDE - HOW TO EXECUTE THESE QUERIES
-- ============================================================

-- Step 1: RUN THE MAIN DATABASE SETUP
-- File: database-setup.sql
-- This creates all 7 tables with seed data
--
-- OPTION A: Using psql (command line)
-- psql -U your_username -d your_database -f database-setup.sql
--
-- OPTION B: Using pgAdmin
-- 1. Open pgAdmin
-- 2. Connect to your database
-- 3. Right-click on database → Query Tool
-- 4. Copy entire database-setup.sql
-- 5. Paste into query window
-- 6. Click "Execute" (or F5)
--
-- OPTION C: Using DBeaver
-- 1. Connect to your database
-- 2. Right-click on database → SQL Script
-- 3. Paste database-setup.sql
-- 4. Click Execute (Ctrl+Enter)
--
-- OPTION D: Using VS Code PostgreSQL Extension
-- 1. Install PostgreSQL extension
-- 2. Connect to your database
-- 3. Create new SQL file
-- 4. Paste database-setup.sql
-- 5. Right-click → Execute

-- Step 2 (OPTIONAL): INSERT SAMPLE DATA
-- File: database-sample-data.sql
-- This creates 5 sample assets for testing
--
-- Follow same instructions as Step 1 but use database-sample-data.sql
-- This is OPTIONAL but recommended for testing the system

-- Step 3: VERIFY SETUP
-- Copy and run these verification queries:

-- Check all tables were created
SELECT
tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('assets', 'threat_catalog', 'threat_asset_type_mapping',
'risk_register', 'risk_analysis', 'scf_controls',
'control_recommendations')
ORDER BY tablename;

-- Check data counts
SELECT 'threat_catalog' as table_name, COUNT(_) as count FROM threat_catalog
UNION ALL
SELECT 'threat_asset_type_mapping', COUNT(_) FROM threat_asset_type_mapping
UNION ALL
SELECT 'scf_controls', COUNT(_) FROM scf_controls
UNION ALL
SELECT 'assets', COUNT(_) FROM assets
UNION ALL
SELECT 'risk_register', COUNT(_) FROM risk_register
UNION ALL
SELECT 'risk_analysis', COUNT(_) FROM risk_analysis
UNION ALL
SELECT 'control_recommendations', COUNT(\*) FROM control_recommendations;

-- ============================================================
-- EXPECTED RESULTS AFTER SETUP
-- ============================================================

-- threat_catalog should have 10 rows
-- threat_asset_type_mapping should have 31 rows
-- scf_controls should have 28 rows

-- If sample data was inserted:
-- assets should have 5 rows
-- risk_register, risk_analysis, control_recommendations will be empty until you run assessments

-- ============================================================
-- AFTER SETUP: FLOW TO START CREATING RISKS
-- ============================================================

-- 1. Your frontend creates an asset via:
-- POST /api/assets
--
-- 2. User clicks "Analyze Risk" to trigger:
-- POST /api/complete-assessment with {asset_id: 1}
--
-- 3. The API automatically:
-- - Identifies all applicable threats (via threat_asset_type_mapping)
-- - Creates risk_register entries
-- - Calculates risk_analysis (likelihood, impact, score)
-- - Generates control_recommendations
--
-- 4. Users see the dashboard with:
-- - Risk summary (Critical, High, Medium, Low)
-- - 5×5 risk matrix visualization
-- - List of recommended controls

-- ============================================================
-- TROUBLESHOOTING
-- ============================================================

-- If you see "table already exists" errors:
-- Run this first to drop all tables:
--
-- DROP TABLE IF EXISTS control_recommendations CASCADE;
-- DROP TABLE IF EXISTS scf_controls CASCADE;
-- DROP TABLE IF EXISTS risk_analysis CASCADE;
-- DROP TABLE IF EXISTS risk_register CASCADE;
-- DROP TABLE IF EXISTS threat_asset_type_mapping CASCADE;
-- DROP TABLE IF EXISTS threat_catalog CASCADE;
-- DROP TABLE IF EXISTS assets CASCADE;
--
-- Then run database-setup.sql again

-- If you see foreign key errors:
-- Make sure threat_catalog is populated before risk_register
-- The script handles this with ON CONFLICT DO NOTHING

-- If indexes fail:
-- This is usually safe to ignore - the system will still work
-- Indexes just improve query performance

-- ============================================================
-- SUCCESS INDICATORS
-- ============================================================

-- You'll know everything is working when:
-- ✅ All 7 tables exist
-- ✅ threat_catalog has 10 pre-populated threats
-- ✅ scf_controls has 28 pre-populated controls
-- ✅ threat_asset_type_mapping has 31 pre-mapped threats
-- ✅ You can insert sample assets without errors
-- ✅ The API endpoints work and create risks automatically

-- ============================================================
-- NEXT STEPS
-- ============================================================

-- 1. Copy database-setup.sql and database-sample-data.sql to your project
-- 2. Run database-setup.sql in your PostgreSQL database
-- 3. (Optional) Run database-sample-data.sql to add test assets
-- 4. Verify counts match expected results above
-- 5. Test the APIs:
-- POST /api/assets (create sample asset)
-- POST /api/complete-assessment (auto-identify risks)
-- GET /api/complete-assessment (view results)
-- 6. View dashboard with RiskAssessmentDashboard component
