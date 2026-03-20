'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, UserPlus, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createRelationship, getSpouses, getParents, getChildren, getSiblings } from '@/actions/relationships';
import { createMember, getMembers } from '@/actions/members';
import type { FamilyMember, RelationshipInput } from '@/types';

interface Suggestion {
  id: string;
  label: string;
  rel: RelationshipInput;
  checked: boolean;
}

interface RelationshipManagerProps {
  memberId: string;
  memberName: string;
  defaultRelType?: 'spouse' | 'parent' | 'child';
}

export function RelationshipManager({ memberId, defaultRelType }: RelationshipManagerProps) {
  const router = useRouter();
  const authed = useAuth();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [search, setSearch] = useState('');
  const [relType, setRelType] = useState(defaultRelType || 'spouse');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<'form' | 'suggestions'>('form');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isSavingSuggestions, setIsSavingSuggestions] = useState(false);
  const [subMode, setSubMode] = useState<'search' | 'quick-create'>('search');
  const [quickName, setQuickName] = useState('');
  const [quickGender, setQuickGender] = useState<'L' | 'P'>('L');
  const [quickBirthDate, setQuickBirthDate] = useState('');
  const [isCreatingMember, startCreatingMember] = useTransition();

  const relTypeLabels: Record<string, string> = {
    spouse: 'Pasangan (suami/istri)',
    parent: 'Orang tua (ayah/ibu)',
    child: 'Anak',
  };

  useEffect(() => {
    if (open) {
      getMembers().then(setMembers).catch(() => {});
    }
  }, [open]);

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      setRelType(defaultRelType || 'spouse');
      setSearch('');
      setSelectedMemberId('');
      setStep('form');
      setSuggestions([]);
      setSubMode('search');
      setQuickName('');
      setQuickGender('L');
      setQuickBirthDate('');
    }
    setOpen(isOpen);
  }

  async function buildSuggestions(type: string, relatedId: string): Promise<Suggestion[]> {
    const suggs: Suggestion[] = [];
    const parentChildRel: Omit<RelationshipInput, 'person1_id' | 'person2_id'> = {
      type: 'parent_child', marriage_date: null, divorce_date: null, is_active: true, marriage_order: null,
    };

    if (type === 'spouse') {
      // memberId ↔ relatedId as spouses
      // Suggest: each spouse's existing children should get the other spouse as parent
      const [myChildren, theirChildren] = await Promise.all([
        getChildren(memberId),
        getChildren(relatedId),
      ]);

      const myName = members.find(m => m.id === memberId)?.full_name ?? 'Anda';
      const theirName = members.find(m => m.id === relatedId)?.full_name ?? 'pasangan';

      // My children → add relatedId as parent
      for (const child of myChildren) {
        const childParents = await getParents(child.id);
        if (!childParents.some(p => p.id === relatedId)) {
          suggs.push({
            id: `cross-parent-mine-${child.id}`,
            label: `Tambahkan ${theirName} sebagai orang tua ${child.full_name}`,
            rel: { ...parentChildRel, person1_id: relatedId, person2_id: child.id },
            checked: true,
          });
        }
      }

      // Their children → add memberId as parent
      for (const child of theirChildren) {
        const childParents = await getParents(child.id);
        if (!childParents.some(p => p.id === memberId)) {
          suggs.push({
            id: `cross-parent-theirs-${child.id}`,
            label: `Tambahkan ${myName} sebagai orang tua ${child.full_name}`,
            rel: { ...parentChildRel, person1_id: memberId, person2_id: child.id },
            checked: true,
          });
        }
      }
    } else if (type === 'child') {
      // memberId = parent, relatedId = child
      // Suggest: parent's spouses → also become parents of the child
      const [spouses, existingParents] = await Promise.all([
        getSpouses(memberId),
        getParents(relatedId),
      ]);
      const existingIds = new Set(existingParents.map(p => p.id));
      const childName = members.find(m => m.id === relatedId)?.full_name ?? 'anak';
      for (const s of spouses) {
        if (!existingIds.has(s.id)) {
          suggs.push({
            id: `spouse-${s.id}`,
            label: `Tambahkan ${s.full_name} sebagai orang tua ${childName}`,
            rel: { ...parentChildRel, person1_id: s.id, person2_id: relatedId },
            checked: true,
          });
        }
      }
    } else if (type === 'parent') {
      // memberId = child (current), relatedId = parent
      // Suggest 1: selected parent's spouses → also become parents of current member
      const [parentSpouses, existingMyParents, mySiblings, parentChildren] = await Promise.all([
        getSpouses(relatedId),
        getParents(memberId),
        getSiblings(memberId),
        getChildren(relatedId),
      ]);
      const existingParentIds = new Set(existingMyParents.map(p => p.id));
      const parentName = members.find(m => m.id === relatedId)?.full_name ?? 'orang tua';

      for (const s of parentSpouses) {
        if (!existingParentIds.has(s.id)) {
          suggs.push({
            id: `co-parent-${s.id}`,
            label: `Tambahkan ${s.full_name} sebagai orang tua Anda juga`,
            rel: { ...parentChildRel, person1_id: s.id, person2_id: memberId },
            checked: true,
          });
        }
      }

      // Suggest 2: current member's siblings → also get the new parent
      const existingChildIds = new Set(parentChildren.map(c => c.id));
      for (const sib of mySiblings) {
        if (!existingChildIds.has(sib.id)) {
          suggs.push({
            id: `sibling-${sib.id}`,
            label: `Tambahkan ${parentName} sebagai orang tua ${sib.full_name} juga`,
            rel: { ...parentChildRel, person1_id: relatedId, person2_id: sib.id },
            checked: true,
          });
        }
      }
    }

    return suggs;
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function enterQuickCreate(name: string) {
    setQuickName(name);
    setQuickGender('L');
    setQuickBirthDate('');
    setComboOpen(false);
    setSearch('');
    setSubMode('quick-create');
  }

  function handleQuickCreate() {
    if (!quickName.trim()) return;
    startCreatingMember(async () => {
      try {
        const newMember = await createMember({
          full_name: quickName.trim(),
          gender: quickGender,
          birth_date: quickBirthDate || null,
          nickname: null,
          birth_place: null,
          death_date: null,
          phone: null,
          email: null,
          address: null,
          bio: null,
          profile_photo_url: null,
          instagram: null,
          facebook: null,
          twitter: null,
          linkedin: null,
        });
        setMembers(prev => [...prev, newMember]);
        setSelectedMemberId(newMember.id);
        setSubMode('search');
        toast.success(`${newMember.full_name} berhasil ditambahkan!`);
      } catch {
        toast.error('Gagal membuat anggota baru');
      }
    });
  }

  const filteredMembers = members
    .filter((m) => m.id !== memberId)
    .filter((m) =>
      !search || m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.nickname?.toLowerCase().includes(search.toLowerCase())
    );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const relatedId = selectedMemberId;
    const marriageDate = formData.get('marriage_date') as string;
    const marriageOrder = formData.get('marriage_order') as string;

    if (!relatedId) {
      toast.error('Pilih anggota keluarga terlebih dahulu');
      return;
    }

    startTransition(async () => {
      try {
        if (relType === 'spouse') {
          await createRelationship({
            person1_id: memberId,
            person2_id: relatedId,
            type: 'spouse',
            marriage_date: marriageDate || null,
            divorce_date: null,
            is_active: true,
            marriage_order: marriageOrder ? parseInt(marriageOrder) : 1,
          });
          toast.success('Pasangan berhasil ditambahkan!');
        } else if (relType === 'parent') {
          await createRelationship({
            person1_id: relatedId,
            person2_id: memberId,
            type: 'parent_child',
            marriage_date: null,
            divorce_date: null,
            is_active: true,
            marriage_order: null,
          });
          toast.success('Orang tua berhasil ditambahkan!');
        } else if (relType === 'child') {
          await createRelationship({
            person1_id: memberId,
            person2_id: relatedId,
            type: 'parent_child',
            marriage_date: null,
            divorce_date: null,
            is_active: true,
            marriage_order: null,
          });
          toast.success('Anak berhasil ditambahkan!');
        }

        const suggs = await buildSuggestions(relType, relatedId);
        if (suggs.length > 0) {
          setSuggestions(suggs);
          setStep('suggestions');
        } else {
          setOpen(false);
          router.refresh();
        }
      } catch (err) {
        toast.error('Gagal menambahkan hubungan');
        console.error(err);
      }
    });
  }

  async function handleSaveSuggestions() {
    const checked = suggestions.filter(s => s.checked);
    setIsSavingSuggestions(true);
    try {
      await Promise.all(checked.map(s => createRelationship(s.rel)));
    } catch {
      toast.error('Beberapa hubungan gagal disimpan');
    } finally {
      setIsSavingSuggestions(false);
      setStep('form');
      setSuggestions([]);
      setRelType(defaultRelType || 'spouse');
      setSearch('');
      setSelectedMemberId('');
      setOpen(false);
      router.refresh();
    }
  }

  const scopedTitles: Record<string, string> = {
    parent: 'Tambah Orang Tua',
    spouse: 'Tambah Pasangan',
    child: 'Tambah Anak',
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50 text-sm py-2 px-3" onClick={(e: React.MouseEvent) => { if (!authed) { e.preventDefault(); router.push('/login?redirect=' + encodeURIComponent(window.location.pathname)); } }} />}
      >
        <Plus className="w-4 h-4 mr-1" />
        Tambah
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-950 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-amber-600" />
            {step === 'suggestions' ? 'Tambahkan Hubungan Lainnya?' : defaultRelType ? scopedTitles[defaultRelType] : 'Tambah Hubungan'}
          </DialogTitle>
        </DialogHeader>

        {step === 'suggestions' ? (
          <div className="mt-2 space-y-4">
            <p className="text-lg text-amber-700/80">
              Centang hubungan yang ingin ditambahkan secara otomatis:
            </p>
            <div className="space-y-3">
              {suggestions.map(s => (
                <label key={s.id} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={s.checked}
                    onChange={() => setSuggestions(prev =>
                      prev.map(p => p.id === s.id ? { ...p, checked: !p.checked } : p)
                    )}
                    className="mt-0.5 w-5 h-5 rounded border-amber-300 accent-amber-600 shrink-0"
                  />
                  <span className="text-lg text-amber-900 group-hover:text-amber-700 leading-snug">{s.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { handleOpenChange(false); router.refresh(); }}
                className="border-amber-200 text-amber-700"
              >
                Lewati
              </Button>
              <Button
                type="button"
                disabled={isSavingSuggestions || suggestions.every(s => !s.checked)}
                onClick={handleSaveSuggestions}
                className="bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
              >
                {isSavingSuggestions ? 'Menyimpan...' : 'Tambahkan'}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {!defaultRelType && (
          <div className="space-y-2">
            <Label className="text-amber-800 text-base">Jenis Hubungan</Label>
            <Select name="type" value={relType} onValueChange={(v) => v && setRelType(v)}>
              <SelectTrigger className="border-amber-200">
                <SelectValue>{relTypeLabels[relType]}</SelectValue>
              </SelectTrigger>
              <SelectContent className="min-w-80">
                <SelectItem value="spouse">Pasangan (suami/istri)</SelectItem>
                <SelectItem value="parent">Orang tua (ayah/ibu)</SelectItem>
                <SelectItem value="child">Anak</SelectItem>
              </SelectContent>
            </Select>
          </div>
          )}

          <div className="space-y-2">
            <Label className="text-amber-800 text-base">Pilih Anggota</Label>
            <input type="hidden" name="related_id" value={selectedMemberId} />
            {subMode === 'quick-create' ? (
              <div className="rounded-lg border border-amber-300 bg-amber-50/50 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5" />
                    Anggota Baru
                  </span>
                  <button
                    type="button"
                    onClick={() => setSubMode('search')}
                    className="text-sm text-amber-600 hover:text-amber-800 transition-colors"
                  >
                    ← Cari lagi
                  </button>
                </div>
                <input
                  autoFocus
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full rounded-md border border-amber-200 bg-white px-3 py-2.5 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickGender('L')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      quickGender === 'L'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    ♂ Laki-laki
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickGender('P')}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      quickGender === 'P'
                        ? 'bg-rose-500 text-white border-rose-500'
                        : 'bg-white text-amber-700 border-amber-200 hover:bg-amber-50'
                    }`}
                  >
                    ♀ Perempuan
                  </button>
                </div>
                <div>
                  <label className="text-xs text-amber-600 mb-1 block">Tanggal Lahir (opsional)</label>
                  <input
                    type="date"
                    value={quickBirthDate}
                    onChange={(e) => setQuickBirthDate(e.target.value)}
                    className="w-full rounded-md border border-amber-200 bg-white px-3 py-2 text-base outline-none focus:border-amber-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleQuickCreate}
                  disabled={!quickName.trim() || isCreatingMember}
                  className="w-full py-2.5 rounded-md bg-linear-to-r from-amber-600 to-orange-600 text-white text-sm font-medium disabled:opacity-50 hover:from-amber-700 hover:to-orange-700 transition-colors"
                >
                  {isCreatingMember ? 'Membuat...' : '✓ Buat & Pilih'}
                </button>
              </div>
            ) : (
              <div ref={comboRef} className="relative">
                <button
                  type="button"
                  onClick={() => setComboOpen((o) => !o)}
                  className="w-full flex items-center justify-between rounded-lg border border-amber-200 bg-transparent px-3 py-3 text-lg sm:text-base text-left outline-none focus-visible:border-amber-400 focus-visible:ring-2 focus-visible:ring-amber-400/20"
                >
                  <span className={selectedMemberId ? 'text-foreground' : 'text-muted-foreground'}>
                    {selectedMemberId
                      ? (() => { const m = members.find(m => m.id === selectedMemberId); return m ? `${m.full_name}${m.nickname ? ` (${m.nickname})` : ''}` : 'Pilih anggota keluarga'; })()
                      : 'Pilih anggota keluarga'}
                  </span>
                  <svg className="w-4 h-4 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6"/></svg>
                </button>

                {comboOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-amber-200 bg-white shadow-lg">
                    <div className="p-2 border-b border-amber-100">
                      <input
                        autoFocus
                        placeholder="Cari nama..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full rounded-md border border-amber-200 bg-amber-50/50 px-3 py-2.5 text-lg sm:text-base outline-none focus:border-amber-400"
                      />
                    </div>
                    <ul className="max-h-56 overflow-y-auto py-1">
                      {filteredMembers.map((m) => (
                        <li
                          key={m.id}
                          onClick={() => { setSelectedMemberId(m.id); setComboOpen(false); setSearch(''); }}
                          className={`px-3 py-3 text-lg sm:text-base cursor-pointer hover:bg-amber-50 flex items-center justify-between ${
                            selectedMemberId === m.id ? 'bg-amber-50 font-medium text-amber-700' : ''
                          }`}
                        >
                          <span>{m.full_name}{m.nickname ? ` (${m.nickname})` : ''}</span>
                        </li>
                      ))}
                      {filteredMembers.length === 0 && !search && (
                        <li className="px-3 py-3 text-base text-muted-foreground">Ketik nama untuk mencari</li>
                      )}
                      {filteredMembers.length === 0 && search && (
                        <li className="px-3 py-2 text-base text-muted-foreground italic">Tidak ada anggota ditemukan</li>
                      )}
                      {search.trim() && (
                        <li
                          onClick={() => enterQuickCreate(search)}
                          className="px-3 py-2.5 text-base cursor-pointer hover:bg-amber-50/80 flex items-center gap-2 text-amber-600 font-medium border-t border-amber-100"
                        >
                          <Plus className="w-4 h-4 shrink-0" />
                          <span>Tambah &ldquo;{search}&rdquo; sebagai anggota baru</span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {relType === 'spouse' && (
            <>
              <div className="space-y-2">
                <Label className="text-amber-800 text-base">Tanggal Pernikahan (opsional)</Label>
                <Input
                  name="marriage_date"
                  type="date"
                  className="border-amber-200"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-amber-800 text-base">Pernikahan ke- (opsional)</Label>
                <Input
                  name="marriage_order"
                  type="number"
                  min="1"
                  placeholder="1"
                  className="border-amber-200"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-amber-200 text-amber-700">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
            >
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
