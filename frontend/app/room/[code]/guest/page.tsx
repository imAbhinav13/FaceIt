"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  Download,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { saveAs } from "file-saver";

import { api } from "@/lib/api";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { InfoHint } from "@/components/faceit/InfoHint";
import { ScanningOverlay } from "@/components/faceit/ScanningOverlay";

type GuestRoom = {
  id: string;
  room_code: string;
  name: string;
  status: string;
  expires_at?: string;
  created_at?: string;
};

type GuestPhoto = {
  photo_id: string;
  face_id?: string;
  confidence: number;
  status: string;
  signed_url: string;
  storage_path: string;
};

type GuestStatusResponse = {
  success: boolean;
  guest_session_id: string;
  status: "pending" | "processing" | "done" | "failed";
  room: GuestRoom;
  photos: GuestPhoto[];
  message: string | null;
  error: string | null;
  signed_url_ttl_seconds?: number;
};

const gridVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 220, damping: 24 },
  },
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
      <div className="relative mx-auto max-w-7xl space-y-6">{children}</div>
    </main>
  );
}

function GuestSkeleton() {
  return (
    <PageShell>
      <Card className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6">
        <Skeleton className="h-4 w-36 bg-zinc-800" />
        <Skeleton className="mt-4 h-10 w-72 bg-zinc-800" />
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Skeleton className="h-[520px] rounded-[2rem] bg-zinc-900" />
        <Skeleton className="h-[520px] rounded-[2rem] bg-zinc-900" />
      </div>
    </PageShell>
  );
}

