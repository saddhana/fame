-- FAME: Family Tree Web App — Database Schema
-- Idempotent: safe to run multiple times

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: family_members
-- ============================================
CREATE TABLE IF NOT EXISTS family_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  nickname TEXT,
  birth_date DATE,
  death_date DATE,
  gender TEXT NOT NULL CHECK (gender IN ('L', 'P')),
  birth_place TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  bio TEXT,
  profile_photo_url TEXT,
  generation INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_members_name ON family_members USING gin (to_tsvector('simple', full_name));
CREATE INDEX IF NOT EXISTS idx_family_members_generation ON family_members (generation);

-- ============================================
-- Table: relationships
-- ============================================
CREATE TABLE IF NOT EXISTS relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  person1_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  person2_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('spouse', 'parent_child')),
  marriage_date DATE,
  divorce_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  marriage_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT different_people CHECK (person1_id != person2_id)
);

CREATE INDEX IF NOT EXISTS idx_relationships_person1 ON relationships (person1_id);
CREATE INDEX IF NOT EXISTS idx_relationships_person2 ON relationships (person2_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships (type);

-- ============================================
-- Table: photos
-- ============================================
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploader_member_id UUID REFERENCES family_members(id) ON DELETE SET NULL,
  cloudinary_public_id TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('family', 'personal', 'event')) DEFAULT 'family',
  event_name TEXT,
  taken_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_type ON photos (photo_type);
CREATE INDEX IF NOT EXISTS idx_photos_created ON photos (created_at DESC);

-- ============================================
-- Table: photo_tags
-- ============================================
CREATE TABLE IF NOT EXISTS photo_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  photo_id UUID NOT NULL REFERENCES photos(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES family_members(id) ON DELETE CASCADE,
  CONSTRAINT unique_photo_tag UNIQUE (photo_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_photo_tags_photo ON photo_tags (photo_id);
CREATE INDEX IF NOT EXISTS idx_photo_tags_member ON photo_tags (member_id);

-- ============================================
-- Auto-update updated_at trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON family_members;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON family_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Row Level Security (RLS)
-- ============================================
ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_tags ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (idempotent)
DROP POLICY IF EXISTS "Public read access" ON family_members;
DROP POLICY IF EXISTS "Service role full access" ON family_members;
DROP POLICY IF EXISTS "Public read access" ON relationships;
DROP POLICY IF EXISTS "Service role full access" ON relationships;
DROP POLICY IF EXISTS "Public read access" ON photos;
DROP POLICY IF EXISTS "Service role full access" ON photos;
DROP POLICY IF EXISTS "Public read access" ON photo_tags;
DROP POLICY IF EXISTS "Service role full access" ON photo_tags;

CREATE POLICY "Public read access" ON family_members FOR SELECT USING (true);
CREATE POLICY "Public read access" ON relationships FOR SELECT USING (true);
CREATE POLICY "Public read access" ON photos FOR SELECT USING (true);
CREATE POLICY "Public read access" ON photo_tags FOR SELECT USING (true);

CREATE POLICY "Service role full access" ON family_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON relationships FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON photos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON photo_tags FOR ALL USING (true) WITH CHECK (true);

