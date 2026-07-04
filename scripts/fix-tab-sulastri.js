// Quick fixes: tab in Raditya's name + find/fix Sulastri
const fs = require('fs');
const envPath = require('path').join(__dirname, '../.env.local');
for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '');
}
const { createClient } = require('@supabase/supabase-js');
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // 1. Fix tab in Raditya's name
  console.log('=== Fix Raditya tab ===');
  const { data: radits } = await db.from('family_members').select('id,full_name,nickname').ilike('full_name', '%Raditya%');
  console.log('  Found:', radits?.map(r => JSON.stringify(r.full_name)));
  const radit = radits?.find(r => r.full_name.includes('\t') || r.full_name.trim() !== r.full_name);
  if (radit) {
    const cleaned = radit.full_name.replace(/\t/g, '').trim();
    const { error } = await db.from('family_members').update({ full_name: cleaned }).eq('id', radit.id);
    console.log(error ? `  ERROR: ${error.message}` : `  ✓ "${radit.full_name}" → "${cleaned}"`);
  } else if (radits?.length) {
    console.log('  No tab found — name looks clean already');
  } else {
    console.log('  Not found');
  }

  // 2. Find Sulastri
  console.log('\n=== Search Sulastri ===');
  const { data: candidates } = await db.from('family_members').select('id,full_name,birth_date,gender').ilike('full_name', '%sulastri%');
  if (candidates?.length) {
    for (const c of candidates) console.log(`  Found: id=${c.id} name="${c.full_name}" birth=${c.birth_date} gender=${c.gender}`);

    // Fix birth date if missing (9/20/1974 = 1974-09-20 — US format, second segment > 12 means day)
    const target = candidates[0];
    if (!target.birth_date) {
      const { error } = await db.from('family_members').update({ birth_date: '1974-09-20' }).eq('id', target.id);
      console.log(error ? `  ERROR: ${error.message}` : `  ✓ birth_date set to 1974-09-20`);
    } else {
      console.log(`  birth_date already set: ${target.birth_date}`);
    }
  } else {
    console.log('  No match for "sulastri" — checking all members for similar names...');
    const { data: all } = await db.from('family_members').select('id,full_name').order('full_name');
    const similar = all?.filter(m => m.full_name.toLowerCase().startsWith('su') && m.full_name.toLowerCase().includes('astri'));
    if (similar?.length) similar.forEach(m => console.log(`  Possible match: "${m.full_name}"`));
    else console.log('  No similar names found either. Member may not be in DB.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
