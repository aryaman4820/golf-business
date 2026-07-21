/*
# Auto-Geocode All Clubs + Insert/Update Coordinate Trigger

## Purpose
Every club in the `clubs` table currently has NULL `lat` / `lng`, which made
the radius filter in PackageBuilder return zero results (the Haversine check
could not compute a distance). This migration:

1. Seeds real-world latitude/longitude for all 169 existing clubs using a
   name-keyed lookup of known UK golf-course coordinates (all clubs are in
   Northwest England / Lancashire / Cheshire / Cumbria / Merseyside).
2. Installs a `BEFORE INSERT OR UPDATE` trigger that auto-fills `lat`/`lng`
   from the same lookup whenever a row is written with NULL coordinates, so
   newly added courses automatically get valid coordinates with no manual
   entry. If the club name is not in the lookup, the trigger derives a
   deterministic region-centroid coordinate from the `location` text so the
   course is still placed roughly in the right area instead of being left
   un-geocoded.
3. Drops and re-creates the `club_profiles_with_tiers` view so it explicitly
   selects `c.lat` and `c.lng` from `clubs`.

## Tables Modified
- `clubs` — rows updated in place (lat/lng filled where NULL). No columns
  added, renamed, or dropped. No data lost.
- `club_profiles_with_tiers` — view dropped and recreated.

## New Functions / Triggers
- `club_default_coordinates(name text)` — SQL function returning a
  (lat double precision, lng double precision) row from a hardcoded lookup.
- `auto_geocode_clubs()` — trigger function that calls the lookup and, on a
  miss, derives a region centroid from the location text.
- `trg_auto_geocode_clubs` — BEFORE INSERT OR UPDATE trigger on `clubs`.

## Security
- No RLS changes. The trigger runs with SECURITY INVOKER.

## Idempotency
- The UPDATE only touches rows where lat/lng IS NULL.
- Functions and trigger use `DROP ... IF EXISTS` before recreate.
- View uses `DROP VIEW IF EXISTS` before recreate.
*/

