"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

type CreatedEvent = {
  id: string;
  room_code: string;
  name: string;
  status: string;
  expires_at: string;
  created_by: string;
};

export default function CreateRoomPage() {
  const router = useRouter();

  const [eventName, setEventName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [createdEvent, setCreatedEvent] = useState<CreatedEvent | null>(null);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      setLoading(false);
    }

    checkSession();
  }, [router]);

  async function handleCreateRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setCreatedEvent(null);

    if (!eventName.trim()) {
      setMessage("Event name is required.");
      return;
    }

    setCreating(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMessage("Session expired. Please login again.");
      setCreating(false);
      router.push("/login");
      return;
    }

    try {
      const response = await api.post(
        "/rooms",
        {
          name: eventName.trim(),
          room_code: roomCode.trim() || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setCreatedEvent(response.data.event);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || error.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return <main className="p-8">Checking session...</main>;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Create Event Room</h1>
          <p className="mt-1 text-sm text-gray-600">
            Create a room, share the code, and upload event photos.
          </p>
        </div>

        <form onSubmit={handleCreateRoom} className="space-y-4">
          <input
            className="w-full rounded-lg border p-3"
            placeholder="Event name, e.g. Farewell Party"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            required
          />

          <input
            className="w-full rounded-lg border p-3 uppercase"
            placeholder="Optional room code, e.g. FEST24"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />

          <p className="text-xs text-gray-500">
            Room code must be 6 characters. Avoids 0, O, I, and 1.
          </p>

          <button
            disabled={creating}
            className="w-full rounded-lg bg-black p-3 text-white disabled:opacity-50"
          >
            {creating ? "Creating room..." : "Create Room"}
          </button>
        </form>

        {message && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {message}
          </div>
        )}

        {createdEvent && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-4 space-y-3">
            <p className="text-sm font-medium text-green-800">
              Room created successfully.
            </p>

            <div className="rounded-lg bg-white p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Room Code
              </p>
              <p className="mt-1 text-3xl font-bold tracking-widest">
                {createdEvent.room_code}
              </p>
            </div>

            <button
              onClick={() => router.push(`/room/${createdEvent.room_code}`)}
              className="w-full rounded-lg bg-black p-3 text-white"
            >
              Go to Room
            </button>
          </div>
        )}
      </div>
    </main>
  );
}