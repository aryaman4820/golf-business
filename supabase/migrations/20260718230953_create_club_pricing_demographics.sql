/*
# Create club pricing demographics table and tier view

1. New Tables
- `club_pricing_demographics` — stores golf club profiles with graduated demographic pricing.
  - `id` (uuid, primary key)
  - `created_at` (timestamptz, default now())
  - `name` (text, not null) — club name
  - `location` (text) — club location
  - `joining_fee_7day` (numeric) — 7-day joining fee
  - `joining_fee_5day` (numeric) — 5-day joining fee
  - `clubhouse_bar_levy` (numeric) — annual bar levy
  - `year` (integer) — year established
  - `total_historic_revenue` (numeric) — cumulative revenue
  - `total_member_count` (integer) — current member count
  - `price_under_12` (numeric) — under-12 membership price
  - `price_junior_12_18` (numeric) — 12-18 junior price
  - `price_colt_21` (numeric) — colt (19-21) price
  - `price_intermediate_25` (numeric) — intermediate (22-25) price
  - `price_intermediate_28` (numeric) — intermediate (26-28) price
  - `price_intermediate_31_35` (numeric) — intermediate (29-35) price
  - `price_full_7day_adult` (numeric) — full 7-day adult price (peak/fallback)
  - `price_5day_adult` (numeric) — 5-day adult price
  - `price_country_member` (numeric) — country member price
  - `price_student` (numeric) — verified student price
  - `tier` (text) — auto-calculated membership tier label (Budget / Mid-tier / Premium / Luxury)

2. New Views
- `club_profiles_with_tiers` — selects all columns from `club_pricing_demographics` with the tier recomputed from `price_full_7day_adult` so the frontend always reads a consistent tier.

3. Security
- Enable RLS on `club_pricing_demographics`.
- This is a single-tenant demo app with no sign-in screen, so anon + authenticated CRUD is allowed (the data is intentionally public/shared for the package builder playground).

4. Tier logic
- Budget: up to 700
- Mid-tier: 701 - 1200
- Premium: 1201 - 2000
- Luxury: 2000 and above
*/

CREATE TABLE IF NOT EXISTS club_pricing_demographics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  location text,
  joining_fee_7day numeric,
  joining_fee_5day numeric,
  clubhouse_bar_levy numeric,
  year integer,
  total_historic_revenue numeric,
  total_member_count integer,
  price_under_12 numeric,
  price_junior_12_18 numeric,
  price_colt_21 numeric,
  price_intermediate_25 numeric,
  price_intermediate_28 numeric,
  price_intermediate_31_35 numeric,
  price_full_7day_adult numeric,
  price_5day_adult numeric,
  price_country_member numeric,
  price_student numeric,
  tier text
);

ALTER TABLE club_pricing_demographics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_clubs" ON club_pricing_demographics;
CREATE POLICY "anon_select_clubs" ON club_pricing_demographics FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_clubs" ON club_pricing_demographics;
CREATE POLICY "anon_insert_clubs" ON club_pricing_demographics FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_clubs" ON club_pricing_demographics;
CREATE POLICY "anon_update_clubs" ON club_pricing_demographics FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_clubs" ON club_pricing_demographics;
CREATE POLICY "anon_delete_clubs" ON club_pricing_demographics FOR DELETE
  TO anon, authenticated USING (true);

CREATE OR REPLACE VIEW club_profiles_with_tiers AS
SELECT
  id,
  created_at,
  name,
  location,
  joining_fee_7day,
  joining_fee_5day,
  clubhouse_bar_levy,
  year,
  total_historic_revenue,
  total_member_count,
  price_under_12,
  price_junior_12_18,
  price_colt_21,
  price_intermediate_25,
  price_intermediate_28,
  price_intermediate_31_35,
  price_full_7day_adult,
  price_5day_adult,
  price_country_member,
  price_student,
  CASE
    WHEN price_full_7day_adult <= 700 THEN 'Budget'
    WHEN price_full_7day_adult <= 1200 THEN 'Mid-tier'
    WHEN price_full_7day_adult <= 2000 THEN 'Premium'
    ELSE 'Luxury'
  END AS tier
FROM club_pricing_demographics;