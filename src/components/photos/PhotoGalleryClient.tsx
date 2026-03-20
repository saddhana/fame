'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Camera, Search, ZoomIn } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { PhotoUploadDialog } from './PhotoUploadDialog';
import { PhotoLightbox } from './PhotoLightbox';
import type { Photo, FamilyMember } from '@/types';

const typeFilters = [
  { value: 'all', label: 'Semua' },
  { value: 'family', label: 'Keluarga' },
  { value: 'personal', label: 'Pribadi' },
  { value: 'event', label: 'Acara' },
];

export function PhotoGalleryClient({
  photos,
  members,
}: {
  photos: Photo[];
  members: FamilyMember[];
}) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filtered = photos.filter((p) => {
    const matchesSearch =
      !search ||
      p.caption?.toLowerCase().includes(search.toLowerCase()) ||
      p.event_name?.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || p.photo_type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
          <Input
            placeholder="Cari foto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 border-amber-200 focus:border-amber-400 focus:ring-amber-400/20 bg-white/80"
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          {typeFilters.map((f) => (
            <Badge
              key={f.value}
              variant="outline"
              className={cn(
                'cursor-pointer transition-colors',
                typeFilter === f.value
                  ? 'bg-amber-600 text-white border-amber-600'
                  : 'border-amber-200 text-amber-700 hover:bg-amber-50'
              )}
              onClick={() => setTypeFilter(f.value)}
            >
              {f.label}
            </Badge>
          ))}

          <PhotoUploadDialog members={members} />
        </div>
      </div>

      {/* Gallery grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Camera className="w-12 h-12 text-amber-300/60 mx-auto mb-4" />
          <p className="text-amber-700/70 font-medium">
            {photos.length === 0
              ? 'Belum ada foto yang diunggah'
              : 'Tidak ditemukan foto yang sesuai'}
          </p>
          <p className="text-sm text-amber-600/50 mt-1">
            {photos.length === 0
              ? 'Mulai dengan mengunggah foto keluarga pertama'
              : 'Coba ubah filter pencarian'}
          </p>
        </div>
      ) : (
        <div className="columns-2 sm:columns-3 lg:columns-4 gap-4 space-y-4">
          {filtered.map((photo, index) => (
            <div
              key={photo.id}
              className="break-inside-avoid group cursor-pointer"
              onClick={() => setLightboxIndex(index)}
            >
              <div className="relative rounded-xl overflow-hidden bg-amber-50 shadow-sm hover:shadow-md transition-all duration-300 border border-amber-100/50">
                <Image
                  src={photo.thumbnail_url || photo.url}
                  alt={photo.caption || 'Foto keluarga'}
                  width={400}
                  height={400}
                  className="w-full h-auto group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Caption overlay */}
                {photo.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-xs text-white truncate">{photo.caption}</p>
                  </div>
                )}

                {/* Type badge */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <Badge className="bg-white/90 text-amber-700 border-0 text-[10px]">
                    {photo.photo_type === 'family' ? 'Keluarga' : 
                     photo.photo_type === 'personal' ? 'Pribadi' : 'Acara'}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={filtered}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
