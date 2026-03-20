'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CldUploadWidget } from 'next-cloudinary';
import { toast } from 'sonner';
import Image from 'next/image';
import { User, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createMember, updateMember } from '@/actions/members';
import type { FamilyMember } from '@/types';

interface MemberFormProps {
  member?: FamilyMember;
  mode: 'create' | 'edit';
}

interface CloudinaryResult {
  info: {
    secure_url: string;
    public_id: string;
    coordinates?: {
      custom?: number[][];
    };
  };
}

export function MemberForm({ member, mode }: MemberFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [photoUrl, setPhotoUrl] = useState(member?.profile_photo_url || '');
  const [isDeceased, setIsDeceased] = useState(!!member?.death_date);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const data = {
      full_name: formData.get('full_name') as string,
      nickname: (formData.get('nickname') as string) || null,
      birth_date: (formData.get('birth_date') as string) || null,
      death_date: isDeceased ? ((formData.get('death_date') as string) || null) : null,
      gender: (formData.get('gender') as 'L' | 'P') || 'L',
      birth_place: (formData.get('birth_place') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      address: (formData.get('address') as string) || null,
      bio: (formData.get('bio') as string) || null,
      profile_photo_url: photoUrl || null,
    };

    startTransition(async () => {
      try {
        if (mode === 'create') {
          const newMember = await createMember(data);
          toast.success('Anggota berhasil ditambahkan!');
          router.push(`/members/${newMember.id}`);
        } else if (member) {
          await updateMember(member.id, data);
          toast.success('Data anggota berhasil diperbarui!');
          router.push(`/members/${member.id}`);
        }
      } catch (err) {
        toast.error('Gagal menyimpan data. Silakan coba lagi.');
        console.error(err);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Photo Upload */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-linear-to-br from-amber-100 to-orange-50 border-2 border-dashed border-amber-200">
          {photoUrl ? (
            <>
              <Image src={photoUrl} alt="Foto profil" fill className="object-cover" />
              <button
                type="button"
                onClick={() => setPhotoUrl('')}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-12 h-12 text-amber-300/60" />
            </div>
          )}
        </div>

        <CldUploadWidget
          uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
          options={{
            maxFiles: 1,
            resourceType: 'image',
            folder: 'fame/profiles',
            cropping: true,
            croppingAspectRatio: 1,
          }}
          onSuccess={(result) => {
            const res = result as CloudinaryResult;
            const { secure_url, coordinates } = res.info;
            const cropCoords = coordinates?.custom?.[0];
            if (cropCoords) {
              const [x, y, w, h] = cropCoords;
              setPhotoUrl(secure_url.replace('/upload/', `/upload/c_crop,g_north_west,x_${x},y_${y},w_${w},h_${h}/`));
            } else {
              setPhotoUrl(secure_url);
            }
          }}
        >
          {({ open }) => (
            <Button type="button" variant="outline" size="sm" onClick={() => open()} className="border-amber-200 text-amber-700 hover:bg-amber-50">
              <Upload className="w-4 h-4 mr-2" />
              {photoUrl ? 'Ganti Foto' : 'Unggah Foto'}
            </Button>
          )}
        </CldUploadWidget>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="full_name" className="text-amber-800">Nama Lengkap *</Label>
          <Input
            id="full_name"
            name="full_name"
            required
            defaultValue={member?.full_name}
            placeholder="Masukkan nama lengkap"
            className="border-amber-200 focus:border-amber-400 focus:ring-amber-400/20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nickname" className="text-amber-800">Nama Panggilan</Label>
          <Input
            id="nickname"
            name="nickname"
            defaultValue={member?.nickname || ''}
            placeholder="Nama panggilan"
            className="border-amber-200 focus:border-amber-400 focus:ring-amber-400/20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender" className="text-amber-800">Jenis Kelamin *</Label>
          <Select name="gender" defaultValue={member?.gender || 'L'}>
            <SelectTrigger className="border-amber-200 focus:border-amber-400 focus:ring-amber-400/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="L">Laki-laki</SelectItem>
              <SelectItem value="P">Perempuan</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_date" className="text-amber-800">Tanggal Lahir</Label>
          <Input
            id="birth_date"
            name="birth_date"
            type="date"
            defaultValue={member?.birth_date || ''}
            className="border-amber-200 focus:border-amber-400 focus:ring-amber-400/20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="birth_place" className="text-amber-800">Tempat Lahir</Label>
          <Input
            id="birth_place"
            name="birth_place"
            defaultValue={member?.birth_place || ''}
            placeholder="Kota kelahiran"
            className="border-amber-200 focus:border-amber-400 focus:ring-amber-400/20"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDeceased}
              onChange={(e) => setIsDeceased(e.target.checked)}
              className="w-4 h-4 rounded border-amber-300 accent-amber-600"
            />
            <span className="text-sm text-amber-800">Sudah meninggal dunia</span>
          </label>
        </div>

        {isDeceased && (
          <div className="space-y-2">
            <Label htmlFor="death_date" className="text-amber-800">Tanggal Meninggal</Label>
            <Input
              id="death_date"
              name="death_date"
              type="date"
              defaultValue={member?.death_date || ''}
              className="border-amber-200 focus:border-amber-400 focus:ring-amber-400/20"
            />
          </div>
        )}

      </div>

      {/* Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-amber-800">Telepon</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={member?.phone || ''}
            placeholder="08xxxxxxxxxx"
            className="border-amber-200 focus:border-amber-400 focus:ring-amber-400/20"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-amber-800">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={member?.email || ''}
            placeholder="email@contoh.com"
            className="border-amber-200 focus:border-amber-400 focus:ring-amber-400/20"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="address" className="text-amber-800">Alamat</Label>
          <Textarea
            id="address"
            name="address"
            defaultValue={member?.address || ''}
            placeholder="Alamat tempat tinggal"
            className="border-amber-200 focus:border-amber-400 focus:ring-amber-400/20 resize-none"
            rows={2}
          />
        </div>
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio" className="text-amber-800">Biografi Singkat</Label>
        <Textarea
          id="bio"
          name="bio"
          defaultValue={member?.bio || ''}
          placeholder="Ceritakan sesuatu tentang anggota keluarga ini..."
          className="border-amber-200 focus:border-amber-400 focus:ring-amber-400/20 resize-none"
          rows={4}
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="border-amber-200 text-amber-700 hover:bg-amber-50"
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="bg-linear-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md shadow-amber-600/20"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Menyimpan...
            </span>
          ) : mode === 'create' ? 'Tambah Anggota' : 'Simpan Perubahan'}
        </Button>
      </div>
    </form>
  );
}
