"use client";

import { useRef, useState, type DragEvent } from "react";
import { MAX_FILE_MB, validateFile } from "@/ml/preprocessing";

interface Props {
  previewUrl: string | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export default function ImageUploader({ previewUrl, onSelect, onRemove, disabled }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFiles(list: FileList | null) {
    if (disabled) return;
    const file = list?.[0];
    if (!file) return;
    const check = await validateFile(file);
    if (!check.ok) {
      setError(check.error ?? "This file cannot be used.");
      return;
    }
    setError(null);
    onSelect(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) void handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      {/* hidden inputs: one for gallery / files, one that opens the phone camera directly */}
      <input
        ref={fileRef}
        type="file"
        disabled={disabled}
        accept="image/jpeg,image/png,.jpg,.jpeg,.png"
        className="hidden"
        data-testid="file-input"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        disabled={disabled}
        accept="image/jpeg,image/png"
        capture="environment"
        className="hidden"
        data-testid="camera-input"
        onChange={(e) => {
          void handleFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {previewUrl ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Preview of the selected skin photograph" className="mx-auto max-h-[420px] w-full object-contain" />
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-12 text-center transition ${
            dragging ? "border-teal-600 bg-teal-50" : "border-slate-300 bg-slate-50"
          }`}
        >
          <svg className="h-12 w-12 text-teal-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="9" cy="10" r="2" />
            <path d="M21 16l-5-5-8 8" />
          </svg>
          <p className="mt-3 font-semibold text-slate-800">Drag and drop a photograph here</p>
          <p className="mt-1 text-sm text-slate-500">JPG, JPEG or PNG · up to {MAX_FILE_MB} MB</p>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => fileRef.current?.click()}>
          {previewUrl ? "Replace image" : "Upload image"}
        </button>
        <button type="button" className="btn btn-secondary" disabled={disabled} onClick={() => cameraRef.current?.click()}>
          Take photo with camera
        </button>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        On a smartphone, “Take photo” opens the camera. On a computer it opens a file chooser.
      </p>

      {previewUrl && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setError(null);
            onRemove();
          }}
          className="mt-3 text-sm font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-800 disabled:opacity-50"
        >
          Remove image
        </button>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          {error}
        </p>
      )}
    </div>
  );
}