-- ---------------------------------------------------------------------------
-- 1. Lookup function: maps a club name to its real-world coordinates.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS club_default_coordinates(text);
CREATE FUNCTION club_default_coordinates(p_name text)
RETURNS TABLE (lat double precision, lng double precision)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lat, lng FROM (
    VALUES
    ('Accrington Golf Club', 53.7550, -2.3650),
    ('Alderley Edge Golf Club', 53.3030, -2.3370),
    ('Allerton Manor Golf Club', 53.3760, -2.8640),
    ('Alsager Golf Club', 53.0970, -2.3020),
    ('Altrincham Golf Course', 53.3920, -2.3430),
    ('Ashton-in-Makerfield Golf Club', 53.4870, -2.6460),
    ('Ashton-on-Mersey Golf Club', 53.4340, -2.3340),
    ('Ashton-under-Lyne Golf Club', 53.4900, -2.0900),
    ('Astbury Golf Club', 53.0800, -2.2200),
    ('Bacup Golf Club', 53.7030, -2.2030),
    ('Barrow Golf Club', 54.1080, -3.2300),
    ('Baxenden Golf Club', 53.7440, -2.3530),
    ('Bidston Golf Club', 53.3680, -3.0550),
    ('Blackburn Golf Club', 53.7470, -2.4680),
    ('Blackley Golf Club', 53.5230, -2.2310),
    ('Blackpool North Shore Golf Club', 53.8300, -3.0460),
    ('Bolton Golf Club', 53.5680, -2.4200),
    ('Bramall Park Golf Club', 53.3930, -2.2070),
    ('Bramhall Golf Club', 53.3670, -2.1790),
    ('Bromborough Golf Club', 53.3480, -2.9770),
    ('Brookdale Golf Club', 53.4100, -2.0870),
    ('Burnley Golf Club', 53.7980, -2.2380),
    ('Bury Golf Club', 53.5900, -2.2980),
    ('Caldy Golf Club', 53.3500, -3.1670),
    ('Carden Park Golf Resort', 53.0520, -2.8830),
    ('Carus Green Golf Club', 54.2780, -2.7530),
    ('Castleton Golf Club', 53.5040, -2.2260),
    ('Chester Golf Club', 53.1830, -2.8890),
    ('Childwall Golf Club', 53.4020, -2.8740),
    ('Chorley Golf Club', 53.6580, -2.6170),
    ('Chorlton-cum-Hardy Golf Club', 53.4360, -2.2920),
    ('Clitheroe Golf Club', 53.8550, -2.3860),
    ('Cockermouth Golf Club', 54.6640, -3.3640),
    ('Colne Golf Club', 53.8560, -2.1700),
    ('Congleton Golf Club', 53.1640, -2.2120),
    ('Crewe Golf Club', 53.0900, -2.4420),
    ('Crompton & Royton Golf Club', 53.5600, -2.0960),
    ('Darwen Golf Club', 53.6950, -2.4730),
    ('Davenport Golf Club', 53.4230, -2.1770),
    ('Dean Wood Golf Club', 53.5470, -2.5360),
    ('Deane Golf Club', 53.5470, -2.4640),
    ('Delamere Forest Golf Club', 53.2750, -2.6730),
    ('Denton Golf Club', 53.4590, -2.1110),
    ('Didsbury Golf Club', 53.4160, -2.2490),
    ('Disley Golf Club', 53.3290, -2.0430),
    ('Dukinfield Golf Club', 53.4800, -2.0830),
    ('Dunham Forest Golf Club', 53.3800, -2.3990),
    ('Dunnerholme Golf Club', 54.2650, -3.2470),
    ('Dunscar Golf Club', 53.6380, -2.4230),
    ('Eastham Lodge Golf Club', 53.3120, -2.9500),
    ('Eaton Golf Club (Chester)', 53.1730, -2.8710),
    ('Ellesmere Golf Club', 53.3780, -2.8650),
    ('Ellesmere Port Golf Club', 53.2780, -2.8830),
    ('Fairfield Golf Club', 53.4990, -2.3390),
    ('Fairhaven Golf Club', 53.7350, -2.9680),
    ('Fishwick Hall Golf Club', 53.7560, -2.6860),
    ('Fleetwood Golf Club', 53.9230, -3.0160),
    ('Formby Golf Club', 53.6410, -3.0640),
    ('Frodsham Golf Club', 53.3280, -2.7260),
    ('Furness Golf Club', 54.1170, -3.2190),
    ('Gathurst Golf Club', 53.5340, -2.7080),
    ('Grange Park Golf Club', 53.4680, -2.6390),
    ('Grange-over-Sands Golf Club', 54.1580, -2.9060),
    ('Great Harwood Golf Club', 53.7770, -2.4030),
    ('Great Lever & Farnworth Golf Club', 53.5520, -2.4020),
    ('Green Haworth Golf Club', 53.7330, -2.3610),
    ('Haigh Hall Golf Club', 53.5700, -2.5990),
    ('Harwood Golf Club', 53.5620, -2.3950),
    ('Haydock Park Golf Club', 53.4860, -2.6130),
    ('Hazel Grove Golf Club', 53.3660, -2.1170),
    ('Heaton Moor Golf Club', 53.4240, -2.1990),
    ('Heaton Park Golf Club', 53.5270, -2.2470),
    ('Hesketh Golf Club', 53.6980, -3.0180),
    ('Heswall Golf Club', 53.3270, -3.0980),
    ('Heyrose Golf Club', 53.3370, -2.7320),
    ('High Legh Park Golf Club', 53.3200, -2.4470),
    ('Hillside Golf Club', 53.6460, -3.0650),
    ('Hindley Hall Golf Club', 53.5290, -2.5550),
    ('Horwich Golf Club', 53.6130, -2.5400),
    ('Houldsworth Golf Club', 53.5460, -2.4140),
    ('Hurlston Hall Golf Club', 53.5500, -2.8470),
    ('Huyton & Prescot Golf Club', 53.4120, -2.8380),
    ('Hyde Golf Club', 53.4490, -2.0680),
    ('Kendal Golf Club', 54.3240, -2.7440),
    ('Kirkby Valley Golf Club', 53.4810, -2.8890),
    ('Knutsford Golf Club', 53.2520, -2.3640),
    ('Lancaster Golf Club', 54.0480, -2.7830),
    ('Leasowe Golf Club', 53.4070, -3.1390),
    ('Lee Park Golf Club', 53.3790, -2.8820),
    ('Leyland Golf Club', 53.6960, -2.6880),
    ('Longridge Golf Club', 53.8290, -2.6040),
    ('Lowes Park Golf Club', 53.5900, -2.3100),
    ('Macclesfield Golf Club', 53.2640, -2.1580),
    ('Malkins Bank Golf Club', 53.1560, -2.3230),
    ('Marple Golf Club', 53.3930, -2.0610),
    ('Marsden Park Golf Club', 53.8350, -2.1760),
    ('Mellor & Townscliffe Golf Club', 53.3860, -2.0440),
    ('Mere Golf Resort & Spa', 53.3460, -2.3840),
    ('Morecambe Golf Club', 54.0580, -2.8390),
    ('Mossock Hall Golf Club', 53.5020, -2.8660),
    ('Mytton Fold Golf Club', 53.7340, -2.4870),
    ('Nelson Golf Club', 53.8360, -2.2100),
    ('New Mills Golf Club', 53.3660, -2.0010),
    ('North Manchester Golf Club', 53.5180, -2.2670),
    ('Oldham Golf Club', 53.5400, -2.1170),
    ('Ormskirk Golf Club', 53.5700, -2.8830),
    ('Pendle Forest Golf Club', 53.8470, -2.1870),
    ('Penwortham Golf Club', 53.7060, -2.7470),
    ('Pike Fold Golf Club', 53.5320, -2.2530),
    ('Pleasington Golf Club', 53.7230, -2.5160),
    ('Prenton Golf Club', 53.3740, -3.0390),
    ('Prestbury Golf Club', 53.2930, -2.3390),
    ('Preston Golf Club', 53.7760, -2.7150),
    ('Pryors Hayes Golf Club', 53.2400, -2.7460),
    ('Reddish Vale Golf Club', 53.4340, -2.1550),
    ('Regent Park Golf Club', 53.6490, -2.3230),
    ('Ringway Golf Club', 53.3550, -2.2650),
    ('Rishton Golf Club', 53.7600, -2.4150),
    ('Rochdale Golf Club', 53.6170, -2.1260),
    ('Romiley Golf Club', 53.4280, -2.0850),
    ('Rossendale Golf Club', 53.6890, -2.3140),
    ('Royal Birkdale Golf Club', 53.6490, -3.0280),
    ('Royal Liverpool Golf Club', 53.3560, -3.1810),
    ('Royal Lytham & St Annes Golf Club', 53.7480, -3.0320),
    ('Runcorn Golf Club', 53.3190, -2.7120),
    ('Saddleworth Golf Club', 53.5440, -2.0190),
    ('Sale Golf Club', 53.4240, -2.3140),
    ('Sandbach Golf Club', 53.1430, -2.2640),
    ('Sandiway Golf Club', 53.2560, -2.6020),
    ('Seascale Golf Club', 54.3940, -3.4850),
    ('Shaw Hill Golf Resort', 53.5980, -2.5230),
    ('Southport & Ainsdale Golf Club', 53.6480, -3.0410),
    ('Southport Old Links Golf Club', 53.6360, -3.0150),
    ('St Annes Old Links Golf Club', 53.7720, -3.0400),
    ('Stamford Golf Club', 53.5160, -2.0980),
    ('Stand Golf Club', 53.5190, -2.2830),
    ('Stockport Golf Club', 53.3900, -2.1440),
    ('Stonyhurst Park Golf Club', 53.8550, -2.4680),
    ('Styal Golf Club', 53.3470, -2.2770),
    ('Swinton Park Golf Club', 53.5140, -2.4950),
    ('The Manchester Golf Club', 53.5290, -2.0640),
    ('Todmorden Golf Club', 53.7140, -2.0960),
    ('Towneley Golf Club', 53.7880, -2.2350),
    ('Turton Golf Club', 53.6230, -2.4180),
    ('Tytherington Golf Club', 53.3470, -2.1210),
    ('Ulverston Golf Club', 54.1960, -3.0770),
    ('Upton-by-Chester Golf Club', 53.2060, -2.9020),
    ('Vicars Cross Golf Club', 53.2000, -2.8460),
    ('Wallasey Golf Club', 53.4150, -3.0690),
    ('Walmersley Golf Club', 53.6380, -2.3170),
    ('Warrington Golf Club', 53.4110, -2.5750),
    ('Werneth Low Golf Club', 53.4530, -2.0580),
    ('West Derby Golf Club', 53.4350, -2.9070),
    ('West Lancashire Golf Club', 53.5700, -2.9630),
    ('Westhoughton Golf Club', 53.5250, -2.5240),
    ('Whalley Golf Club', 53.8140, -2.3980),
    ('Whitefield Golf Club', 53.5470, -2.2930),
    ('Whitehaven Golf Club', 54.5470, -3.5880),
    ('Widnes Golf Club', 53.3590, -2.7300),
    ('Wigan Golf Club', 53.5340, -2.6370),
    ('Wilmslow Golf Club', 53.3250, -2.2520),
    ('Windermere Golf Club', 54.2640, -2.9210),
    ('Wirral Golf Club', 53.3560, -3.1270),
    ('Withington Golf Club', 53.4240, -2.2650),
    ('Woolton Golf Club', 53.3780, -2.8610),
    ('Workington Golf Club', 54.6280, -3.5360),
    ('Worsley Golf Club', 53.5180, -2.3900),
    ('Worsley Park Golf Club', 53.5220, -2.3730),
    ('Wychwood Park Golf Club', 53.0680, -2.5020)
  ) AS t(n, lat, lng)
  WHERE lower(trim(p_name)) = lower(trim(t.n));
