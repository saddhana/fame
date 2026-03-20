import { getMembers } from '@/actions/members';
import { getRelationships } from '@/actions/relationships';
import { FamilyTreeClient } from '@/components/tree/FamilyTreeClient';

export default async function FamilyTreePage() {
  let members: Awaited<ReturnType<typeof getMembers>> = [];
  let relationships: Awaited<ReturnType<typeof getRelationships>> = [];

  try {
    [members, relationships] = await Promise.all([
      getMembers(),
      getRelationships(),
    ]);
  } catch {
    // Supabase not configured
  }

  return <FamilyTreeClient members={members} relationships={relationships} />;
}
