'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { deleteMember } from '@/actions/members';

export function DeleteMemberButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    await deleteMember(id);
    router.push('/members');
    router.refresh();
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 text-sm"
      >
        <Trash2 className="w-4 h-4 mr-2" />
        Hapus
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus anggota?</DialogTitle>
            <DialogDescription>
              <strong>{name}</strong> akan dihapus beserta semua relasinya. Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={loading}>
              Batal
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Hapus
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
