'use client';

import React, { useState, useRef, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { CameraIcon, XIcon, RefreshIcon, UploadCloudIcon as UploadIcon } from '@/components/icons';
import { toast } from 'sonner';

interface PhotoUploaderProps {
  shipmentId: string;
  onUploadComplete?: () => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

interface UploadingFile {
  file: File;
  preview: string;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export default function PhotoUploader({
  shipmentId,
  onUploadComplete,
  maxFiles = 5,
  maxSizeMB = 5,
}: PhotoUploaderProps) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback(
    (files: FileList | File[]): File[] => {
      const validFiles: File[] = [];
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!allowedTypes.includes(file.type)) {
          toast.error(`${file.name}: Unsupported file type. Use JPG, PNG, or WebP.`);
          continue;
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast.error(`${file.name}: File too large. Max ${maxSizeMB}MB.`);
          continue;
        }
        validFiles.push(file);
      }

      if (validFiles.length > maxFiles) {
        toast.warning(`Only ${maxFiles} files can be uploaded at once. First ${maxFiles} selected.`);
        validFiles.splice(maxFiles);
      }

      return validFiles;
    },
    [maxFiles, maxSizeMB]
  );

  const uploadFile = useCallback(
    async (file: File, preview: string) => {
      const fileEntry: UploadingFile = {
        file,
        preview,
        status: 'uploading',
        progress: 0,
      };

      setUploadingFiles((prev) => [...prev, fileEntry]);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + 20, 90) }
              : f
          )
        );
      }, 200);

      try {
        const photoUrl = URL.createObjectURL(file);
        const description = file.name.replace(/\.[^/.]+$/, '');

        const res = await apiFetch(`/shipments/${shipmentId}/photos`, {
          method: 'POST',
          body: JSON.stringify({ photoUrl, description }),
        });

        clearInterval(progressInterval);

        if (res.success) {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file ? { ...f, status: 'success', progress: 100 } : f
            )
          );
          toast.success(`${file.name} uploaded successfully`);
          onUploadComplete?.();
        } else {
          setUploadingFiles((prev) =>
            prev.map((f) =>
              f.file === file
                ? { ...f, status: 'error', progress: 0, error: res.error || 'Upload failed' }
                : f
            )
          );
          toast.error(`${file.name}: ${res.error || 'Upload failed'}`);
        }
      } catch {
        clearInterval(progressInterval);
        setUploadingFiles((prev) =>
          prev.map((f) =>
            f.file === file
              ? { ...f, status: 'error', progress: 0, error: 'Network error' }
              : f
          )
        );
        toast.error(`${file.name}: Network error`);
      }
    },
    [shipmentId, onUploadComplete]
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles = validateFiles(files);
      validFiles.forEach((file) => {
        const preview = URL.createObjectURL(file);
        uploadFile(file, preview);
      });
    },
    [validateFiles, uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
        e.target.value = '';
      }
    },
    [handleFiles]
  );

  const removeFile = useCallback((file: File) => {
    setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
  }, []);

  const retryUpload = useCallback(
    (file: File) => {
      const preview = URL.createObjectURL(file);
      setUploadingFiles((prev) => prev.filter((f) => f.file !== file));
      uploadFile(file, preview);
    },
    [uploadFile]
  );

  const hasActiveUploads = uploadingFiles.some((f) => f.status === 'uploading');

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={hasActiveUploads}
        />
        <CameraIcon className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Drop photos here or click to browse
        </p>
        <p className="text-xs text-slate-400 mt-1">
          JPG, PNG, WebP up to {maxSizeMB}MB each (max {maxFiles} files)
        </p>
        {hasActiveUploads && (
          <div className="absolute inset-0 bg-white/50 dark:bg-slate-900/50 rounded-xl flex items-center justify-center">
            <p className="text-sm text-emerald-600 font-medium">Uploading...</p>
          </div>
        )}
      </div>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((f, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-3 rounded-lg border ${
                f.status === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : f.status === 'error'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <img
                src={f.preview}
                alt={f.file.name}
                className="w-12 h-12 object-cover rounded-lg flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">
                  {f.file.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(f.file.size / 1024).toFixed(1)} KB
                </p>
                {f.status === 'uploading' && (
                  <div className="mt-1.5 w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
                {f.status === 'error' && (
                  <p className="text-xs text-red-500 mt-0.5">{f.error}</p>
                )}
                {f.status === 'success' && (
                  <p className="text-xs text-emerald-600 mt-0.5">Uploaded</p>
                )}
              </div>
              <div className="flex-shrink-0">
                {f.status === 'error' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      retryUpload(f.file);
                    }}
                    className="p-1.5 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors"
                  >
                    <RefreshIcon className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.file);
                  }}
                  className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
