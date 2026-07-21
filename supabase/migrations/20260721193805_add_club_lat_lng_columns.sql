/*
# Add lat / lng coordinate columns to clubs

## Summary
The Package Builder now geocodes each club's `location` text via the
OpenStreetMap Nominatim API to power radius-based filtering. To avoid
re-geocoding the same clubs on every page load, the resolved coordinates
should be persisted back onto the club row. This migration adds two
nullable coordinate columns to the `clubs` table so resolved lat/lng
values can be stored permanently and read directly on subsequent loads.

## 1. Modified Table: clubs
- ADD COLUMN lat (double precision, nullable) — resolved latitude of the
  club's location. NULL until the background geocoder populates it.
- ADD COLUMN lng (double precision, nullable) — resolved longitude of the
  club's location. NULL until the background geocoder populates it.

Both columns are nullable because existing rows do not yet have
coordinates; the front-end treats NULL as "needs geocoding" and
auto-populates them in the background.

## 2. View update
- Recreate the existing `club_profiles_with_tiers` view to also SELECT
  c.lat and c.lng so the front-end read path receives stored coordinates
  directly. Views hold no data, so DROP + CREATE is non-destructive.

## 3. Security
- No RLS policy changes. The `clubs` table already has anon +
  authenticated CRUD policies (TO anon, authenticated, public data for
  this no-auth app). The new columns inherit the existing row-level
  visibility, and the anon-key client can both read and UPDATE these
  columns under the existing anon_update_clubs policy.

## 4. Important Notes
1. Non-destructive: no data is deleted or modified. Only two nullable
   columns are appended and the view is refreshed.
2. Idempotent: uses IF NOT EXISTS guards so re-running is safe.
3. Double precision is the standard Postgres type for lat/lng and
   matches the front-end's number type.
*/

ALTER TABLE clubs ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS lng double precision;

-- Recreate the view to expose the new coordinate columns.
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
