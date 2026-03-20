"use server";

import { createServerSupabase } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import type { Relationship, RelationshipInput, FamilyMember } from "@/types";
import { revalidatePath } from "next/cache";
import { recomputeGenerations } from "./generations";

export async function getRelationships(): Promise<Relationship[]> {
  const { data, error } = await supabase.from("relationships").select("*");

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getRelationshipsByMember(
  memberId: string,
): Promise<Relationship[]> {
  const { data, error } = await supabase
    .from("relationships")
    .select("*")
    .or(`person1_id.eq.${memberId},person2_id.eq.${memberId}`);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getSpouses(
  memberId: string,
): Promise<(FamilyMember & { relationship: Relationship })[]> {
  const relationships = await getRelationshipsByMember(memberId);
  const spouseRelations = relationships.filter((r) => r.type === "spouse");

  const spouses: (FamilyMember & { relationship: Relationship })[] = [];

  for (const rel of spouseRelations) {
    const spouseId =
      rel.person1_id === memberId ? rel.person2_id : rel.person1_id;
    const { data } = await supabase
      .from("family_members")
      .select("*")
      .eq("id", spouseId)
      .single();

    if (data) {
      spouses.push({ ...data, relationship: rel });
    }
  }

  return spouses.sort(
    (a, b) =>
      (a.relationship.marriage_order || 1) -
      (b.relationship.marriage_order || 1),
  );
}

export async function getParents(memberId: string): Promise<FamilyMember[]> {
  const { data: rels, error } = await supabase
    .from("relationships")
    .select("person1_id")
    .eq("person2_id", memberId)
    .eq("type", "parent_child");

  if (error || !rels?.length) return [];

  const parentIds = rels.map((r) => r.person1_id);
  const { data } = await supabase
    .from("family_members")
    .select("*")
    .in("id", parentIds);

  return data || [];
}

export async function getChildren(memberId: string): Promise<FamilyMember[]> {
  const { data: rels, error } = await supabase
    .from("relationships")
    .select("person2_id")
    .eq("person1_id", memberId)
    .eq("type", "parent_child");

  if (error || !rels?.length) return [];

  const childIds = rels.map((r) => r.person2_id);
  const { data } = await supabase
    .from("family_members")
    .select("*")
    .in("id", childIds);

  return data || [];
}

export async function getSiblings(memberId: string): Promise<FamilyMember[]> {
  // Get parents first, then get all their children
  const parents = await getParents(memberId);
  if (parents.length === 0) return [];

  const parentIds = parents.map((p) => p.id);
  const { data: rels } = await supabase
    .from("relationships")
    .select("person2_id")
    .in("person1_id", parentIds)
    .eq("type", "parent_child");

  if (!rels?.length) return [];

  const siblingIds = [...new Set(rels.map((r) => r.person2_id))].filter(
    (id) => id !== memberId,
  );
  if (siblingIds.length === 0) return [];

  const { data } = await supabase
    .from("family_members")
    .select("*")
    .in("id", siblingIds);

  return data || [];
}

export async function createRelationship(
  input: RelationshipInput,
): Promise<Relationship> {
  const db = createServerSupabase();
  const { data, error } = await db
    .from("relationships")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (input.type === "parent_child") {
    await recomputeGenerations();
  }
  revalidatePath("/members");
  revalidatePath("/family-tree");
  return data;
}

export async function deleteRelationship(id: string): Promise<void> {
  const db = createServerSupabase();
  // Check if this is a parent_child relationship before deleting
  const { data: rel } = await supabase
    .from("relationships")
    .select("type")
    .eq("id", id)
    .single();

  const { error } = await db.from("relationships").delete().eq("id", id);

  if (error) throw new Error(error.message);
  if (rel?.type === "parent_child") {
    await recomputeGenerations();
  }
  revalidatePath("/members");
  revalidatePath("/family-tree");
}

export async function endMarriage(
  relationshipId: string,
  divorceDate: string,
): Promise<void> {
  const db = createServerSupabase();
  const { error } = await db
    .from("relationships")
    .update({ is_active: false, divorce_date: divorceDate })
    .eq("id", relationshipId);

  if (error) throw new Error(error.message);
  revalidatePath("/members");
  revalidatePath("/family-tree");
}
