/*
# Create scans and alerts tables with GPS location support

1. New Tables
- `scans`: Stores neonatal jaundice screening results with exact GPS coordinates
  - id (uuid, PK)
  - baby_id (text) - identifier for the baby
  - mother_name (text) - mother or parent name
  - age_hours (integer) - baby age in hours
  - birth_weight (integer) - birth weight in grams
  - gestational_age (text) - gestational age in weeks
  - bilirubin (numeric) - estimated bilirubin level mg/dL
  - status (text) - 'Normal' | 'Monitor' | 'Refer Urgently'
  - ward (text) - ward or facility name
  - worker_name (text) - healthcare worker name
  - notes (text) - clinical notes
  - image_base64 (text) - base64 encoded scan image
  - latitude (double precision) - GPS latitude where scan was taken
  - longitude (double precision) - GPS longitude where scan was taken
  - location_accuracy (double precision) - GPS accuracy in meters
  - location_address (text) - reverse-geocoded address
  - scanned_at (timestamptz) - when scan was performed
  - created_at (timestamptz) - when record was created

- `alerts`: Stores critical alerts sent to hospitals with live location
  - id (uuid, PK)
  - scan_id (uuid, FK to scans) - linked scan
  - baby_id (text) - baby identifier
  - bilirubin (numeric) - bilirubin level
  - parent_name (text) - parent name
  - parent_phone (text) - parent phone number
  - facility_name (text) - target facility
  - latitude (double precision) - GPS latitude
  - longitude (double precision) - GPS longitude
  - location_accuracy (double precision) - GPS accuracy meters
  - location_address (text) - address text
  - is_sent (boolean) - whether alert was successfully sent
  - retry_count (integer) - sync retry attempts
  - resolved (boolean) - whether hospital responded
  - created_at (timestamptz)
  - sent_at (timestamptz) - when alert was sent
  - last_retry_at (timestamptz) - last sync retry time

2. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD (single-tenant app, no Supabase auth sign-in).
- All data is intentionally shared between app users and hospital portals.

3. Indexes
- Index on scans.scanned_at for time-based queries
- Index on alerts.is_sent for pending alert queries
- Index on alerts.facility_name for hospital-specific queries
*/

CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  baby_id text NOT NULL,
  mother_name text NOT NULL DEFAULT '',
  age_hours integer NOT NULL DEFAULT 0,
  birth_weight integer NOT NULL DEFAULT 0,
  gestational_age text NOT NULL DEFAULT '',
  bilirubin numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Normal',
  ward text NOT NULL DEFAULT '',
  worker_name text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  image_base64 text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  location_accuracy double precision,
  location_address text NOT NULL DEFAULT '',
  scanned_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scans" ON scans;
CREATE POLICY "anon_select_scans" ON scans FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scans" ON scans;
CREATE POLICY "anon_insert_scans" ON scans FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scans" ON scans;
CREATE POLICY "anon_update_scans" ON scans FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scans" ON scans;
CREATE POLICY "anon_delete_scans" ON scans FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans (scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_status ON scans (status);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid REFERENCES scans(id) ON DELETE CASCADE,
  baby_id text NOT NULL,
  bilirubin numeric NOT NULL DEFAULT 0,
  parent_name text NOT NULL DEFAULT '',
  parent_phone text NOT NULL DEFAULT '',
  facility_name text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  location_accuracy double precision,
  location_address text NOT NULL DEFAULT '',
  is_sent boolean NOT NULL DEFAULT false,
  retry_count integer NOT NULL DEFAULT 0,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_retry_at timestamptz
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_alerts_is_sent ON alerts (is_sent);
CREATE INDEX IF NOT EXISTS idx_alerts_facility ON alerts (facility_name);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts (created_at DESC);
