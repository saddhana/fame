ALTER TABLE family_members
ADD COLUMN is_deceased boolean NOT NULL DEFAULT false;

-- Backfill: anyone with a death_date is already deceased
UPDATE family_members SET is_deceased = true WHERE death_date IS NOT NULL;
