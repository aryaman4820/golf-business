/*
# Add explicit public coordinate-update RLS policy on clubs

## Summary
The front-end background geocoder resolves each club's `location` to
lat/lng via the Photon API and persists the result back to the `clubs`
table with `supabase.from('clubs').update({ lat, lng }).eq('id', club.id)`.
This migration guarantees that the anon-key client can perform that UPDATE
without hitting a 401/403 by adding an explicit, clearly-named UPDATE
policy for anon + authenticated. It also re-asserts the lat/lng columns
exist (idempotent) so the migration is self-contained.

## 1. Schema checks (idempotent)
- `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS lat double precision`
- `ALTER TABLE clubs ADD COLUMN IF NOT EXISTS lng double precision`
  Both already added by migration 20260721193805; re-stated here as a
  no-op guard so this migration is safe to run on a fresh or existing DB.

## 2. Security
- New UPDATE policy "Allow public update of coordinates" on `clubs` for
  `TO anon, authenticated` with `USING (true) WITH CHECK (true)`.
  This is a no-auth app (no sign-in screen) where all club data is
  intentionally public/shared, so unrestricted anon updates are correct.
  The existing `anon_update_clubs` policy already permits this, but the
  explicit named policy documents the intent and survives any future
  policy re-creation.

## 3. Important notes
1. Non-destructive: no data is deleted or modified.
2. Idempotent: column additions use IF NOT EXISTS; policy is DROP IF EXISTS
   then CREATE, so re-running is safe.
3. RLS remains enabled on `clubs` from prior migrations.
*/

-- 1. Schema checks (idempotent — no-op if columns already exist)
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS lat double precision;
ALTER TABLE clubs ADD COLUMN IF NOT EXISTS lng double precision;

-- 2. Explicit public coordinate-update policy (no-auth app → anon + authenticated)
DROP POLICY IF EXISTS "Allow public update of coordinates" ON clubs;
CREATE POLICY "Allow public update of coordinates" ON clubs FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);