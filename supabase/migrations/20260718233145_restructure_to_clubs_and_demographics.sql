/*
# Restructure database to two-table model (clubs + club_pricing_demographics)

## Summary
The front-end (PackageBuilder, ClubCard, AdminPortal) was already coded for a
two-table structure: a `clubs` parent table for identity/fixed fees and a
`club_pricing_demographics` child table for yearly graduated pricing. The
database only had a single flat `club_pricing_demographics` table with no
`clubs` table and no `club_id` column, so the view could not join correctly
and AdminPortal's `clubs` lookups failed. This migration creates the missing
`clubs` table, adds a `club_id` foreign key to the existing demographics
table, and rebuilds the `club_profiles_with_tiers` view to join them.

## 1. View
- DROP existing `club_profiles_with_tiers` view (views hold no data — safe).
- Recreate it as a LEFT JOIN from `clubs` to `club_pricing_demographics` on
  `club_id`, exposing every column the front-end reads:
  identity (name, location, tier), fixed fees (joining_fee_7day,
  joining_fee_5day, clubhouse_bar_levy), yearly demographics (year,
  total_historic_revenue, total_member_count), and all graduated price
  columns (price_under_12 … price_full_7day_adult, price_5day_adult,
  price_country_member, price_student).

## 2. New Table: clubs
- id (uuid PK, auto-generated)
- created_at (timestamptz)
- name (text, not null) — club identity
- location (text)
- tier (text) — stored tier label ("Budget" / "Mid-tier" / "Premium" / "Luxury")
- joining_fee_7day (numeric) — fixed 7-day joining fee
- joining_fee_5day (numeric) — fixed 5-day joining fee
- clubhouse_bar_levy (numeric) — fixed annual bar levy

## 3. Modified Table: club_pricing_demographics
- ADD COLUMN club_id (uuid, FK → clubs.id ON DELETE CASCADE).
  Non-destructive: existing rows and columns are untouched. Old rows keep
  NULL club_id and simply won't appear in the new view (no data lost).

## 4. Security (RLS)
- This is a no-auth app (no sign-in screen), so all policies use
  TO anon, authenticated with USING(true) — the data is intentionally public.
- clubs: 4 CRUD policies (select/insert/update/delete) for anon + authenticated.
- club_pricing_demographics: 4 CRUD policies (select/insert/update/delete)
  for anon + authenticated (ensures the view, which runs as the caller, can
  read underlying rows through the anon key).

## 5. Important Notes
1. No existing data is deleted or modified — only the view is dropped
   (no data) and one column is added (non-destructive).
2. The view is a plain LEFT JOIN; for the demo, one demographic row per
   club is seeded, giving a clean 1:1 result set.
3. AdminPortal's `clubs` UUID lookup and `club_pricing_demographics` insert
   (with club_id) now have real tables to hit.
*/

-- 1. Drop existing view (no data loss)
DROP VIEW IF EXISTS club_profiles_with_tiers;

-- 2. Create clubs table
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  location text,
  tier text,
  joining_fee_7day numeric,
  joining_fee_5day numeric,
  clubhouse_bar_levy numeric
);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;

-- 3. Add club_id foreign key to demographics table (non-destructive)
ALTER TABLE club_pricing_demographics
  ADD COLUMN IF NOT EXISTS club_id uuid REFERENCES clubs(id) ON DELETE CASCADE;

-- 4. Recreate the view joining the two tables
CREATE VIEW club_profiles_with_tiers AS
SELECT
  c.id,
  c.created_at,
  c.name,
  c.location,
  c.tier,
  c.joining_fee_7day,
  c.joining_fee_5day,
  c.clubhouse_bar_levy,
  cpd.year,
  cpd.total_historic_revenue,
  cpd.total_member_count,
  cpd.price_under_12,
  cpd.price_junior_12_18,
  cpd.price_colt_21,
  cpd.price_intermediate_25,
  cpd.price_intermediate_28,
  cpd.price_intermediate_31_35,
  cpd.price_full_7day_adult,
  cpd.price_5day_adult,
  cpd.price_country_member,
  cpd.price_student
FROM clubs c
LEFT JOIN club_pricing_demographics cpd ON c.id = cpd.club_id;

-- 5. RLS policies for clubs (no-auth app → anon + authenticated, public data)
DROP POLICY IF EXISTS "anon_select_clubs" ON clubs;
CREATE POLICY "anon_select_clubs" ON clubs FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clubs" ON clubs;
CREATE POLICY "anon_insert_clubs" ON clubs FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clubs" ON clubs;
CREATE POLICY "anon_update_clubs" ON clubs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clubs" ON clubs;
CREATE POLICY "anon_delete_clubs" ON clubs FOR DELETE
  TO anon, authenticated USING (true);

-- 6. RLS policies for club_pricing_demographics (ensure anon readability through the view)
DROP POLICY IF EXISTS "anon_select_demographics" ON club_pricing_demographics;
CREATE POLICY "anon_select_demographics" ON club_pricing_demographics FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_demographics" ON club_pricing_demographics;
CREATE POLICY "anon_insert_demographics" ON club_pricing_demographics FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_demographics" ON club_pricing_demographics;
CREATE POLICY "anon_update_demographics" ON club_pricing_demographics FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_demographics" ON club_pricing_demographics;
CREATE POLICY "anon_delete_demographics" ON club_pricing_demographics FOR DELETE
  TO anon, authenticated USING (true);
