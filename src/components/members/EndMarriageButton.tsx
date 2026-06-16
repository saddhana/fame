'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { HeartCrack } from 'lucide-react';
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
import { endMarriage } from '@/actions/relationships';

export function EndMarriageButton({
  relationshipId,
  spouseName,
}: {
  relationshipId: string;
  spouseName: string;
}) {
  const router = useRouter();
  const authed = useAuth();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [divorceDate, setDivorceDate] = useState('');

  function handleConfirm() {
    startTransition(async () => {
      try {
        await endMarriage(relationshipId, divorceDate || new Date().toISOString().split('T')[0]);
        toast.success('Status pernikahan diperbarui');
        setOpen(false);
        router.refresh();
      } catch {
        toast.error('Gagal memperbarui status pernikahan');
      }
    });
  }

  if (!authed) return null;

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        title="Tandai sebagai bercerai"
        className="shrink-0 rounded-md p-2 text-amber-300 hover:text-rose-500 hover:bg-rose-50 transition-colors active:scale-90"
      >
        <HeartCrack className="w-4 h-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-950">Akhiri Pernikahan</DialogTitle>
          </DialogHeader>
          <p className="text-base text-amber-800/70 mt-1">
            Tandai pernikahan dengan <span className="font-semibold text-amber-900">{spouseName}</span> sebagai bercerai.
          </p>
          <div className="space-y-2 mt-2">
            <Label className="text-amber-800">Tanggal Cerai (opsional)</Label>
            <Input
              type="date"
              value={divorceDate}
              onChange={(e) => setDivorceDate(e.target.value)}
              className="border-amber-200"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
            <DialogClose
              render={<Button variant="outline" className="border-amber-200 text-amber-700" />}
            >
              Batal
            </DialogClose>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
