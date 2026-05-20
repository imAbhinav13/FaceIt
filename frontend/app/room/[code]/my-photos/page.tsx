"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

type MatchStatusResponse = {
  success: boolean;
  room: {
    id: string;
    room_code: string;
    name: string;
    status: string;
  };
  match_job_status: "not_started" | "pending" | "processing" | "done" | "failed";
  job: {
    id: string;
    status: string;
    error: string | null;
    created_at: string | null;
    started_at: string | null;
    completed_at: string | null;
  } | null;
  matched_count: number;
  review_count: number;
};

type MyPhoto = {
  match_id: string;
  photo_id: string;
  confidence: number;
  status: string;
  matched_at: string;
  storage_path: string;
  signed_url: string;
};

type MyPhotosResponse = {
  success: boolean;
  room: {
    id: string;
    room_code: string;
    name: string;
    status: string;
  };
  signed_url_ttl_seconds?: number;
  photos: MyPhoto[];
  message: string | null;
};

export default function MyPhotosPage() {
  const router = useRouter();
  const params = useParams();

  const code = String(params.code || "").toUpperCase();

  const [matchStatus, setMatchStatus] =
    useState<MatchStatusResponse | null>(null);
  const [photosResponse, setPhotosResponse] =
    useState<MyPhotosResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [message, setMessage] = useState("");

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }

  async function loadMatchStatus() {
    const token = await getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await api.get(`/rooms/${code}/match-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setMatchStatus(response.data);

      if (response.data.match_job_status === "done") {
        await loadMyPhotos();
      }
    } catch (error: any) {
      setMessage(error.response?.data?.detail || error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadMyPhotos() {
    const token = await getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setLoadingPhotos(true);

    try {
      const response = await api.get(`/rooms/${code}/my-photos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setPhotosResponse(response.data);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || error.message);
    } finally {
      setLoadingPhotos(false);
    }
  }

  useEffect(() => {
    if (!code) return;

    loadMatchStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (!matchStatus) return;

    const shouldPoll =
      matchStatus.match_job_status === "pending" ||
      matchStatus.match_job_status === "processing" ||
      matchStatus.match_job_status === "not_started"||
      matchStatus.review_count > 0; // auto refresh in receiver gallery after appoval

    if (!shouldPoll) return;

    const interval = window.setInterval(() => {
      loadMatchStatus();
    }, 5000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchStatus?.match_job_status, code]);

  if (loading) {
    return <main className="p-8">Checking match status...</main>;
  }

  if (message) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-red-300 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-800">Gallery Error</h1>
          <p className="mt-2 text-sm text-red-700">{message}</p>

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

  if (!matchStatus) {
    return null;
  }

  const room = matchStatus.room;
  const photos = photosResponse?.photos || [];

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-xl border p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">My Matched Photos</p>
              <h1 className="text-3xl font-bold">{room.name}</h1>
              <p className="mt-1 text-sm text-gray-600">
                Room Code: {room.room_code}
              </p>
            </div>

            <span className="rounded-full border px-3 py-1 text-sm uppercase">
              {matchStatus.match_job_status}
            </span>
          </div>

          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-lg bg-gray-100 p-3">
              <p className="text-gray-500">Room Status</p>
              <p className="font-medium uppercase">{room.status}</p>
            </div>

            <div className="rounded-lg bg-gray-100 p-3">
              <p className="text-gray-500">Confirmed Matches</p>
              <p className="font-medium">{matchStatus.matched_count}</p>
            </div>

            <div className="rounded-lg bg-gray-100 p-3">
              <p className="text-gray-500">Needs Review</p>
              <p className="font-medium">{matchStatus.review_count}</p>
            </div>
          </div>
        </div>

        {matchStatus.match_job_status === "not_started" && (
          <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-6">
            <h2 className="text-xl font-bold text-yellow-900">
              Matching has not started yet
            </h2>
            <p className="mt-2 text-sm text-yellow-800">
              Go back to the join page and start matching for this room.
            </p>

            <button
              onClick={() => router.push("/room/join")}
              className="mt-4 rounded-lg bg-black px-4 py-3 text-white"
            >
              Join Room
            </button>
          </div>
        )}

        {(matchStatus.match_job_status === "pending" ||
          matchStatus.match_job_status === "processing") && (
          <div className="rounded-xl border bg-gray-50 p-6">
            <h2 className="text-xl font-bold">Finding your photos...</h2>
            <p className="mt-2 text-sm text-gray-600">
              Matching is still running. This page will refresh automatically.
            </p>
          </div>
        )}

        {matchStatus.match_job_status === "failed" && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-6">
            <h2 className="text-xl font-bold text-red-800">
              Matching failed
            </h2>
            <p className="mt-2 text-sm text-red-700">
              {matchStatus.job?.error || "Something went wrong during matching."}
            </p>
          </div>
        )}

        {matchStatus.match_job_status === "done" && loadingPhotos && (
          <div className="rounded-xl border bg-gray-50 p-6">
            Loading matched photos...
          </div>
        )}

        {matchStatus.match_job_status === "done" &&
          !loadingPhotos &&
          photos.length === 0 && (
            <div className="rounded-xl border bg-gray-50 p-6">
              <h2 className="text-xl font-bold">No confirmed matches yet</h2>
              <p className="mt-2 text-sm text-gray-600">
                {photosResponse?.message ||
                  "No confirmed photos were found for your enrolled face."}
              </p>

              {matchStatus.review_count > 0 && (
                <p className="mt-2 text-sm text-yellow-700">
                  Some possible matches are waiting for uploader review. Review
                  queue will be added in Phase 4.
                </p>
              )}
            </div>
          )}

        {matchStatus.match_job_status === "done" && photos.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <div
                key={photo.match_id}
                className="overflow-hidden rounded-xl border bg-white"
              >
                <img
                  src={photo.signed_url}
                  alt={`Matched photo ${photo.photo_id}`}
                  className="h-64 w-full object-cover"
                />

                <div className="p-3 text-sm">
                  <p className="font-medium">
                    Confidence: {(photo.confidence * 100).toFixed(1)}%
                  </p>
                  <p className="text-gray-500">
                    Matched: {new Date(photo.matched_at).toLocaleString()}
                  </p>

                  <a
                    href={photo.signed_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 block rounded-lg bg-black p-2 text-center text-white"
                  >
                    Open Photo
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => router.push("/room/join")}
          className="w-full rounded-lg border p-3"
        >
          Join Another Room
        </button>
      </div>
    </main>
  );
}