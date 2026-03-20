'use server';

import { createServerSupabase } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import type { FamilyMember, FamilyMemberInput } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getMembers(): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .order('generation', { ascending: true })
    .order('full_name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export async function getMemberById(id: string): Promise<FamilyMember | null> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('id', id)
    .single();

  if (error) return null;
  return data;
}

export async function searchMembers(query: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .or(`full_name.ilike.%${query}%,nickname.ilike.%${query}%`)
    .order('full_name', { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function createMember(input: FamilyMemberInput): Promise<FamilyMember> {
  const db = createServerSupabase();
  const { data, error } = await db
    .from('family_members')
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/members');
  revalidatePath('/family-tree');
  revalidatePath('/');
  return data;
}

export async function updateMember(id: string, input: Partial<FamilyMemberInput>): Promise<FamilyMember> {
  const db = createServerSupabase();
  const { data, error } = await db
    .from('family_members')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/members');
  revalidatePath(`/members/${id}`);
  revalidatePath('/family-tree');
  revalidatePath('/');
  return data;
}

export async function deleteMember(id: string): Promise<void> {
  const db = createServerSupabase();
  const { error } = await db
    .from('family_members')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  revalidatePath('/members');
  revalidatePath('/family-tree');
  revalidatePath('/');
}

export async function getMemberCount(): Promise<number> {
  const { count, error } = await supabase
    .from('family_members')
    .select('*', { count: 'exact', head: true });

  if (error) throw new Error(error.message);
  return count || 0;
}

export async function getGenerationCount(): Promise<number> {
  const { data, error } = await supabase
    .from('family_members')
    .select('generation')
    .order('generation', { ascending: false })
    .limit(1)
    .single();

  if (error) return 0;
  return data?.generation || 0;
}
