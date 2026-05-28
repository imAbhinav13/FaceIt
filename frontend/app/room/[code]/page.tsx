"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CloudUpload,
  Database,
  Images,
  Loader2,
  LockKeyhole,
  ScanFace,
  Sparkles,
  Timer,
  UserRound,
  XCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { Dropzone } from "@/components/faceit/Dropzone";
import { ProcessingSkeleton } from "@/components/faceit/ProcessingSkeleton";
import { ScanningOverlay } from "@/components/faceit/ScanningOverlay";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Page shell                                                                  */
/* -------------------------------------------------------------------------- */
/*
  Latest UI update:
  - Uses global faceit-page style.
  - Removes old purple/green hue.
  - Keeps only cyan FaceIt background.
  - Includes subtle grid + grain like other redesigned pages.
*/

function PageShell({ children }: { children: ReactNode }) {
  return (
    <main className="faceit-page relative min-h-screen overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {/* Main cyan aurora */}
        <motion.div
          className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Secondary cyan glow only */}
        <motion.div
          className="absolute -bottom-32 -right-32 h-[520px] w-[520px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(34,211,238,0.045) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0.7, 0.35] }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />

        {/* Light square grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
          }}
        />

        {/* Subtle grain */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl space-y-5">
        {children}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Clean header                                                                */
/* -------------------------------------------------------------------------- */
/*
  Latest UI update:
  - Removes "FaceIt AI Room".
  - Removes the big bubble/logo treatment.
  - Keeps room code, status, title, expiry, and actions.
*/

function CleanRoomHeader({
  roomCode,
  title,
  status,
  expiresAt,
  subtitle,
  onBack,
  onReview,
  onMyPhotos,
}: {
  roomCode: string;
  title: string;
  status?: string;
  expiresAt?: string;
  subtitle: string;
  onBack: () => void;
  onReview?: () => void;
  onMyPhotos?: () => void;
}) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="pt-2"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="mb-5 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/50 transition hover:bg-white/[0.04] hover:text-white/75"
          >
            <ArrowLeft size={15} />
            Back
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-cyan-300/20 bg-cyan-300/10 text-cyan-200"
            >
              {roomCode}
            </Badge>

            {status && (
              <Badge
                variant="outline"
                className="border-white/10 bg-white/[0.03] text-white/55"
              >
                {status}
              </Badge>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white/90 sm:text-4xl">
            {title}
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
            {subtitle}
          </p>

          {expiresAt && (
            <p className="font-faceit-mono mt-3 text-[11px] uppercase tracking-[0.12em] text-white/25">
              Expires {new Date(expiresAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {onReview && (
            <Button
              variant="outline"
              onClick={onReview}
              className="border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/[0.07]"
            >
              Review
            </Button>
          )}

          {onMyPhotos && (
            <Button
              onClick={onMyPhotos}
              className="faceit-primary-button text-black"
            >
              My Photos
              <ArrowRight className="ml-2 size-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
}

/* -------------------------------------------------------------------------- */
/* Room info strip                                                             */
/* -------------------------------------------------------------------------- */

function InfoStrip({ room }: { room: RoomEvent }) {
  const items = [
    {
      label: "Status",
      value: room.status,
      icon: ScanFace,
    },
    {
      label: "Created",
      value: new Date(room.created_at).toLocaleDateString(),
      icon: Clock3,
    },
    {
      label: "Expiry",
      value: new Date(room.expires_at).toLocaleDateString(),
      icon: Timer,
    },
    {
      label: "Access",
      value: "Private URLs",
      icon: LockKeyhole,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div key={item.label} className="faceit-glass-soft rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-xl"
                style={{
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.16)",
                }}
              >
                <Icon className="text-cyan-300" size={17} />
              </div>

              <div>
                <p className="font-faceit-mono text-[10px] uppercase tracking-[0.12em] text-white/25">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-medium text-white/75">
                  {item.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Compact progress panel                                                      */
/* -------------------------------------------------------------------------- */
/*
  Latest UI update:
  - Replaces heavy "Photo processing progress" dashboard.
  - Avoids brick-like blocks.
  - Shows one clear progress bar and four compact counters.
  - Used instead of ResultsDashboard.
*/

function CompactProgressPanel({
  total,
  done,
  pending,
  processing,
  failed,
  roomStatus,
}: {
  total: number;
  done: number;
  pending: number;
  processing: number;
  failed: number;
  roomStatus: string;
}) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  const waiting = total === 0;

  const items = [
    {
      label: "Uploaded",
      value: total,
      icon: CloudUpload,
      active: total > 0,
    },
    {
      label: "Scanning",
      value: processing + pending,
      icon: ScanFace,
      active: processing > 0 || pending > 0,
    },
    {
      label: "Ready",
      value: done,
      icon: CheckCircle2,
      active: done > 0,
    },
    {
      label: "Failed",
      value: failed,
      icon: XCircle,
      active: failed > 0,
    },
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="faceit-glass rounded-3xl p-5 sm:p-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-faceit-mono text-[11px] uppercase tracking-[0.14em] text-cyan-400/80">
            Processing
          </p>

          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white/90">
            {waiting ? "Waiting for photos" : "Photo scan progress"}
          </h2>

          <p className="mt-2 max-w-xl text-sm leading-6 text-white/38">
            {waiting
              ? "Upload an event photo batch to begin face detection and gallery preparation."
              : `${done} of ${total} photos are ready for matching.`}
          </p>
        </div>

        <div className="text-left lg:text-right">
          <p className="font-faceit-mono text-[11px] uppercase tracking-[0.14em] text-white/25">
            Overall
          </p>

          <p className="mt-1 text-4xl font-semibold text-white/90">
            {percent}%
          </p>

          <Badge
            variant="outline"
            className="mt-2 border-cyan-300/20 bg-cyan-300/10 text-cyan-200"
          >
            {roomStatus}
          </Badge>
        </div>
      </div>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full rounded-full"
          style={{
            background:
              "linear-gradient(90deg, rgb(34,211,238), rgb(6,182,212))",
            boxShadow: "0 0 18px rgba(34,211,238,0.35)",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl p-4"
              style={{
                background: item.active
                  ? "rgba(34,211,238,0.08)"
                  : "rgba(255,255,255,0.025)",
                border: item.active
                  ? "1px solid rgba(34,211,238,0.18)"
                  : "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-faceit-mono text-[10px] uppercase tracking-[0.12em] text-white/25">
                    {item.label}
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-white/85">
                    {item.value}
                  </p>
                </div>

                <Icon
                  size={22}
                  className={item.active ? "text-cyan-300" : "text-white/25"}
                />
              </div>
            </div>
          );
        })}
      </div>
    </motion.section>
  );
}

/* -------------------------------------------------------------------------- */
/* Uploader preview panel                                                      */
/* -------------------------------------------------------------------------- */

function PreviewPanel({
  files,
  previewUrl,
  scanningActive,
  isUploading,
}: {
  files: File[];
  previewUrl: string | null;
  scanningActive: boolean;
  isUploading: boolean;
}) {
  return (
    <Card className="faceit-glass relative overflow-hidden rounded-3xl p-4">
      <div className="mb-4 flex items-center justify-between px-1">
        <div>
          <p className="font-faceit-mono text-[11px] uppercase tracking-[0.14em] text-cyan-400/80">
            Preview
          </p>
          <p className="mt-1 text-sm text-white/35">
            First image from the selected batch.
          </p>
        </div>

        <Badge
          variant="outline"
          className="border-white/10 bg-white/[0.03] text-white/55"
        >
          {files.length > 0 ? `${files.length} staged` : "Idle"}
        </Badge>
      </div>

      <AnimatePresence mode="wait">
        {previewUrl ? (
          <motion.div
            key={previewUrl}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 220, damping: 24 }}
            className="relative overflow-hidden rounded-3xl border border-white/10 bg-black"
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
              <p className="mt-1 text-xs text-white/40">
                Preview from current staged batch
              </p>
            </div>

            <ScanningOverlay
              active={scanningActive}
              label={
                isUploading
                  ? "Uploading selected photos"
                  : "Preparing face detection"
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key="empty-preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex h-[420px] items-center justify-center rounded-3xl border border-dashed border-white/10 bg-black/25 p-6 text-center"
          >
            <div className="max-w-sm">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl"
                style={{
                  background: "rgba(34,211,238,0.08)",
                  border: "1px solid rgba(34,211,238,0.18)",
                }}
              >
                <Database className="size-7 text-cyan-300" />
              </div>

              <p className="mt-5 text-lg font-semibold text-white/90">
                Waiting for photo batch
              </p>

              <p className="mt-2 text-sm leading-6 text-white/35">
                Select event photos to preview the first image before upload.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Main page                                                                   */
/* -------------------------------------------------------------------------- */

export default function RoomPage() {
  const router = useRouter();
  const params = useParams<{ code?: string }>();
  const searchParams = useSearchParams();

  /*
    Supports both:
    - /room/[code] through params.code
    - /room?code=ABC123 through search params

    If your project only uses /room/[code], this still works.
  */
  const code = useMemo(() => {
    const paramCode = params?.code;
    const queryCode = searchParams.get("code");

    return String(paramCode || queryCode || "").toUpperCase();
  }, [params?.code, searchParams]);

  const progressRef = useRef<HTMLDivElement | null>(null);

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
      /*
        Keep the page usable even if one polling request fails.
        The next polling interval can still recover.
      */
    }
  }

  async function uploadPhotos() {
    setMessage("");

    if (files.length === 0) {
      setMessage("Please select at least one event photo before starting upload.");
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

  /* Load room details */
  useEffect(() => {
    async function loadRoom() {
      setMessage("");

      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      if (!code) {
        setMessage("Missing room code.");
        setLoading(false);
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

    loadRoom();
  }, [code, router]);

  /* Poll progress for uploader room */
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

  /* Auto-scroll to compact progress when upload/processing starts */
  useEffect(() => {
    if (!isUploading && !isProcessing) return;

    const timer = window.setTimeout(() => {
      progressRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [isUploading, isProcessing]);

  /* Clean object URL */
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (loading) {
    return (
      <PageShell>
        <CleanRoomHeader
          roomCode={code || "ROOM"}
          title="Loading room"
          subtitle="Preparing room details."
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
              className="faceit-primary-button mt-4 w-full text-black"
            >
              Create New Room
            </Button>
          </Alert>
        </div>
      </PageShell>
    );
  }

  if (!room) return null;

  return (
    <PageShell>
      <CleanRoomHeader
        roomCode={room.room_code}
        title={room.name}
        status={room.status}
        expiresAt={room.expires_at}
        subtitle={
          room.is_uploader
            ? "Upload event photos and prepare private participant galleries."
            : "Open your private matched photo gallery."
        }
        onBack={() => router.push("/room/create")}
        onReview={
          room.is_uploader
            ? () => router.push(`/room/${room.room_code}/review`)
            : undefined
        }
        onMyPhotos={() => router.push(`/room/${room.room_code}/my-photos`)}
      />

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Alert className="border-red-900/70 bg-red-950/40 text-red-100">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

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

              <Card className="faceit-glass rounded-3xl p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CloudUpload className="size-4 text-cyan-300" />

                      <p className="font-faceit-mono text-[11px] uppercase tracking-[0.14em] text-cyan-400/80">
                        Upload
                      </p>
                    </div>

                    <p className="mt-2 text-sm leading-6 text-white/38">
                      Start uploading the staged event photo batch.
                    </p>
                  </div>

                  <Button
                    onClick={uploadPhotos}
                    disabled={isUploading || files.length === 0}
                    className="faceit-primary-button px-6 py-6 text-base font-semibold text-black disabled:opacity-50"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 size-5 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 size-5" />
                        Start Upload
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </div>

            <PreviewPanel
              files={files}
              previewUrl={previewUrl}
              scanningActive={scanningActive}
              isUploading={isUploading}
            />
          </section>

          <div ref={progressRef} className="scroll-mt-6">
            {progress ? (
              <CompactProgressPanel
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
          </div>
        </>
      ) : (
        <Card className="faceit-glass overflow-hidden rounded-3xl p-6">
          <div className="max-w-2xl">
            <p className="font-faceit-mono text-[11px] uppercase tracking-[0.14em] text-cyan-400/80">
              Participant access
            </p>

            <h2 className="mt-3 text-2xl font-semibold text-white/90">
              Open your private matched gallery
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/40">
              Participants can view photos matched to their enrolled face
              profile. Guests can continue with temporary selfie matching.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => router.push(`/room/${room.room_code}/my-photos`)}
                className="faceit-primary-button text-black"
              >
                <Images className="mr-2 size-4" />
                View My Photos
                <ArrowRight className="ml-2 size-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push(`/room/${room.room_code}/guest`)}
                className="border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.07]"
              >
                <UserRound className="mr-2 size-4" />
                Continue as Guest
              </Button>
            </div>
          </div>
        </Card>
      )}
    </PageShell>
  );
}