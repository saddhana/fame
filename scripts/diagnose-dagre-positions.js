const fs = require('fs');
for (const line of fs.readFileSync(require('path').join(__dirname, '../.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const { createClient } = require('@supabase/supabase-js');
const dagre = require('dagre');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const NODE_WIDTH = 168, NODE_HEIGHT = 88, COUPLE_GAP = 48, GAP = 20;

async function main() {
  const [{ data: members }, { data: allRels }] = await Promise.all([
    db.from('family_members').select('id,full_name,nickname,generation,birth_date'),
    db.from('relationships').select('*'),
  ]);
  const memberBirthDate = new Map(members.map(m => [m.id, m.birth_date ?? '']));
  const memberGeneration = new Map(members.map(m => [m.id, m.generation ?? 99]));
  const shortname = id => { const m = members.find(x=>x.id===id); return m ? (m.nickname||m.full_name.split(' ')[0]) : '???'; };

  const spouseRels = allRels.filter(r => r.type === 'spouse');
  const rawPC = allRels.filter(r => r.type === 'parent_child');
  const byParentId = new Map();
  for (const rel of rawPC) { const arr=byParentId.get(rel.person1_id)??[]; arr.push(rel); byParentId.set(rel.person1_id,arr); }
  for (const arr of byParentId.values()) arr.sort((a,b)=>{const da=memberBirthDate.get(a.person2_id)??'',db2=memberBirthDate.get(b.person2_id)??'';return!da?1:!db2?-1:da.localeCompare(db2);});
  const parentChildRels = Array.from(byParentId.entries()).sort(([a],[b])=>{
    const ga=memberGeneration.get(a)??99,gb=memberGeneration.get(b)??99;
    if(ga!==gb)return ga-gb;
    const da=memberBirthDate.get(a)??'',db2=memberBirthDate.get(b)??'';
    return!da?1:!db2?-1:da.localeCompare(db2);
  }).flatMap(([,rels])=>rels);

  const assigned=new Set(),couples=[],memberCoupleIndex=new Map();
  for (const rel of spouseRels) {
    if(assigned.has(rel.person1_id)||assigned.has(rel.person2_id))continue;
    const idx=couples.length; couples.push({ids:[rel.person1_id,rel.person2_id]});
    memberCoupleIndex.set(rel.person1_id,idx); memberCoupleIndex.set(rel.person2_id,idx);
    assigned.add(rel.person1_id); assigned.add(rel.person2_id);
  }
  for (const m of members) if(!assigned.has(m.id)){const idx=couples.length;couples.push({ids:[m.id]});memberCoupleIndex.set(m.id,idx);}

  const ufParent=couples.map((_,i)=>i);
  function ufFind(x){if(ufParent[x]!==x)ufParent[x]=ufFind(ufParent[x]);return ufParent[x];}
  for (const rel of parentChildRels){const p=memberCoupleIndex.get(rel.person1_id),c=memberCoupleIndex.get(rel.person2_id);if(p!==undefined&&c!==undefined)ufParent[ufFind(p)]=ufFind(c);}
  const compMap=new Map();
  for(let i=0;i<couples.length;i++){const r=ufFind(i);if(!compMap.has(r))compMap.set(r,[]);compMap.get(r).push(i);}
  const mainComp=[...compMap.values()].sort((a,b)=>b.length-a.length)[0];
  const idxSet=new Set(mainComp);

  const g=new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(()=>({}));
  g.setGraph({rankdir:'TB',nodesep:20,ranksep:90,edgesep:10});
  for(const i of mainComp)g.setNode(`c${i}`,{width:couples[i].ids.length===2?NODE_WIDTH*2+COUPLE_GAP:NODE_WIDTH,height:NODE_HEIGHT});

  const coupleParent=new Map(),coupleChildren=new Map();
  for(const rel of parentChildRels){
    const pIdx=memberCoupleIndex.get(rel.person1_id),cIdx=memberCoupleIndex.get(rel.person2_id);
    if(pIdx===undefined||cIdx===undefined||!idxSet.has(pIdx)||!idxSet.has(cIdx)||pIdx===cIdx)continue;
    if(!coupleParent.has(cIdx)){
      coupleParent.set(cIdx,pIdx);
      if(!coupleChildren.has(pIdx))coupleChildren.set(pIdx,[]);
      coupleChildren.get(pIdx).push(cIdx);
      g.setEdge(`c${pIdx}`,`c${cIdx}`);
    }
  }
  dagre.layout(g);

  // Use DESCENDANT's birth date (person2_id in parent-child rel), not married-in spouse's date
  const coupleAnchorBirth=new Map();
  for(const rel of parentChildRels){
    const cIdx=memberCoupleIndex.get(rel.person2_id);
    if(cIdx!==undefined&&!coupleAnchorBirth.has(cIdx)) coupleAnchorBirth.set(cIdx,memberBirthDate.get(rel.person2_id)??'');
  }
  const coupleBirth=idx=>coupleAnchorBirth.get(idx)??'';
  for(const children of coupleChildren.values())children.sort((a,b)=>{const da=coupleBirth(a),db=coupleBirth(b);return!da?1:!db?-1:da.localeCompare(db);});

  const coupleW=idx=>couples[idx].ids.length===2?NODE_WIDTH*2+COUPLE_GAP:NODE_WIDTH;
  let nextLeafX=0;
  const coupleX=new Map();
  function subtreeX(idx){
    const children=coupleChildren.get(idx)??[];
    if(!children.length){coupleX.set(idx,nextLeafX+coupleW(idx)/2);nextLeafX+=coupleW(idx)+GAP;return;}
    for(const c of children)subtreeX(c);
    const lx=coupleX.get(children[0])-coupleW(children[0])/2;
    const rx=coupleX.get(children[children.length-1])+coupleW(children[children.length-1])/2;
    coupleX.set(idx,(lx+rx)/2);
  }

  const coupleGen=idx=>Math.min(...couples[idx].ids.map(id=>memberGeneration.get(id)??99));
  const roots=mainComp.filter(i=>!coupleParent.has(i));
  roots.sort((a,b)=>{const ga=coupleGen(a),gb=coupleGen(b);if(ga!==gb)return ga-gb;const da=coupleBirth(a),db=coupleBirth(b);return!da?1:!db?-1:da.localeCompare(db);});
  for(const root of roots)subtreeX(root);
  for(const i of mainComp)if(!coupleX.has(i)){coupleX.set(i,nextLeafX+coupleW(i)/2);nextLeafX+=coupleW(i)+GAP;}

  // Summary
  const find = name => members.find(m=>m.full_name===name);
  const getX = m => m ? Math.round(coupleX.get(memberCoupleIndex.get(m.id))||0) : null;

  const hartini=find('Hartini'), hartono=find('Hartono');
  console.log('\n=== KEY POSITIONS ===');
  console.log(`Hartono  (Gen2, born 1946): x=${getX(hartono)}`);
  console.log(`Hartini  (Gen2, born 1948): x=${getX(hartini)}`);
  console.log(`Hartono is to the LEFT of Hartini: ${getX(hartono) < getX(hartini) ? '✅ YES' : '❌ NO'}`);

  const hartiniCIdx=memberCoupleIndex.get(hartini.id);
  if(coupleChildren.has(hartiniCIdx)){
    const kids=coupleChildren.get(hartiniCIdx);
    const childXs=kids.map(c=>Math.round(coupleX.get(c)||0));
    const lx=Math.min(...kids.map(c=>coupleX.get(c)-coupleW(c)/2));
    const rx=Math.max(...kids.map(c=>coupleX.get(c)+coupleW(c)/2));
    const expectedX=(lx+rx)/2;
    console.log(`\nHartini (x=${getX(hartini)}) children:`);
    for(const k of kids)console.log(`  ${shortname(couples[k].ids[0])}+${shortname(couples[k].ids[1]??couples[k].ids[0])}: x=${Math.round(coupleX.get(k))}`);
    console.log(`Hartini expected centroid: ${Math.round(expectedX)}, offset: ${Math.round(getX(hartini)-expectedX)}`);
    console.log(Math.abs(getX(hartini)-expectedX)<2?'✅ Perfectly centered above children':'❌ NOT centered');
  }

  // Print Sastro's Gen 2 children in Walker order
  const sastro=find('Sastro Redjono');
  if(sastro){
    const sCIdx=memberCoupleIndex.get(sastro.id);
    if(coupleChildren.has(sCIdx)){
      console.log('\n=== Sastro\'s Gen2 children (left to right) ===');
      for(const k of coupleChildren.get(sCIdx))
        console.log(`  ${shortname(couples[k].ids[0])}+${shortname(couples[k].ids[1]??couples[k].ids[0])} (anchor birth=${coupleBirth(k)||'none'}) x=${Math.round(coupleX.get(k))}`);
    }
  }
}

main().catch(err=>{console.error(err);process.exit(1);});
