"use server";

import { createServerSupabase } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { revalidatePath } from "next/cache";

/**
 * Recompute generation numbers for all family members based on parent-child relationships.
 * Root members (no parents) get generation 1, their children get 2, etc.
 */
export async function recomputeGenerations(): Promise<void> {
  // Fetch all members and parent-child relationships
  const [{ data: members }, { data: relationships }] = await Promise.all([
    supabase.from("family_members").select("id"),
    supabase
      .from("relationships")
      .select("person1_id, person2_id")
      .eq("type", "parent_child"),
  ]);

  if (!members?.length) return;

  const rels = relationships || [];

  // Build parent->children and child->parents maps
  const childrenOf = new Map<string, string[]>();
  const parentsOf = new Map<string, string[]>();

  for (const rel of rels) {
    const children = childrenOf.get(rel.person1_id) || [];
    children.push(rel.person2_id);
    childrenOf.set(rel.person1_id, children);

    const parents = parentsOf.get(rel.person2_id) || [];
    parents.push(rel.person1_id);
    parentsOf.set(rel.person2_id, parents);
  }

  // Find root members (those with no parents)
  const roots = members.filter((m) => !parentsOf.has(m.id));

  // BFS to assign generations
  const generationMap = new Map<string, number>();
  const queue: { id: string; gen: number }[] = roots.map((m) => ({
    id: m.id,
    gen: 1,
  }));

  while (queue.length > 0) {
    const { id, gen } = queue.shift()!;

    // Skip if already assigned with a lower or equal generation (handles multiple parents)
    if (generationMap.has(id) && generationMap.get(id)! <= gen) continue;
    generationMap.set(id, gen);

    const children = childrenOf.get(id) || [];
    for (const childId of children) {
      queue.push({ id: childId, gen: gen + 1 });
    }
  }

  // Members not reached by BFS (disconnected, no parents found) get generation 1
  for (const m of members) {
    if (!generationMap.has(m.id)) {
      generationMap.set(m.id, 1);
    }
  }

  // Batch update all members' generation values
  const db = createServerSupabase();
  const updates = Array.from(generationMap.entries()).map(([id, generation]) =>
    db.from("family_members").update({ generation }).eq("id", id),
  );

  await Promise.all(updates);

  revalidatePath("/members");
  revalidatePath("/family-tree");
  revalidatePath("/");
}
