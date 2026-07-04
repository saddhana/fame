const fs = require('fs');
for (const line of fs.readFileSync(require('path').join(__dirname, '../.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const [{ data: members }, { data: allRels }] = await Promise.all([
    db.from('family_members').select('id,full_name,nickname,generation,birth_date'),
    db.from('relationships').select('*'),
  ]);

  const byId = new Map(members.map(m => [m.id, m]));
  const name = id => { const m = byId.get(id); return m ? `${m.full_name}${m.nickname?' "'+m.nickname+'"':''}` : `???`; };

  const spouseRels = allRels.filter(r => r.type === 'spouse');
  const pcRels = allRels.filter(r => r.type === 'parent_child');

  // Build couples (replicate frontend logic)
  const assigned = new Set();
  const couples = [];
  const memberCoupleIndex = new Map();
  for (const rel of spouseRels) {
    if (assigned.has(rel.person1_id) || assigned.has(rel.person2_id)) continue;
    const idx = couples.length;
    couples.push({ ids: [rel.person1_id, rel.person2_id] });
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

  // Find Hartini
  const hartini = members.find(m => m.full_name === 'Hartini');
  if (!hartini) { console.log('Hartini not found!'); return; }
  console.log(`Hartini: id=${hartini.id.slice(0,8)}, gen=${hartini.generation}`);

  const hartiniCouple = memberCoupleIndex.get(hartini.id);
  console.log(`Hartini couple [${hartiniCouple}]: ${couples[hartiniCouple].ids.map(id => name(id)).join(' + ')}`);

  // Hartini's children
  const hartiniChildren = pcRels.filter(r => r.person1_id === hartini.id).map(r => r.person2_id);
  console.log(`\nHartini's children (${hartiniChildren.length}):`);

  for (const childId of hartiniChildren) {
    const child = byId.get(childId);
    const childCoupleIdx = memberCoupleIndex.get(childId);
    const childCouple = couples[childCoupleIdx];
    console.log(`\n  Child: ${name(childId)} (gen=${child?.generation}, born=${child?.birth_date})`);
    console.log(`  Couple [${childCoupleIdx}]: ${childCouple.ids.map(id => name(id)).join(' + ')}`);

    // Find ALL parents of this couple's members
    for (const memberId of childCouple.ids) {
      const parents = pcRels.filter(r => r.person2_id === memberId);
      const m = byId.get(memberId);
      if (parents.length > 0) {
        console.log(`    ${name(memberId)} (gen=${m?.generation}, born=${m?.birth_date}) has parents:`);
        for (const p of parents) {
          const parentCoupleIdx = memberCoupleIndex.get(p.person1_id);
          const parentCouple = couples[parentCoupleIdx];
          const parentM = byId.get(p.person1_id);
          console.log(`      → ${name(p.person1_id)} (gen=${parentM?.generation}) [couple ${parentCoupleIdx}: ${parentCouple?.ids.map(id=>name(id)).join(' + ')}]`);
        }
      } else {
        console.log(`    ${name(memberId)} (gen=${m?.generation}, born=${m?.birth_date}) — NO PARENTS in DB`);
      }
    }

    // Count how many parent-couple edges will be added to Dagre for this couple
    const parentCoupleSeen = new Set();
    for (const memberId of childCouple.ids) {
      const parents = pcRels.filter(r => r.person2_id === memberId);
      for (const p of parents) {
        const pCIdx = memberCoupleIndex.get(p.person1_id);
        if (pCIdx !== undefined && pCIdx !== childCoupleIdx) parentCoupleSeen.add(pCIdx);
      }
    }
    console.log(`  → Dagre parent edges: ${parentCoupleSeen.size} (${[...parentCoupleSeen].join(', ')})`);
    if (parentCoupleSeen.size > 1) console.log(`  *** CONFLICT: multiple parents pulling this couple! ***`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
