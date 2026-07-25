/*
# Extend user_memberships for My Account dashboard

1. Modified Tables
- `user_memberships`
  - `tier_classification` (text, nullable) — the marketplace tier the member
    purchased ('Budget', 'Mid-tier', 'Premium', 'Luxury'). Drives the digital
    pass accent color and badge on the My Account dashboard.
  - `payment_spread_type` (text, not null default 'annually') — how the member
    chose to pay their recurring subscription: 'annually' (upfront) or
    'monthly' (direct debit over 12 months). Static upfront fees are always
    settled on day one regardless of this value.
  - `student_verified` (boolean, not null default false) — whether the member's
    .ac.uk student status was verified at checkout, locking in student pricing.
  - `customer_phone` (text, nullable) — phone number captured at registration.

2. Security
- No RLS policy changes. The table remains single-tenant (no sign-in screen):
  anon + authenticated CRUD is intentionally permitted for the demo checkout
  flow, as documented in the original migration.

3. Notes
- All additions are additive (ADD COLUMN IF NOT EXISTS) — no data is dropped,
  renamed, or retyped. Existing rows back-fill via column defaults.
- `payment_spread_type` defaults to 'annually' so historical rows (created
  before this column existed) are treated as annual payers.
*/

ALTER TABLE user_memberships
  ADD COLUMN IF NOT EXISTS tier_classification text;
ALTER TABLE user_memberships
  ADD COLUMN IF NOT EXISTS payment_spread_type text NOT NULL DEFAULT 'annually';
ALTER TABLE user_memberships
  ADD COLUMN IF NOT EXISTS student_verified boolean NOT NULL DEFAULT false;
ALTER TABLE user_memberships
  ADD COLUMN IF NOT EXISTS customer_phone text;
