"use server";

import { createServerSupabase } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { isAuthenticated } from "@/lib/auth";
import { recomputeGenerations } from "@/actions/generations";
import { revalidatePath } from "next/cache";

export interface CsvRow {
  "Nama Lengkap": string;
  "Nama Panggilan": string;
  "Jenis Kelamin": string;
  "Tanggal Lahir": string;
  "Tempat Lahir": string;
  "Sudah Meninggal": string;
  "Tanggal Meninggal": string;
  "Biografi": string;
  "Telepon": string;
  "Email": string;
  "Alamat": string;
  "Nama Ayah": string;
  "Nama Ibu": string;
  "Nama Pasangan": string;
}

export interface ImportResult {
  created: number;
  skipped: string[];
  errors: string[];
}

function parseDate(val: string): string | null {
  if (!val || !val.trim()) return null;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(val.trim())) {
    const [dd, mm, yyyy] = val.trim().split("/");
    return `${yyyy}-${mm}-${dd}`;
  }
  return null;
}

export async function importFromCSV(rows: CsvRow[]): Promise<ImportResult> {
  if (!(await isAuthenticated())) throw new Error("Unauthorized");

  const db = createServerSupabase();
  const result: ImportResult = { created: 0, skipped: [], errors: [] };

  // Fetch existing members to build name→id map
  const { data: existingMembers } = await supabase
    .from("family_members")
    .select("id, full_name");

  const nameToId = new Map<string, string>();
  for (const m of existingMembers || []) {
    nameToId.set(m.full_name.toLowerCase().trim(), m.id);
  }

  // Pass 1: insert members
  for (const row of rows) {
    const fullName = row["Nama Lengkap"]?.trim();
    if (!fullName) continue;

    const key = fullName.toLowerCase();
    if (nameToId.has(key)) {
      result.skipped.push(fullName);
      continue;
    }

    const gender = row["Jenis Kelamin"]?.trim().toUpperCase();
    const isDeceased = row["Sudah Meninggal"]?.trim().toLowerCase() === "ya";
    const birthDate = parseDate(row["Tanggal Lahir"]);
    const deathDate = isDeceased ? parseDate(row["Tanggal Meninggal"]) : null;

    const { data, error } = await db
      .from("family_members")
      .insert({
        full_name: fullName,
        nickname: row["Nama Panggilan"]?.trim() || null,
        gender: gender === "P" ? "P" : "L",
        birth_date: birthDate,
        birth_place: row["Tempat Lahir"]?.trim() || null,
        death_date: deathDate,
        bio: row["Biografi"]?.trim() || null,
        phone: row["Telepon"]?.trim() || null,
        email: row["Email"]?.trim() || null,
        address: row["Alamat"]?.trim() || null,
        generation: 1,
      })
      .select("id")
      .single();

    if (error) {
      result.errors.push(`Gagal menyimpan "${fullName}": ${error.message}`);
      continue;
    }

    nameToId.set(key, data.id);
    result.created++;
  }

  // Pass 2: create relationships
  for (const row of rows) {
    const fullName = row["Nama Lengkap"]?.trim();
    if (!fullName) continue;

    const childId = nameToId.get(fullName.toLowerCase());
    if (!childId) continue;

    // Father
    const fatherName = row["Nama Ayah"]?.trim();
    if (fatherName) {
      const fatherId = nameToId.get(fatherName.toLowerCase());
      if (!fatherId) {
        result.errors.push(`Ayah "${fatherName}" tidak ditemukan untuk "${fullName}"`);
      } else {
        const { data: existing } = await db
          .from("relationships")
          .select("id")
          .eq("type", "parent_child")
          .eq("person1_id", fatherId)
          .eq("person2_id", childId)
          .limit(1);

        if (!existing?.length) {
          const { error } = await db.from("relationships").insert({
            type: "parent_child",
            person1_id: fatherId,
            person2_id: childId,
          });
          if (error) {
            result.errors.push(`Gagal membuat relasi ayah "${fatherName}" → "${fullName}": ${error.message}`);
          }
        }
      }
    }

    // Mother
    const motherName = row["Nama Ibu"]?.trim();
    if (motherName) {
      const motherId = nameToId.get(motherName.toLowerCase());
      if (!motherId) {
        result.errors.push(`Ibu "${motherName}" tidak ditemukan untuk "${fullName}"`);
      } else {
        const { data: existing } = await db
          .from("relationships")
          .select("id")
          .eq("type", "parent_child")
          .eq("person1_id", motherId)
          .eq("person2_id", childId)
          .limit(1);

        if (!existing?.length) {
          const { error } = await db.from("relationships").insert({
            type: "parent_child",
            person1_id: motherId,
            person2_id: childId,
          });
          if (error) {
            result.errors.push(`Gagal membuat relasi ibu "${motherName}" → "${fullName}": ${error.message}`);
          }
        }
      }
    }

    // Spouse
    const spouseName = row["Nama Pasangan"]?.trim();
    if (spouseName) {
      const spouseId = nameToId.get(spouseName.toLowerCase());
      if (!spouseId) {
        result.errors.push(`Pasangan "${spouseName}" tidak ditemukan untuk "${fullName}"`);
      } else {
        // Deduplicate: use consistent ordering
        const p1 = childId < spouseId ? childId : spouseId;
        const p2 = childId < spouseId ? spouseId : childId;

        const { data: existing } = await db
          .from("relationships")
          .select("id")
          .eq("type", "spouse")
          .or(
            `and(person1_id.eq.${p1},person2_id.eq.${p2}),and(person1_id.eq.${p2},person2_id.eq.${p1})`
          )
          .limit(1);

        if (!existing?.length) {
          const { error } = await db.from("relationships").insert({
            type: "spouse",
            person1_id: p1,
            person2_id: p2,
            is_active: true,
          });
          if (error) {
            result.errors.push(`Gagal membuat relasi pasangan "${fullName}" ↔ "${spouseName}": ${error.message}`);
          }
        }
      }
    }
  }

  await recomputeGenerations();
  revalidatePath("/members");
  revalidatePath("/family-tree");
  revalidatePath("/");

  return result;
}

