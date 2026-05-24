"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import PhotoUpload from "@/components/PhotoUpload";

type RoomEvent = {
  id: string;
  room_code: string;
  created_by: string;
  name: string;
  status: string;
  expires_at: string;
  created_at: string;
  is_uploader: boolean;
};

type RoomProgress = {
  total: number;
  done: number;
  failed: number;
  processing: number;
  pending: number;
  room_status: string;
};

export default function RoomPage() {
  const router = useRouter();
  const params = useParams();

  const code = String(params.code || "").toUpperCase();

  const [room, setRoom] = useState<RoomEvent | null>(null);
  const [progress, setProgress] = useState<RoomProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadProgress() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token || !code) return;

    try {
      const response = await api.get(`/rooms/${code}/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setProgress(response.data);

      setRoom((currentRoom) => {
        if (!currentRoom) return currentRoom;

        return {
          ...currentRoom,
          status: response.data.room_status,
        };
      });
    } catch {
      // Keep page usable if polling fails once.
    }
  }

  useEffect(() => {
    async function loadRoom() {
      setMessage("");

      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      const token = data.session.access_token;

      try {
        const response = await api.get(`/rooms/${code}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setRoom(response.data.event);
      } catch (error: any) {
        setMessage(error.response?.data?.detail || error.message);
      } finally {
        setLoading(false);
      }
    }

    if (code) {
      loadRoom();
    }
  }, [code, router]);

  useEffect(() => {
    if (!room || !room.is_uploader) return;

    loadProgress();

    if (room.status === "ready") return;

    const interval = window.setInterval(() => {
      loadProgress();
    }, 3000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.status, room?.is_uploader]);

  if (loading) {
    return <main className="p-8">Loading room...</main>;
  }

  if (message) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-red-300 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-800">Room Error</h1>
          <p className="mt-2 text-sm text-red-700">{message}</p>

          <button
            onClick={() => router.push("/room/create")}
            className="mt-4 w-full rounded-lg bg-black p-3 text-white"
          >
            Create New Room
          </button>
        </div>
      </main>
    );
  }

  if (!room) {
    return null;
  }

  const completedCount = progress
    ? progress.done + progress.failed
    : 0;

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((completedCount / progress.total) * 100)
      : 0;

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-xl border p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">Event Room</p>
              <h1 className="text-3xl font-bold">{room.name}</h1>
            </div>

            <span className="rounded-full border px-3 py-1 text-sm uppercase">
              {room.status}
            </span>
          </div>

          <div className="rounded-xl bg-gray-100 p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Room Code
            </p>
            <p className="mt-1 text-4xl font-bold tracking-widest">
              {room.room_code}
            </p>
          </div>

          <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2">
            <p>
              <span className="font-medium text-gray-900">Created:</span>{" "}
              {new Date(room.created_at).toLocaleString()}
            </p>
            <div className="rounded-lg border bg-gray-50 p-3 text-sm">
            <p className="font-medium text-gray-700">
              Photos available until
            </p>

            <p className="mt-1 text-base font-semibold">
              {new Date(room.expires_at).toLocaleString()}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Photos and matches are automatically deleted after expiry.
            </p>
          </div>
          </div>
        </div>

        {room.is_uploader ? (
          <div className="rounded-xl border border-dashed p-6">
            <h2 className="text-xl font-bold">Upload Photos</h2>
            <p className="mt-2 text-sm text-gray-600">
              Select and upload event photos. They will be processed in the
              background.
            </p>

            <div className="mt-4">
              <PhotoUpload
                roomCode={room.room_code}
                onUploadComplete={() => {
                  setRoom({
                    ...room,
                    status: "processing",
                  });

                  loadProgress();
                }}
              />
            </div>

            {progress && progress.total > 0 && (
              <div className="mt-4 rounded-xl border bg-gray-50 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Processing Progress</span>
                  <span>
                    {completedCount}/{progress.total} completed
                  </span>
                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-black transition-all"
                    style={{
                      width: `${progressPercent}%`,
                    }}
                  />
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-gray-600">
                  <div className="rounded-lg bg-white p-2">
                    Pending: {progress.pending}
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    Processing: {progress.processing}
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    Done: {progress.done}
                  </div>
                  <div className="rounded-lg bg-white p-2">
                    Failed: {progress.failed}
                  </div>
                </div>

                {room.status === "ready" && (
                  <p className="mt-3 text-sm font-medium text-green-700">
                    Processing complete. Room is ready.
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border p-6">
            <h2 className="text-xl font-bold">Participant View</h2>
            <p className="mt-2 text-sm text-gray-600">
              Participant photo matching will be built in a later phase.
            </p>
          </div>
        )}

        <button
          onClick={() => router.push("/room/create")}
          className="w-full rounded-lg border p-3"
        >
          Create Another Room
        </button>
      </div>
    </main>
  );
}