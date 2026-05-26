"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ImageIcon,
  Layers3,
  Radar,
  ScanFace,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

type ResultsDashboardProps = {
  total: number;
  done: number;
  pending: number;
  processing: number;
  failed: number;
  roomStatus: string;
  reviewCount?: number;
};

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 220,
      damping: 24,
    },
  },
};

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();

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

function MetricCard({
  title,
  value,
  caption,
  icon,
  accent,
}: {
  title: string;
  value: string | number;
  caption: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div
          className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl ${accent}`}
        />

        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="rounded-2xl border border-white/10 bg-black/30 p-2.5">
              {icon}
            </div>

            <div className="h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_16px_rgba(103,232,249,0.9)]" />
          </div>

          <p className="mt-5 text-sm text-zinc-400">{title}</p>

          <div className="mt-2 flex items-end gap-2">
            <p className="text-4xl font-semibold tracking-tight text-white">
              {value}
            </p>
          </div>

          <p className="mt-2 text-xs leading-5 text-zinc-500">{caption}</p>
        </div>
      </Card>
    </motion.div>
  );
}

function PipelineStep({
  title,
  description,
  state,
  icon,
}: {
  title: string;
  description: string;
  state: "complete" | "active" | "waiting" | "failed";
  icon: ReactNode;
}) {
  const stateClass =
    state === "complete"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : state === "active"
      ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-100"
      : state === "failed"
      ? "border-red-400/30 bg-red-400/10 text-red-200"
      : "border-white/10 bg-white/[0.03] text-zinc-400";

  return (
    <motion.div
      variants={itemVariants}
      className={`relative rounded-2xl border p-4 ${stateClass}`}
    >
      {state === "active" && (
        <motion.div
          className="absolute inset-0 rounded-2xl border border-cyan-300/30"
          animate={{
            opacity: [0.25, 0.8, 0.25],
            boxShadow: [
              "0 0 0 rgba(34,211,238,0)",
              "0 0 26px rgba(34,211,238,0.25)",
              "0 0 0 rgba(34,211,238,0)",
            ],
          }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      <div className="relative flex items-start gap-3">
        <div className="rounded-xl border border-white/10 bg-black/30 p-2">
          {icon}
        </div>

        <div>
          <p className="text-sm font-semibold text-white">{title}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-400">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function ResultsDashboard({
  total,
  done,
  pending,
  processing,
  failed,
  roomStatus,
  reviewCount = 0,
}: ResultsDashboardProps) {
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;
  const queueCount = pending + processing;
  const isReady = roomStatus.toLowerCase() === "ready";
  const hasFailures = failed > 0;
  const hasUploaded = total > 0;
  const isActivelyProcessing =
    roomStatus.toLowerCase() === "processing" || queueCount > 0;

  const pipelineSteps: Array<{
    title: string;
    description: string;
    state: "complete" | "active" | "waiting" | "failed";
    icon: ReactNode;
  }> = [
    {
      title: "Upload",
      description: hasUploaded
        ? `${total} photo${total === 1 ? "" : "s"} received by the room.`
        : "Waiting for an event photo batch.",
      state: hasUploaded ? "complete" : "waiting",
      icon: <ImageIcon className="size-4" />,
    },
    {
      title: "Detect",
      description:
        processing > 0
          ? "DeepFace is detecting faces inside the uploaded batch."
          : done > 0
          ? "Face detection has completed for processed photos."
          : "Face detection starts after upload.",
      state: hasFailures && done === 0 ? "failed" : processing > 0 ? "active" : done > 0 ? "complete" : "waiting",
      icon: <ScanFace className="size-4" />,
    },
    {
      title: "Embed",
      description:
        queueCount > 0
          ? "Facenet512 embeddings are being prepared for matching."
          : done > 0
          ? "Face vectors are stored and ready for similarity search."
          : "Embeddings will be generated per detected face.",
      state: hasFailures && done === 0 ? "failed" : queueCount > 0 ? "active" : done > 0 ? "complete" : "waiting",
      icon: <Layers3 className="size-4" />,
    },
    {
      title: "Ready",
      description: isReady
        ? "Participants can now match against precomputed photo faces."
        : "Private galleries unlock once processing is ready.",
      state: isReady ? "complete" : hasFailures && done === 0 ? "failed" : "waiting",
      icon: <Sparkles className="size-4" />,
    },
  ];

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <motion.div
        variants={itemVariants}
        className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"
      >
        <div>
          <div className="flex items-center gap-2">
            <Radar className="size-4 text-cyan-200" />
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-cyan-100">
              Processing status
            </p>
          </div>

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white">
            Photo processing progress
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Detecting faces 
          </p>
        </div>

        <Badge
          variant="outline"
          className={`w-fit rounded-full px-4 py-2 uppercase tracking-[0.18em] ${getStatusTone(
            roomStatus
          )}`}
        >
          {roomStatus}
        </Badge>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <p className="text-sm text-zinc-400">Overall progress</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-6xl font-semibold tracking-tight text-white">
                {progress}
              </p>
              <p className="mb-2 text-2xl font-semibold text-cyan-200">%</p>
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              {isReady
                ? "Room is ready for participant matching."
                : isActivelyProcessing
                ? "Worker is processing the current photo batch."
                : hasUploaded
                ? "Batch is uploaded. Waiting for the next worker update."
                : "No photos have been uploaded yet."}
            </p>
          </div>

          <div className="w-full max-w-xl">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Uploaded</span>
              <span>Ready</span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-black/50 ring-1 ring-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-violet-300 to-emerald-300 shadow-[0_0_24px_rgba(34,211,238,0.45)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{
                  type: "spring",
                  stiffness: 120,
                  damping: 20,
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-400 sm:grid-cols-4">
              <span>Total: {total}</span>
              <span>Done: {done}</span>
              <span>Queue: {queueCount}</span>
              <span>Failed: {failed}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid gap-4 md:grid-cols-4"
      >
        <MetricCard
          title="Uploaded"
          value={total}
          caption="Photos added to the room."
          icon={<ImageIcon className="size-5 text-cyan-200" />}
          accent="bg-cyan-400/15"
        />

        <MetricCard
          title="Processed"
          value={done}
          caption="Photos ready for matching."
          icon={<CheckCircle2 className="size-5 text-emerald-200" />}
          accent="bg-emerald-400/15"
        />

        <MetricCard
          title="In queue"
          value={queueCount}
          caption="Photos waiting or are bring scanned, patience is appreciated ."
          icon={<Clock3 className="size-5 text-amber-200" />}
          accent="bg-amber-400/15"
        />

        <MetricCard
          title="Review"
          value={reviewCount}
          caption="Low-confidence matches awaiting approval."
          icon={<AlertTriangle className="size-5 text-orange-200" />}
          accent="bg-orange-400/15"
        />
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid gap-3 md:grid-cols-4"
      >
        {pipelineSteps.map((step) => (
          <PipelineStep
            key={step.title}
            title={step.title}
            description={step.description}
            state={step.state}
            icon={step.icon}
          />
        ))}
      </motion.div>
    </motion.section>
  );
}