'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import Link from 'next/link';
import { GitBranch, Search, ArrowRight, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { findRelationshipPath } from '@/actions/relationships';
import type { FamilyMember } from '@/types';
import type { RelationshipPathStep } from '@/actions/relationships';

function inferKinship(steps: RelationshipPathStep[], gender: string | null): string | null {
  if (!steps.length) return null;

  type Dir = 'up' | 'down' | 'spouse';
  const dirs: Dir[] = steps.map((s) => {
    if (s.label === 'Pasangan dari') return 'spouse';
    if (s.label === 'Ayah dari' || s.label === 'Ibu dari') return 'down';
    return 'up';
  });

  const hasSpouse = dirs.includes('spouse');
  const ups = dirs.filter((d) => d === 'up').length;
  const downs = dirs.filter((d) => d === 'down').length;
  const isMale = gender === 'L';
  const isFemale = gender === 'P';

  if (!hasSpouse) {
    if (ups === 0) {
      if (downs === 1) return isMale ? 'anak laki-laki' : isFemale ? 'anak perempuan' : 'anak';
      if (downs === 2) return isMale ? 'cucu laki-laki' : isFemale ? 'cucu perempuan' : 'cucu';
      if (downs === 3) return 'cicit';
      if (downs >= 4) return `keturunan generasi ke-${downs}`;
    }
    if (downs === 0) {
      if (ups === 1) return isMale ? 'ayah' : isFemale ? 'ibu' : 'orang tua';
      if (ups === 2) return isMale ? 'kakek' : isFemale ? 'nenek' : 'kakek/nenek';
      if (ups === 3) return isMale ? 'buyut laki-laki' : isFemale ? 'buyut perempuan' : 'buyut';
      if (ups >= 4) return `leluhur ${ups} generasi ke atas`;
    }
    if (ups === 1 && downs === 1) return isMale ? 'saudara laki-laki' : isFemale ? 'saudara perempuan' : 'saudara';
    if (ups === 1 && downs === 2) return isMale ? 'keponakan laki-laki' : isFemale ? 'keponakan perempuan' : 'keponakan';
    if (ups === 2 && downs === 1) return isMale ? 'paman/om' : isFemale ? 'bibi/tante' : 'paman/bibi';
    if (ups === 3 && downs === 1) return isMale ? 'pakde' : isFemale ? 'bude' : 'pakde/bude';
    if (ups === 1 && downs === 3) return isMale ? 'cucu keponakan laki-laki' : isFemale ? 'cucu keponakan perempuan' : 'cucu keponakan';
    if (ups === 2 && downs === 2) return 'sepupu';
    if (ups === 2 && downs === 3) return 'keponakan jauh';
    if (ups === 3 && downs === 2) return 'sepupu jauh';
    if (ups === 3 && downs === 3) return 'sepupu jauh';
  }

  // Spouse + path = ipar/mertua/menantu
  if (hasSpouse) {
    const spouseIdx = dirs.indexOf('spouse');
    const upsAfter = dirs.slice(spouseIdx + 1).filter((d) => d === 'up').length;
    const downsAfter = dirs.slice(spouseIdx + 1).filter((d) => d === 'down').length;
    const upsBefore = dirs.slice(0, spouseIdx).filter((d) => d === 'up').length;
    const downsBefore = dirs.slice(0, spouseIdx).filter((d) => d === 'down').length;

    if (upsBefore === 0 && downsBefore === 0) {
      // current → spouse → ...
      if (upsAfter === 1 && downsAfter === 0) return isMale ? 'mertua laki-laki' : isFemale ? 'mertua perempuan' : 'mertua';
      if (upsAfter === 0 && downsAfter === 1) return isMale ? 'ipar laki-laki' : isFemale ? 'ipar perempuan' : 'ipar';
      if (upsAfter === 0 && downsAfter === 0) return isMale ? 'suami' : isFemale ? 'istri' : 'pasangan';
    }
    if (upsBefore === 1 && downsBefore === 0 && upsAfter === 0 && downsAfter === 1) {
      // current → parent → spouse → sibling-in-law (not standard but handle)
      return isMale ? 'ipar laki-laki' : isFemale ? 'ipar perempuan' : 'ipar';
    }
    if (downsBefore === 1 && upsBefore === 0 && upsAfter === 0 && downsAfter === 0) {
      return isMale ? 'menantu laki-laki' : isFemale ? 'menantu perempuan' : 'menantu';
    }
  }

  return null;
}

export function RelationshipPathFinder({
  currentMemberId,
  currentMemberName,
  members,
}: {
  currentMemberId: string;
  currentMemberName: string;
  members: FamilyMember[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const [path, setPath] = useState<RelationshipPathStep[] | null | undefined>(undefined);
  const [isPending, startTransition] = useTransition();
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const others = members.filter(
    (m) =>
      m.id !== currentMemberId &&
      (!search || m.full_name.toLowerCase().includes(search.toLowerCase()) ||
        m.nickname?.toLowerCase().includes(search.toLowerCase()))
  );

  const selectedMember = members.find((m) => m.id === selectedId);

  function handleSearch() {
    if (!selectedId) return;
    startTransition(async () => {
      const result = await findRelationshipPath(currentMemberId, selectedId);
      setPath(result);
    });
  }

  function reset() {
    setSelectedId('');
    setSearch('');
    setPath(undefined);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-emerald-800 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center shrink-0">
            <GitBranch className="w-3.5 h-3.5 text-white" />
          </div>
          Cari Hubungan Keluarga
        </h3>
        {(selectedId || path !== undefined) && (
          <button onClick={reset} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
            Reset
          </button>
        )}
      </div>
      <p className="text-xs text-emerald-700/70">Pilih anggota lain untuk mengetahui hubungan mereka dengan <span className="font-semibold">{currentMemberName}</span></p>

      {/* Member picker */}
      <div ref={comboRef} className="relative">
        <button
          type="button"
          onClick={() => setComboOpen((v) => !v)}
          className="w-full flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-sm text-left outline-none focus-visible:border-emerald-400"
        >
          <span className={selectedMember ? 'text-foreground' : 'text-muted-foreground'}>
            {selectedMember ? selectedMember.full_name : 'Pilih anggota keluarga'}
          </span>
          <svg className="w-4 h-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
        </button>

        {comboOpen && (
          <div className="absolute z-50 mt-1 w-full rounded-lg border border-stone-200 bg-white shadow-lg">
            <div className="p-2 border-b border-stone-100">
              <input
                autoFocus
                placeholder="Cari nama..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm outline-none focus:border-emerald-400"
              />
            </div>
            <ul className="max-h-48 overflow-y-auto py-1">
              {others.map((m) => (
                <li
                  key={m.id}
                  onClick={() => { setSelectedId(m.id); setComboOpen(false); setSearch(''); setPath(undefined); }}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-emerald-50 ${selectedId === m.id ? 'bg-emerald-50 font-medium text-emerald-700' : ''}`}
                >
                  {m.full_name}{m.nickname ? ` (${m.nickname})` : ''}
                </li>
              ))}
              {others.length === 0 && (
                <li className="px-3 py-2 text-sm text-muted-foreground italic">Tidak ditemukan</li>
              )}
            </ul>
          </div>
        )}
      </div>

      <Button
        onClick={handleSearch}
        disabled={!selectedId || isPending}
        size="sm"
        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
      >
        {isPending ? (
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Mencari...
          </span>
        ) : (
          <><Search className="w-3.5 h-3.5 mr-1.5" />Cari Hubungan</>
        )}
      </Button>

      {/* Result */}
      {path !== undefined && (
        <div className="pt-1">
          {path === null ? (
            <div className="flex items-center gap-2 text-sm text-stone-400">
              <Unlink className="w-4 h-4" />
              Tidak ditemukan hubungan antara keduanya.
            </div>
          ) : path.length === 0 ? (
            <p className="text-sm text-emerald-700 font-medium">Orang yang sama.</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const kinship = inferKinship(path, selectedMember?.gender ?? null);
                return kinship ? (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-900">
                    <span className="font-semibold">{selectedMember?.full_name}</span>
                    {' '}adalah{' '}
                    <span className="font-semibold text-emerald-700">{kinship}</span>
                    {' '}dari{' '}
                    <span className="font-semibold">{currentMemberName}</span>.
                  </div>
                ) : null;
              })()}
              <ol className="space-y-2">
                {path.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-stone-700">
                    <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-stone-400 shrink-0" />
                    <span>
                      <Link href={`/members/${step.fromId}`} className="font-semibold hover:underline">
                        {step.fromName}
                      </Link>
                      {' '}
                      <span className="text-stone-500">{step.label}</span>
                      {' '}
                      <Link href={`/members/${step.toId}`} className="font-semibold hover:underline">
                        {step.toName}
                      </Link>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
