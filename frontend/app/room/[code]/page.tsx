"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Loader2, Sparkles } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { Dropzone } from "@/components/faceit/Dropzone";
import { ProcessingSkeleton } from "@/components/faceit/ProcessingSkeleton";
import { ResultsDashboard } from "@/components/faceit/ResultsDashboard";
import { RoomHeader } from "@/components/faceit/RoomHeader";
import { ScanningOverlay } from "@/components/faceit/ScanningOverlay";

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

  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState("");

  const previewUrl = useMemo(() => {
    if (!files[0]) return null;
    return URL.createObjectURL(files[0]);
  }, [files]);

  const scanningActive = isUploading || isProcessing;

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }

  async function loadProgress() {
    const token = await getToken();

    if (!token || !code) return;

    try {
      const response = await api.get(`/rooms/${code}/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const nextProgress: RoomProgress = response.data;

      setProgress(nextProgress);

      setRoom((currentRoom) => {
        if (!currentRoom) return currentRoom;

        return {
          ...currentRoom,
          status: nextProgress.room_status,
        };
      });

      const stillProcessing =
        nextProgress.pending > 0 ||
        nextProgress.processing > 0 ||
        nextProgress.room_status === "processing";

      setIsProcessing(stillProcessing);
    } catch {
      // Keep page usable if polling fails once.
    }
  }

  async function uploadPhotos() {
    setMessage("");

    if (files.length === 0) {
      setMessage("Please select at least one event photo before starting the scan.");
      return;
    }

    const token = await getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    try {
      setIsUploading(true);
      setIsProcessing(true);

      await api.post(`/rooms/${code}/photos`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setFiles([]);

      setRoom((currentRoom) => {
        if (!currentRoom) return currentRoom;

        return {
          ...currentRoom,
          status: "processing",
        };
      });

      await loadProgress();
    } catch (error: any) {
      setMessage(
        error.response?.data?.detail ||
          error.message ||
          "Upload failed. Please try again."
      );
      setIsProcessing(false);
    } finally {
      setIsUploading(false);
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

    if (room.status === "ready") {
      setIsProcessing(false);
      return;
    }

    const interval = window.setInterval(() => {
      loadProgress();
    }, 3000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.status, room?.is_uploader]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_45%,#000_100%)] p-4 text-white sm:p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <RoomHeader
            roomCode={code}
            title="Loading room"
            subtitle="Preparing the FaceIt control center."
            onBack={() => router.push("/room/create")}
          />

          <ProcessingSkeleton />
        </div>
      </main>
    );
  }

  if (message && !room) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_45%,#000_100%)] p-4 text-white sm:p-6">
        <div className="mx-auto flex min-h-[80vh] max-w-lg items-center justify-center">
          <Alert className="border-red-900/70 bg-red-950/40 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Room Error</AlertTitle>
            <AlertDescription className="mt-2">{message}</AlertDescription>

            <Button
              onClick={() => router.push("/room/create")}
              className="mt-4 w-full bg-cyan-400 text-zinc-950 hover:bg-cyan-300"
            >
              Create New Room
            </Button>
          </Alert>
        </div>
      </main>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_45%,#000_100%)] p-4 text-white sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <RoomHeader
          roomCode={room.room_code}
          title={room.name}
          subtitle={
            room.is_uploader
              ? "Upload event photos, track DeepFace processing, and prepare private participant galleries."
              : "This room is ready for participants. Open your private matched photo gallery."
          }
          onBack={() => router.push("/room/create")}
          onReview={
            room.is_uploader
              ? () => router.push(`/room/${room.room_code}/review`)
              : undefined
          }
          onMyPhotos={() => router.push(`/room/${room.room_code}/my-photos`)}
        />

        {message && (
          <Alert className="border-red-900/70 bg-red-950/40 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Card className="border-zinc-800 bg-zinc-950/80 p-6 shadow-2xl shadow-black/30">
          <div className="grid gap-4 text-sm text-zinc-400 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Status
              </p>
              <p className="mt-2 font-semibold uppercase text-cyan-300">
                {room.status}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Created
              </p>
              <p className="mt-2 text-zinc-200">
                {new Date(room.created_at).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-zinc-500">
                Photos available until
              </p>
              <p className="mt-2 text-zinc-200">
                {new Date(room.expires_at).toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Photos and matches are automatically deleted after expiry.
              </p>
            </div>
          </div>
        </Card>

        {room.is_uploader ? (
          <>
            <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
              <div className="space-y-4">
                <Dropzone
                  files={files}
                  onFilesChange={setFiles}
                  disabled={isUploading}
                />

                <Button
                  onClick={uploadPhotos}
                  disabled={isUploading || files.length === 0}
                  className="w-full bg-cyan-400 py-6 text-base font-semibold text-zinc-950 hover:bg-cyan-300 disabled:opacity-50"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 size-5 animate-spin" />
                      Uploading to secure room...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 size-5" />
                      Start Face Scan
                    </>
                  )}
                </Button>

                <p className="text-xs text-zinc-500">
                  Photos are uploaded to private Supabase Storage. The worker
                  then detects faces, generates embeddings, and updates this
                  room status.
                </p>
              </div>

              <Card className="relative min-h-[360px] overflow-hidden border-zinc-800 bg-zinc-950/80 p-4 shadow-2xl shadow-black/30">
                <AnimatePresence mode="wait">
                  {previewUrl ? (
                    <motion.div
                      key={previewUrl}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{
                        type: "spring",
                        stiffness: 220,
                        damping: 24,
                      }}
                      className="relative overflow-hidden rounded-xl"
                    >
                      <img
                        src={previewUrl}
                        alt="Selected event preview"
                        className="h-[320px] w-full object-cover"
                      />

                      <ScanningOverlay
                        active={scanningActive}
                        label={
                          isUploading ? "Uploading securely" : "Scanning faces"
                        }
                      />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty-preview"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-[320px] items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-black/30 p-6 text-center"
                    >
                      <div>
                        <div className="mx-auto mb-4 h-14 w-14 rounded-full border border-cyan-400/30 bg-cyan-400/10" />
                        <p className="text-sm font-medium text-zinc-300">
                          Image preview will appear here
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Once photos are selected, FaceIt will show the active
                          scan state here.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </section>

            {progress ? (
              <ResultsDashboard
                total={progress.total}
                done={progress.done}
                pending={progress.pending}
                processing={progress.processing}
                failed={progress.failed}
                roomStatus={progress.room_status}
              />
            ) : (
              <ProcessingSkeleton />
            )}
          </>
        ) : (
          <Card className="border-zinc-800 bg-zinc-950/80 p-6">
            <h2 className="text-xl font-semibold text-white">
              Participant View
            </h2>

            <p className="mt-2 text-sm text-zinc-400">
              Participants can view their private matched photos from this room.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => router.push(`/room/${room.room_code}/my-photos`)}
                className="bg-cyan-400 text-zinc-950 hover:bg-cyan-300"
              >
                View My Photos
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push(`/room/${room.room_code}/guest`)}
                className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900"
              >
                Continue as Guest
              </Button>
            </div>
          </Card>
        )}

        <Button
          variant="outline"
          onClick={() => router.push("/room/create")}
          className="w-full border-zinc-700 bg-transparent text-white hover:bg-zinc-900"
        >
          Create Another Room
        </Button>
      </div>
    </main>
  );
}