"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

type ReviewMatch = {
  match_id: string;
  photo_id: string;
  photo_face_id: string | null;
  user_id: string;
  confidence: number;
  status: string;
  matched_at: string;
  bounding_box: any | null;
  storage_path: string;
  signed_url: string;
};

type ReviewResponse = {
  success: boolean;
  room: {
    id: string;
    room_code: string;
    name: string;
    status: string;
  };
  matches: ReviewMatch[];
  count: number;
  limit: number;
  has_more: boolean;
  message: string | null;
};

export default function ReviewQueuePage() {
  const params = useParams();
  const router = useRouter();

  const code = String(params.code || "").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);

  const [message, setMessage] = useState("");
  const [reviewData, setReviewData] =
    useState<ReviewResponse | null>(null);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }

  async function loadReviewQueue() {
    const token = await getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await api.get(`/rooms/${code}/review`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setReviewData(response.data);
    } catch (error: any) {
      setMessage(
        error.response?.data?.detail ||
          error.message ||
          "Failed to load review queue"
      );
    } finally {
      setLoading(false);
    }
  }

  async function updateMatch(
    matchId: string,
    status: "confirmed" | "rejected"
  ) {
    const token = await getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    setUpdatingMatchId(matchId);

    try {
      await api.patch(
        `/matches/${matchId}`,
        {
          status,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setReviewData((prev) => {
        if (!prev) return prev;

        return {
          ...prev,
          matches: prev.matches.filter(
            (match) => match.match_id !== matchId
          ),
          count: prev.count - 1,
        };
      });
    } catch (error: any) {
      alert(
        error.response?.data?.detail ||
          error.message ||
          "Failed to update match"
      );
    } finally {
      setUpdatingMatchId(null);
    }
  }

  useEffect(() => {
    if (!code) return;

    loadReviewQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (loading) {
    return (
      <main className="p-8">
        Loading review queue...
      </main>
    );
  }

  if (message) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-xl border border-red-300 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-800">
            Review Queue Error
          </h1>

          <p className="mt-2 text-sm text-red-700">
            {message}
          </p>

          <button
            onClick={() => router.push("/room/create")}
            className="mt-4 w-full rounded-lg bg-black p-3 text-white"
          >
            Back
          </button>
        </div>
      </main>
    );
  }

  if (!reviewData) {
    return null;
  }

  return (
    <main className="min-h-screen p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-xl border p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">
                Review Queue
              </p>

              <h1 className="text-3xl font-bold">
                {reviewData.room.name}
              </h1>

              <p className="mt-1 text-sm text-gray-600">
                Room Code: {reviewData.room.room_code}
              </p>
            </div>

            <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm">
              {reviewData.count} pending review
            </div>
          </div>

          {reviewData.has_more && (
            <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 p-3 text-sm text-yellow-800">
              Only the first {reviewData.limit} review matches are shown.
            </div>
          )}
        </div>

        {reviewData.matches.length === 0 && (
          <div className="rounded-xl border bg-gray-50 p-8 text-center">
            <h2 className="text-2xl font-bold">
              No photos need review
            </h2>

            <p className="mt-2 text-sm text-gray-600">
              All matches are already confirmed, rejected, or below threshold.
            </p>
          </div>
        )}

        {reviewData.matches.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {reviewData.matches.map((match) => (
              <div
                key={match.match_id}
                className="overflow-hidden rounded-xl border bg-white"
              >
                <div className="relative overflow-hidden">
                    <img
                        src={match.signed_url}
                        alt={`Review photo ${match.photo_id}`}
                        className="block w-full"
                    />

                    {match.bounding_box?.x_pct !== undefined && (
                        <div
                        className="pointer-events-none absolute z-20 border-4 border-yellow-400 bg-yellow-400/20"
                        style={{
                            left: `${match.bounding_box.x_pct}%`,
                            top: `${match.bounding_box.y_pct}%`,
                            width: `${match.bounding_box.w_pct}%`,
                            height: `${match.bounding_box.h_pct}%`,
                        }}
                        />
                    )}
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <p className="text-sm text-gray-500">
                      Confidence
                    </p>

                    <p className="text-lg font-bold">
                      {(match.confidence * 100).toFixed(1)}%
                    </p>
                  </div>

                  <div className="text-sm text-gray-600">
                    Reviewed match candidate for participant:
                    <div className="mt-1 break-all font-mono text-xs">
                      {match.user_id}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      disabled={updatingMatchId === match.match_id}
                      onClick={() =>
                        updateMatch(match.match_id, "confirmed")
                      }
                      className="rounded-lg bg-green-600 p-3 text-white disabled:opacity-50"
                    >
                      {updatingMatchId === match.match_id
                        ? "Updating..."
                        : "Approve"}
                    </button>

                    <button
                      disabled={updatingMatchId === match.match_id}
                      onClick={() =>
                        updateMatch(match.match_id, "rejected")
                      }
                      className="rounded-lg bg-red-600 p-3 text-white disabled:opacity-50"
                    >
                      {updatingMatchId === match.match_id
                        ? "Updating..."
                        : "Reject"}
                    </button>
                  </div>

                  <div className="text-xs text-gray-400">
                    Match ID: {match.match_id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}