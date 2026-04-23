'use client';

import React, { useState } from 'react';
import { XIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon } from '@/components/icons';

interface PhotoGalleryProps {
  photos: Array<{ id?: string; photoUrl: string; description?: string; createdAt?: string }>;
  editable?: boolean;
  onDelete?: (photoId: string) => void;
}

export default function PhotoGallery({ photos, editable = false, onDelete }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <p className="text-sm">No photos yet</p>
      </div>
    );
  }

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const goToPrev = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : photos.length - 1);
    }
  };
  const goToNext = () => {
    if (lightboxIndex !== null) {
      setLightboxIndex(lightboxIndex < photos.length - 1 ? lightboxIndex + 1 : 0);
    }
  };

  return (
    <>
      {/* Photo Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((photo, i) => (
          <div
            key={photo.id || i}
            className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cursor-pointer transition-shadow hover:shadow-lg"
            onClick={() => openLightbox(i)}
          >
            <div className="aspect-square overflow-hidden">
              <img
                src={photo.photoUrl}
                alt={photo.description || `Photo ${i + 1}`}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
              />
            </div>
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            {/* Delete button */}
            {editable && onDelete && photo.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(photo.id!);
                }}
                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <TrashIcon className="w-3.5 h-3.5" />
              </button>
            )}
            {/* Description */}
            {photo.description && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-xs text-white truncate">{photo.description}</p>
              </div>
            )}
            {/* Timestamp */}
            {photo.createdAt && (
              <div className="absolute top-2 left-2">
                <span className="text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
                  {new Date(photo.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close Button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <XIcon className="w-8 h-8" />
          </button>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronLeftIcon className="w-10 h-10" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goToNext(); }}
                className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
              >
                <ChevronRightIcon className="w-10 h-10" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[85vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={photos[lightboxIndex].photoUrl}
              alt={photos[lightboxIndex].description || `Photo ${lightboxIndex + 1}`}
              className="max-w-full max-h-[75vh] object-contain rounded-lg"
            />
            {photos[lightboxIndex].description && (
              <p className="text-white/80 text-sm mt-3 text-center">
                {photos[lightboxIndex].description}
              </p>
            )}
            <p className="text-white/50 text-xs mt-1">
              {lightboxIndex + 1} / {photos.length}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
