'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/components/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateSpouseRelationship } from '@/actions/relationships';
import type { Relationship } from '@/types';

export function EditSpouseButton({
  relationship,
  spouseName,
}: {
  relationship: Relationship;
  spouseName: string;
}) {
  const router = useRouter();
  const authed = useAuth();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [marriageDate, setMarriageDate] = useState(relationship.marriage_date ?? '');
  const [divorceDate, setDivorceDate] = useState(relationship.divorce_date ?? '');
  const [isActive, setIsActive] = useState(relationship.is_active);
  const [marriageOrder, setMarriageOrder] = useState(String(relationship.marriage_order ?? 1));

  function handleSave() {
    startTransition(async () => {
      try {
        await updateSpouseRelationship(relationship.id, {
          marriage_date: marriageDate || null,
          divorce_date: !isActive ? (divorceDate || null) : null,
          is_active: isActive,
          marriage_order: marriageOrder ? parseInt(marriageOrder) : 1,
        });
        toast.success('Data pernikahan diperbarui');
        setOpen(false);
        router.refresh();
      } catch {
        toast.error('Gagal memperbarui data pernikahan');
      }
    });
  }

  if (!authed) return null;

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        title="Edit data pernikahan"
        className="shrink-0 rounded-md p-2 text-stone-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors active:scale-90"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-stone-900">Edit Pernikahan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-500 -mt-1">
            Pernikahan dengan <span className="font-semibold text-stone-700">{spouseName}</span>
          </p>

          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label className="text-stone-700">Tanggal Pernikahan (opsional)</Label>
              <Input
                type="date"
                value={marriageDate}
                onChange={(e) => setMarriageDate(e.target.value)}
                className="border-stone-200 focus:border-emerald-400"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-stone-700">Pernikahan ke-</Label>
              <Input
                type="number"
                min={1}
                value={marriageOrder}
                onChange={(e) => setMarriageOrder(e.target.value)}
                className="border-stone-200 focus:border-emerald-400"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={!isActive}
                onChange={(e) => setIsActive(!e.target.checked)}
                className="w-4 h-4 rounded border-stone-300 accent-rose-500"
              />
              <span className="text-stone-700 text-sm">Sudah bercerai</span>
            </label>

            {!isActive && (
              <div className="space-y-2">
                <Label className="text-stone-700">Tanggal Cerai (opsional)</Label>
                <Input
                  type="date"
                  value={divorceDate}
                  onChange={(e) => setDivorceDate(e.target.value)}
                  className="border-stone-200 focus:border-emerald-400"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
            <DialogClose
              render={<Button variant="outline" className="border-stone-200 text-stone-600" />}
            >
              Batal
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
