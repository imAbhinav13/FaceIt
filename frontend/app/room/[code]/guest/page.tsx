"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import CameraCapture from "@/components/CameraCaptureTemp";
import { api } from "@/lib/api";

type GuestValidateResponse = {
  success: boolean;
  can_join_as_guest: boolean;
  reason: string | null;
  room: {
    id: string;
    room_code: string;
    name: string;
    status: string;
    expires_at: string;
    created_at: string;
  };
};

type GuestPhoto = {
  photo_id: string;
  face_id: string | null;
  confidence: number;
  status: string;
  signed_url: string;
  storage_path: string;
};

type GuestStatusResponse = {
  success: boolean;
  guest_session_id: string;
  status: "pending" | "processing" | "done" | "failed";
  room: {
    id: string;
    room_code: string;
    name: string;
    status: string;
  };
  photos: GuestPhoto[];
  message: string | null;
  error: string | null;
  signed_url_ttl_seconds: number;
};

export default function GuestSelfiePage() {
  const params = useParams();
  const router = useRouter();

  const code = String(params.code || "").toUpperCase();

  const [roomData, setRoomData] =
    useState<GuestValidateResponse | null>(null);

  const [frames, setFrames] = useState<string[]>([]);

  const [guestSessionId, setGuestSessionId] =
    useState<string | null>(null);

  const [guestStatus, setGuestStatus] =
    useState<GuestStatusResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [matching, setMatching] = useState(false);

  useEffect(() => {
    async function validateRoom() {
      setMessage("");

      if (!code) {
        setMessage("Missing room code.");
        setLoading(false);
        return;
      }

      try {
        const response = await api.post(
          `/rooms/${code}/guest/validate`,
          {}
        );

        setRoomData(response.data);

        if (!response.data.can_join_as_guest) {
          setMessage(
            response.data.reason ||
              "This room is not ready for guest matching yet."
          );
        }
      } catch (error: any) {
        setMessage(error.response?.data?.detail || error.message);
      } finally {
        setLoading(false);
      }
    }

    validateRoom();
  }, [code]);

  async function startGuestMatch() {
    setMessage("");

    if (frames.length !== 3) {
      setMessage(
        "Please capture exactly 3 selfie frames before continuing."
      );
      return;
    }

    setSubmitting(true);

    try {
      const response = await api.post(
        `/rooms/${code}/guest-match`,
        {
          frames,
        }
      );

      setGuestSessionId(response.data.guest_session_id);
      setMatching(true);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function pollGuestStatus(sessionId: string) {
    try {
      const response = await api.get(
        `/rooms/${code}/guest-status/${sessionId}`
      );

      setGuestStatus(response.data);

      if (
        response.data.status === "done" ||
        response.data.status === "failed"
      ) {
        setMatching(false);
      }
    } catch (error: any) {
      setMatching(false);

      setMessage(
        error.response?.data?.detail ||
          error.message ||
          "Failed to fetch guest status"
      );
    }
  }

  useEffect(() => {
    if (!guestSessionId) return;

    pollGuestStatus(guestSessionId);

    const interval = window.setInterval(() => {
      pollGuestStatus(guestSessionId);
    }, 3000);

    return () => window.clearInterval(interval);
  }, [guestSessionId]);

  if (loading) {
    return <main className="p-8">Checking room...</main>;
  }

  if (message && !roomData?.can_join_as_guest) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-yellow-300 bg-yellow-50 p-6">
          <h1 className="text-xl font-bold text-yellow-900">
            Room Not Ready
          </h1>

          <p className="mt-2 text-sm text-yellow-800">{message}</p>

          <button
            onClick={() => router.push("/room/join")}
            className="mt-4 w-full rounded-lg bg-black p-3 text-white"
          >
            Back to Join Room
          </button>
        </div>
      </main>
    );
  }

  if (!roomData) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-red-300 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-800">
            Unable to Load Room
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {message || "Something went wrong while loading this room."}
          </p>

          <button
            onClick={() => router.push("/room/join")}
            className="mt-4 w-full rounded-lg bg-black p-3 text-white"
          >
            Back to Join Room
          </button>
        </div>
      </main>
    );
  }

  const matchedPhotos = guestStatus?.photos || [];

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border p-6">
          <p className="text-sm text-gray-500">
            Guest Selfie Matching
          </p>

          <h1 className="text-3xl font-bold">
            {roomData.room.name}
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Room Code: {roomData.room.room_code}
          </p>

          <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-800">
            Guest results are temporary. Download or save your photos before
            leaving or refreshing this page.
          </div>
        </div>

        {!guestSessionId && (
          <div className="rounded-xl border p-6 space-y-5">
            <CameraCapture
              maxFrames={3}
              onFramesCaptured={(capturedFrames: string[]) => {
                setFrames(capturedFrames);
                setMessage("");
              }}
            />

            {frames.length > 0 && frames.length < 3 && (
              <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
                {frames.length}/3 frames captured. Please capture all 3
                frames.
              </div>
            )}

            {frames.length === 3 && (
              <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700">
                3 selfie frames captured successfully.
              </div>
            )}

            {message && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">
                {message}
              </div>
            )}

            <button
              onClick={startGuestMatch}
              disabled={frames.length !== 3 || submitting}
              className="w-full rounded-lg bg-black p-3 text-white disabled:opacity-50"
            >
              {submitting
                ? "Starting match..."
                : "Find My Photos"}
            </button>
          </div>
        )}

        {guestSessionId && matching && (
          <div className="rounded-xl border bg-gray-50 p-8 text-center">
            <h2 className="text-2xl font-bold">
              Finding your photos...
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              Your selfie is being matched against event photos.
              This page updates automatically.
            </p>
          </div>
        )}

        {guestStatus?.status === "failed" && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-6">
            <h2 className="text-2xl font-bold text-red-800">
              Guest Matching Failed
            </h2>

            <p className="mt-2 text-sm text-red-700">
              {guestStatus.error || "Something went wrong."}
            </p>
          </div>
        )}

        {guestStatus?.status === "done" &&
          matchedPhotos.length === 0 && (
            <div className="rounded-xl border bg-gray-50 p-8 text-center">
              <h2 className="text-2xl font-bold">
                No Photos Found
              </h2>

              <p className="mt-2 text-sm text-gray-600">
                {guestStatus.message ||
                  "No matching photos were found for this selfie."}
              </p>
            </div>
          )}

        {guestStatus?.status === "done" &&
          matchedPhotos.length > 0 && (
            <>
              <div className="rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-800">
                Found {matchedPhotos.length} matching photo
                {matchedPhotos.length !== 1 ? "s" : ""}.
                Download or save them before leaving this page.
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {matchedPhotos.map((photo) => (
                  <div
                    key={photo.photo_id}
                    className="overflow-hidden rounded-xl border bg-white"
                  >
                    <img
                      src={photo.signed_url}
                      alt={`Guest match ${photo.photo_id}`}
                      className="w-full"
                    />

                    <div className="space-y-3 p-4">
                      <div>
                        <p className="text-sm text-gray-500">
                          Confidence
                        </p>

                        <p className="text-lg font-bold">
                          {(photo.confidence * 100).toFixed(1)}%
                        </p>
                      </div>

                      <a
                        href={photo.signed_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg bg-black p-3 text-center text-white"
                      >
                        Open Photo
                      </a>

                      <a
                        href={photo.signed_url}
                        download
                        className="block rounded-lg border p-3 text-center"
                      >
                        Download Photo
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

        <button
          onClick={() => router.push("/room/join")}
          className="w-full rounded-lg border p-3"
        >
          Back to Join Room
        </button>
      </div>
    </main>
  );
}