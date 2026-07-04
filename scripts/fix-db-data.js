// scripts/fix-db-data.js
// Fixes all data corruption from the disambiguation merge bug during import.
// Run once: node scripts/fix-db-data.js

// Load env vars from .env.local manually (avoids needing dotenv as a direct dep)
const fs = require('fs');
const envPath = require('path').join(__dirname, '../.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
}

const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function parseDate(val) {
  if (!val || !val.trim()) return null;
  const m = val.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, a, b, yyyy] = m;
  const dd = parseInt(b) > 12 ? b : a;
  const mm = parseInt(b) > 12 ? a : b;
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

async function findOne(fullName) {
  const { data } = await db.from('family_members').select('id,full_name,nickname,birth_date,gender').eq('full_name', fullName);
  return data?.[0] ?? null;
}

async function findBy(fullName, field, value) {
  const { data } = await db.from('family_members').select('id,full_name,nickname,birth_date').eq('full_name', fullName);
  return data?.find(r => r[field] === value) ?? data?.[0] ?? null;
}

async function delParent(parentId, childId) {
  const { error } = await db.from('relationships').delete()
    .eq('type', 'parent_child').eq('person1_id', parentId).eq('person2_id', childId);
  if (error) console.log(`    ERROR del parent: ${error.message}`);
}

async function delSpouse(id1, id2) {
  const { error } = await db.from('relationships').delete().eq('type', 'spouse')
    .or(`and(person1_id.eq.${id1},person2_id.eq.${id2}),and(person1_id.eq.${id2},person2_id.eq.${id1})`);
  if (error) console.log(`    ERROR del spouse: ${error.message}`);
}

async function addParent(parentId, childId) {
  const { data: ex } = await db.from('relationships').select('id')
    .eq('type','parent_child').eq('person1_id',parentId).eq('person2_id',childId).limit(1);
  if (ex?.length) return;
  await db.from('relationships').insert({ type:'parent_child', person1_id:parentId, person2_id:childId });
}

async function addSpouse(id1, id2) {
  const p1 = id1 < id2 ? id1 : id2, p2 = id1 < id2 ? id2 : id1;
  const { data: ex } = await db.from('relationships').select('id').eq('type','spouse')
    .or(`and(person1_id.eq.${p1},person2_id.eq.${p2}),and(person1_id.eq.${p2},person2_id.eq.${p1})`).limit(1);
  if (ex?.length) return;
  await db.from('relationships').insert({ type:'spouse', person1_id:p1, person2_id:p2, is_active:true });
}

async function createMember(fields) {
  const { data, error } = await db.from('family_members').insert(fields).select('id').single();
  if (error) { console.log(`    ERROR create: ${error.message}`); return null; }
  return data.id;
}

// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  // ── 1. Fix missing birth / death dates (parseDate regex was too strict) ──
  console.log('=== 1. Fix birth/death dates ===');
  const dateFixes = [
    { name: 'Agustina Dwi Mastura',              field: 'birth_date', raw: '1/8/1993' },
    { name: 'Partini',                            field: 'birth_date', raw: '4/7/1952' },
    { name: 'Endang Siswanti',                    field: 'birth_date', raw: '3/9/1966' },
    { name: 'Sulastri',                           field: 'birth_date', raw: '9/20/1974' },
    { name: 'Reynaldy Nurcahyo Riko Susilo',      field: 'birth_date', raw: '7/16/2003' },
    { name: 'Joko Susilo',                        field: 'birth_date', raw: '10/2/1972' },
    { name: 'Nisrina Zakia Inayah',               field: 'birth_date', raw: '4/4/2002' },
    { name: 'Eny Widiastuti',                     field: 'birth_date', raw: '4/1/1973' },
    { name: 'Agung Wijayanto',                    field: 'birth_date', raw: '2/7/1980' },
    { name: 'Nova Kurnia Akbar',                  field: 'birth_date', raw: '4/11/2002' },
    { name: 'Gladiest Janetra Azhar',             field: 'birth_date', raw: '12/2/2014' },
    { name: 'Wuryanti Dyah Palupi',               field: 'birth_date', raw: '10/5/1987' },
    { name: 'Esa Putri Yudaningsih',              field: 'birth_date', raw: '2/11/1997' },
    { name: 'Elzio Hafidan Abirama',              field: 'birth_date', raw: '12/1/2024' },
    { name: 'Rizky Aldianansyah',                 field: 'birth_date', raw: '10/6/2001' },
    { name: 'Riris Tri Prihatiningtyas Wulandari',field: 'birth_date', raw: '7/7/1976' },
    { name: 'Wirawan Aji',                        field: 'birth_date', raw: '8/4/1977' },
    { name: 'Triyono',                            field: 'birth_date', raw: '12/7/1982' },
    { name: 'Witon Adha Gantara',                 field: 'birth_date', raw: '11/6/1992' },
    { name: 'Kelvin Fadlan Aditya',               field: 'birth_date', raw: '23/6/2021' },
    { name: 'Siti Supartinah',                    field: 'death_date', raw: '6/12/2020' },
  ];

  for (const fix of dateFixes) {
    const parsed = parseDate(fix.raw);
    if (!parsed) { console.log(`  SKIP (unparseable): ${fix.name} ${fix.raw}`); continue; }
    const m = await findOne(fix.name);
    if (!m) { console.log(`  SKIP (not found): ${fix.name}`); continue; }
    if (m[fix.field]) { console.log(`  SKIP (already set): ${fix.name} ${fix.field}=${m[fix.field]}`); continue; }
    const { error } = await db.from('family_members').update({ [fix.field]: parsed }).eq('id', m.id);
    console.log(`  ${error ? `ERROR ${fix.name}: ${error.message}` : `✓ ${fix.name} → ${fix.field}: ${parsed}`}`);
  }

  // ── 2. Fix Hartono disambiguation ────────────────────────────────────────
  console.log('\n=== 2. Fix Hartono ===');
  // The merged "Hartono" in DB is actually family-07 patriarch (born 1946, nickname Yangkung Hartono)
  // He wrongly has Sunarso/Suyanti as parents and Nety Rusnaningsih as spouse.
  const hartono07 = await findBy('Hartono', 'nickname', 'Yangkung Hartono')
                 ?? await findBy('Hartono', 'birth_date', '1946-12-12');
  const sunarso   = await findOne('Sunarso');
  const suyanti   = await findOne('Suyanti');
  const nety      = await findOne('Nety Rusnaningsih');

  if (!hartono07) { console.log('  ERROR: Hartono (07) not found'); }
  else {
    console.log(`  Hartono (07) id: ${hartono07.id}`);
    if (sunarso) { await delParent(sunarso.id, hartono07.id); console.log('  ✓ Removed Sunarso → Hartono (07)'); }
    if (suyanti) { await delParent(suyanti.id, hartono07.id); console.log('  ✓ Removed Suyanti → Hartono (07)'); }
    if (nety)    { await delSpouse(hartono07.id, nety.id);    console.log('  ✓ Removed Hartono (07) ↔ Nety'); }

    // Check if Hartono (01.03) already exists as a second record
    const { data: allHartonos } = await db.from('family_members').select('id,nickname').eq('full_name','Hartono');
    const hartono0103 = allHartonos?.find(h => h.id !== hartono07.id);

    let h0103id = hartono0103?.id;
    if (!h0103id) {
      h0103id = await createMember({ full_name: 'Hartono', gender: 'L', is_deceased: false, generation: 1 });
      console.log(`  ✓ Created Hartono (01.03): ${h0103id}`);
    } else {
      console.log(`  Hartono (01.03) already exists: ${h0103id}`);
    }

    if (h0103id) {
      if (sunarso) { await addParent(sunarso.id, h0103id); console.log('  ✓ Sunarso → Hartono (01.03)'); }
      if (suyanti) { await addParent(suyanti.id, h0103id); console.log('  ✓ Suyanti → Hartono (01.03)'); }
      if (nety)    { await addSpouse(h0103id, nety.id);    console.log('  ✓ Hartono (01.03) ↔ Nety'); }
    }
  }

  // ── 3. Fix Sutrisno disambiguation ───────────────────────────────────────
  console.log('\n=== 3. Fix Sutrisno ===');
  const sutrisno11  = await findBy('Sutrisno', 'nickname', 'Eyang Tris')
                   ?? await findBy('Sutrisno', 'birth_date', '1956-07-15');
  const ngadenan    = await findOne('Ngadenan Wiryo Rejono');
  const sutarni     = await findOne('Sutarni');
  const mukaryati   = await findOne('Mukaryati');

  if (!sutrisno11) { console.log('  ERROR: Sutrisno (11) not found'); }
  else {
    console.log(`  Sutrisno (11) id: ${sutrisno11.id}`);
    if (ngadenan)  { await delParent(ngadenan.id, sutrisno11.id); console.log('  ✓ Removed Ngadenan → Sutrisno (11)'); }
    if (sutarni)   { await delParent(sutarni.id, sutrisno11.id);  console.log('  ✓ Removed Sutarni → Sutrisno (11)'); }
    if (mukaryati) { await delSpouse(sutrisno11.id, mukaryati.id); console.log('  ✓ Removed Sutrisno (11) ↔ Mukaryati'); }

    const { data: allSutrisnos } = await db.from('family_members').select('id,nickname').eq('full_name','Sutrisno');
    const sutrisno0301 = allSutrisnos?.find(s => s.id !== sutrisno11.id);

    let s0301id = sutrisno0301?.id;
    if (!s0301id) {
      s0301id = await createMember({ full_name: 'Sutrisno', gender: 'L', is_deceased: false, generation: 1 });
      console.log(`  ✓ Created Sutrisno (03.01): ${s0301id}`);
    } else {
      console.log(`  Sutrisno (03.01) already exists: ${s0301id}`);
    }

    if (s0301id) {
      if (ngadenan)  { await addParent(ngadenan.id, s0301id); console.log('  ✓ Ngadenan → Sutrisno (03.01)'); }
      if (sutarni)   { await addParent(sutarni.id, s0301id);  console.log('  ✓ Sutarni → Sutrisno (03.01)'); }
      if (mukaryati) { await addSpouse(s0301id, mukaryati.id); console.log('  ✓ Sutrisno (03.01) ↔ Mukaryati'); }
    }
  }

  // ── 4. Fix Sri Mulyani disambiguation ────────────────────────────────────
  console.log('\n=== 4. Fix Sri Mulyani ===');
  // Current "Sri Mulyani" in DB = Agus Krisnanto's wife (04.03) but wrongly has Sutarno/Sutarmi as parents
  const sutarno  = await findOne('Sutarno');
  const sutarmi  = await findOne('Sutarmi');

  const { data: allSMs } = await db.from('family_members').select('id,nickname').eq('full_name','Sri Mulyani');

  // Find the one with Sutarno/Sutarmi as parent (the merged one)
  let mergedSMId = null;
  for (const sm of allSMs ?? []) {
    if (sutarno) {
      const { data: rel } = await db.from('relationships').select('id')
        .eq('type','parent_child').eq('person1_id',sutarno.id).eq('person2_id',sm.id).limit(1);
      if (rel?.length) { mergedSMId = sm.id; break; }
    }
  }
  if (!mergedSMId && allSMs?.length === 1) mergedSMId = allSMs[0].id;

  if (!mergedSMId) { console.log('  ERROR: Merged Sri Mulyani not found'); }
  else {
    console.log(`  Sri Mulyani (merged) id: ${mergedSMId}`);
    if (sutarno) { await delParent(sutarno.id, mergedSMId); console.log('  ✓ Removed Sutarno → Sri Mulyani'); }
    if (sutarmi) { await delParent(sutarmi.id, mergedSMId); console.log('  ✓ Removed Sutarmi → Sri Mulyani'); }

    // Check if Sri Mulyani (02.08) already exists
    const sm0208 = allSMs?.find(s => s.id !== mergedSMId);
    let sm0208id = sm0208?.id;
    if (!sm0208id) {
      sm0208id = await createMember({ full_name: 'Sri Mulyani', gender: 'P', is_deceased: false, generation: 1 });
      console.log(`  ✓ Created Sri Mulyani (02.08): ${sm0208id}`);
    } else {
      console.log(`  Sri Mulyani (02.08) already exists: ${sm0208id}`);
    }

    if (sm0208id) {
      if (sutarno) { await addParent(sutarno.id, sm0208id); console.log('  ✓ Sutarno → Sri Mulyani (02.08)'); }
      if (sutarmi) { await addParent(sutarmi.id, sm0208id); console.log('  ✓ Sutarmi → Sri Mulyani (02.08)'); }
    }
  }

  // ── 5. Fix Titik Suprapti mother (Supartini → Partini) ───────────────────
  console.log('\n=== 5. Fix Titik Suprapti mother ===');
  const titik   = await findOne('Titik Suprapti');
  const partini = await findOne('Partini');
  if (titik && partini) {
    await addParent(partini.id, titik.id);
    console.log('  ✓ Partini → Titik Suprapti');
  } else {
    console.log(`  SKIP: Titik=${titik?.id} Partini=${partini?.id}`);
  }

  // ── 6. Recompute generations ─────────────────────────────────────────────
  console.log('\n=== 6. Recompute generations ===');
  const { error: rpcErr } = await db.rpc('recompute_generations');
  if (rpcErr) {
    console.log(`  Note: RPC not available (${rpcErr.message})`);
    console.log('  → Open the app and visit any page to trigger recomputation.');
  } else {
    console.log('  ✓ Generations recomputed');
  }

  console.log('\n✅ Done. Refresh the family tree in the app.');
}

main().catch(err => { console.error(err); process.exit(1); });
