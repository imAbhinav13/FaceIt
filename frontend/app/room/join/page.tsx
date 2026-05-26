"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "motion/react";
import { Variants } from "motion/react";
import {
  ArrowRight,
  Check,
  Clock,
  Info,
  ScanFace,
  User,
  UserCheck,
  Users,
  Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type JoinResponse = {
  success: boolean;
  status: string;
  can_match: boolean;
  reason: string | null;
  room: {
    id: string;
    room_code: string;
    name: string;
    status: string;
    expires_at: string;
    created_at: string;
  };
  user: {
    id: string;
    email: string;
    has_face_embedding: boolean;
  };
  job: {
    id: string;
    status: string;
    deduplicated: boolean;
  } | null;
};

type GuestValidateResponse = {
  success: boolean;
  can_join_as_guest: boolean;
  reason: string | null;
  room: {
    id: string;
    room_code: string;
    name: string;
    status: string;
    expires_at: string;
    created_at: string;
  };
};

type JoinMode = "account" | "guest";

// ─── Background Orbs (shared design system) ──────────────────────────────────

function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full"
        style={{ background: "radial-gradient(circle, rgba(167,139,250,0.06) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
      {/* Grain */}
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
        className="text-white/25 hover:text-cyan-400 transition-colors ml-1.5 outline-none"
        aria-label="More info"
      >
        <Info size={13} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-lg px-3 py-2 text-xs text-white/70 z-50"
            style={{
              background: "rgba(15,15,20,0.96)",
              border: "1px solid rgba(34,211,238,0.2)",
              backdropFilter: "blur(12px)",
            }}
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {text}
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0"
              style={{
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "5px solid rgba(34,211,238,0.2)",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mode Card ────────────────────────────────────────────────────────────────

type ModeCardProps = {
  mode: JoinMode;
  selected: boolean;
  onSelect: () => void;
  index: number;
};

const MODE_META: Record<JoinMode, {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  detail: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
}> = {
  account: {
    icon: <UserCheck size={20} />,
    label: "Account",
    sublabel: "Face-match from enrollment",
    detail: "Uses your saved face profile to find your photos instantly.",
    accentBg: "rgba(34,211,238,0.07)",
    accentBorder: "rgba(34,211,238,0.55)",
    accentText: "text-cyan-400",
  },
  guest: {
    icon: <ScanFace size={20} />,
    label: "Guest",
    sublabel: "Match with a quick selfie",
    detail: "No account needed. Take a selfie and we'll find your photos.",
    accentBg: "rgba(167,139,250,0.07)",
    accentBorder: "rgba(167,139,250,0.55)",
    accentText: "text-violet-400",
  },
};

function ModeCard({ mode, selected, onSelect, index }: ModeCardProps) {
  const meta = MODE_META[mode];
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.08, duration: 0.38, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, scale: 1.015 }}
      whileTap={{ scale: 0.975 }}
      className="relative flex-1 rounded-xl p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-all duration-200"
      style={{
        background: selected ? meta.accentBg : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? meta.accentBorder : "rgba(255,255,255,0.08)"}`,
        boxShadow: selected
          ? `0 0 22px ${meta.accentBorder.replace("0.55", "0.12")}, inset 0 1px 0 rgba(255,255,255,0.05)`
          : "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      {/* Check badge */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="absolute top-2.5 right-2.5 rounded-full p-0.5"
            style={{ background: meta.accentBorder }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 20 }}
          >
            <Check size={10} strokeWidth={3} className="text-black" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`mb-2.5 ${meta.accentText}`}>{meta.icon}</div>
      <p className="text-sm font-semibold text-white/90 tracking-tight mb-0.5">{meta.label}</p>
      <p className="text-[11px] text-white/35 leading-snug">{meta.sublabel}</p>

      {/* Expanded detail when selected */}
      <AnimatePresence>
        {selected && (
          <motion.p
            className="text-[11px] text-white/50 leading-relaxed mt-2 pt-2"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
            initial={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 8, paddingTop: 8 }}
            exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0 }}
            transition={{ duration: 0.22 }}
          >
            {meta.detail}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function RoomStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; border: string; pulse?: boolean }> = {
    ready:      { label: "Ready",      color: "text-emerald-400", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.3)" },
    processing: { label: "Processing", color: "text-amber-400",   bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)", pulse: true },
    pending:    { label: "Pending",    color: "text-amber-400",   bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.3)", pulse: true },
    failed:     { label: "Failed",     color: "text-red-400",     bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)" },
    expired:    { label: "Expired",    color: "text-red-400",     bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)" },
  };
  const s = map[status] ?? { label: status, color: "text-white/50", bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${s.color}`}
      style={{ background: s.bg, border: `1px solid ${s.border}` }}
    >
      {s.pulse && (
        <motion.span
          className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
      {s.label}
    </span>
  );
}

// ─── Result Card ──────────────────────────────────────────────────────────────

function AccountResultCard({
  result,
  checking,
  onStartMatch,
  onViewPhotos,
}: {
  result: JoinResponse;
  checking: boolean;
  onStartMatch: () => void;
  onViewPhotos: () => void;
}) {
  const expiryDate = new Date(result.room.expires_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(10,10,14,0.9)",
        border: "1px solid rgba(34,211,238,0.2)",
        boxShadow: "0 0 50px rgba(34,211,238,0.06), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
    >
      {/* Sweep shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(105deg, transparent 40%, rgba(34,211,238,0.04) 50%, transparent 60%)" }}
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{ delay: 0.2, duration: 1.1, ease: "easeInOut" }}
      />

      <div className="p-5 space-y-4">
        {/* Room info */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/30 font-mono mb-1">Room</p>
            <h2 className="text-lg font-semibold text-white/90 tracking-tight leading-tight">
              {result.room.name}
            </h2>
            <p className="text-xs text-white/30 font-mono mt-0.5">{result.room.room_code} · expires {expiryDate}</p>
          </div>
          <RoomStatusBadge status={result.room.status} />
        </div>

        <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Waiting state */}
        {!result.can_match &&
          result.room.status !== "failed" &&
          result.room.status !== "expired" && (
            <motion.div
              className="flex items-start gap-3 rounded-xl p-3"
              style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="mt-0.5 shrink-0"
              >
                <Clock size={14} className="text-amber-400" />
              </motion.div>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                {result.reason}. Photos are still processing — checking again every 10 seconds.
              </p>
            </motion.div>
          )}

        {/* Face enrollment hint */}
        {result.user && !result.user.has_face_embedding && (
          <motion.div
            className="flex items-start gap-3 rounded-xl p-3"
            style={{ background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.2)" }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <ScanFace size={14} className="text-violet-400 mt-0.5 shrink-0" />
            <p className="text-xs text-violet-300/80 leading-relaxed">
              No face enrollment found. Complete face setup in your profile for better matching accuracy.
            </p>
          </motion.div>
        )}

        {/* Start match CTA */}
        {result.can_match && !result.job && (
          <motion.button
            type="button"
            onClick={onStartMatch}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, rgb(34,211,238) 0%, rgb(6,182,212) 100%)",
              boxShadow: "0 0 24px rgba(34,211,238,0.28)",
            }}
            whileHover={!checking ? { scale: 1.015, boxShadow: "0 0 36px rgba(34,211,238,0.42)" } : {}}
            whileTap={!checking ? { scale: 0.975 } : {}}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {checking ? (
              <><Loader2 size={15} className="animate-spin" /> Starting match…</>
            ) : (
              <>Start Matching <ArrowRight size={15} strokeWidth={2.5} /></>
            )}
          </motion.button>
        )}

        {/* Job started */}
        {result.job && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div
              className="flex items-center gap-3 rounded-xl p-3"
              style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)" }}
            >
              <motion.div
                className="flex items-center justify-center w-6 h-6 rounded-full shrink-0"
                style={{ background: "rgba(52,211,153,0.15)" }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <Check size={12} className="text-emerald-400" strokeWidth={2.5} />
              </motion.div>
              <div>
                <p className="text-xs font-semibold text-emerald-400">Matching job started</p>
                <p className="text-[11px] text-white/35 mt-0.5">
                  Status: {result.job.status}
                  {result.job.deduplicated && " · existing job reused"}
                </p>
              </div>
            </div>

            <motion.button
              type="button"
              onClick={onViewPhotos}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              style={{
                background: "linear-gradient(135deg, rgb(34,211,238) 0%, rgb(6,182,212) 100%)",
                boxShadow: "0 0 24px rgba(34,211,238,0.28)",
              }}
              whileHover={{ scale: 1.015, boxShadow: "0 0 36px rgba(34,211,238,0.42)" }}
              whileTap={{ scale: 0.975 }}
            >
              View My Photos <ArrowRight size={15} strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

function GuestResultCard({
  result,
  onContinue,
}: {
  result: GuestValidateResponse;
  onContinue: () => void;
}) {
  const expiryDate = new Date(result.room.expires_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(10,10,14,0.9)",
        border: "1px solid rgba(167,139,250,0.2)",
        boxShadow: "0 0 50px rgba(167,139,250,0.06), 0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(105deg, transparent 40%, rgba(167,139,250,0.04) 50%, transparent 60%)" }}
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{ delay: 0.2, duration: 1.1, ease: "easeInOut" }}
      />

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/30 font-mono mb-1">Guest Room</p>
            <h2 className="text-lg font-semibold text-white/90 tracking-tight leading-tight">
              {result.room.name}
            </h2>
            <p className="text-xs text-white/30 font-mono mt-0.5">{result.room.room_code} · expires {expiryDate}</p>
          </div>
          <RoomStatusBadge status={result.room.status} />
        </div>

        <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Waiting */}
        {!result.can_join_as_guest &&
          result.room.status !== "failed" &&
          result.room.status !== "expired" && (
            <motion.div
              className="flex items-start gap-3 rounded-xl p-3"
              style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="mt-0.5 shrink-0">
                <Clock size={14} className="text-amber-400" />
              </motion.div>
              <p className="text-xs text-amber-300/80 leading-relaxed">
                {result.reason}. Photos are still processing — checking again every 10 seconds.
              </p>
            </motion.div>
          )}

        {/* Failed */}
        {result.room.status === "failed" && (
          <motion.div
            className="rounded-xl p-3 text-xs text-red-300/80"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            This room failed processing. Ask the uploader to re-upload photos.
          </motion.div>
        )}

        {/* Expired */}
        {result.room.status === "expired" && (
          <motion.div
            className="rounded-xl p-3 text-xs text-red-300/80"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            This room has expired.
          </motion.div>
        )}

        {/* Continue CTA */}
        {result.can_join_as_guest && (
          <motion.button
            type="button"
            onClick={onContinue}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            style={{
              background: "linear-gradient(135deg, rgba(167,139,250,1) 0%, rgba(139,92,246,1) 100%)",
              boxShadow: "0 0 24px rgba(167,139,250,0.28)",
              color: "white",
            }}
            whileHover={{ scale: 1.015, boxShadow: "0 0 36px rgba(167,139,250,0.42)" }}
            whileTap={{ scale: 0.975 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            Continue to Guest Selfie <ArrowRight size={15} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function JoinRoomPage() {
  const router = useRouter();

  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<JoinMode>("account");

  const [joinResult, setJoinResult] = useState<JoinResponse | null>(null);
  const [guestResult, setGuestResult] = useState<GuestValidateResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  const resultRef = useRef<HTMLDivElement>(null);

  // ── Session check ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function checkSession() {
      await supabase.auth.getSession();
      setLoading(false);
    }
    checkSession();
  }, []);

  // ── Auto-scroll to result ──────────────────────────────────────────────────
  useEffect(() => {
    const hasResult = joinResult || guestResult;
    if (hasResult && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    }
  }, [joinResult, guestResult]);

  // ── Poll for account join ──────────────────────────────────────────────────
  useEffect(() => {
    if (!joinResult) return;
    if (joinResult.room.status === "ready" || joinResult.room.status === "failed" || joinResult.room.status === "expired") return;
    const interval = window.setInterval(() => validateAccountJoin(joinResult.room.room_code), 10000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinResult?.room?.room_code, joinResult?.room?.status]);

  // ── Poll for guest join ────────────────────────────────────────────────────
  useEffect(() => {
    if (!guestResult) return;
    if (guestResult.room.status === "ready" || guestResult.room.status === "failed" || guestResult.room.status === "expired") return;
    const interval = window.setInterval(() => validateGuestJoin(guestResult.room.room_code), 10000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestResult?.room?.room_code, guestResult?.room?.status]);

  function resetResults() {
    setMessage("");
    setJoinResult(null);
    setGuestResult(null);
  }

  async function validateAccountJoin(codeOverride?: string) {
    const codeToUse = (codeOverride || roomCode).trim().toUpperCase();
    if (!codeToUse) { setMessage("Please enter a room code."); return; }

    setChecking(true);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) { setChecking(false); router.push("/login"); return; }

    try {
      const response = await api.post(`/rooms/${codeToUse}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
      setJoinResult(response.data);
      setRoomCode(response.data.room.room_code);
      setMessage("");
    } catch (error: any) {
      setJoinResult(null);
      setMessage(error.response?.data?.detail || error.message);
    } finally {
      setChecking(false);
    }
  }

  async function validateGuestJoin(codeOverride?: string) {
    const codeToUse = (codeOverride || roomCode).trim().toUpperCase();
    if (!codeToUse) { setMessage("Please enter a room code."); return; }

    setChecking(true);
    try {
      const response = await api.post(`/rooms/${codeToUse}/guest/validate`, {});
      setGuestResult(response.data);
      setRoomCode(response.data.room.room_code);
      setMessage("");
    } catch (error: any) {
      setGuestResult(null);
      setMessage(error.response?.data?.detail || error.message);
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    resetResults();
    if (mode === "account") await validateAccountJoin();
    else await validateGuestJoin();
  }

  const containerVariants: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 18 },
    visible: { 
      opacity: 1, 
      y: 0, 
      transition: { 
        duration: 0.45, 
        ease: [0.25, 0.46, 0.45, 0.94] // TypeScript now safely knows this is a cubic-bezier tuple
      } 
    },
  };

  const selectedMeta = MODE_META[mode];

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "rgb(7,7,10)" }}>
        <motion.div className="flex gap-1.5" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.4, repeat: Infinity }}>
          {[0, 1, 2].map((i) => (
            <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </motion.div>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-screen flex items-center justify-center p-6"
      style={{ background: "rgb(7,7,10)", fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600&family=DM+Mono:wght@400;500&display=swap');

        .input-field {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.9);
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
          font-family: 'DM Mono', monospace;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.18); letter-spacing: 0.05em; text-transform: none; font-family: 'DM Sans', system-ui; }
        .input-field:hover { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); }
        .input-field:focus { outline: none; border-color: rgba(34,211,238,0.5); box-shadow: 0 0 0 3px rgba(34,211,238,0.08), 0 0 20px rgba(34,211,238,0.05); background: rgba(34,211,238,0.03); }
      `}</style>

      <BackgroundOrbs />

      <div className="relative z-10 w-full max-w-md">
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-4">

          {/* Header */}
          <motion.div variants={itemVariants} className="text-center mb-6">
            <motion.div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
              style={{ background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)", boxShadow: "0 0 24px rgba(34,211,238,0.1)" }}
              whileHover={{ scale: 1.05, boxShadow: "0 0 36px rgba(34,211,238,0.2)" }}
            >
              <Users size={22} className="text-cyan-400" />
            </motion.div>
            <h1
              className="text-2xl font-semibold text-white tracking-tight"
              style={{ letterSpacing: "-0.02em" }}
            >
              Join room
            </h1>
            <p className="mt-1.5 text-sm text-white/35">
              Enter a code to find your photos.
            </p>
          </motion.div>

          {/* Form card */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.025)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
              backdropFilter: "blur(20px)",
            }}
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-5">

              {/* Room Code Input */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-xs font-medium text-white/40 uppercase tracking-[0.1em]">
                  Room code
                </label>
                <div className="relative">
                  <input
                    className="input-field w-full rounded-xl px-4 py-3.5 text-base text-center tracking-[0.25em]"
                    placeholder="e.g. FEST24"
                    value={roomCode}
                    onChange={(e) => {
                      setRoomCode(e.target.value.toUpperCase());
                      resetResults();
                    }}
                    maxLength={6}
                    required
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {/* Char counter */}
                  <span
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] text-white/20"
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  >
                    {roomCode.length}/6
                  </span>
                </div>
              </motion.div>

              {/* Mode selector */}
              <motion.div variants={itemVariants} className="space-y-2">
                <div className="flex items-center">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-[0.1em]">
                    Join as
                  </label>
                  <InfoHint text="Account users match from their saved face enrollment for instant results. Guests match using a temporary selfie — no login required." />
                </div>
                <div className="flex gap-2.5">
                  <ModeCard mode="account" selected={mode === "account"} onSelect={() => { setMode("account"); resetResults(); }} index={0} />
                  <ModeCard mode="guest"   selected={mode === "guest"}   onSelect={() => { setMode("guest");   resetResults(); }} index={1} />
                </div>
              </motion.div>

              {/* Divider */}
              <div className="w-full h-px" style={{ background: "rgba(255,255,255,0.06)" }} />

              {/* CTA */}
              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  disabled={checking}
                  className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
                  style={
                    mode === "account"
                      ? { background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(6,182,212,0.1))", border: "1px solid rgba(34,211,238,0.3)", color: "rgb(34,211,238)" }
                      : { background: "linear-gradient(135deg, rgba(167,139,250,0.15), rgba(139,92,246,0.1))", border: "1px solid rgba(167,139,250,0.3)", color: "rgb(167,139,250)" }
                  }
                  whileHover={!checking ? { scale: 1.01 } : {}}
                  whileTap={!checking ? { scale: 0.98 } : {}}
                >
                  <AnimatePresence mode="wait">
                    {checking ? (
                      <motion.span key="loading" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <motion.span className="flex gap-1">
                          {[0,1,2].map(i => (
                            <motion.span key={i} className="w-1 h-1 rounded-full inline-block" style={{ background: mode === "account" ? "rgb(34,211,238)" : "rgb(167,139,250)" }}
                              animate={{ scale: [1, 1.6, 1] }} transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }} />
                          ))}
                        </motion.span>
                        Checking room…
                      </motion.span>
                    ) : (
                      <motion.span key="idle" className="flex items-center gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {mode === "account" ? <UserCheck size={15} /> : <ScanFace size={15} />}
                        {mode === "account" ? "Join with Account" : "Continue as Guest"}
                        <ArrowRight size={14} strokeWidth={2.5} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </form>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {message && (
              <motion.div
                className="rounded-xl px-4 py-3 text-sm text-red-300"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
              >
                <span className="font-medium">Error · </span>{message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results */}
          <AnimatePresence>
            {(joinResult || guestResult) && (
              <div ref={resultRef}>
                {joinResult && (
                  <AccountResultCard
                    result={joinResult}
                    checking={checking}
                    onStartMatch={() => validateAccountJoin(joinResult.room.room_code)}
                    onViewPhotos={() => router.push(`/room/${joinResult.room.room_code}/my-photos`)}
                  />
                )}
                {guestResult && (
                  <GuestResultCard
                    result={guestResult}
                    onContinue={() => router.push(`/room/${guestResult.room.room_code}/guest`)}
                  />
                )}
              </div>
            )}
          </AnimatePresence>

        </motion.div>
      </div>
    </main>
  );
}