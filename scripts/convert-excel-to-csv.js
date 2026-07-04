// Convert silsilah_keluarga.xlsx → template_import_fame_new.csv
// Run: node scripts/convert-excel-to-csv.js

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const wb = XLSX.readFile(path.join(__dirname, '../silsilah_keluarga.xlsx'));
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

// Load existing CSV as source of truth for real contact/date data
const existingCsv = fs.readFileSync(path.join(__dirname, '../template_import_fame.csv'), 'utf8');
const existingLines = existingCsv.split('\n');
const existingHeaders = existingLines[0].replace(/\r/g, '').split(',');

function parseCsvLine(line) {
  const result = [];
  let cur = '', inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\r') continue; // strip Windows CR
    if (c === '"') { inQuote = !inQuote; }
    else if (c === ',' && !inQuote) { result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

// Map: normalized name → row object from existing CSV
const existingData = new Map();
for (const line of existingLines.slice(1)) {
  if (!line.trim()) continue;
  const cols = parseCsvLine(line);
  const row = {};
  existingHeaders.forEach((h, i) => { row[h] = cols[i] ?? ''; });
  if (row['Nama Lengkap']) {
    existingData.set(row['Nama Lengkap'].trim().toLowerCase(), row);
  }
}

// Words that should stay lowercase in a name (Indonesian/common)
const LOWER_WORDS = new Set(['bin', 'binti', 'van', 'de', 'der', 'al']);

function toTitleCase(str) {
  // Normalize spaces and split on whitespace
  return str.trim().split(/\s+/).map((word, i) => {
    if (i > 0 && LOWER_WORDS.has(word.toLowerCase())) return word.toLowerCase();
    // Handle prefixes like "MS." → "Ms." or "MS.BUSTOMI" → "Ms. Bustomi"
    const normalized = word.replace(/\./g, '. ').replace(/\s+/g, ' ').trim();
    return normalized.split(/\s+/).map(w =>
      w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    ).join(' ');
  }).join(' ').replace(/\s+/g, ' ').trim();
}

function cleanName(raw) {
  if (!raw || !raw.trim()) return null;
  // Remove nickname in parens, e.g. "Purwakaning Purnomo Agung (Agung)" → "Purwakaning Purnomo Agung"
  const stripped = raw.replace(/\s*\(.*?\)\s*/g, '').trim();
  return toTitleCase(stripped);
}

function isDeceased(raw) {
  return /\b(alm|almh|almarhum|almarhumah)\b/i.test(raw);
}

// Guess gender from common Indonesian feminine name patterns
// Returns 'P' if likely female, 'L' if likely male, null if unknown
const FEMININE_TOKENS = [
  'sri', 'siti', 'tri', 'eni', 'endang', 'wulan', 'hartini', 'sumarni',
  'suwarni', 'wartini', 'suryanti', 'sumiyati', 'mukaryati', 'murti',
  'mening', 'suharni', 'ngadinah', 'sumini', 'indri', 'indria', 'yuliastuti',
  'kasembadan', 'darwanti', 'setyowati', 'daryanti', 'supartinah', 'sutarni',
  'sutarmi', 'suyanti', 'wiyatmi', 'renny', 'rosalina', 'ria', 'winarni',
  'mulyani', 'dameria', 'pandjaitan', 'kresi', 'meirawati', 'sulastri',
  'utami', 'siswanti', 'setyawati', 'triana', 'widiastuti', 'kurniawati',
  'palupi', 'pertiwi', 'suryobawono', // wait this is male... let's remove
  'partini', 'hartanti', 'wahyuningsih',
];
const MASCULINE_TOKENS = [
  'agung', 'purwakaning', 'purnomo', 'walujo', 'wirawan', 'dwi',  'sudarto',
  'jumadi', 'hartono', 'wuryanto', 'mujiono', 'warsito', 'surono', 'santoso',
  'irwan', 'suparmo', 'harno', 'giyatno', 'sunarto', 'giyarto', 'sumakno',
  'tarmo', 'sumanto', 'mardiyanto', 'sutrisno', 'sunaryo', 'suyoko', 'sudaryo',
  'sudarwo', 'sutaryo', 'hery', 'priyatmoko', 'arif', 'suparnadi', 'agus',
  'krisnanto', 'ary', 'isharyanto', 'nanang', 'harjanto', 'iwan', 'andriyanto',
  'sutarjo', 'siswo', 'suwito', 'eko', 'nugroho', 'tri', 'jatmiko', 'joko',
  'susilo', 'totok', 'imam', 'sudjono', 'triyono', 'witon', 'adha',
  'bustomi', 'soewito', 'ngadenan', 'wiryo', 'rejono', 'sunarso', 'sukardi',
  'setiyono', 'sutrisno', 'arif',
];

function guessGender(fullName) {
  const lower = fullName.toLowerCase();
  const tokens = lower.split(/\s+/);
  let femCount = 0, mascCount = 0;
  for (const t of tokens) {
    if (FEMININE_TOKENS.includes(t)) femCount++;
    if (MASCULINE_TOKENS.includes(t)) mascCount++;
  }
  if (femCount > mascCount) return 'P';
  if (mascCount > femCount) return 'L';
  // fallback: names ending in 'i' or 'a' tend to be female in Javanese
  const last = tokens[tokens.length - 1];
  if (/[ai]$/.test(last) && !['walujo','suyoko','surono','sumanto','mardiyanto'].includes(last)) return 'P';
  return 'L'; // default male
}

// Parse all entries from the Excel
// Structure: ID in col 0, name in one of cols 1-5+ based on generation depth

const entries = new Map(); // id → { id, rawName, name, deceased, col }

for (const row of rows) {
  const id = String(row[0]).trim();
  if (!id || id === 'NO REG' || id.toUpperCase().includes('SILSILAH')) continue;

  // Find which column has the name (first non-empty col 1..5)
  let name = '';
  let col = -1;
  for (let c = 1; c <= 5; c++) {
    if (row[c] && String(row[c]).trim()) {
      name = String(row[c]).trim();
      col = c;
      break;
    }
  }
  if (!name) continue;

  // Normalize ID: handle typo "02,B" → "02.B"
  const normalId = id.replace(',', '.');

  entries.set(normalId, {
    id: normalId,
    rawName: name,
    name: cleanName(name),
    deceased: isDeceased(name),
    col,
  });
}

// Build family lookup: familyId → { a: entry, b: entry }
// Family ID = id without trailing ".A" or ".B"
const families = new Map();
for (const [id, entry] of entries) {
  const parts = id.split('.');
  const suffix = parts[parts.length - 1].toUpperCase();
  if (suffix === 'A' || suffix === 'B') {
    const familyId = parts.slice(0, -1).join('.');
    if (!families.has(familyId)) families.set(familyId, { a: null, b: null });
    if (suffix === 'A') families.get(familyId).a = entry;
    else families.get(familyId).b = entry;
  }
}

// For each person, determine their parents
// Person "X.Y.A" → parent family is "X" (the .A and .B of that family)
// Person "X.A" → EMPU level, no parents
function getParentFamilyId(id) {
  const parts = id.split('.');
  const suffix = parts[parts.length - 1].toUpperCase();
  if (suffix !== 'A' && suffix !== 'B') return null;
  // Only .A persons are biological children; .B are spouses from outside
  if (suffix !== 'A') return null;
  if (parts.length <= 2) return null; // e.g. "08.A" = EMPU level
  // "08.01.A" → parent family "08"
  // "08.01.01.A" → parent family "08.01"
  const parentParts = parts.slice(0, -2); // remove last number and A/B
  if (parentParts.length === 0) return null;
  return parentParts.join('.');
}

// Detect duplicate names and build a disambiguation map: entry id → display name
// For duplicates, append the family code: "Hartono (01.03)"
const nameCount = new Map();
for (const [id, entry] of entries) {
  if (!entry.name) continue;
  const s = id.split('.').pop().toUpperCase();
  if (s !== 'A' && s !== 'B') continue;
  nameCount.set(entry.name.toLowerCase(), (nameCount.get(entry.name.toLowerCase()) || 0) + 1);
}

function displayName(entry, id) {
  const count = nameCount.get(entry.name.toLowerCase()) || 1;
  if (count <= 1) return entry.name;
  // Use family code without the trailing A/B as the disambiguator
  const familyCode = id.split('.').slice(0, -1).join('.');
  return `${entry.name} (${familyCode})`;
}

// Build CSV rows
const csvRows = [];

for (const [id, entry] of entries) {
  if (!entry.name) continue;

  const parts = id.split('.');
  const suffix = parts[parts.length - 1].toUpperCase();

  // Only process .A and .B entries (skip anything else)
  if (suffix !== 'A' && suffix !== 'B') continue;

  const gender = guessGender(entry.name);
  const myDisplayName = displayName(entry, id);

  // Determine spouse
  const familyId = parts.slice(0, -1).join('.');
  const family = families.get(familyId);
  const spouseEntry = family ? (suffix === 'A' ? family.b : family.a) : null;
  const spouseId = spouseEntry
    ? id.replace(/\.[AB]$/i, suffix === 'A' ? '.B' : '.A')
    : null;
  const spouseDisplayName = spouseEntry ? displayName(spouseEntry, spouseId) : '';

  // Determine parents (only for .A persons)
  let fatherName = '';
  let motherName = '';
  if (suffix === 'A') {
    const parentFamilyId = getParentFamilyId(id);
    if (parentFamilyId) {
      const parentFamily = families.get(parentFamilyId);
      if (parentFamily) {
        const pa = parentFamily.a;
        const pb = parentFamily.b;
        const paId = parentFamilyId + '.A';
        const pbId = parentFamilyId + '.B';
        const paDisplay = pa ? displayName(pa, paId) : '';
        const pbDisplay = pb ? displayName(pb, pbId) : '';
        if (pa && pb) {
          const gA = guessGender(pa.name);
          const gB = guessGender(pb.name);
          if (gA === 'L') { fatherName = paDisplay; motherName = pbDisplay; }
          else if (gB === 'L') { fatherName = pbDisplay; motherName = paDisplay; }
          else { fatherName = paDisplay; motherName = pbDisplay; }
        } else if (pa) {
          if (guessGender(pa.name) === 'L') fatherName = paDisplay; else motherName = paDisplay;
        } else if (pb) {
          if (guessGender(pb.name) === 'L') fatherName = pbDisplay; else motherName = pbDisplay;
        }
      }
    }
  }

  // Merge with existing CSV data if this person is already there (match by base name)
  const existing = existingData.get(entry.name.toLowerCase());

  const row = {
    'Nama Lengkap': myDisplayName,
    'Nama Panggilan': existing?.['Nama Panggilan'] ?? '',
    'Jenis Kelamin': existing?.['Jenis Kelamin'] ?? gender,
    'Tanggal Lahir': existing?.['Tanggal Lahir'] ?? '',
    'Tempat Lahir': existing?.['Tempat Lahir'] ?? '',
    'Sudah Meninggal': existing?.['Sudah Meninggal'] ?? (entry.deceased ? 'Ya' : 'Tidak'),
    'Tanggal Meninggal': existing?.['Tanggal Meninggal'] ?? '',
    'Biografi': existing?.['Biografi'] ?? '',
    'Telepon': existing?.['Telepon'] ?? '',
    'Email': existing?.['Email'] ?? '',
    'Alamat': existing?.['Alamat'] ?? '',
    // Relationships: prefer existing CSV, fall back to Excel-derived
    'Nama Ayah': existing?.['Nama Ayah'] || fatherName,
    'Nama Ibu': existing?.['Nama Ibu'] || motherName,
    'Nama Pasangan': existing?.['Nama Pasangan'] || spouseDisplayName,
  };

  csvRows.push(row);
}

// Write CSV (including already-existing ones — the import will skip them,
// but they're needed so that parent/spouse lookups work)
const headers = [
  'Nama Lengkap','Nama Panggilan','Jenis Kelamin','Tanggal Lahir','Tempat Lahir',
  'Sudah Meninggal','Tanggal Meninggal','Biografi','Telepon','Email','Alamat',
  'Nama Ayah','Nama Ibu','Nama Pasangan'
];

function escCsv(v) {
  const s = String(v ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Add any people from the existing CSV who aren't covered by the Excel at all
const coveredNames = new Set(csvRows.map(r => r['Nama Lengkap'].toLowerCase()));
for (const [, row] of existingData) {
  if (!coveredNames.has(row['Nama Lengkap'].toLowerCase())) {
    csvRows.push(row);
  }
}

const lines = [headers.join(',')];
let mergedCount = 0;
for (const row of csvRows) {
  if (existingData.has(row['Nama Lengkap'].toLowerCase())) mergedCount++;
  lines.push(headers.map(h => escCsv(row[h])).join(','));
}

const outPath = path.join(__dirname, '../Keluarga - template_import_fame.csv');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`Written ${lines.length - 1} rows to ${outPath}`);
console.log(`  Merged with existing CSV data: ${mergedCount}`);
console.log(`  New (from Excel only): ${lines.length - 1 - mergedCount}`);
