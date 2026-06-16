'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pencil, Tag, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { updatePhoto } from '@/actions/photos';
import type { PhotoWithTags, FamilyMember } from '@/types';

export function EditPhotoDialog({
  photo,
  members,
  open,
  onClose,
}: {
  photo: PhotoWithTags;
  members: FamilyMember[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [taggedMemberIds, setTaggedMemberIds] = useState<string[]>(
    photo.tags?.map((t) => t.member_id) ?? [],
  );
  const [showTagging, setShowTagging] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await updatePhoto(
          photo.id,
          {
            caption: (formData.get('caption') as string) || null,
            photo_type: (formData.get('photo_type') as 'family' | 'personal' | 'event') || photo.photo_type,
            event_name: (formData.get('event_name') as string) || null,
            taken_date: (formData.get('taken_date') as string) || null,
            uploader_member_id: (formData.get('uploader_member_id') as string) || null,
          },
          taggedMemberIds,
        );
        toast.success('Foto berhasil diperbarui!');
        onClose();
        router.refresh();
      } catch {
        toast.error('Gagal menyimpan perubahan');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-950 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-600" />
            Edit Foto
          </DialogTitle>
        </DialogHeader>

        {/* Preview */}
        <div className="rounded-xl overflow-hidden bg-amber-50 border border-amber-200">
          <Image
            src={photo.thumbnail_url || photo.url}
            alt={photo.caption || 'Foto'}
            width={400}
            height={160}
            className="w-full h-36 object-cover"
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Caption */}
          <div className="space-y-2">
            <Label className="text-amber-800">Keterangan</Label>
            <Textarea
              name="caption"
              defaultValue={photo.caption || ''}
              placeholder="Tulis keterangan foto..."
              rows={2}
              className="border-amber-200 resize-none"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-amber-800">Jenis Foto</Label>
            <Select name="photo_type" defaultValue={photo.photo_type}>
              <SelectTrigger className="border-amber-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="family">Keluarga</SelectItem>
                <SelectItem value="personal">Pribadi</SelectItem>
                <SelectItem value="event">Acara</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Event name */}
          <div className="space-y-2">
            <Label className="text-amber-800">Nama Acara (opsional)</Label>
            <Input
              name="event_name"
              defaultValue={photo.event_name || ''}
              placeholder="Mis: Lebaran 2025"
              className="border-amber-200"
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-amber-800">Tanggal Foto</Label>
            <Input
              name="taken_date"
              type="date"
              defaultValue={photo.taken_date || ''}
              className="border-amber-200"
            />
          </div>

          {/* Uploader */}
          <div className="space-y-2">
            <Label className="text-amber-800">Diunggah oleh</Label>
            <Select name="uploader_member_id" defaultValue={photo.uploader_member_id || ''}>
              <SelectTrigger className="border-amber-200">
                <SelectValue placeholder="Pilih anggota (opsional)" />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tag members */}
          {members.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowTagging((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 transition-colors"
              >
                <Tag className="w-3.5 h-3.5" />
                Tandai anggota dalam foto
                {taggedMemberIds.length > 0 && (
                  <span className="ml-1 bg-amber-100 text-amber-700 text-xs font-medium px-1.5 py-0.5 rounded-full">
                    {taggedMemberIds.length}
                  </span>
                )}
              </button>
              {showTagging && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 max-h-40 overflow-y-auto space-y-1.5">
                  {members.map((m) => (
                    <label key={m.id} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={taggedMemberIds.includes(m.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTaggedMemberIds((prev) => [...prev, m.id]);
                          } else {
                            setTaggedMemberIds((prev) => prev.filter((id) => id !== m.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-amber-300 accent-amber-600 shrink-0"
                      />
                      <span className="text-sm text-amber-900 group-hover:text-amber-700 truncate">
                        {m.full_name}{m.nickname ? ` (${m.nickname})` : ''}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-amber-200 text-amber-700"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Menyimpan...
                </span>
              ) : (
                <>
                  <Pencil className="w-3.5 h-3.5 mr-1.5" />
                  Simpan
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
