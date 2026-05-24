"use client";

import { motion } from "motion/react";
import { ArrowLeft, Images, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

type RoomHeaderProps = {
  roomCode: string;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  onReview?: () => void;
  onMyPhotos?: () => void;
};

export function RoomHeader({
  roomCode,
  title = "Event Control Center",
  subtitle = "Upload photos, track processing, and prepare private galleries.",
  onBack,
  onReview,
  onMyPhotos,
}: RoomHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 180,
        damping: 22,
      }}
      className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl shadow-black/30 sm:flex-row sm:items-center"
    >
      <div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 p-2">
            <ShieldCheck className="size-4 text-cyan-300" />
          </div>

          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">
            FaceIt Room
          </p>
        </div>

        <h1 className="mt-3 text-3xl font-semibold text-white">{title}</h1>

        <p className="mt-1 max-w-2xl text-sm text-zinc-400">{subtitle}</p>

        <p className="mt-3 text-sm text-zinc-500">
          Room code:{" "}
          <span className="font-semibold tracking-widest text-white">
            {roomCode}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        {onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900"
          >
            <ArrowLeft className="mr-2 size-4" />
            Back
          </Button>
        )}

        {onReview && (
          <Button
            variant="outline"
            onClick={onReview}
            className="border-zinc-700 bg-transparent text-white hover:bg-zinc-900"
          >
            Review Queue
          </Button>
        )}

        {onMyPhotos && (
          <Button
            onClick={onMyPhotos}
            className="bg-cyan-400 text-zinc-950 hover:bg-cyan-300"
          >
            <Images className="mr-2 size-4" />
            My Photos
          </Button>
        )}
      </div>
    </motion.header>
  );
}