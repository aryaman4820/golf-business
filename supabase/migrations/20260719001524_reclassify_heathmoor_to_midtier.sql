-- Keep the Premium tab to exactly the 4 Royal Birkdale Clones by moving the
-- existing Heathmoor Valley club to Mid-tier (preserves its data and cards).
UPDATE clubs SET tier = 'Mid-tier' WHERE name = 'Heathmoor Valley';