export default function GuestPage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code || "").toUpperCase();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<GuestRoom | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [cameraError, setCameraError] = useState("");

  const [guestSessionId, setGuestSessionId] = useState<string | null>(null);
  const [guestStatus, setGuestStatus] = useState<GuestStatusResponse | null>(
    null
  );
  const [isMatching, setIsMatching] = useState(false);

  const activeFrame = frames[frames.length - 1] || null;
  const photos = guestStatus?.photos || [];
  const status = guestStatus?.status;

  async function validateRoom() {
    setLoading(true);
    setMessage("");

    try {
      const response = await api.post(`/rooms/${code}/guest/validate`);
      setRoom(response.data.room);

      if (!response.data.can_join_as_guest) {
        setMessage(response.data.reason || "Guest matching is not available.");
      }
    } catch (error: any) {
      setMessage(
        error.response?.data?.detail ||
          error.message ||
          "Failed to validate guest room."
      );
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    setCameraError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setCameraError("Camera access failed.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current || frames.length >= 3) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const frame = canvas.toDataURL("image/jpeg", 0.9);
    setFrames((prev) => [...prev, frame].slice(0, 3));
  }

  function resetFrames() {
    setFrames([]);
    setGuestSessionId(null);
    setGuestStatus(null);
    setIsMatching(false);
    setMessage("");
  }

  async function startGuestMatch() {
    if (frames.length !== 3) {
      setMessage("Capture 3 selfies first.");
      return;
    }

    setMessage("");
    setIsMatching(true);

    try {
      const response = await api.post(`/rooms/${code}/guest-match`, {
        frames,
      });

      if (!response.data.can_match) {
        setMessage(response.data.reason || "Guest matching is not available.");
        setIsMatching(false);
        return;
      }

      setGuestSessionId(response.data.guest_session_id);
    } catch (error: any) {
      setMessage(
        error.response?.data?.detail ||
          error.message ||
          "Failed to start guest match."
      );
      setIsMatching(false);
    }
  }

  async function loadGuestStatus(sessionId: string) {
    try {
      const response = await api.get(`/rooms/${code}/guest-status/${sessionId}`);
      setGuestStatus(response.data);

      if (response.data.status === "done" || response.data.status === "failed") {
        setIsMatching(false);
      }
    } catch (error: any) {
      setMessage(
        error.response?.data?.detail ||
          error.message ||
          "Failed to refresh guest status."
      );
      setIsMatching(false);
    }
  }

  async function downloadOne(photo: GuestPhoto, index: number) {
    const response = await fetch(photo.signed_url);
    const blob = await response.blob();
    saveAs(blob, `faceit-${code}-guest-${index + 1}.jpg`);
  }

  useEffect(() => {
    if (!code) return;

    validateRoom();
    startCamera();

    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (!guestSessionId) return;

    loadGuestStatus(guestSessionId);

    const interval = window.setInterval(() => {
      loadGuestStatus(guestSessionId);
    }, 3000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestSessionId]);

  if (loading) {
    return <GuestSkeleton />;
  }

  return (
    <PageShell>
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 170, damping: 22 }}
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 p-2">
                <UserRound className="size-4 text-cyan-200" />
              </div>
              <p className="text-xs font-medium text-cyan-100">Guest Match</p>
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {room?.name || "Guest Photos"}
            </h1>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Badge
                variant="outline"
                className="rounded-full border-white/10 bg-black/30 px-3 py-1.5 text-zinc-300"
              >
                Room {code}
              </Badge>

              <Badge className="rounded-full bg-cyan-300 text-zinc-950 hover:bg-cyan-200">
                {frames.length}/3 selfies
              </Badge>

              <InfoHint
                side="right"
                text="Guest selfies are used for this temporary match only and are not saved as account enrollment."
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push(`/room/${code}`)}
            className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 size-4" />
            Room
          </Button>
        </div>
      </motion.header>

      {(message || cameraError) && (
        <Alert className="border-red-900/70 bg-red-950/40 text-red-100">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Guest flow notice</AlertTitle>
          <AlertDescription>{message || cameraError}</AlertDescription>
        </Alert>
      )}

      <section className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <Card className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-white">Camera</p>
            <Badge
              variant="outline"
              className="border-white/10 bg-black/30 text-zinc-300"
            >
              3 selfies required
            </Badge>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="block w-full"
            />
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <div className="mt-5 grid grid-cols-3 gap-3">
            {[0, 1, 2].map((slot) => (
              <motion.div
                key={slot}
                layout
                className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black/35"
              >
                <AnimatePresence mode="wait">
                  {frames[slot] ? (
                    <motion.img
                      key={frames[slot]}
                      src={frames[slot]}
                      alt={`Selfie frame ${slot + 1}`}
                      initial={{ opacity: 0, scale: 0.88 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.88 }}
                      transition={{
                        type: "spring",
                        stiffness: 260,
                        damping: 22,
                      }}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex h-full items-center justify-center text-xs text-zinc-600"
                    >
                      {slot + 1}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Button
              onClick={captureFrame}
              disabled={frames.length >= 3 || isMatching}
              className="bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
            >
              <Camera className="mr-2 size-4" />
              Capture
            </Button>

            <Button
              variant="outline"
              onClick={resetFrames}
              disabled={isMatching}
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
            >
              Reset
            </Button>
          </div>
        </Card>

        <Card className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-white">Scan stage</p>
            <Badge
              variant="outline"
              className="border-white/10 bg-black/30 text-zinc-300"
            >
              {status || "Idle"}
            </Badge>
          </div>

          <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-black">
            {activeFrame ? (
              <img
                src={activeFrame}
                alt="Guest selfie preview"
                className="block w-full"
              />
            ) : (
              <div className="flex h-[360px] items-center justify-center">
                <div className="text-center">
                  <Sparkles className="mx-auto size-8 text-cyan-200" />
                  <p className="mt-4 text-sm text-zinc-400">
                    Capture selfies to begin
                  </p>
                </div>
              </div>
            )}

            <ScanningOverlay
              active={isMatching || status === "pending" || status === "processing"}
              label="Guest match active"
            />
          </div>

          <Button
            onClick={startGuestMatch}
            disabled={frames.length !== 3 || isMatching}
            className="mt-5 w-full bg-cyan-300 py-6 text-base font-semibold text-zinc-950 hover:bg-cyan-200"
          >
            {isMatching ? (
              <>
                <Loader2 className="mr-2 size-5 animate-spin" />
                Matching...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 size-5" />
                Start Guest Match
              </>
            )}
          </Button>

          {guestSessionId && (
            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 p-3">
              <span className="text-sm text-zinc-300">Guest session</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadGuestStatus(guestSessionId)}
                className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
              >
                <RefreshCw className="mr-2 size-4" />
                Refresh
              </Button>
            </div>
          )}
        </Card>
      </section>

      {guestStatus?.status === "done" && (
        <Alert className="border-amber-900/70 bg-amber-950/30 text-amber-100">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Download before leaving</AlertTitle>
          <AlertDescription>
            Guest results are temporary and may disappear if this session
            expires or the backend restarts.
          </AlertDescription>
        </Alert>
      )}

      {guestStatus?.status === "failed" && (
        <Alert className="border-red-900/70 bg-red-950/40 text-red-100">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Guest match failed</AlertTitle>
          <AlertDescription>
            {guestStatus.error || "Please reset and try again."}
          </AlertDescription>
        </Alert>
      )}

      {guestStatus?.status === "done" && photos.length === 0 && (
        <Card className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-10 text-center shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10">
            <Camera className="size-8 text-cyan-200" />
          </div>

          <h2 className="mt-6 text-2xl font-semibold text-white">
            No photos found
          </h2>

          <div className="mt-6 flex justify-center">
            <Button
              onClick={resetFrames}
              className="bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
            >
              Try Again
            </Button>
          </div>
        </Card>
      )}

      {photos.length > 0 && (
        <motion.section
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {photos.map((photo, index) => (
            <motion.div key={photo.photo_id} variants={cardVariants}>
              <Card className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="relative overflow-hidden bg-black">
                  <img
                    src={photo.signed_url}
                    alt={`Guest matched photo ${index + 1}`}
                    className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />

                  <Badge className="absolute left-3 top-3 bg-emerald-300 text-zinc-950 hover:bg-emerald-200">
                    {(photo.confidence * 100).toFixed(1)}%
                  </Badge>
                </div>

                <div className="p-4">
                  <Button
                    onClick={() => downloadOne(photo, index)}
                    className="w-full bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
                  >
                    <Download className="mr-2 size-4" />
                    Download
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.section>
      )}
    </PageShell>
  );
}