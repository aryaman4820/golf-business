/*
# Create user_memberships table (single-tenant, no auth)

1. New Tables
- `user_memberships`
  - `id` (uuid, primary key) — internal row id
  - `membership_pass_uuid` (uuid, not null, default gen_random_uuid) — the public digital golf pass token shown on the receipt
  - `customer_name` (text, not null) — full name from registration step
  - `customer_email` (text, not null) — email used in the session
  - `customer_age` (integer, not null) — resolved age used for demographic pricing
  - `selected_club_ids` (text[], not null default '{}') — array of selected club ids
  - `package_subscription_subtotal` (numeric, not null default 0) — final subscription total (base + cap + extra courses)
  - `static_fees_total` (numeric, not null default 0) — sum of joining fees + bar levies
  - `grand_total` (numeric, not null default 0) — grand total paid
  - `status` (text, not null default 'active') — pass status badge text
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `user_memberships`.
- Single-tenant app (no sign-in screen): allow anon + authenticated CRUD so the anon-key frontend can insert membership records and read receipts. Data is intentionally public/shared for this demo checkout flow.
*/

CREATE TABLE IF NOT EXISTS user_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_pass_uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_age integer NOT NULL,
  selected_club_ids text[] NOT NULL DEFAULT '{}',
  package_subscription_subtotal numeric NOT NULL DEFAULT 0,
  static_fees_total numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_memberships" ON user_memberships;
CREATE POLICY "anon_select_memberships" ON user_memberships FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_memberships" ON user_memberships;
CREATE POLICY "anon_insert_memberships" ON user_memberships FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_memberships" ON user_memberships;
CREATE POLICY "anon_update_memberships" ON user_memberships FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_memberships" ON user_memberships;
CREATE POLICY "anon_delete_memberships" ON user_memberships FOR DELETE
TO anon, authenticated USING (true);
