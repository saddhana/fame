'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, Calendar, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/AuthContext';
import type { PhotoWithTags } from '@/types';

interface PhotoLightboxProps {
  photos: PhotoWithTags[];
  initialIndex: number;
  onClose: () => void;
  onDelete?: (photoId: string) => Promise<void>;
}

export function PhotoLightbox({ photos, initialIndex, onClose, onDelete }: PhotoLightboxProps) {
  const authed = useAuth();
  const [index, setIndex] = useState(initialIndex);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const photo = photos[index];

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length);
    setConfirmDelete(false);
  }, [photos.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
    setConfirmDelete(false);
  }, [photos.length]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { if (confirmDelete) setConfirmDelete(false); else onClose(); }
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev, confirmDelete]);

  if (!photo) return null;

  const taggedNames = photo.tags?.map((t) => t.member?.full_name).filter(Boolean) ?? [];

  function handleDelete() {
    if (!onDelete) return;
    startDeleting(async () => {
      await onDelete(photo.id);
    });
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-100 bg-black/95 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Top-right controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {authed && onDelete && !confirmDelete && (
            <button
              onClick={() => setConfirmDelete(true)}
              title="Hapus foto"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-red-500/70 flex items-center justify-center text-white transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <a
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Delete confirmation bar */}
        {confirmDelete && (
          <div
            className="absolute top-0 left-0 right-0 z-10 bg-red-900/90 backdrop-blur-sm px-6 py-4 flex items-center justify-between"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-white text-sm font-medium">Hapus foto ini? Tindakan tidak dapat dibatalkan.</p>
            <div className="flex gap-2 ml-4 shrink-0">
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-3 py-1.5 rounded-md bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-md bg-red-500 text-white text-sm font-medium hover:bg-red-400 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Menghapus...' : 'Hapus'}
              </button>
            </div>
          </div>
        )}

        {/* Counter */}
        <div className="absolute top-4 left-4 z-10 text-white/70 text-sm">
          {index + 1} / {photos.length}
        </div>

        {/* Prev/Next */}
        {photos.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image */}
        <motion.div
          key={photo.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="max-w-[90vw] max-h-[80vh] relative"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={photo.url}
            alt={photo.caption || 'Foto'}
            width={1200}
            height={800}
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
          />
        </motion.div>

        {/* Caption bar */}
        {(photo.caption || photo.taken_date || photo.event_name || taggedNames.length > 0) && (
          <div
            className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 to-transparent p-6 pt-12"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="max-w-2xl mx-auto text-center space-y-2">
              {photo.caption && (
                <p className="text-white text-sm">{photo.caption}</p>
              )}
              <div className="flex items-center justify-center gap-3 text-white/60 text-xs flex-wrap">
                {photo.event_name && (
                  <Badge className="bg-white/10 text-white/80 border-0 text-[10px]">
                    {photo.event_name}
                  </Badge>
                )}
                {photo.taken_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(photo.taken_date), 'd MMMM yyyy', { locale: idLocale })}
                  </span>
                )}
              </div>
              {taggedNames.length > 0 && (
                <p className="text-white/50 text-xs flex items-center justify-center gap-1.5">
                  <Users className="w-3 h-3 shrink-0" />
                  {taggedNames.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
