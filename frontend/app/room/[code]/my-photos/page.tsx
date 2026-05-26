"use client";

import { useEffect, useState } from "react";
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
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";

import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

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

const gridVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 16,
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

function GallerySkeleton() {
  return (
    <div className="space-y-6">
      <Card className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 backdrop-blur-xl">
        <Skeleton className="h-4 w-40 bg-zinc-800" />
        <Skeleton className="mt-4 h-10 w-72 bg-zinc-800" />
        <Skeleton className="mt-3 h-4 w-96 max-w-full bg-zinc-800" />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <Card
            key={item}
            className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045]"
          >
            <Skeleton className="h-64 w-full bg-zinc-800" />
            <div className="p-4">
              <Skeleton className="h-4 w-32 bg-zinc-800" />
              <Skeleton className="mt-3 h-9 w-full bg-zinc-800" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

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
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get(`/rooms/${code}/my-photos`, {
          headers: { Authorization: `Bearer ${token}` },
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
    if (!photosData?.photos.length) return;

    setDownloadingZip(true);

    try {
      const token = await getToken();

      if (!token) {
        router.push("/login");
        return;
      }

      const freshResponse = await api.get(`/rooms/${code}/my-photos`, {
        headers: { Authorization: `Bearer ${token}` },
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

  const photos = photosData?.photos || [];
  const room = photosData?.room || matchStatus?.room;
  const signedTtlMinutes = photosData?.signed_url_ttl_seconds
    ? Math.round(photosData.signed_url_ttl_seconds / 60)
    : 60;

  if (loading) {
    return (
      <PageShell>
        <GallerySkeleton />
      </PageShell>
    );
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
                <ShieldCheck className="size-4 text-cyan-200" />
              </div>
              <p className="text-xs font-medium text-cyan-100">
                
              </p>
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {room?.name || "My Photos"}
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              These are the event photos matched to your enrolled face profile.
              Signed links are temporary, so download the photos you want to keep.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Badge
                variant="outline"
                className="rounded-full border-white/10 bg-black/30 px-3 py-1.5 text-zinc-300"
              >
                Room {code}
              </Badge>

              <Badge
                variant="outline"
                className="rounded-full border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-cyan-100"
              >
                {photos.length} matched photo{photos.length === 1 ? "" : "s"}
              </Badge>

              {matchStatus && (
                <Badge
                  variant="outline"
                  className="rounded-full border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-emerald-100"
                >
                  Match status: {matchStatus.match_job_status}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
            <Button
              variant="outline"
              onClick={() => router.push(`/room/${code}`)}
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 size-4" />
              Room
            </Button>

            <Button
              variant="outline"
              onClick={() => loadMyPhotos({ silent: true })}
              disabled={refreshing}
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
            >
              <RefreshCw
                className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>

            <Button
              onClick={downloadAllAsZip}
              disabled={photos.length === 0 || downloadingZip}
              className="bg-cyan-300 text-zinc-950 shadow-lg shadow-cyan-950/40 hover:bg-cyan-200"
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

      {message && (
        <Alert className="border-red-900/70 bg-red-950/40 text-red-100">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Gallery error</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <Card className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-zinc-500">Matched photos</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {photos.length}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-500">Review pending</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {matchStatus?.review_count ?? 0}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium text-zinc-500">
              Signed URL expiry
            </p>
            <p className="mt-2 text-sm text-zinc-300">
              Links refresh on reload and ZIP download. Current links last about{" "}
              {signedTtlMinutes} minutes.
            </p>
          </div>
        </div>
      </Card>

      {photos.length === 0 ? (
        <Card className="rounded-[2rem] border border-white/10 bg-white/[0.045] p-10 text-center shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10">
            <Camera className="size-8 text-cyan-200" />
          </div>

          <h2 className="mt-6 text-2xl font-semibold text-white">
            No matched photos yet
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-zinc-400">
            {photosData?.message ||
              "Your matched photos will appear here once the room is ready and matching is complete. If some matches are uncertain, the uploader may need to approve them."}
          </p>

          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              onClick={() => loadMyPhotos({ silent: true })}
              className="bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
            >
              <RefreshCw className="mr-2 size-4" />
              Check Again
            </Button>

            <Button
              variant="outline"
              onClick={() => router.push(`/room/${code}`)}
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
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
          {photos.map((photo, index) => (
            <motion.div key={photo.match_id} variants={cardVariants}>
              <Card className="group overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/30 backdrop-blur-xl">
                <div className="relative overflow-hidden bg-black">
                  <img
                    src={photo.signed_url}
                    alt={`Matched event photo ${index + 1}`}
                    className="h-72 w-full object-cover transition duration-500 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/10" />

                  <Badge className="absolute left-3 top-3 bg-emerald-300 text-zinc-950 hover:bg-emerald-200">
                    <CheckCircle2 className="mr-1 size-3.5" />
                    Match
                  </Badge>

                  <div className="absolute bottom-3 left-3 right-3">
                    <p className="text-sm font-medium text-white">
                      Confidence {(photo.confidence * 100).toFixed(1)}%
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      Matched {new Date(photo.matched_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <ImageIcon className="size-4 text-cyan-200" />
                    <span className="truncate">{photo.photo_id}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => window.open(photo.signed_url, "_blank")}
                      className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
                    >
                      Open
                    </Button>

                    <Button
                      onClick={() => downloadOne(photo)}
                      className="bg-cyan-300 text-zinc-950 hover:bg-cyan-200"
                    >
                      <Download className="mr-2 size-4" />
                      Save
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.section>
      )}

      {matchStatus?.review_count ? (
        <Alert className="border-amber-900/70 bg-amber-950/30 text-amber-100">
          <Sparkles className="h-4 w-4" />
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