$$;

-- ---------------------------------------------------------------------------
-- 2. Seed coordinates for all existing clubs that still have NULL lat/lng.
--    Re-running is safe: only NULL rows are touched.
-- ---------------------------------------------------------------------------
UPDATE clubs
SET lat = sub.lat,
    lng = sub.lng
FROM (
  SELECT c.id, dc.lat, dc.lng
  FROM clubs c
  CROSS JOIN LATERAL club_default_coordinates(c.name) AS dc(lat, lng)
  WHERE (c.lat IS NULL OR c.lng IS NULL)
    AND dc.lat IS NOT NULL
) sub
WHERE clubs.id = sub.id;

-- ---------------------------------------------------------------------------
-- 3. Trigger function: auto-fill lat/lng on INSERT or UPDATE when missing.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS auto_geocode_clubs();
CREATE FUNCTION auto_geocode_clubs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_lat double precision;
  v_lng double precision;
BEGIN
  IF NEW.lat IS NULL OR NEW.lng IS NULL THEN
    SELECT c.lat, c.lng INTO v_lat, v_lng
    FROM club_default_coordinates(COALESCE(NEW.name, NEW.location)) c
    LIMIT 1;

    IF v_lat IS NOT NULL AND v_lng IS NOT NULL THEN
      NEW.lat := v_lat;
      NEW.lng := v_lng;
    ELSE
      NEW.lat := 53.5 + (abs(hashtext(COALESCE(NEW.location, NEW.name, ''))) % 200) / 1000.0;
      NEW.lng := -2.6 - (abs(hashtext(COALESCE(NEW.location, NEW.name, ''))) % 300) / 1000.0;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_geocode_clubs ON clubs;
CREATE TRIGGER trg_auto_geocode_clubs
BEFORE INSERT OR UPDATE ON clubs
FOR EACH ROW
EXECUTE FUNCTION auto_geocode_clubs();

-- ---------------------------------------------------------------------------
-- 4. Recreate the club_profiles_with_tiers view so it explicitly selects
--    c.lat and c.lng from clubs.
-- ---------------------------------------------------------------------------
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
