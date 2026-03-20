'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CldUploadWidget } from 'next-cloudinary';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon } from 'lucide-react';
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
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [publicId, setPublicId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  function resetForm() {
    setUploadedUrl('');
    setPublicId('');
    setThumbnailUrl('');
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
        });

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
        render={<Button className="bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md shadow-amber-600/20" />}
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
              className="bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white"
            >
              {isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
