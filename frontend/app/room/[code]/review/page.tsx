"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
  Info,
} from "lucide-react";

import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

type ReviewMatch = {
  match_id: string;
  photo_id: string;
  photo_face_id: string | null;
  user_id: string;
  participant?: { id: string; name: string | null };
  confidence: number;
  status: string;
  matched_at: string;
  bounding_box: {
    x_pct?: number; y_pct?: number; w_pct?: number; h_pct?: number;
    x?: number; y?: number; w?: number; h?: number;
    image_width?: number; image_height?: number;
  } | null;
  storage_path: string;
  signed_url: string;
};

type ReviewResponse = {
  success: boolean;
  room: { id: string; room_code: string; name: string; status: string };
  matches: ReviewMatch[];
  count: number;
  limit: number;
  has_more: boolean;
  message: string | null;
};

// ─── Motion variants ──────────────────────────────────────────────────────────

const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.065, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 240, damping: 26 },
  },
  exitApprove: {
    opacity: 0,
    scale: 0.9,
    y: -12,
    transition: { duration: 0.24, ease: "easeIn" as const }, // added as const
  },
  exitReject: {
    opacity: 0,
    x: 36,
    scale: 0.95,
    transition: { duration: 0.24, ease: "easeIn" as const }, // added as const
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getConfidenceStyle(confidence: number): {
  label: string; color: string; bg: string; border: string; bar: string;
} {
  if (confidence >= 0.55) return {
    label: "High",
    color: "text-emerald-400",
    bg: "rgba(52,211,153,0.12)",
    border: "rgba(52,211,153,0.35)",
    bar: "rgb(52,211,153)",
  };
  if (confidence >= 0.45) return {
    label: "Mid",
    color: "text-amber-400",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.35)",
    bar: "rgb(251,191,36)",
  };
  return {
    label: "Low",
    color: "text-orange-400",
    bg: "rgba(251,146,60,0.12)",
    border: "rgba(251,146,60,0.35)",
    bar: "rgb(251,146,60)",
  };
}

function getParticipantLabel(match: ReviewMatch) {
  if (match.participant?.name) return match.participant.name;
  return `User ${match.user_id.slice(0, 6).toUpperCase()}`;
}

// ─── Background (shared design system) ───────────────────────────────────────

