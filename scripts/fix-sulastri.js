const fs = require('fs');
for (const line of fs.readFileSync(require('path').join(__dirname, '../.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function findOne(name) {
  const { data } = await db.from('family_members').select('id,full_name').eq('full_name', name);
  return data?.[0] ?? null;
}
async function addParent(parentId, childId) {
  const { data: ex } = await db.from('relationships').select('id').eq('type','parent_child').eq('person1_id',parentId).eq('person2_id',childId).limit(1);
  if (ex?.length) { console.log(`  SKIP (exists): parent→child`); return; }
  const { error } = await db.from('relationships').insert({ type:'parent_child', person1_id:parentId, person2_id:childId });
  if (error) console.log(`  ERROR addParent: ${error.message}`);
}
async function addSpouse(id1, id2) {
  const p1 = id1 < id2 ? id1 : id2, p2 = id1 < id2 ? id2 : id1;
  const { data: ex } = await db.from('relationships').select('id').eq('type','spouse').or(`and(person1_id.eq.${p1},person2_id.eq.${p2}),and(person1_id.eq.${p2},person2_id.eq.${p1})`).limit(1);
  if (ex?.length) { console.log(`  SKIP (exists): spouse`); return; }
  const { error } = await db.from('relationships').insert({ type:'spouse', person1_id:p1, person2_id:p2, is_active:true });
  if (error) console.log(`  ERROR addSpouse: ${error.message}`);
}

async function main() {
  // 1. Create Sulastri
  console.log('=== Create Sulastri ===');
  let sulastri = await findOne('Sulastri');
  if (sulastri) {
    console.log(`  Already exists: ${sulastri.id}`);
  } else {
    const { data, error } = await db.from('family_members').insert({
      full_name: 'Sulastri', nickname: 'Sulastri', gender: 'P',
      birth_date: '1974-09-20', birth_place: 'Yogyakarta',
      is_deceased: true, death_date: '2023-10-23', generation: 1,
    }).select('id').single();
    if (error) { console.log(`  ERROR: ${error.message}`); return; }
    sulastri = data;
    console.log(`  ✓ Created Sulastri: ${sulastri.id}`);
  }

  // 2. Link Sulastri ↔ Joko Susilo
  const joko = await findOne('Joko Susilo');
  if (joko) {
    await addSpouse(sulastri.id, joko.id);
    console.log('  ✓ Sulastri ↔ Joko Susilo');
  } else {
    console.log('  SKIP: Joko Susilo not found');
  }

  // 3. Sulastri as mother of Reynaldy (already in DB)
  const reynaldy = await findOne('Reynaldy Nurcahyo Riko Susilo');
  if (reynaldy) {
    await addParent(sulastri.id, reynaldy.id);
    console.log('  ✓ Sulastri → Reynaldy');
  }

  // 4. Create Filza (not in DB)
  console.log('\n=== Create Filza ===');
  let filza = await findOne('Filza Nuraida Ramadhani Susilo');
  if (filza) {
    console.log(`  Already exists: ${filza.id}`);
  } else {
    const { data, error } = await db.from('family_members').insert({
      full_name: 'Filza Nuraida Ramadhani Susilo', nickname: 'Filza',
      gender: 'P', birth_date: '2005-10-14', birth_place: 'Batam', generation: 2,
    }).select('id').single();
    if (error) { console.log(`  ERROR: ${error.message}`); return; }
    filza = data;
    console.log(`  ✓ Created Filza: ${filza.id}`);
  }
  if (joko) { await addParent(joko.id, filza.id); console.log('  ✓ Joko → Filza'); }
  await addParent(sulastri.id, filza.id);
  console.log('  ✓ Sulastri → Filza');

  // 5. Create Ayu (not in DB)
  console.log('\n=== Create Ayu ===');
  let ayu = await findOne('Ayu Safira Susilo');
  if (ayu) {
    console.log(`  Already exists: ${ayu.id}`);
  } else {
    const { data, error } = await db.from('family_members').insert({
      full_name: 'Ayu Safira Susilo', nickname: 'Ayu',
      gender: 'P', birth_date: '2011-12-23', birth_place: 'Palembang', generation: 2,
    }).select('id').single();
    if (error) { console.log(`  ERROR: ${error.message}`); return; }
    ayu = data;
    console.log(`  ✓ Created Ayu: ${ayu.id}`);
  }
  if (joko) { await addParent(joko.id, ayu.id); console.log('  ✓ Joko → Ayu'); }
  await addParent(sulastri.id, ayu.id);
  console.log('  ✓ Sulastri → Ayu');

  console.log('\n✅ Done.');
}

main().catch(err => { console.error(err); process.exit(1); });
