"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { UploadCloud, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type DropzoneProps = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
};

export function Dropzone({ files, onFilesChange, disabled }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(selectedFiles: FileList | null) {
    if (!selectedFiles || disabled) return;

    const imageFiles = Array.from(selectedFiles).filter((file) =>
      file.type.startsWith("image/")
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
      className={`relative overflow-hidden border-dashed bg-zinc-950/80 p-6 transition ${
        isDragging
          ? "border-cyan-400 shadow-[0_0_40px_rgba(34,211,238,0.25)]"
          : "border-zinc-800"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        disabled={disabled}
        onChange={(event) => handleFiles(event.target.files)}
      />

      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 p-4">
          <UploadCloud className="size-8 text-cyan-300" />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-white">
            Upload event photos
          </h3>
          <p className="mt-1 text-sm text-zinc-400">
            Drag and drop images here, or browse from your device.
          </p>
        </div>

        <Button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="bg-cyan-400 text-zinc-950 hover:bg-cyan-300"
        >
          Select Photos
        </Button>
      </div>

      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            layout
            className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
          >
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
                  className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
                >
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="h-32 w-full object-cover"
                  />

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => removeFile(index)}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1 opacity-0 transition group-hover:opacity-100"
                    aria-label={`Remove ${file.name}`}
                  >
                    <X className="size-4 text-white" />
                  </button>

                  <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2">
                    <p className="truncate text-xs text-zinc-200">
                      {file.name}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}