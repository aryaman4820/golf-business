/*
# Ensure lat/lng columns, refresh view with coordinates, add update policy

## Summary
1. Idempotently adds lat (DOUBLE PRECISION) and lng (DOUBLE PRECISION) to
   the clubs table if they are missing.
2. Drops and re-creates the club_profiles_with_tiers view so it explicitly
   selects c.lat and c.lng from clubs.
3. Drops and re-creates the "Allow public update of coordinates" UPDATE
   policy on clubs so the anon-key client can persist geocoded coordinates.

## Security
- The UPDATE policy uses USING (true) WITH CHECK (true) with no TO clause,
  which defaults to PUBLIC — accessible to the anon role. This is correct
  for a no-auth app where all club data is intentionally public/shared.

## Notes
1. Non-destructive: no data is deleted or modified.
2. Idempotent: column additions use IF NOT EXISTS; policy is DROP IF EXISTS
   then CREATE; view is DROP IF EXISTS then CREATE.
*/

-- 1. Ensure lat/lng columns exist (idempotent)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS lng double precision;

-- 2. Recreate the view with explicit lat/lng selection
DROP VIEW IF EXISTS club_profiles_with_tiers;
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
  c.lat,
  c.lng,
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

-- 3. Ensure public update policy for coordinates exists (anon-accessible)
DROP POLICY IF EXISTS "Allow public update of coordinates" ON clubs;
CREATE POLICY "Allow public update of coordinates" ON clubs FOR UPDATE
  USING (true) WITH CHECK (true);