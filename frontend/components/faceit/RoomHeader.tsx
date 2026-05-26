"use client";

import { motion } from "motion/react";
import {
  ArrowLeft,
  CalendarClock,
  Copy,
  Images,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type RoomHeaderProps = {
  roomCode: string;
  title?: string;
  subtitle?: string;
  status?: string;
  expiresAt?: string | null;
  onBack?: () => void;
  onReview?: () => void;
  onMyPhotos?: () => void;
};

function formatDate(value?: string | null) {
  if (!value) return "Not set";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "Not set";
  }
}

function getStatusTone(status?: string) {
  const normalized = status?.toLowerCase();

  if (normalized === "ready") {
    return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
  }

  if (normalized === "processing") {
    return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
  }

  if (normalized === "failed") {
    return "border-red-400/30 bg-red-400/10 text-red-200";
  }

  if (normalized === "expired") {
    return "border-zinc-500/30 bg-zinc-500/10 text-zinc-300";
  }

  return "border-violet-400/30 bg-violet-400/10 text-violet-200";
}

export function RoomHeader({
  roomCode,
  title = "Event Control Center",
  subtitle = "Secure photo intelligence room for private face-matched galleries.",
  status,
  expiresAt,
  onBack,
  onReview,
  onMyPhotos,
}: RoomHeaderProps) {
  async function copyRoomCode() {
    try {
      await navigator.clipboard.writeText(roomCode);
    } catch {
      // Clipboard can fail in non-secure contexts. The visible room code remains available.
    }
  }

  return (
    <motion.header
      initial={{ opacity: 0, y: -14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 170,
        damping: 22,
      }}
      className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-8"
    >
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 left-20 h-72 w-72 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5">
              <ShieldCheck className="size-4 text-cyan-200" />
              <span className="text-xs font-medium text-cyan-100">
                FaceIt AI Room
              </span>
            </div>

            {status && (
              <Badge
                variant="outline"
                className={`rounded-full px-3 py-1 uppercase tracking-[0.18em] ${getStatusTone(
                  status
                )}`}
              >
                {status}
              </Badge>
            )}
          </div>

          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            {title}
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            {subtitle}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={copyRoomCode}
              className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-left shadow-inner shadow-white/5 transition hover:border-cyan-300/40 hover:bg-cyan-300/10"
            >
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">
                  Room Code
                </p>
                <p className="mt-1 font-mono text-lg font-semibold tracking-wide text-white">
                  {roomCode}
                </p>
              </div>

              <Copy className="size-4 text-zinc-500 transition group-hover:text-cyan-200" />
            </button>

            {expiresAt && (
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <CalendarClock className="size-5 text-violet-200" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">
                    Auto Expiry
                  </p>
                  <p className="mt-1 text-sm text-zinc-200">
                    {formatDate(expiresAt)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
          {onBack && (
            <Button
              variant="outline"
              onClick={onBack}
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
            >
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
          )}

          {onReview && (
            <Button
              variant="outline"
              onClick={onReview}
              className="border-white/10 bg-white/[0.03] text-white hover:bg-white/10"
            >
              <Sparkles className="mr-2 size-4" />
              Review Queue
            </Button>
          )}

          {onMyPhotos && (
            <Button
              onClick={onMyPhotos}
              className="bg-cyan-300 text-zinc-950 shadow-lg shadow-cyan-950/40 hover:bg-cyan-200"
            >
              <Images className="mr-2 size-4" />
              My Photos
            </Button>
          )}
        </div>
      </div>
    </motion.header>
  );
}