function formatDate(val: string | null): string {
  if (!val) return "";
  // YYYY-MM-DD → DD/MM/YYYY
  const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

export async function getTemplateRows(): Promise<CsvRow[]> {
  const { data: members } = await supabase
    .from("family_members")
    .select("id, full_name, nickname, gender, birth_date, birth_place, death_date, bio, phone, email, address")
    .order("created_at", { ascending: true })
    .limit(15);

  if (!members?.length) return [];

  const ids = members.map((m) => m.id);

  const { data: rels } = await supabase
    .from("relationships")
    .select("type, person1_id, person2_id, is_active")
    .or(ids.map((id) => `person1_id.eq.${id},person2_id.eq.${id}`).join(","));

  const idToName = new Map(members.map((m) => [m.id, m.full_name]));

  // Fetch genders for parent IDs that may not be in the members list
  const parentIds = (rels || [])
    .filter((r) => r.type === "parent_child")
    .map((r) => r.person1_id)
    .filter((id) => !idToName.has(id));

  const idToGender = new Map(members.map((m) => [m.id, m.gender]));
  if (parentIds.length) {
    const { data: parentMembers } = await supabase
      .from("family_members")
      .select("id, full_name, gender")
      .in("id", parentIds);
    for (const p of parentMembers || []) {
      idToName.set(p.id, p.full_name);
      idToGender.set(p.id, p.gender);
    }
  }

  return members.map((m) => {
    const myRels = (rels || []).filter(
      (r) => r.person1_id === m.id || r.person2_id === m.id
    );

    const parentRels = myRels.filter(
      (r) => r.type === "parent_child" && r.person2_id === m.id
    );
    const spouseRels = myRels.filter(
      (r) => r.type === "spouse" && r.is_active
    );

    const fatherId = parentRels.find((r) => idToGender.get(r.person1_id) === "L")?.person1_id;
    const motherId = parentRels.find((r) => idToGender.get(r.person1_id) === "P")?.person1_id;
    const fatherName = fatherId ? (idToName.get(fatherId) ?? "") : "";
    const motherName = motherId ? (idToName.get(motherId) ?? "") : "";

    const spouseName = spouseRels
      .map((r) => idToName.get(r.person1_id === m.id ? r.person2_id : r.person1_id))
      .filter(Boolean)[0] ?? "";

    return {
      "Nama Lengkap": m.full_name,
      "Nama Panggilan": m.nickname ?? "",
      "Jenis Kelamin": m.gender,
      "Tanggal Lahir": formatDate(m.birth_date),
      "Tempat Lahir": m.birth_place ?? "",
      "Sudah Meninggal": m.death_date ? "Ya" : "Tidak",
      "Tanggal Meninggal": formatDate(m.death_date),
      "Biografi": m.bio ?? "",
      "Telepon": m.phone ?? "",
      "Email": m.email ?? "",
      "Alamat": m.address ?? "",
      "Nama Ayah": fatherName,
      "Nama Ibu": motherName,
      "Nama Pasangan": spouseName,
    };
  });
}
