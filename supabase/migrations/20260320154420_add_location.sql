-- Add location coordinates to family_members for Google Maps integration
ALTER TABLE family_members
  ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 7),
  ADD COLUMN IF NOT EXISTS location_lng DECIMAL(10, 7);
