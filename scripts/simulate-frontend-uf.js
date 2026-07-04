// Exact replication of the frontend couple-based Union-Find
const fs = require('fs');
for (const line of fs.readFileSync(require('path').join(__dirname, '../.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const [{ data: members }, { data: allRels }] = await Promise.all([
    db.from('family_members').select('id,full_name,generation,nickname'),
    db.from('relationships').select('*'),
  ]);

  console.log(`Fetched ${members.length} members, ${allRels.length} relationships`);

  const spouseRels = allRels.filter(r => r.type === 'spouse');
  const allPCRels = allRels.filter(r => r.type === 'parent_child');
  console.log(`Spouse rels: ${spouseRels.length}, Parent-child rels: ${allPCRels.length}`);

  // Build couples (same as frontend)
  const assigned = new Set();
  const couples = [];
  const memberCoupleIndex = new Map();

  for (const rel of spouseRels) {
    if (assigned.has(rel.person1_id) || assigned.has(rel.person2_id)) continue;
    const idx = couples.length;
    couples.push({ ids: [rel.person1_id, rel.person2_id], rel });
    memberCoupleIndex.set(rel.person1_id, idx);
    memberCoupleIndex.set(rel.person2_id, idx);
    assigned.add(rel.person1_id);
    assigned.add(rel.person2_id);
  }
  for (const m of members) {
    if (!assigned.has(m.id)) {
      const idx = couples.length;
      couples.push({ ids: [m.id] });
      memberCoupleIndex.set(m.id, idx);
    }
  }
  console.log(`Total couples: ${couples.length}`);

  // Union-Find on couples using parent-child rels
  const ufParent = couples.map((_, i) => i);
  function ufFind(x) {
    if (ufParent[x] !== x) ufParent[x] = ufFind(ufParent[x]);
    return ufParent[x];
  }

  const byId = new Map(members.map(m => [m.id, m]));
  const name = id => { const m = byId.get(id); return m ? `${m.full_name}${m.nickname?' "'+m.nickname+'"':''}` : `???:${id.slice(0,8)}`; };

  for (const rel of allPCRels) {
    const pIdx = memberCoupleIndex.get(rel.person1_id);
    const cIdx = memberCoupleIndex.get(rel.person2_id);
    if (pIdx === undefined) { console.log(`  WARN: parent ${name(rel.person1_id)} not in any couple`); continue; }
    if (cIdx === undefined) { console.log(`  WARN: child ${name(rel.person2_id)} not in any couple`); continue; }
    if (ufFind(pIdx) !== ufFind(cIdx)) ufParent[ufFind(pIdx)] = ufFind(cIdx);
  }

  const componentMap = new Map();
  for (let i = 0; i < couples.length; i++) {
    const root = ufFind(i);
    if (!componentMap.has(root)) componentMap.set(root, []);
    componentMap.get(root).push(i);
  }
  const components = [...componentMap.values()].sort((a,b) => b.length - a.length);
  console.log(`\nTotal components: ${components.length}`);

  // Check specific members
  const WATCH = ['Hartono','Hartini','Eny Widiastuti','Imam Sudjono','Purwakaning Purnomo Agung','Sastro Redjono','Dwi Ary Suryobawono'];
  const watchIds = members.filter(m => WATCH.includes(m.full_name)).map(m => m.id);

  components.forEach((comp, i) => {
    const memberNames = comp.flatMap(ci => couples[ci].ids.map(id => name(id)));
    const watched = memberNames.filter(n => WATCH.some(w => n.startsWith(w)));
    if (watched.length || i < 3) {
      const gens = [...new Set(comp.flatMap(ci => couples[ci].ids.map(id => byId.get(id)?.generation)))].filter(Boolean).sort();
      console.log(`\nComponent ${i+1} (${comp.length} couples, gens ${gens.join(',')})`);
      if (watched.length) console.log(`  Watched: ${watched.join(', ')}`);
      if (comp.length <= 5) comp.forEach(ci => console.log(`  Couple: ${couples[ci].ids.map(id=>name(id)).join(' + ')}`));
    }
  });

  // Specifically check the Hartono→Eny chain
  console.log('\n=== Chain check: Hartono(07) → Eny ===');
  const hartono07 = members.find(m => m.full_name === 'Hartono' && m.nickname === 'Yangkung Hartono');
  const eny = members.find(m => m.full_name === 'Eny Widiastuti');
  if (hartono07 && eny) {
    const h07CoupleIdx = memberCoupleIndex.get(hartono07.id);
    const enyCoupleIdx = memberCoupleIndex.get(eny.id);
    console.log(`  Hartono07 in couple ${h07CoupleIdx}: ${couples[h07CoupleIdx]?.ids.map(id=>name(id)).join(' + ')}`);
    console.log(`  Eny in couple ${enyCoupleIdx}: ${couples[enyCoupleIdx]?.ids.map(id=>name(id)).join(' + ')}`);
    const edge = allPCRels.find(r => r.person1_id === hartono07.id && r.person2_id === eny.id);
    console.log(`  Relationship exists: ${!!edge}`);
    if (h07CoupleIdx !== undefined && enyCoupleIdx !== undefined) {
      console.log(`  Same component: ${ufFind(h07CoupleIdx) === ufFind(enyCoupleIdx)}`);
    }
  }
}

main().catch(err => { console.error(err); process.exit(1); });
