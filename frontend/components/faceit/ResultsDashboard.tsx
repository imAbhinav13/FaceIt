"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, Clock3, ImageIcon } from "lucide-react";

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

const cardVariants = {
  hidden: {
    opacity: 0,
    y: 14,
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

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string | number;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <motion.div variants={cardVariants}>
      <Card className="border-zinc-800 bg-zinc-950/90 p-5 shadow-2xl shadow-black/20">
        <div className="flex items-center justify-between">
          <div className={`rounded-xl p-2 ${tone}`}>{icon}</div>

          <Badge variant="outline" className="border-zinc-700 text-zinc-300">
            Live
          </Badge>
        </div>

        <p className="mt-5 text-sm text-zinc-400">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-white">{value}</p>
      </Card>
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

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Processing dashboard
          </h2>
          <p className="text-sm text-zinc-400">
            FaceIt is scanning photos, extracting faces, and preparing private
            matches.
          </p>
        </div>

        <Badge className="w-fit bg-cyan-400 text-zinc-950 hover:bg-cyan-300">
          {roomStatus.toUpperCase()}
        </Badge>
      </div>

      <motion.div
        variants={containerVariants}
        className="grid gap-4 md:grid-cols-4"
      >
        <MetricCard
          title="Uploaded photos"
          value={total}
          icon={<ImageIcon className="size-5 text-cyan-300" />}
          tone="bg-cyan-400/10"
        />

        <MetricCard
          title="Processed"
          value={done}
          icon={<CheckCircle2 className="size-5 text-emerald-300" />}
          tone="bg-emerald-400/10"
        />

        <MetricCard
          title="In queue"
          value={queueCount}
          icon={<Clock3 className="size-5 text-amber-300" />}
          tone="bg-amber-400/10"
        />

        <MetricCard
          title="Needs review"
          value={reviewCount}
          icon={<AlertTriangle className="size-5 text-orange-300" />}
          tone="bg-orange-400/10"
        />
      </motion.div>

      <motion.div variants={cardVariants}>
        <Card className="border-zinc-800 bg-zinc-950 p-5">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Face processing progress</span>
            <span className="text-cyan-300">{progress}%</span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
            <motion.div
              className="h-full rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.8)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{
                type: "spring",
                stiffness: 120,
                damping: 20,
              }}
            />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-zinc-400 sm:grid-cols-4">
            <span>Total: {total}</span>
            <span>Done: {done}</span>
            <span>Processing: {processing}</span>
            <span>Failed: {failed}</span>
          </div>
        </Card>
      </motion.div>
    </motion.section>
  );
}