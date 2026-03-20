'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteRelationship } from '@/actions/relationships';
import { useAuth } from '@/components/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function RemoveRelationshipButton({
  relationshipId,
  label,
}: {
  relationshipId: string;
  label: string;
}) {
  const router = useRouter();
  const authed = useAuth();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    startTransition(async () => {
      try {
        await deleteRelationship(relationshipId);
        toast.success('Hubungan berhasil dihapus');
        setOpen(false);
        router.refresh();
      } catch {
        toast.error('Gagal menghapus hubungan');
      }
    });
  }

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!authed) { router.push('/login?redirect=' + encodeURIComponent(window.location.pathname)); return; } setOpen(true); }}
        title="Hapus hubungan"
        className="ml-auto shrink-0 rounded-md p-2 text-amber-300 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-90"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-amber-950">Hapus Hubungan</DialogTitle>
          </DialogHeader>
          <p className="text-lg text-amber-800/70 mt-1">
            Hapus hubungan dengan <span className="font-semibold text-amber-900">{label}</span>? Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
            <DialogClose
              render={
                <Button variant="outline" className="border-amber-200 text-amber-700" />
              }
            >
              Batal
            </DialogClose>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white text-lg sm:text-base py-5 sm:py-2.5"
            >
              {isPending ? 'Menghapus...' : 'Hapus'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

