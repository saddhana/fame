'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CldUploadWidget } from 'next-cloudinary';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, Tag } from 'lucide-react';
import { useAuth } from '@/components/AuthContext';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { createPhoto } from '@/actions/photos';
import type { FamilyMember } from '@/types';

interface CloudinaryResult {
  info: {
    secure_url: string;
    public_id: string;
    thumbnail_url: string;
  };
}

export function PhotoUploadDialog({ members }: { members: FamilyMember[] }) {
  const router = useRouter();
  const authed = useAuth();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [publicId, setPublicId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [taggedMemberIds, setTaggedMemberIds] = useState<string[]>([]);
  const [showTagging, setShowTagging] = useState(false);

  function resetForm() {
    setUploadedUrl('');
    setPublicId('');
    setThumbnailUrl('');
    setTaggedMemberIds([]);
    setShowTagging(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!uploadedUrl) {
      toast.error('Pilih foto terlebih dahulu');
      return;
    }

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await createPhoto({
          cloudinary_public_id: publicId,
          url: uploadedUrl,
          thumbnail_url: thumbnailUrl || null,
          caption: (formData.get('caption') as string) || null,
          photo_type: (formData.get('photo_type') as 'family' | 'personal' | 'event') || 'family',
          event_name: (formData.get('event_name') as string) || null,
          taken_date: (formData.get('taken_date') as string) || null,
          uploader_member_id: (formData.get('uploader_member_id') as string) || null,
        }, taggedMemberIds.length ? taggedMemberIds : undefined);

        toast.success('Foto berhasil diunggah!');
        setOpen(false);
        resetForm();
        router.refresh();
      } catch (err) {
        toast.error('Gagal menyimpan foto');
        console.error(err);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger
        render={<Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20" onClick={(e: React.MouseEvent) => { if (!authed) { e.preventDefault(); router.push('/login?redirect=' + encodeURIComponent(window.location.pathname)); } }} />}
      >
        <Upload className="w-4 h-4 mr-2" />
        Unggah Foto
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-amber-950 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-600" />
            Unggah Foto Baru
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Upload widget */}
          <div className="space-y-2">
            <Label className="text-amber-800">Foto *</Label>
            {uploadedUrl ? (
              <div className="relative rounded-xl overflow-hidden bg-amber-50 border border-amber-200">
                <Image src={uploadedUrl} alt="Preview" width={400} height={160} className="w-full h-40 object-cover" />
                <button
                  type="button"
                  onClick={resetForm}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <CldUploadWidget
                uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
                options={{
                  maxFiles: 1,
                  resourceType: 'image',
                  folder: 'fame/gallery',
                }}
                onSuccess={(result) => {
                  const res = result as CloudinaryResult;
                  setUploadedUrl(res.info.secure_url);
                  setPublicId(res.info.public_id);
                  setThumbnailUrl(res.info.thumbnail_url || '');
                }}
              >
                {({ open }) => (
                  <button
                    type="button"
                    onClick={() => open()}
                    className="w-full h-32 rounded-xl border-2 border-dashed border-amber-200 bg-amber-50/50 hover:bg-amber-50 transition-colors flex flex-col items-center justify-center gap-2 text-amber-500"
                  >
                    <Upload className="w-6 h-6" />
                    <span className="text-sm">Klik untuk pilih foto</span>
                  </button>
                )}
              </CldUploadWidget>
            )}
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

          {/* Caption */}
          <div className="space-y-2">
            <Label className="text-amber-800">Keterangan</Label>
            <Textarea
              name="caption"
              placeholder="Tulis keterangan foto..."
              rows={2}
              className="border-amber-200 resize-none"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label className="text-amber-800">Jenis Foto</Label>
            <Select name="photo_type" defaultValue="family">
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
            <Input name="event_name" placeholder="Mis: Lebaran 2025" className="border-amber-200" />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-amber-800">Tanggal Foto</Label>
            <Input name="taken_date" type="date" className="border-amber-200" />
          </div>

          {/* Uploader */}
          <div className="space-y-2">
            <Label className="text-amber-800">Diunggah oleh</Label>
            <Select name="uploader_member_id">
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }} className="border-amber-200 text-amber-700">
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending || !uploadedUrl}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
