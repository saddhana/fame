"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Download, FileText, CheckCircle, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { importFromCSV, getTemplateRows, type CsvRow, type ImportResult } from "@/actions/csv-import";

const COLUMNS = [
  "Nama Lengkap",
  "Nama Panggilan",
  "Jenis Kelamin",
  "Tanggal Lahir",
  "Tempat Lahir",
  "Sudah Meninggal",
  "Tanggal Meninggal",
  "Biografi",
  "Telepon",
  "Email",
  "Alamat",
  "Nama Ayah",
  "Nama Ibu",
  "Nama Pasangan",
] as const;


function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function generateTemplate(rows: CsvRow[]): string {
  const header = COLUMNS.join(",");
  const dataRows = rows.map((row) =>
    COLUMNS.map((col) => escapeCSV(row[col as keyof CsvRow])).join(",")
  );
  return [header, ...dataRows].join("\r\n");
}

function parseCSV(text: string): CsvRow[] {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse: handle quoted fields
    const values: string[] = [];
    let inQuote = false;
    let current = "";
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"' && !inQuote) {
        inQuote = true;
      } else if (ch === '"' && inQuote) {
        if (line[c + 1] === '"') {
          current += '"';
          c++;
        } else {
          inQuote = false;
        }
      } else if (ch === "," && !inQuote) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row as unknown as CsvRow);
  }
  return rows;
}

type Status = "idle" | "preview" | "importing" | "done";

export function ImportClient() {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CsvRow[] | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleDownloadTemplate() {
    const templateRows = await getTemplateRows();
    const csv = generateTemplate(templateRows);
    const url = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import_fame.csv";
    a.click();
  }

  function handleFile(f: File) {
    setFile(f);
    setError(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) {
          setError("File CSV kosong atau tidak ada data.");
          setStatus("idle");
          return;
        }
        setRows(parsed);
        setStatus("preview");
      } catch {
        setError("Gagal membaca file CSV. Pastikan format file benar.");
        setStatus("idle");
      }
    };
    reader.readAsText(f, "utf-8");
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith(".csv")) {
      handleFile(f);
    } else {
      setError("Harap unggah file berformat .csv");
    }
  }, []);

  async function handleImport() {
    if (!rows) return;
    setStatus("importing");
    setError(null);
    try {
      const res = await importFromCSV(rows);
      setResult(res);
      setStatus("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan saat impor.");
      setStatus("preview");
    }
  }

  function handleReset() {
    setFile(null);
    setRows(null);
    setStatus("idle");
    setResult(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const previewRows = rows?.slice(0, 5) ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-800" style={{ fontFamily: "var(--font-playfair)" }}>
          Import CSV
        </h1>
        <p className="text-stone-500 mt-1 text-sm">
          Tambahkan banyak anggota keluarga sekaligus menggunakan file CSV.
        </p>
      </div>

      {/* Step 1: Download Template */}
      <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
        <h2 className="font-semibold text-stone-700 mb-1">Langkah 1 — Unduh Template</h2>
        <p className="text-stone-500 text-sm mb-4">
          Gunakan template ini sebagai panduan. Isi data keluarga Anda, lalu simpan sebagai CSV.
        </p>
        <button
          onClick={handleDownloadTemplate}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Unduh Template CSV
        </button>
      </div>

      {/* Step 2: Upload */}
      <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
        <h2 className="font-semibold text-stone-700 mb-1">Langkah 2 — Unggah File CSV</h2>
        <p className="text-stone-500 text-sm mb-4">
          Pilih file CSV yang sudah diisi. Format kolom harus sama dengan template.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
            ${dragOver ? "border-emerald-400 bg-emerald-50" : "border-stone-200 hover:border-emerald-300 hover:bg-stone-50"}
          `}
        >
          <FileText className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          {file ? (
            <div>
              <p className="font-medium text-stone-700">{file.name}</p>
              <p className="text-stone-400 text-sm mt-1">{rows?.length ?? 0} baris data ditemukan</p>
            </div>
          ) : (
            <div>
              <p className="text-stone-500 font-medium">Klik atau seret file CSV ke sini</p>
              <p className="text-stone-400 text-sm mt-1">Hanya file .csv yang didukung</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {error && (
          <div className="mt-3 flex items-start gap-2 text-red-600 text-sm bg-red-50 rounded-lg p-3">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Step 3: Preview */}
      {status === "preview" || status === "importing" ? (
        <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-stone-700">Langkah 3 — Pratinjau Data</h2>
              <p className="text-stone-500 text-sm mt-0.5">
                Menampilkan {previewRows.length} dari {rows?.length} baris.
              </p>
            </div>
            <button
              onClick={handleReset}
              className="text-stone-400 hover:text-stone-600 text-sm transition-colors"
            >
              Ganti file
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-stone-100">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="bg-stone-50">
                  {COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-left font-semibold text-stone-500 whitespace-nowrap border-b border-stone-100"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-stone-50/50"}>
                    {COLUMNS.map((col) => (
                      <td
                        key={col}
                        className="px-3 py-2 text-stone-600 border-b border-stone-50 whitespace-nowrap max-w-37.5 truncate"
                        title={row[col as keyof CsvRow]}
                      >
                        {row[col as keyof CsvRow] || (
                          <span className="text-stone-300">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={handleImport}
              disabled={status === "importing"}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status === "importing" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengimpor...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Impor {rows?.length} Anggota
                </>
              )}
            </button>
            {status !== "importing" && (
              <button
                onClick={handleReset}
                className="px-4 py-2.5 rounded-lg border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                Batal
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Result */}
      {status === "done" && result && (
        <div className="bg-white rounded-xl border border-stone-100 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-stone-700">Hasil Import</h2>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-lg px-4 py-2.5">
              <CheckCircle className="w-4 h-4" />
              <span className="font-semibold">{result.created}</span>
              <span className="text-sm">anggota ditambahkan</span>
            </div>
            {(result.updated ?? 0) > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 text-blue-700 rounded-lg px-4 py-2.5">
                <CheckCircle className="w-4 h-4" />
                <span className="font-semibold">{result.updated}</span>
                <span className="text-sm">anggota diperbarui</span>
              </div>
            )}
            {result.skipped.length > 0 && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-lg px-4 py-2.5">
                <AlertCircle className="w-4 h-4" />
                <span className="font-semibold">{result.skipped.length}</span>
                <span className="text-sm">dilewati (sudah ada)</span>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 rounded-lg px-4 py-2.5">
                <XCircle className="w-4 h-4" />
                <span className="font-semibold">{result.errors.length}</span>
                <span className="text-sm">peringatan</span>
              </div>
            )}
          </div>

          {result.skipped.length > 0 && (
            <div>
              <p className="text-sm font-medium text-stone-600 mb-2">Dilewati (nama sudah ada):</p>
              <ul className="text-sm text-stone-500 space-y-1">
                {result.skipped.map((name, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-stone-600 mb-2">Peringatan relasi:</p>
              <ul className="text-sm text-red-500 space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-stone-200 text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors"
          >
            Import lagi
          </button>
        </div>
      )}
    </div>
  );
}
