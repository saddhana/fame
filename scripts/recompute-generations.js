const fs = require('fs');
for (const line of fs.readFileSync(require('path').join(__dirname, '../.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const [{ data: members }, { data: rels }, { data: spouseRels }] = await Promise.all([
    db.from('family_members').select('id'),
    db.from('relationships').select('person1_id,person2_id').eq('type','parent_child'),
    db.from('relationships').select('person1_id,person2_id').eq('type','spouse'),
  ]);

  const childrenOf = new Map();
  const parentsOf = new Map();
  for (const rel of rels || []) {
    if (!childrenOf.has(rel.person1_id)) childrenOf.set(rel.person1_id, []);
    childrenOf.get(rel.person1_id).push(rel.person2_id);
    if (!parentsOf.has(rel.person2_id)) parentsOf.set(rel.person2_id, []);
    parentsOf.get(rel.person2_id).push(rel.person1_id);
  }

  const roots = members.filter(m => !parentsOf.has(m.id));
  console.log(`Roots (no parents): ${roots.length}`);

  const genMap = new Map();
  const queue = roots.map(m => ({ id: m.id, gen: 1 }));
  while (queue.length) {
    const { id, gen } = queue.shift();
    if (genMap.has(id) && genMap.get(id) >= gen) continue;
    genMap.set(id, gen);
    for (const childId of childrenOf.get(id) || []) queue.push({ id: childId, gen: gen + 1 });
  }
  for (const m of members) if (!genMap.has(m.id)) genMap.set(m.id, 1);

  // Spouses share max generation
  let changed = true;
  while (changed) {
    changed = false;
    for (const rel of spouseRels || []) {
      const g1 = genMap.get(rel.person1_id) ?? 1;
      const g2 = genMap.get(rel.person2_id) ?? 1;
      const max = Math.max(g1, g2);
      if (g1 !== max) { genMap.set(rel.person1_id, max); changed = true; }
      if (g2 !== max) { genMap.set(rel.person2_id, max); changed = true; }
    }
  }

  // Show what's changing
  const { data: current } = await db.from('family_members').select('id,full_name,generation');
  let fixes = 0;
  for (const m of current || []) {
    const newGen = genMap.get(m.id);
    if (newGen && m.generation !== newGen) {
      console.log(`  ${m.full_name}: gen ${m.generation} → ${newGen}`);
      fixes++;
    }
  }
  console.log(`\nTotal changes: ${fixes}`);

  // Batch update
  const updates = Array.from(genMap.entries()).map(([id, generation]) =>
    db.from('family_members').update({ generation }).eq('id', id)
  );
  await Promise.all(updates);
  console.log('✅ Generations recomputed.');
}

main().catch(err => { console.error(err); process.exit(1); });
