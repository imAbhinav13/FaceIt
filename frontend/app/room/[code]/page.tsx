"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Database,
  Loader2,
  LockKeyhole,
  ScanFace,
  Sparkles,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black p-4 text-white sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.18),transparent_30%),radial-gradient(circle_at_bottom,rgba(16,185,129,0.10),transparent_36%)]" />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="pointer-events-none absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl space-y-6">{children}</div>
    </main>
  );
}

function InfoStrip({ room }: { room: RoomEvent }) {
  return (
    <Card className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-0 shadow-2xl shadow-black/30 backdrop-blur-xl">
      <div className="grid divide-y divide-white/10 md:grid-cols-4 md:divide-x md:divide-y-0">
        <div className="p-5">
          <p className="text-xs font-medium text-zinc-500">
            Room Status
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
            <p className="font-semibold uppercase text-cyan-200">
              {room.status}
            </p>
          </div>
        </div>

        <div className="p-5">
          <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">
            Created
          </p>
          <p className="mt-3 text-sm text-zinc-200">
            {new Date(room.created_at).toLocaleString()}
          </p>
        </div>

        <div className="p-5">
          <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">
            Auto Expiry
          </p>
          <p className="mt-3 text-sm text-zinc-200">
            {new Date(room.expires_at).toLocaleString()}
          </p>
        </div>

        <div className="p-5">
          <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">
            Storage Mode
          </p>
          <div className="mt-3 flex items-center gap-2 text-sm text-zinc-200">
            <LockKeyhole className="size-4 text-emerald-300" />
            Private signed URLs
          </div>
        </div>
      </div>
    </Card>
  );
}

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
      // Keep page usable if one polling request fails.
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
      <PageShell>
        <RoomHeader
          roomCode={code}
          title="Loading room"
          subtitle="Preparing the FaceIt control center."
          onBack={() => router.push("/room/create")}
        />

        <ProcessingSkeleton />
      </PageShell>
    );
  }

  if (message && !room) {
    return (
      <PageShell>
        <div className="mx-auto flex min-h-[80vh] max-w-lg items-center justify-center">
          <Alert className="border-red-900/70 bg-red-950/40 text-red-100">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Room Error</AlertTitle>
            <AlertDescription className="mt-2">{message}</AlertDescription>

            <Button
              onClick={() => router.push("/room/create")}
              className="mt-4 w-full bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
            >
              Create New Room
            </Button>
          </Alert>
        </div>
      </PageShell>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <PageShell>
      <RoomHeader
        roomCode={room.room_code}
        title={room.name}
        status={room.status}
        expiresAt={room.expires_at}
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

      <InfoStrip room={room} />

      {room.is_uploader ? (
        <>
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_460px]">
            <div className="space-y-4">
              <Dropzone
                files={files}
                onFilesChange={setFiles}
                disabled={isUploading}
              />

              <Card className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <ScanFace className="size-4 text-cyan-200" />
                      <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-100">
                        Scan Command
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-zinc-400">
                      Start the upload and worker pipeline for this staged batch.
                    </p>
                  </div>

                  <Button
                    onClick={uploadPhotos}
                    disabled={isUploading || files.length === 0}
                    className="bg-cyan-300 px-6 py-6 text-base font-semibold text-zinc-950 shadow-lg shadow-cyan-950/30 hover:bg-cyan-200 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 size-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 size-5" />
                        Start Face Scan
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>

            <Card className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between px-1">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-100">
                    AI Scan Stage
                  </p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Live visual state for the active batch.
                  </p>
                </div>

                <Badge
                  variant="outline"
                  className="border-white/10 bg-black/30 text-zinc-300"
                >
                  {files.length > 0 ? `${files.length} staged` : "Idle"}
                </Badge>
              </div>

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
                    className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black"
                  >
                    <img
                      src={previewUrl}
                      alt="Selected event preview"
                      className="h-[420px] w-full object-cover"
                    />

                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-4">
                      <p className="truncate text-sm font-medium text-white">
                        {files[0]?.name}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        First preview from current staged batch
                      </p>
                    </div>

                    <ScanningOverlay
                      active={scanningActive}
                      label={
                        isUploading
                          ? "Secure upload active"
                          : "Facial vector scan active"
                      }
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-[420px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-black/35 p-6 text-center"
                  >
                    <div className="max-w-sm">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 shadow-2xl shadow-cyan-950/40">
                        <Database className="size-8 text-cyan-200" />
                      </div>

                      <p className="mt-5 text-lg font-semibold text-white">
                        Waiting for photo batch
                      </p>

                      <p className="mt-2 text-sm leading-6 text-zinc-500">
                        Select or drop event photos. The AI scan stage will show
                        the first preview and active processing animation.
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
        <Card className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-cyan-100">
              Participant Access
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-white">
              Open your private matched gallery
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Participants can view only the photos matched to their enrolled
              face profile. Guest users can use temporary selfie matching.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => router.push(`/room/${room.room_code}/my-photos`)}
                className="bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
              >
                View My Photos
                <ArrowRight className="ml-2 size-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push(`/room/${room.room_code}/guest`)}
                className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
              >
                Continue as Guest
              </Button>
            </div>
          </div>
        </Card>
      )}
    </PageShell>
  );
}