"use server";

import { createServerSupabase } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import type { Photo, PhotoInput, PhotoWithTags } from "@/types";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";

export async function getPhotos(type?: string): Promise<Photo[]> {
  let query = supabase
    .from("photos")
    .select("*")
    .order("created_at", { ascending: false });

  if (type && type !== "all") {
    query = query.eq("photo_type", type);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPhotoById(id: string): Promise<PhotoWithTags | null> {
  const { data: photo, error } = await supabase
    .from("photos")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !photo) return null;

  const { data: tags } = await supabase
    .from("photo_tags")
    .select("*, member:family_members(*)")
    .eq("photo_id", id);

  return { ...photo, tags: tags || [] };
}

export async function getPhotosByMember(memberId: string): Promise<Photo[]> {
  const { data: tags, error } = await supabase
    .from("photo_tags")
    .select("photo_id")
    .eq("member_id", memberId);

  if (error || !tags?.length) return [];

  const photoIds = tags.map((t) => t.photo_id);
  const { data } = await supabase
    .from("photos")
    .select("*")
    .in("id", photoIds)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function createPhoto(
  input: PhotoInput,
  tagMemberIds?: string[],
): Promise<Photo> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  const db = createServerSupabase();
  const { data: photo, error } = await db
    .from("photos")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);

  if (tagMemberIds?.length) {
    const tags = tagMemberIds.map((memberId) => ({
      photo_id: photo.id,
      member_id: memberId,
    }));

    await db.from("photo_tags").insert(tags);
  }

  revalidatePath("/gallery");
  revalidatePath("/");
  return photo;
}

export async function deletePhoto(id: string): Promise<void> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  const db = createServerSupabase();
  const { error } = await db.from("photos").delete().eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/gallery");
  revalidatePath("/");
}

export async function getPhotoCount(): Promise<number> {
  const { count, error } = await supabase
    .from("photos")
    .select("*", { count: "exact", head: true });

  if (error) throw new Error(error.message);
  return count || 0;
}