function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-40 -left-40 h-[700px] w-[700px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 h-[600px] w-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
      <div
        className="absolute inset-0 opacity-[0.022]"
        style={{
          backgroundImage: `linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

// ─── Info Hint ────────────────────────────────────────────────────────────────

function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-white/25 hover:text-cyan-400 transition-colors outline-none"
        aria-label="More info"
      >
        <Info size={13} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg px-3 py-2 text-xs text-white/70 z-50"
            style={{
              background: "rgba(10,10,14,0.97)",
              border: "1px solid rgba(34,211,238,0.2)",
              backdropFilter: "blur(12px)",
            }}
            initial={{ opacity: 0, y: 4, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.94 }}
            transition={{ duration: 0.14 }}
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
              style={{ borderLeft: "5px solid transparent", borderRight: "5px solid transparent", borderTop: "5px solid rgba(34,211,238,0.2)" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <motion.div
      className={`rounded-xl bg-white/[0.05] ${className}`}
      animate={{ opacity: [0.5, 0.9, 0.5] }}
      transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

function ReviewSkeleton() {
  return (
    <main className="relative min-h-screen p-6" style={{ background: "rgb(7,7,10)" }}>
      <BackgroundOrbs />
      <div className="relative z-10 mx-auto max-w-7xl space-y-6">
        {/* Header skeleton */}
        <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <SkeletonPulse className="h-3 w-28 mb-4" />
          <SkeletonPulse className="h-8 w-64 mb-3" />
          <SkeletonPulse className="h-3 w-40" />
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0,1,2,3].map(i => (
            <div key={i} className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <SkeletonPulse className="h-3 w-20 mb-3" />
              <SkeletonPulse className="h-7 w-14" />
            </div>
          ))}
        </div>
        {/* Cards skeleton */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0,1,2,3,4,5].map(i => (
            <div key={i} className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <SkeletonPulse className="h-60 w-full rounded-none" />
              <div className="p-4 space-y-3">
                <SkeletonPulse className="h-4 w-28" />
                <div className="flex gap-2">
                  <SkeletonPulse className="h-9 flex-1" />
                  <SkeletonPulse className="h-9 flex-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <motion.div
      className="rounded-2xl p-5"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.07)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 240, damping: 26 }}
    >
      <p className="text-[11px] uppercase tracking-[0.1em] text-white/35 font-mono mb-2">{label}</p>
      <p className={`text-2xl font-semibold tracking-tight ${accent ?? "text-white/90"}`}
        style={{ fontFamily: "'DM Mono', monospace" }}>
        {value}
      </p>
    </motion.div>
  );
}

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({
  match,
  isUpdating,
  removingAction,
  onApprove,
  onReject,
}: {
  match: ReviewMatch;
  isUpdating: boolean;
  removingAction: "confirmed" | "rejected" | null;
  onApprove: () => void;
  onReject: () => void;
}) {
  const confidence = match.confidence;
  const pct = (confidence * 100).toFixed(1);
  const cs = getConfidenceStyle(confidence);
  const hasBoundingBox = match.bounding_box?.x_pct !== undefined;
  const label = getParticipantLabel(match);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden flex flex-col"
      style={{
        background: "rgba(255,255,255,0.025)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Image area */}
      <div className="relative overflow-hidden bg-black/40 flex-shrink-0">
        <img
          src={match.signed_url}
          alt={`Review match for ${label}`}
          className="block w-full h-auto"
          style={{ minHeight: "180px" }}
        />

        {/* Face bounding box */}
        {hasBoundingBox && (
          <div
            className="pointer-events-none absolute z-20 border-2 border-cyan-200 bg-cyan-300/10 shadow-[0_0_22px_rgba(103,232,249,0.35)] transition duration-300 group-hover:shadow-[0_0_34px_rgba(103,232,249,0.75)]"
            style={{
              left: `${match.bounding_box!.x_pct}%`,
              top: `${match.bounding_box!.y_pct}%`,
              width: `${match.bounding_box!.w_pct}%`,
              height: `${match.bounding_box!.h_pct}%`,
              border: "1.5px solid rgba(34,211,238,0.7)",
              background: "rgba(34,211,238,0.06)",
              boxShadow: "0 0 0 0 rgba(34,211,238,0)",
            }}
          >
            {/* Corner accents */}
            {[
              "top-0 left-0 border-t-2 border-l-2",
              "top-0 right-0 border-t-2 border-r-2",
              "bottom-0 left-0 border-b-2 border-l-2",
              "bottom-0 right-0 border-b-2 border-r-2",
            ].map((cls, i) => (
              <div
                key={i}
                className={`absolute w-2 h-2 border-cyan-300 transition-all duration-300 group-hover:w-3 group-hover:h-3 group-hover:border-cyan-200 ${cls}`}
                style={{ margin: "-1.5px" }}
              />
            ))}
          </div>
        )}

        {/* Confidence badge — top left */}
        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{ background: cs.bg, border: `1px solid ${cs.border}`, backdropFilter: "blur(8px)" }}
        >
          <span className={cs.color}>{pct}%</span>
          <span className="text-white/30">·</span>
          <span className={`${cs.color} text-[10px]`}>{cs.label}</span>
        </div>

        {/* Info hint — top right */}
        <div className="absolute top-3 right-3">
          <div className="rounded-full p-1.5" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)" }}>
            <InfoHint text="Approve makes this photo visible in the participant's gallery. Reject hides only this match." />
          </div>
        </div>

        {/* Participant + time — bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-sm font-medium text-white/90 truncate">{label}</p>
          <p className="text-[11px] text-white/35 font-mono mt-0.5">
            {new Date(match.matched_at).toLocaleString("en-US", {
              month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Confidence bar */}
      <div className="px-4 pt-3 pb-0">
        <div className="w-full h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: cs.bar }}
            initial={{ width: 0 }}
            animate={{ width: `${confidence * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="p-4 flex gap-2.5 mt-auto">
        {/* Approve */}
        <motion.button
          type="button"
          onClick={onApprove}
          disabled={isUpdating}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:opacity-40"
          style={{
            background: "rgba(52,211,153,0.12)",
            border: "1px solid rgba(52,211,153,0.3)",
            color: "rgb(52,211,153)",
          }}
          whileHover={!isUpdating ? { scale: 1.03, background: "rgba(52,211,153,0.2)" } : {}}
          whileTap={!isUpdating ? { scale: 0.96 } : {}}
        >
          {isUpdating && removingAction === "confirmed"
            ? <Loader2 size={13} className="animate-spin" />
            : <Check size={13} strokeWidth={2.5} />
          }
          Approve
        </motion.button>

        {/* Reject */}
        <motion.button
          type="button"
          onClick={onReject}
          disabled={isUpdating}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-40"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "rgba(252,165,165,0.9)",
          }}
          whileHover={!isUpdating ? { scale: 1.03, background: "rgba(239,68,68,0.16)" } : {}}
          whileTap={!isUpdating ? { scale: 0.96 } : {}}
        >
          {isUpdating && removingAction === "rejected"
            ? <Loader2 size={13} className="animate-spin" />
            : <X size={13} strokeWidth={2.5} />
          }
          Reject
        </motion.button>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onRefresh, onBack, refreshing }: { onRefresh: () => void; onBack: () => void; refreshing: boolean }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-20 px-6 text-center rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 240, damping: 28 }}
    >
      <motion.div
        className="flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
        style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.25)", boxShadow: "0 0 32px rgba(52,211,153,0.08)" }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 22, delay: 0.1 }}
      >
        <Check size={26} className="text-emerald-400" strokeWidth={2} />
      </motion.div>
      <h2 className="text-xl font-semibold text-white/90 mb-1.5 tracking-tight">Review queue clear</h2>
      <p className="text-sm text-white/35 mb-6 max-w-xs">All matches have been reviewed. New uncertain matches will appear here as participants join.</p>
      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-black outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, rgb(34,211,238), rgb(6,182,212))", boxShadow: "0 0 20px rgba(34,211,238,0.25)" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </motion.button>
        <motion.button
          type="button"
          onClick={onBack}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 outline-none focus-visible:ring-2 focus-visible:ring-white/20"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <ArrowLeft size={14} />
          Back to Room
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReviewQueuePage() {
  const params = useParams();
  const router = useRouter();
  const code = String(params.code || "").toUpperCase();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [reviewData, setReviewData] = useState<ReviewResponse | null>(null);
  const [updatingMatchId, setUpdatingMatchId] = useState<string | null>(null);
  const [removingMatch, setRemovingMatch] = useState<{
    id: string; action: "confirmed" | "rejected";
  } | null>(null);

  const stats = useMemo(() => {
    const matches = reviewData?.matches ?? [];
    const count = matches.length;
    const avg = count > 0 ? matches.reduce((s, m) => s + m.confidence, 0) / count : 0;
    const high = matches.filter(m => m.confidence >= 0.55).length;
    return { pending: count, average: avg, highConfidence: high, limit: reviewData?.limit ?? 0 };
  }, [reviewData]);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  }

  async function loadReviewQueue(options?: { silent?: boolean }) {
    const token = await getToken();
    if (!token) { router.push("/login"); return; }

    if (options?.silent) setRefreshing(true);
    else setLoading(true);
    setMessage("");

    try {
      const response = await api.get(`/rooms/${code}/review`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReviewData(response.data);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || error.message || "Failed to load review queue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function updateMatch(matchId: string, status: "confirmed" | "rejected") {
    const token = await getToken();
    if (!token) { router.push("/login"); return; }

    setUpdatingMatchId(matchId);
    setRemovingMatch({ id: matchId, action: status });

    try {
      await api.patch(`/matches/${matchId}`, { status }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      window.setTimeout(() => {
        setReviewData(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            matches: prev.matches.filter(m => m.match_id !== matchId),
            count: Math.max(prev.count - 1, 0),
          };
        });
        setRemovingMatch(null);
      }, 200);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || error.message || "Failed to update match.");
      setRemovingMatch(null);
    } finally {
      setUpdatingMatchId(null);
    }
  }

  useEffect(() => {
    if (code) loadReviewQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (loading) return <ReviewSkeleton />;

  // Full-page error
  if (message && !reviewData) {
    return (
      <main className="relative min-h-screen flex items-center justify-center p-6" style={{ background: "rgb(7,7,10)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
        <BackgroundOrbs />
        <motion.div
          className="relative z-10 w-full max-w-md rounded-2xl p-6 text-center"
          style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <AlertCircle size={28} className="text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white/90 mb-1.5">Review queue error</h2>
          <p className="text-sm text-red-300/80 mb-5">{message}</p>
          <motion.button
            type="button"
            onClick={() => router.push(`/room/${code}`)}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-black"
            style={{ background: "linear-gradient(135deg, rgb(34,211,238), rgb(6,182,212))" }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            <ArrowLeft size={14} /> Back to Room
          </motion.button>
        </motion.div>
      </main>
    );
  }

  if (!reviewData) return null;

  return (
    <main
      className="relative min-h-screen p-5 sm:p-6"
      style={{ background: "rgb(7,7,10)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');
      `}</style>
      <BackgroundOrbs />

      <div className="relative z-10 mx-auto max-w-7xl space-y-5">

        {/* ── Header ── */}
        <motion.div
          className="relative overflow-hidden rounded-2xl p-5 sm:p-6"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 24px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
          }}
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 26 }}
        >
          {/* Glow orb */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full"
            style={{ background: "radial-gradient(circle, rgba(34,211,238,0.1) 0%, transparent 70%)" }} />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: identity */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg"
                  style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.2)" }}>
                  <ShieldCheck size={14} className="text-cyan-400" />
                </div>
                <span className="text-[11px] uppercase tracking-[0.12em] text-cyan-400/80 font-mono">Review Queue</span>
                <InfoHint text="Approve makes a matched photo visible in the participant's gallery. Reject hides only this uncertain match." />
              </div>

              <h1
                className="text-2xl sm:text-3xl font-semibold text-white/90 tracking-tight"
                style={{ letterSpacing: "-0.02em" }}
              >
                {reviewData.room.name}
              </h1>

              <div className="flex items-center gap-2 mt-2">
                <span
                  className="text-xs text-white/30 font-mono px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  {reviewData.room.room_code}
                </span>
                <span
                  className="text-xs text-cyan-400 font-mono px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)" }}
                >
                  {reviewData.count} pending
                </span>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex gap-2.5">
              <motion.button
                type="button"
                onClick={() => router.push(`/room/${code}`)}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                whileHover={{ scale: 1.02, background: "rgba(255,255,255,0.07)" }}
                whileTap={{ scale: 0.97 }}
              >
                <ArrowLeft size={14} /> Room
              </motion.button>

              <motion.button
                type="button"
                onClick={() => loadReviewQueue({ silent: true })}
                disabled={refreshing}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-white/60 outline-none focus-visible:ring-2 focus-visible:ring-white/20 transition-colors disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                whileHover={!refreshing ? { scale: 1.02, background: "rgba(255,255,255,0.07)" } : {}}
                whileTap={!refreshing ? { scale: 0.97 } : {}}
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin text-cyan-400" : ""} />
                Refresh
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* ── Stats strip ── */}
        <motion.div
          className="grid grid-cols-2 gap-3 md:grid-cols-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <StatCard label="Pending" value={String(stats.pending)} accent="text-white/90" />
          <StatCard label="Avg confidence" value={`${(stats.average * 100).toFixed(1)}%`}
            accent={stats.average >= 0.55 ? "text-emerald-400" : stats.average >= 0.45 ? "text-amber-400" : "text-orange-400"} />
          <StatCard label="High confidence" value={String(stats.highConfidence)} accent="text-emerald-400" />
          <StatCard label="Queue limit" value={String(stats.limit)} accent="text-white/50" />
        </motion.div>

        {/* ── Inline error ── */}
        <AnimatePresence>
          {message && reviewData && (
            <motion.div
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-red-300"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.22)" }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
            >
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <span><span className="font-medium">Action failed · </span>{message}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Has more banner ── */}
        <AnimatePresence>
          {reviewData.has_more && (
            <motion.div
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-amber-300/80"
              style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Sparkles size={14} className="text-amber-400 shrink-0" />
              Showing first {reviewData.limit} items — refresh after decisions to load more.
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Card grid / empty state ── */}
        {reviewData.matches.length === 0 ? (
          <EmptyState
            onRefresh={() => loadReviewQueue({ silent: true })}
            onBack={() => router.push(`/room/${code}`)}
            refreshing={refreshing}
          />
        ) : (
          <motion.section
            variants={gridVariants}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence mode="popLayout">
              {reviewData.matches.map(match => {
                const isUpdating = updatingMatchId === match.match_id;
                const isRemoving = removingMatch?.id === match.match_id;
                const exitVariant = removingMatch?.action === "confirmed" ? "exitApprove" : "exitReject";

                return (
                  <motion.div
                    key={match.match_id}
                    layout
                    variants={cardVariants}
                    initial="hidden"
                    animate="show"
                    exit={isRemoving ? exitVariant : "exitApprove"}
                  >
                    <ReviewCard
                      match={match}
                      isUpdating={isUpdating}
                      removingAction={isRemoving ? removingMatch!.action : null}
                      onApprove={() => updateMatch(match.match_id, "confirmed")}
                      onReject={() => updateMatch(match.match_id, "rejected")}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.section>
        )}

      </div>
    </main>
  );
}