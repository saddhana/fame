export interface FamilyMember {
  id: string;
  full_name: string;
  nickname: string | null;
  birth_date: string | null;
  death_date: string | null;
  gender: "L" | "P";
  birth_place: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  bio: string | null;
  profile_photo_url: string | null;
  instagram: string | null;
  facebook: string | null;
  twitter: string | null;
  linkedin: string | null;
  location_lat: number | null;
  location_lng: number | null;
  generation: number;
  created_at: string;
  updated_at: string;
}

export interface Relationship {
  id: string;
  person1_id: string;
  person2_id: string;
  type: "spouse" | "parent_child";
  marriage_date: string | null;
  divorce_date: string | null;
  is_active: boolean;
  marriage_order: number | null;
  created_at: string;
}

export interface Photo {
  id: string;
  uploader_member_id: string | null;
  cloudinary_public_id: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  photo_type: "family" | "personal" | "event";
  event_name: string | null;
  taken_date: string | null;
  created_at: string;
}

export interface PhotoTag {
  id: string;
  photo_id: string;
  member_id: string;
}

// Extended types with joined data
export interface FamilyMemberWithRelations extends FamilyMember {
  spouses: (FamilyMember & { relationship: Relationship })[];
  parents: FamilyMember[];
  children: FamilyMember[];
  siblings: FamilyMember[];
}

export interface PhotoWithTags extends Photo {
  tags: (PhotoTag & { member: FamilyMember })[];
}

// Form input types (generation is auto-computed from relationships)
export type FamilyMemberInput = Omit<
  FamilyMember,
  "id" | "created_at" | "updated_at" | "generation"
>;

export type RelationshipInput = Omit<Relationship, "id" | "created_at">;

export type PhotoInput = Omit<Photo, "id" | "created_at">;
