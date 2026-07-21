-- Seed 4 distinct Premium clubs so the Premium tab shows a full 4-card grid.
-- Each club gets its own UUID (gen_random_uuid) and a unique name, so the
-- dedup-by-id grouping in PackageBuilder keeps all four while selection
-- isolates a single card via club.id.

INSERT INTO clubs (name, location, tier, joining_fee_7day, joining_fee_5day, clubhouse_bar_levy)
VALUES
  ('Royal Birkdale Clone (North)', 'Southport, England', 'Premium', 1450, 1180, 150),
  ('Royal Birkdale Clone (South)', 'Southport, England', 'Premium', 1520, 1240, 160),
  ('Royal Birkdale Clone (Links)', 'Merseyside, England', 'Premium', 1680, 1380, 175),
  ('Royal Birkdale Clone (Championship)', 'Ainsdale, England', 'Premium', 1890, 1560, 195);

-- One demographic row per new club so the view emits pricing for each card.
INSERT INTO club_pricing_demographics (
  club_id, year, price_full_7day_adult, price_under_12, price_junior_12_18,
  price_colt_21, price_intermediate_25, price_intermediate_28,
  price_intermediate_31_35, price_student, price_5day_adult,
  price_country_member, total_historic_revenue, total_member_count
)
SELECT
  c.id,
  2025,
  c.joining_fee_7day,
  120, 240, 360, 520, 640, 760, 420,
  c.joining_fee_5day,
  700,
  250000,
  320
FROM clubs c
WHERE c.name IN (
  'Royal Birkdale Clone (North)',
  'Royal Birkdale Clone (South)',
  'Royal Birkdale Clone (Links)',
  'Royal Birkdale Clone (Championship)'
)
  AND NOT EXISTS (
    SELECT 1 FROM club_pricing_demographics d WHERE d.club_id = c.id
  );
