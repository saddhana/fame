import { Suspense } from 'react';
import { Camera } from 'lucide-react';
import { getPhotos } from '@/actions/photos';
import { getMembers } from '@/actions/members';
import { PhotoGalleryClient } from '@/components/photos/PhotoGalleryClient';
import { Skeleton } from '@/components/ui/skeleton';

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; member?: string }>;
}) {
  const params = await searchParams;

  let photos: Awaited<ReturnType<typeof getPhotos>> = [];
  let members: Awaited<ReturnType<typeof getMembers>> = [];

  try {
    [photos, members] = await Promise.all([
      getPhotos(params.type),
      getMembers(),
    ]);
  } catch {
    // Supabase not configured
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-amber-950 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center shadow-sm">
            <Camera className="w-5 h-5 text-white" />
          </div>
          Galeri Foto
        </h1>
        <p className="text-sm text-amber-600/70 mt-1 ml-[52px]">
          {photos.length} foto tersimpan
        </p>
      </div>

      <Suspense fallback={<GallerySkeleton />}>
        <PhotoGalleryClient photos={photos} members={members} />
      </Suspense>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-xl bg-amber-100/50" />
      ))}
    </div>
  );
}
