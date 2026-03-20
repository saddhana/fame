'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
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
import { createRelationship } from '@/actions/relationships';
import { getMembers } from '@/actions/members';
import type { FamilyMember } from '@/types';

interface RelationshipManagerProps {
  memberId: string;
  memberName: string;
}

export function RelationshipManager({ memberId, memberName }: RelationshipManagerProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (open) {
      getMembers().then(setMembers).catch(() => {});
    }
  }, [open]);

  const filteredMembers = members
    .filter((m) => m.id !== memberId)
    .filter((m) =>
      !search || m.full_name.toLowerCase().includes(search.toLowerCase()) ||
      m.nickname?.toLowerCase().includes(search.toLowerCase())
    );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const relType = formData.get('type') as string;
    const relatedId = formData.get('related_id') as string;
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
          // This member is the child, selected person is the parent
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
          // This member is the parent, selected person is the child
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

        setOpen(false);
        router.refresh();
      } catch (err) {
        toast.error('Gagal menambahkan hubungan');
        console.error(err);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button variant="outline" size="sm" className="border-amber-200 text-amber-700 hover:bg-amber-50" />}
      >
        <Plus className="w-4 h-4 mr-1" />
        Tambah
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-950 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-amber-600" />
            Tambah Hubungan
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label className="text-amber-800">Jenis Hubungan</Label>
            <Select name="type" defaultValue="spouse">
              <SelectTrigger className="border-amber-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spouse">{memberName} adalah pasangan dari...</SelectItem>
                <SelectItem value="parent">{memberName} adalah anak dari...</SelectItem>
                <SelectItem value="child">{memberName} adalah orang tua dari...</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-amber-800">Pilih Anggota</Label>
            <Input
              placeholder="Cari nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-amber-200 mb-2"
            />
            <Select name="related_id">
              <SelectTrigger className="border-amber-200">
                <SelectValue placeholder="Pilih anggota keluarga" />
              </SelectTrigger>
              <SelectContent>
                {filteredMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name} {m.nickname ? `(${m.nickname})` : ''} — Gen {m.generation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-amber-800">Tanggal Pernikahan (opsional)</Label>
            <Input
              name="marriage_date"
              type="date"
              className="border-amber-200"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-amber-800">Pernikahan ke- (opsional)</Label>
            <Input
              name="marriage_order"
              type="number"
              min="1"
              placeholder="1"
              className="border-amber-200"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-amber-200 text-amber-700">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
            >
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
