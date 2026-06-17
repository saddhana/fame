"use server";

import { createServerSupabase } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import type { Relationship, RelationshipInput, FamilyMember } from "@/types";
import { revalidatePath } from "next/cache";
import { recomputeGenerations } from "./generations";
import { isAuthenticated } from "@/lib/auth";

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

export async function getParents(
  memberId: string,
): Promise<(FamilyMember & { _relationshipId: string })[]> {
  const { data: rels, error } = await supabase
    .from("relationships")
    .select("id, person1_id")
    .eq("person2_id", memberId)
    .eq("type", "parent_child");

  if (error || !rels?.length) return [];

  const relMap = new Map(rels.map((r) => [r.person1_id, r.id]));
  const parentIds = rels.map((r) => r.person1_id);
  const { data } = await supabase
    .from("family_members")
    .select("*")
    .in("id", parentIds);

  return (data || []).map((m) => ({
    ...m,
    _relationshipId: relMap.get(m.id)!,
  }));
}

export async function getChildren(
  memberId: string,
): Promise<(FamilyMember & { _relationshipId: string })[]> {
  const { data: rels, error } = await supabase
    .from("relationships")
    .select("id, person2_id")
    .eq("person1_id", memberId)
    .eq("type", "parent_child");

  if (error || !rels?.length) return [];

  const relMap = new Map(rels.map((r) => [r.person2_id, r.id]));
  const childIds = rels.map((r) => r.person2_id);
  const { data } = await supabase
    .from("family_members")
    .select("*")
    .in("id", childIds);

  return (data || []).map((m) => ({
    ...m,
    _relationshipId: relMap.get(m.id)!,
  }));
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

export async function getChildrenInLaw(
  memberId: string,
): Promise<(FamilyMember & { _spouseBirthDate: string | null })[]> {
  // Children's spouses — carries child's birth_date for sorting
  const children = await getChildren(memberId);
  if (!children.length) return [];
  const results: (FamilyMember & { _spouseBirthDate: string | null })[] = [];
  const seen = new Set<string>();
  for (const child of children) {
    const spouses = await getSpouses(child.id);
    for (const s of spouses) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        results.push({ ...s, _spouseBirthDate: child.birth_date });
      }
    }
  }
  return results;
}

export async function getParentsInLaw(
  memberId: string,
): Promise<FamilyMember[]> {
  // Spouses' parents
  const spouses = await getSpouses(memberId);
  if (!spouses.length) return [];
  const results: FamilyMember[] = [];
  const seen = new Set<string>();
  for (const spouse of spouses) {
    const parents = await getParents(spouse.id);
    for (const { _relationshipId: _rid, ...p } of parents) {
      void _rid;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        results.push(p);
      }
    }
  }
  return results;
}

export type RelationshipPathStep = {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  label: string; // e.g. "Ayah dari", "Pasangan dari"
};

export async function findRelationshipPath(
  fromId: string,
  toId: string,
): Promise<RelationshipPathStep[] | null> {
  if (fromId === toId) return [];

  const [{ data: members }, { data: rels }] = await Promise.all([
    supabase.from("family_members").select("id, full_name, gender"),
    supabase.from("relationships").select("*"),
  ]);

  if (!members || !rels) return null;

  const memberMap = new Map(members.map((m) => [m.id, m]));

  type Edge = { to: string; label: (fromGender: "L" | "P") => string };
  const graph = new Map<string, Edge[]>();
  for (const m of members) graph.set(m.id, []);

  for (const rel of rels) {
    if (rel.type === "spouse") {
      graph.get(rel.person1_id)?.push({ to: rel.person2_id, label: () => "Pasangan dari" });
      graph.get(rel.person2_id)?.push({ to: rel.person1_id, label: () => "Pasangan dari" });
    } else if (rel.type === "parent_child") {
      // person1 is parent, person2 is child
      graph.get(rel.person1_id)?.push({
        to: rel.person2_id,
        label: (g) => (g === "L" ? "Ayah dari" : "Ibu dari"),
      });
      graph.get(rel.person2_id)?.push({
        to: rel.person1_id,
        label: (g) => (g === "L" ? "Anak laki-laki dari" : "Anak perempuan dari"),
      });
    }
  }

  // BFS
  const visited = new Set<string>([fromId]);
  const queue: { id: string; path: RelationshipPathStep[] }[] = [{ id: fromId, path: [] }];

  while (queue.length > 0) {
    const { id, path } = queue.shift()!;
    const edges = graph.get(id) ?? [];
    for (const edge of edges) {
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      const fromMember = memberMap.get(id);
      const toMember = memberMap.get(edge.to);
      if (!fromMember || !toMember) continue;
      const step: RelationshipPathStep = {
        fromId: id,
        fromName: fromMember.full_name,
        toId: edge.to,
        toName: toMember.full_name,
        label: edge.label(fromMember.gender as "L" | "P"),
      };
      const newPath = [...path, step];
      if (edge.to === toId) return newPath;
      queue.push({ id: edge.to, path: newPath });
    }
  }

  return null; // no connection found
}

export async function createRelationship(
  input: RelationshipInput,
): Promise<Relationship> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  const db = createServerSupabase();

  // Check for duplicate relationship (both directions)
  const { data: existing } = await db
    .from("relationships")
    .select("id")
    .eq("type", input.type)
    .or(
      `and(person1_id.eq.${input.person1_id},person2_id.eq.${input.person2_id}),and(person1_id.eq.${input.person2_id},person2_id.eq.${input.person1_id})`,
    )
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error("Hubungan ini sudah ada");
  }

  const { data, error } = await db
    .from("relationships")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (input.type === "parent_child" || input.type === "spouse") {
    await recomputeGenerations();
  }
  revalidatePath("/members");
  revalidatePath("/family-tree");
  return data;
}

export async function deleteRelationship(id: string): Promise<void> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  const db = createServerSupabase();
  // Check if this is a parent_child relationship before deleting
  const { data: rel } = await supabase
    .from("relationships")
    .select("type")
    .eq("id", id)
    .single();

  const { error } = await db.from("relationships").delete().eq("id", id);

  if (error) throw new Error(error.message);
  if (rel?.type === "parent_child" || rel?.type === "spouse") {
    await recomputeGenerations();
  }
  revalidatePath("/members");
  revalidatePath("/family-tree");
}

export async function endMarriage(
  relationshipId: string,
  divorceDate: string,
): Promise<void> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  const db = createServerSupabase();
  const { error } = await db
    .from("relationships")
    .update({ is_active: false, divorce_date: divorceDate })
    .eq("id", relationshipId);

  if (error) throw new Error(error.message);
  revalidatePath("/members");
  revalidatePath("/family-tree");
}

export async function updateSpouseRelationship(
  id: string,
  data: {
    marriage_date: string | null;
    divorce_date: string | null;
    is_active: boolean;
    marriage_order: number | null;
  },
): Promise<void> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");
  const db = createServerSupabase();
  const { error } = await db
    .from("relationships")
    .update(data)
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/members");
  revalidatePath("/family-tree");
}
