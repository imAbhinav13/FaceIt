"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

type PhotoUploadProps = {
  roomCode: string;
  onUploadComplete?: () => void;
};

export default function PhotoUpload({
  roomCode,
  onUploadComplete,
}: PhotoUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleUpload() {
    setMessage("");

    if (files.length === 0) {
      setMessage("Please select at least one photo.");
      return;
    }

    setUploading(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMessage("Session expired. Please login again.");
      setUploading(false);
      return;
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      const response = await api.post(
        `/rooms/${roomCode}/photos`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(
        `Uploaded ${response.data.uploaded_count} photo(s). Processing jobs created.`
      );

      setFiles([]);
      onUploadComplete?.();
    } catch (error: any) {
      setMessage(error.response?.data?.detail || error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">

    <input
        type="file"
        aria-label="Upload event photos" // Adds accessible context natively
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => {
            setFiles(Array.from(e.target.files || []));
            setMessage("");
    }}
    className="w-full rounded-lg border p-3"
    />

      {files.length > 0 && (
        <div className="rounded-lg bg-gray-100 p-3 text-sm text-gray-700">
          {files.length} photo(s) selected.
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        className="w-full rounded-lg bg-black p-3 text-white disabled:opacity-50"
      >
        {uploading ? "Uploading..." : "Upload Photos"}
      </button>

      {message && (
        <div className="rounded-lg border p-3 text-sm">
          {message}
        </div>
      )}
    </div>
  );
}