const fs = require('fs');
for (const line of fs.readFileSync(require('path').join(__dirname, '../.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const WATCH = ['Hartono','Hartini','Purwakaning Purnomo Agung','Imam Sudjono','Eny Widiastuti','Dewi Kurniawati','Agung Wijayanto','Sastro Redjono','Walujo','Riris Tri Prihatiningtyas Wulandari','Dwi Ary Suryobawono'];

async function main() {
  const { data: members } = await db.from('family_members').select('id,full_name,generation,nickname');
  const { data: rels } = await db.from('relationships').select('type,person1_id,person2_id');

  const byId = new Map(members.map(m => [m.id, m]));
  const name = id => { const m = byId.get(id); return m ? `${m.full_name}${m.nickname ? ' "'+m.nickname+'"' : ''}` : id; };

  // Show all relationships for watched members
  const watched = members.filter(m => WATCH.includes(m.full_name));
  for (const m of watched) {
    const myRels = rels.filter(r => r.person1_id === m.id || r.person2_id === m.id);
    const parents = myRels.filter(r => r.type === 'parent_child' && r.person2_id === m.id).map(r => name(r.person1_id));
    const children = myRels.filter(r => r.type === 'parent_child' && r.person1_id === m.id).map(r => name(r.person2_id));
    const spouses = myRels.filter(r => r.type === 'spouse').map(r => name(r.person1_id === m.id ? r.person2_id : r.person1_id));
    console.log(`\n${m.full_name} (Gen ${m.generation}, id:${m.id.slice(0,8)})`);
    if (parents.length) console.log(`  Parents: ${parents.join(', ')}`);
    if (spouses.length) console.log(`  Spouse:  ${spouses.join(', ')}`);
    if (children.length) console.log(`  Children (${children.length}): ${children.slice(0,5).join(', ')}${children.length>5?'...':''}`);
    if (!parents.length && !spouses.length && !children.length) console.log('  *** NO RELATIONSHIPS ***');
  }

  // Simulate Union-Find to count components
  console.log('\n=== Component simulation ===');
  const uf = new Map(members.map(m => [m.id, m.id]));
  function find(x) { if (uf.get(x) !== x) uf.set(x, find(uf.get(x))); return uf.get(x); }
  function union(a, b) { uf.set(find(a), find(b)); }

  for (const r of rels) { union(r.person1_id, r.person2_id); }

  const compMap = new Map();
  for (const m of members) {
    const root = find(m.id);
    if (!compMap.has(root)) compMap.set(root, []);
    compMap.get(root).push(m);
  }
  const comps = [...compMap.values()].sort((a,b) => b.length - a.length);
  console.log(`Total components: ${comps.length}`);
  comps.slice(0,5).forEach((comp, i) => {
    const gens = [...new Set(comp.map(m => m.generation))].sort();
    console.log(`  Component ${i+1}: ${comp.length} members, gens ${gens.join(',')}`);
    // Show if any watched member is here
    const here = comp.filter(m => WATCH.includes(m.full_name));
    if (here.length) console.log(`    Watched: ${here.map(m=>m.full_name).join(', ')}`);
  });
}

main().catch(err => { console.error(err); process.exit(1); });
