"use client";

import { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  FileImage,
  LockKeyhole,
  ShieldCheck,
  UploadCloud,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
};

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 MB";

  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

export function Dropzone({ files, onFilesChange, disabled }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const totalSize = useMemo(() => {
    return files.reduce((sum, file) => sum + file.size, 0);
  }, [files]);

  function handleFiles(selectedFiles: FileList | null) {
    if (!selectedFiles || disabled) return;

    const imageFiles = Array.from(selectedFiles).filter((file) =>
      ["image/jpeg", "image/png", "image/webp"].includes(file.type)
    );

    if (imageFiles.length === 0) return;

    onFilesChange([...files, ...imageFiles]);
  }

  function removeFile(index: number) {
    if (disabled) return;
    onFilesChange(files.filter((_, fileIndex) => fileIndex !== index));
  }

  return (
    <Card
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
      className={`relative overflow-hidden rounded-[2rem] border bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl transition duration-300 sm:p-6 ${
        isDragging
          ? "border-cyan-300/60 shadow-cyan-950/30"
          : "border-white/10"
      }`}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-12 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-2">
                <LockKeyhole className="size-4 text-cyan-200" />
              </div>

              <p className="text-xs font-medium text-cyan-100">
                Secure Photo Intake
              </p>
            </div>

            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Upload event photos
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
              Add the full event batch here. Photos stay staged locally until
              you start the FaceIt scan.
            </p>
          </div>

          {files.length > 0 && (
            <div className="hidden rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right sm:block">
              <p className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                Staged
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {files.length} files
              </p>
              <p className="text-xs text-zinc-500">{formatBytes(totalSize)}</p>
            </div>
          )}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={`group flex min-h-[220px] w-full flex-col items-center justify-center rounded-[1.5rem] border border-dashed p-6 text-center transition duration-300 ${
            isDragging
              ? "border-cyan-300/70 bg-cyan-300/10"
              : "border-white/10 bg-black/25 hover:border-cyan-300/40 hover:bg-cyan-300/[0.06]"
          } disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <motion.div
            animate={{
              y: isDragging ? -4 : 0,
              scale: isDragging ? 1.04 : 1,
            }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="rounded-full border border-cyan-300/25 bg-cyan-300/10 p-5 shadow-2xl shadow-cyan-950/30"
          >
            <UploadCloud className="size-9 text-cyan-200" />
          </motion.div>

          <h3 className="mt-5 text-lg font-semibold text-white">
            Drop photos here
          </h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
            Supports JPG, PNG, and WEBP images.
          </p>

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {["JPG", "PNG", "WEBP"].map((type) => (
              <Badge
                key={type}
                variant="outline"
                className="border-white/10 bg-white/[0.03] text-zinc-300"
              >
                {type}
              </Badge>
            ))}
          </div>
        </button>

        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/25 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 size-4 text-emerald-300" />
            <p className="text-xs leading-5 text-zinc-400">
              Private bucket storage. Signed URLs only. Photos and matches
              expire with the room TTL.
            </p>
          </div>

          <Button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="bg-cyan-300 text-zinc-950 shadow-lg shadow-cyan-950/30 hover:bg-cyan-200"
          >
            Select Photos
          </Button>
        </div>

        <AnimatePresence>
          {files.length > 0 && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-200">
                  Preview queue
                </p>
                <p className="text-xs text-zinc-500">
                  {files.length} files · {formatBytes(totalSize)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {files.map((file, index) => {
                  const previewUrl = URL.createObjectURL(file);

                  return (
                    <motion.div
                      key={`${file.name}-${file.lastModified}-${index}`}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 24,
                      }}
                      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
                    >
                      <img
                        src={previewUrl}
                        alt={file.name}
                        className="h-32 w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10 opacity-90" />

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => removeFile(index)}
                        className="absolute right-2 top-2 rounded-full border border-white/10 bg-black/70 p-1 opacity-0 backdrop-blur transition group-hover:opacity-100"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="size-4 text-white" />
                      </button>

                      <div className="absolute bottom-2 left-2 right-2">
                        <div className="flex items-center gap-2">
                          <FileImage className="size-3.5 text-cyan-200" />
                          <p className="truncate text-xs text-zinc-100">
                            {file.name}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
}