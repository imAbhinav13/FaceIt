"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Download,
  ImageIcon,
  Images,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/* -------------------------------------------------------------------------- */
/* Types                                                                       */
/* -------------------------------------------------------------------------- */

type MatchStatus = {
  match_job_status: string;
  matched_count: number;
  review_count: number;
  room: {
    id: string;
    room_code: string;
    name: string;
    status: string;
  };
};

type GalleryPhoto = {
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
  photos: GalleryPhoto[];
  message: string | null;
};

/* -------------------------------------------------------------------------- */
/* Motion variants                                                             */
/* -------------------------------------------------------------------------- */

const gridVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.075,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 220,
      damping: 24,
    },
  },
};

/* -------------------------------------------------------------------------- */
/* Latest FaceIt page shell                                                    */
/* -------------------------------------------------------------------------- */
/*
  Updated to match latest UI:
  - Uses global faceit-page.
  - Removes purple/green hue.
  - Keeps only cyan FaceIt aurora.
  - Keeps subtle grid background.
*/

function PageShell({ children }: { children: React.ReactNode }) {
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
/* Loading state                                                               */
/* -------------------------------------------------------------------------- */

function GallerySkeleton() {
  return (
    <div className="space-y-5">
      <div className="faceit-glass rounded-3xl p-6">
        <div className="faceit-skeleton h-4 w-40 rounded-full" />
        <div className="faceit-skeleton mt-4 h-10 w-72 max-w-full rounded-xl" />
        <div className="faceit-skeleton mt-3 h-4 w-96 max-w-full rounded-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="faceit-glass overflow-hidden rounded-3xl"
          >
            <div className="faceit-skeleton h-64 w-full" />
            <div className="p-4">
              <div className="faceit-skeleton h-4 w-32 rounded-full" />
              <div className="faceit-skeleton mt-3 h-10 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small helpers                                                               */
/* -------------------------------------------------------------------------- */

function getConfidenceStyle(confidence: number) {
  if (confidence >= 0.6) {
    return {
      label: "High match",
      bg: "rgba(52,211,153,0.12)",
      border: "rgba(52,211,153,0.35)",
      text: "text-emerald-300",
    };
  }

  if (confidence >= 0.45) {
    return {
      label: "Medium match",
      bg: "rgba(251,191,36,0.12)",
      border: "rgba(251,191,36,0.35)",
      text: "text-amber-300",
    };
  }

  return {
    label: "Low match",
    bg: "rgba(251,146,60,0.12)",
    border: "rgba(251,146,60,0.35)",
    text: "text-orange-300",
  };
}

/* -------------------------------------------------------------------------- */
/* Main page                                                                   */
/* -------------------------------------------------------------------------- */

export default function MyPhotosPage() {
  const params = useParams();
  const router = useRouter();

  const code = String(params.code || "").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [message, setMessage] = useState("");

  const [matchStatus, setMatchStatus] = useState<MatchStatus | null>(null);
  const [photosData, setPhotosData] = useState<MyPhotosResponse | null>(null);

  const photos = photosData?.photos || [];
  const room = photosData?.room || matchStatus?.room;

  const signedTtlMinutes = useMemo(() => {
    if (!photosData?.signed_url_ttl_seconds) return 60;
    return Math.round(photosData.signed_url_ttl_seconds / 60);
  }, [photosData?.signed_url_ttl_seconds]);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }

  async function loadMyPhotos(options?: { silent?: boolean }) {
    const token = await getToken();

    if (!token) {
      router.push("/login");
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setMessage("");

    try {
      const [statusResponse, photosResponse] = await Promise.all([
        api.get(`/rooms/${code}/match-status`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        api.get(`/rooms/${code}/my-photos`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      setMatchStatus(statusResponse.data);
      setPhotosData(photosResponse.data);
    } catch (error: any) {
      setMessage(
        error.response?.data?.detail ||
          error.message ||
          "Failed to load your photos."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function downloadOne(photo: GalleryPhoto) {
    const response = await fetch(photo.signed_url);
    const blob = await response.blob();

    saveAs(blob, `faceit-${code}-${photo.photo_id}.jpg`);
  }

  async function downloadAllAsZip() {
    if (!photos.length) return;

    setDownloadingZip(true);
    setMessage("");

    try {
      const token = await getToken();

      if (!token) {
        router.push("/login");
        return;
      }

      /*
        Refresh signed URLs before ZIP download.
        This avoids broken downloads if older signed URLs have expired.
      */
      const freshResponse = await api.get(`/rooms/${code}/my-photos`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const freshPhotos: GalleryPhoto[] = freshResponse.data.photos || [];
      const zip = new JSZip();

      for (let index = 0; index < freshPhotos.length; index += 1) {
        const photo = freshPhotos[index];
        const response = await fetch(photo.signed_url);
        const blob = await response.blob();

        zip.file(`faceit-${code}-${index + 1}.jpg`, blob);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      saveAs(zipBlob, `faceit-${code}-my-photos.zip`);
    } catch (error: any) {
      setMessage(error.message || "Failed to download ZIP.");
    } finally {
      setDownloadingZip(false);
    }
  }

  useEffect(() => {
    if (!code) return;

    loadMyPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  /*
    Poll while matching is not done or while review items exist.
    Approved photos can appear after uploader review.
  */
  useEffect(() => {
    if (!matchStatus) return;

    const shouldPoll =
      matchStatus.match_job_status === "pending" ||
      matchStatus.match_job_status === "processing" ||
      matchStatus.match_job_status === "not_started" ||
      matchStatus.review_count > 0;

    if (!shouldPoll) return;

    const interval = window.setInterval(() => {
      loadMyPhotos({ silent: true });
    }, 5000);

    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchStatus?.match_job_status, matchStatus?.review_count, code]);

  if (loading) {
    return (
      <PageShell>
        <GallerySkeleton />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 190, damping: 24 }}
        className="pt-2"
      >
        <button
          type="button"
          onClick={() => router.push(`/room/${code}`)}
          className="mb-5 inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/50 transition hover:bg-white/[0.04] hover:text-white/75"
        >
          <ArrowLeft size={15} />
          Room
        </button>

        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className="border-cyan-300/20 bg-cyan-300/10 text-cyan-200"
              >
                Room {code}
              </Badge>

              <Badge
                variant="outline"
                className="border-white/10 bg-white/[0.03] text-white/55"
              >
                {photos.length} matched
              </Badge>

              {matchStatus && (
                <Badge
                  variant="outline"
                  className="border-emerald-300/20 bg-emerald-300/10 text-emerald-200"
                >
                  {matchStatus.match_job_status}
                </Badge>
              )}
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white/90 sm:text-4xl">
              {room?.name || "My Photos"}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/40">
              Photos matched to your enrolled face profile. Download the ones
              you want to keep.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <Button
              variant="outline"
              onClick={() => loadMyPhotos({ silent: true })}
              disabled={refreshing}
              className="faceit-secondary-button"
            >
              <RefreshCw
                className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button
              onClick={downloadAllAsZip}
              disabled={photos.length === 0 || downloadingZip}
              className="faceit-primary-button text-black disabled:opacity-50"
            >
              {downloadingZip ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Archive className="mr-2 size-4" />
              )}
              Download ZIP
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Error */}
      {message && (
        <Alert className="border-red-900/70 bg-red-950/40 text-red-100">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gallery error</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      {/* Compact status strip */}
      <section className="grid gap-3 md:grid-cols-3">
        <Card className="faceit-glass-soft rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Images className="text-cyan-300" size={20} />
            <div>
              <p className="font-faceit-mono text-[10px] uppercase tracking-[0.12em] text-white/25">
                Matched photos
              </p>
              <p className="mt-1 text-2xl font-semibold text-white/85">
                {photos.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="faceit-glass-soft rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Sparkles className="text-cyan-300" size={20} />
            <div>
              <p className="font-faceit-mono text-[10px] uppercase tracking-[0.12em] text-white/25">
                Review pending
              </p>
              <p className="mt-1 text-2xl font-semibold text-white/85">
                {matchStatus?.review_count ?? 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="faceit-glass-soft rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <Timer className="text-cyan-300" size={20} />
            <div>
              <p className="font-faceit-mono text-[10px] uppercase tracking-[0.12em] text-white/25">
                Link expiry
              </p>
              <p className="mt-1 text-sm leading-6 text-white/50">
                Refreshes on reload. Current links last about{" "}
                {signedTtlMinutes} minutes.
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Empty state */}
      {photos.length === 0 ? (
        <Card className="faceit-glass rounded-3xl p-10 text-center">
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl"
            style={{
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.18)",
            }}
          >
            <Camera className="size-8 text-cyan-300" />
          </div>

          <h2 className="mt-6 text-2xl font-semibold text-white/90">
            No matched photos yet
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/38">
            {photosData?.message ||
              "Your matched photos will appear here once the room is ready and matching is complete."}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              onClick={() => loadMyPhotos({ silent: true })}
              className="faceit-primary-button text-black"
            >
              <RefreshCw className="mr-2 size-4" />
              Check Again
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push(`/room/${code}`)}
              className="faceit-secondary-button"
            >
              Back to Room
            </Button>
          </div>
        </Card>
      ) : (
        <motion.section
          variants={gridVariants}
          initial="hidden"
          animate="show"
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {photos.map((photo, index) => {
            const confidence = getConfidenceStyle(photo.confidence);

            return (
              <motion.div key={photo.match_id} variants={cardVariants}>
                <Card className="faceit-glass faceit-card-hover group overflow-hidden rounded-3xl">
                  <div className="relative overflow-hidden bg-black">
                    <img
                      src={photo.signed_url}
                      alt={`Matched event photo ${index + 1}`}
                      className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />

                    <Badge
                      className="absolute left-3 top-3 text-black"
                      style={{
                        background: "rgb(52,211,153)",
                      }}
                    >
                      <CheckCircle2 className="mr-1 size-3.5" />
                      Match
                    </Badge>

                    <div
                      className="absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-medium"
                      style={{
                        background: confidence.bg,
                        border: `1px solid ${confidence.border}`,
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                      }}
                    >
                      <span className={confidence.text}>
                        {(photo.confidence * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-sm font-medium text-white">
                        {confidence.label}
                      </p>

                      <p className="mt-1 text-xs text-white/40">
                        Matched {new Date(photo.matched_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex items-center gap-2 text-xs text-white/35">
                      <ImageIcon className="size-4 text-cyan-300/80" />
                      <span className="truncate">{photo.photo_id}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant="outline"
                        onClick={() => window.open(photo.signed_url, "_blank")}
                        className="faceit-secondary-button"
                      >
                        Open
                      </Button>

                      <Button
                        onClick={() => downloadOne(photo)}
                        className="faceit-primary-button text-black"
                      >
                        <Download className="mr-2 size-4" />
                        Save
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </motion.section>
      )}

      {/* Review notice */}
      {matchStatus?.review_count ? (
        <Alert className="border-amber-900/70 bg-amber-950/30 text-amber-100">
          <ShieldCheck className="h-4 w-4" />
          <AlertTitle>Some photos may still be under review</AlertTitle>
          <AlertDescription>
            The uploader has {matchStatus.review_count} uncertain match
            {matchStatus.review_count === 1 ? "" : "es"} to approve or reject.
            Approved photos will appear here automatically.
          </AlertDescription>
        </Alert>
      ) : null}
    </PageShell>
  );
}