"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";


type JoinResponse = {
  success: boolean;
  status: string;
  can_match: boolean;
  reason: string | null;
  room: {
    id: string;
    room_code: string;
    name: string;
    status: string;
    expires_at: string;
    created_at: string;
  };
  user: {
    id: string;
    email: string;
    has_face_embedding: boolean;
  };
  job: {
    id: string;
    status: string;
    deduplicated: boolean;
  } | null;
};

export default function JoinRoomPage() {
  const router = useRouter();

  const [roomCode, setRoomCode] = useState("");
  const [joinResult, setJoinResult] = useState<JoinResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
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

  async function validateJoin(codeOverride?: string) {
    const codeToUse = (codeOverride || roomCode).trim().toUpperCase();

    setMessage("");

    if (!codeToUse) {
      setMessage("Please enter a room code.");
      return;
    }

    setChecking(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setChecking(false);
      router.push("/login");
      return;
    }

    try {
      const response = await api.post(
        `/rooms/${codeToUse}/join`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setJoinResult(response.data);
      setRoomCode(response.data.room.room_code);
    } catch (error: any) {
      setJoinResult(null);
      setMessage(error.response?.data?.detail || error.message);
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    if (!joinResult) return;

    if (joinResult.room.status === "ready") return;

    if (
      joinResult.room.status === "failed" ||
      joinResult.room.status === "expired"
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      validateJoin(joinResult.room.room_code);
    }, 10000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinResult?.room?.room_code, joinResult?.room?.status]);

  if (loading) {
    return <main className="p-8">Checking session...</main>;
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-xl border p-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold">Join Event Room</h1>
          <p className="mt-1 text-sm text-gray-600">
            Enter a room code to find photos that match your enrolled face.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            validateJoin();
          }}
          className="space-y-4"
        >
          <input
            className="w-full rounded-lg border p-3 uppercase"
            placeholder="Room code, e.g. FEST24"
            value={roomCode}
            onChange={(e) => {
              setRoomCode(e.target.value.toUpperCase());
              setMessage("");
              setJoinResult(null);
            }}
            maxLength={6}
            required
          />

          <button
            disabled={checking}
            className="w-full rounded-lg bg-black p-3 text-white disabled:opacity-50"
          >
            {checking ? "Checking room..." : "Join Room"}
          </button>
        </form>

        {message && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {message}
          </div>
        )}

        {joinResult && (
          <div className="rounded-xl border bg-gray-50 p-4 space-y-3">
            <div>
              <p className="text-sm text-gray-500">Room</p>
              <h2 className="text-xl font-bold">{joinResult.room.name}</h2>
              <p className="text-sm text-gray-600">
                Code: {joinResult.room.room_code}
              </p>
            </div>

            <div className="rounded-lg bg-white p-3 text-sm">
              <p>
                <span className="font-medium">Room status:</span>{" "}
                {joinResult.room.status}
              </p>
              <p>
                <span className="font-medium">Can match now:</span>{" "}
                {joinResult.can_match ? "Yes" : "No"}
              </p>
            </div>

            {!joinResult.can_match &&
              joinResult.room.status !== "failed" &&
              joinResult.room.status !== "expired" && (
                <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                  {joinResult.reason}. Waiting for uploader photos to finish
                  processing. This page checks again every 10 seconds.
                </div>
              )}

            {joinResult.room.status === "failed" && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                This room failed processing. Please ask the uploader to upload
                photos again.
              </div>
            )}

            {joinResult.room.status === "expired" && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                This room has expired.
              </div>
            )}

            {joinResult.job && (
            <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
                <p className="font-medium">Matching job started.</p>
                <p>Status: {joinResult.job.status}</p>
                {joinResult.job.deduplicated && (
                <p>Existing matching job reused.</p>
                )}
            </div>
            )}

            {joinResult.job && (
              <button
                onClick={() =>
                  router.push(`/room/${joinResult.room.room_code}/my-photos`)
                }
                className="w-full rounded-lg border p-3"
              >
                View My Photos
              </button>
            )}

            {joinResult.can_match && (
            <button
                onClick={() => validateJoin(joinResult.room.room_code)}
                disabled={checking}
                className="w-full rounded-lg bg-black p-3 text-white disabled:opacity-50"
            >
                {checking ? "Starting match..." : "Start Matching"}
            </button>
            )}
          </div>
        )}
      </div>
    </main>
  );
}