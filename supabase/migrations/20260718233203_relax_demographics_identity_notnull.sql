/*
# Relax NOT NULL on redundant identity columns in club_pricing_demographics

## Summary
The demographics table was originally a flat single-table schema where
`name` and `location` were NOT NULL. After the restructure, identity now
lives in the `clubs` parent table, and demographics rows are linked by
`club_id`. The old `name`/`location` columns are now redundant and should
not block inserts that correctly rely on `club_id` instead.

## 1. Modified Table: club_pricing_demographics
- ALTER `name` to DROP NOT NULL (column kept for backward compat, now nullable).
- ALTER `location` to DROP NOT NULL (same).

## 2. Important Notes
1. No data is deleted or renamed — columns remain, just allow NULL.
2. New demographics inserts via AdminPortal (which only sends club_id + price
   columns) now succeed without supplying name/location.
*/

ALTER TABLE club_pricing_demographics ALTER COLUMN name DROP NOT NULL;
ALTER TABLE club_pricing_demographics ALTER COLUMN location DROP NOT NULL;
