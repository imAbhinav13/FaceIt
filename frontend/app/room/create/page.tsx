"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { motion, AnimatePresence } from "motion/react";
import { Check, Copy, ArrowRight, Sparkles, Info, Zap, Calendar, Shield } from "lucide-react";
import { Variants } from "motion/react";

// ─── Types ───────────────────────────────────────────────────────────────────

type CreatedEvent = {
  id: string;
  room_code: string;
  name: string;
  status: string;
  expires_at: string;
  created_by: string;
};

type TTLOption = {
  days: number;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  accent: string;
  accentBg: string;
  accentBorder: string;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const TTL_OPTIONS: TTLOption[] = [
  {
    days: 2,
    label: "2 Days",
    sublabel: "Quick event",
    icon: <Zap size={16} />,
    accent: "text-cyan-400",
    accentBg: "rgba(34,211,238,0.08)",
    accentBorder: "rgba(34,211,238,0.6)",
  },
  {
    days: 5,
    label: "5 Days",
    sublabel: "Short stay",
    icon: <Calendar size={16} />,
    accent: "text-violet-400",
    accentBg: "rgba(167,139,250,0.08)",
    accentBorder: "rgba(167,139,250,0.6)",
  },
  {
    days: 7,
    label: "7 Days",
    sublabel: "Full week",
    icon: <Shield size={16} />,
    accent: "text-emerald-400",
    accentBg: "rgba(52,211,153,0.08)",
    accentBorder: "rgba(52,211,153,0.6)",
  },
];

// ─── Animated background orbs ────────────────────────────────────────────────

function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      />
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(34,211,238,0.02) 0%, transparent 60%)",
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `linear-gradient(rgba(34,211,238,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.5) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />
      {/* Noise grain */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

// ─── TTL Card ─────────────────────────────────────────────────────────────────

function TTLCard({
  option,
  selected,
  onSelect,
  index,
}: {
  option: TTLOption;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 + index * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      className="relative flex-1 rounded-xl p-4 text-left transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
      style={{
        background: selected ? option.accentBg : "rgba(255,255,255,0.03)",
        border: `1px solid ${selected ? option.accentBorder : "rgba(255,255,255,0.08)"}`,
        boxShadow: selected
          ? `0 0 20px ${option.accentBorder.replace("0.6", "0.15")}, inset 0 1px 0 rgba(255,255,255,0.05)`
          : "inset 0 1px 0 rgba(255,255,255,0.03)",
      }}
    >
      <AnimatePresence>
        {selected && (
          <motion.div
            className="absolute top-2.5 right-2.5 rounded-full p-0.5"
            style={{ background: option.accentBorder }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            <Check size={10} strokeWidth={3} className="text-black" />
          </motion.div>
        )}
      </AnimatePresence>

      <div className={`mb-2 ${option.accent}`}>{option.icon}</div>
      <p className="text-sm font-semibold text-white/90 font-mono tracking-wide">
        {option.label}
      </p>
      <p className="text-xs text-white/35 mt-0.5">{option.sublabel}</p>
    </motion.button>
  );
}

// ─── Info Hint ────────────────────────────────────────────────────────────────

function InfoHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="More information"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="text-white/25 hover:text-cyan-400 transition-colors ml-1.5 outline-none"
      >
        <Info size={13} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg px-3 py-2 text-xs text-white/70 z-50"
            style={{
              background: "rgba(15,15,20,0.95)",
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

// ─── Room Code Display ────────────────────────────────────────────────────────

function RoomCodeChar({ char, index }: { char: string; index: number }) {
  return (
    <motion.span
      className="inline-flex items-center justify-center w-10 h-12 rounded-lg text-2xl font-bold font-mono text-white"
      style={{
        background: "rgba(34,211,238,0.08)",
        border: "1px solid rgba(34,211,238,0.25)",
        textShadow: "0 0 20px rgba(34,211,238,0.8)",
      }}
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: index * 0.06,
        type: "spring",
        stiffness: 400,
        damping: 22,
      }}
    >
      {char}
    </motion.span>
  );
}

// ─── Success State ────────────────────────────────────────────────────────────

function SuccessCard({
  event,
  onGoToRoom,
}: {
  event: CreatedEvent;
  onGoToRoom: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(event.room_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const expiryDate = new Date(event.expires_at).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <motion.div
      className="relative overflow-hidden rounded-2xl p-6"
      style={{
        background: "rgba(10,10,14,0.9)",
        border: "1px solid rgba(34,211,238,0.3)",
        boxShadow:
          "0 0 60px rgba(34,211,238,0.08), 0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
      initial={{ opacity: 0, y: 32, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 28 }}
    >
      {/* Sweep shimmer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(105deg, transparent 40%, rgba(34,211,238,0.04) 50%, transparent 60%)",
        }}
        initial={{ x: "-100%" }}
        animate={{ x: "200%" }}
        transition={{ delay: 0.3, duration: 1.2, ease: "easeInOut" }}
      />

      {/* Header */}
      <motion.div
        className="flex items-center gap-2 mb-5"
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.15 }}
      >
        <motion.div
          className="flex items-center justify-center w-7 h-7 rounded-full"
          style={{ background: "rgba(52,211,153,0.15)", border: "1px solid rgba(52,211,153,0.4)" }}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
        >
          <Check size={13} className="text-emerald-400" strokeWidth={2.5} />
        </motion.div>
        <div>
          <p className="text-sm font-semibold text-emerald-400 tracking-wide">Room Created</p>
          <p className="text-xs text-white/35">{event.name} · expires {expiryDate}</p>
        </div>
      </motion.div>

      {/* Room code */}
      <div className="mb-5">
        <p className="text-[10px] uppercase tracking-[0.15em] text-white/30 mb-3 font-mono">
          Room Code
        </p>
        <div className="flex gap-1.5 justify-center">
          {event.room_code.split("").map((char, i) => (
            <RoomCodeChar key={i} char={char} index={i} />
          ))}
        </div>
      </div>

      {/* Actions */}
      <motion.div
        className="flex gap-2"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <motion.button
          type="button"
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          style={{
            background: copied ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${copied ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`,
            color: copied ? "rgb(52,211,153)" : "rgba(255,255,255,0.7)",
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.span
                key="copied"
                className="flex items-center gap-1.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Check size={14} strokeWidth={2.5} /> Copied
              </motion.span>
            ) : (
              <motion.span
                key="copy"
                className="flex items-center gap-1.5"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
              >
                <Copy size={14} /> Copy Code
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          type="button"
          onClick={onGoToRoom}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-black outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          style={{
            background: "linear-gradient(135deg, rgb(34,211,238) 0%, rgb(6,182,212) 100%)",
            boxShadow: "0 0 24px rgba(34,211,238,0.3)",
          }}
          whileHover={{ scale: 1.02, boxShadow: "0 0 32px rgba(34,211,238,0.45)" }}
          whileTap={{ scale: 0.97 }}
        >
          Enter Room <ArrowRight size={14} strokeWidth={2.5} />
        </motion.button>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CreateRoomPage() {
  const router = useRouter();

  const [eventName, setEventName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [createdEvent, setCreatedEvent] = useState<CreatedEvent | null>(null);
  const [ttlDays, setTtlDays] = useState(2);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [, setNameFocused] = useState(false);
  const [, setCodeFocused] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push("/login");
        return;
      }
      setLoading(false);
    }
    checkSession();
  }, [router]);

  async function handleCreateRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setCreatedEvent(null);

    if (!eventName.trim()) {
      setMessage("Event name is required.");
      return;
    }

    setCreating(true);
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMessage("Session expired. Please login again.");
      setCreating(false);
      router.push("/login");
      return;
    }

    try {
      const response = await api.post(
        "/rooms",
        { name: eventName.trim(), room_code: roomCode.trim() || null, ttl_days: ttlDays },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCreatedEvent(response.data.event);
    } catch (error: any) {
      setMessage(error.response?.data?.detail || error.message);
    } finally {
      setCreating(false);
    }
  }

  // Auto-scroll to success card after room creation
  useEffect(() => {
    if (createdEvent && successRef.current) {
      const timer = setTimeout(() => {
        successRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
      
      return () => clearTimeout(timer);
    }
  }, [createdEvent]);

  // Container stagger animation variants
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
        ease: [0.25, 0.46, 0.45, 0.94]
      } 
    },
  };

  if (loading) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "rgb(7,7,10)" }}
      >
        <motion.div
          className="flex gap-1.5"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-cyan-400"
              animate={{ scale: [1, 1.5, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </motion.div>
      </main>
    );
  }

  return (
    <main
      className="relative min-h-screen flex items-center justify-center p-6"
      style={{
        background: "rgb(7,7,10)",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&family=DM+Mono:wght@400;500&display=swap');
        
        .input-field {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          color: rgba(255,255,255,0.9);
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .input-field::placeholder { color: rgba(255,255,255,0.2); }
        .input-field:hover { border-color: rgba(255,255,255,0.14); background: rgba(255,255,255,0.04); }
        .input-field:focus { outline: none; border-color: rgba(34,211,238,0.5); box-shadow: 0 0 0 3px rgba(34,211,238,0.08), 0 0 20px rgba(34,211,238,0.05); background: rgba(34,211,238,0.03); }
        .input-field.upper { text-transform: uppercase; font-family: 'DM Mono', monospace; letter-spacing: 0.1em; }
        
        .create-btn {
          background: linear-gradient(135deg, rgba(34,211,238,0.15) 0%, rgba(6,182,212,0.1) 100%);
          border: 1px solid rgba(34,211,238,0.3);
          color: rgb(34,211,238);
          transition: all 0.2s;
        }
        .create-btn:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(34,211,238,0.22) 0%, rgba(6,182,212,0.16) 100%);
          border-color: rgba(34,211,238,0.5);
          box-shadow: 0 0 28px rgba(34,211,238,0.18);
        }
        .create-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        
        .char-count {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
        }
      `}</style>

      <BackgroundOrbs />

      <div className="relative z-10 w-full max-w-md">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-5"
        >
          {/* Brand mark + Title */}
          <motion.div variants={itemVariants} className="text-center mb-8">
            <motion.div
              className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4"
              style={{
                background: "rgba(34,211,238,0.08)",
                border: "1px solid rgba(34,211,238,0.2)",
                boxShadow: "0 0 24px rgba(34,211,238,0.1)",
              }}
              whileHover={{ scale: 1.05, boxShadow: "0 0 36px rgba(34,211,238,0.2)" }}
            >
              <Sparkles size={22} className="text-cyan-400" />
            </motion.div>
            <h1
              className="text-2xl font-semibold text-white tracking-tight"
              style={{ fontFamily: "'DM Sans', system-ui, sans-serif", letterSpacing: "-0.02em" }}
            >
              Create event room
            </h1>
            <p className="mt-1.5 text-sm text-white/35">
              Share the code. Collect the memories.
            </p>
          </motion.div>

          {/* Form Card */}
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
            <form onSubmit={handleCreateRoom} className="p-6 space-y-5">
              {/* Event Name */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-xs font-medium text-white/40 uppercase tracking-[0.1em]">
                  Event name
                </label>
                <div className="relative">
                  <input
                    className="input-field w-full rounded-xl px-4 py-3 text-sm"
                    placeholder="e.g. Sunset Farewell Party"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    onFocus={() => setNameFocused(true)}
                    onBlur={() => setNameFocused(false)}
                    required
                  />
                </div>
              </motion.div>

              {/* Room Code */}
              <motion.div variants={itemVariants} className="space-y-1.5">
                <label className="text-xs font-medium text-white/40 uppercase tracking-[0.1em]">
                  Room code
                  <span className="ml-1.5 text-white/20 normal-case tracking-normal font-normal">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <input
                    className="input-field upper w-full rounded-xl px-4 py-3 text-sm pr-12"
                    placeholder="e.g. FEST24"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    onFocus={() => setCodeFocused(true)}
                    onBlur={() => setCodeFocused(false)}
                    maxLength={6}
                  />
                  <span
                    className="char-count absolute right-3 top-1/2 -translate-y-1/2 text-white/20"
                  >
                    {roomCode.length}/6
                  </span>
                </div>
                <p className="text-[11px] text-white/25 leading-relaxed">
                  6 characters · avoids confusing 0, O, I, 1
                </p>
              </motion.div>

              {/* TTL */}
              <motion.div variants={itemVariants} className="space-y-2.5">
                <div className="flex items-center">
                  <label className="text-xs font-medium text-white/40 uppercase tracking-[0.1em]">
                    Photo expiry
                  </label>
                  <InfoHint text="Photos and matches are permanently deleted after room expiry. This cannot be undone." />
                </div>
                <div className="flex gap-2.5">
                  {TTL_OPTIONS.map((opt, i) => (
                    <TTLCard
                      key={opt.days}
                      option={opt}
                      selected={ttlDays === opt.days}
                      onSelect={() => setTtlDays(opt.days)}
                      index={i}
                    />
                  ))}
                </div>
              </motion.div>

              {/* Divider */}
              <div
                className="w-full h-px"
                style={{ background: "rgba(255,255,255,0.06)" }}
              />

              {/* Submit */}
              <motion.div variants={itemVariants}>
                <motion.button
                  type="submit"
                  disabled={creating}
                  className="create-btn w-full rounded-xl py-3.5 text-sm font-semibold tracking-wide outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
                  whileHover={!creating ? { scale: 1.01 } : {}}
                  whileTap={!creating ? { scale: 0.98 } : {}}
                >
                  <AnimatePresence mode="wait">
                    {creating ? (
                      <motion.span
                        key="creating"
                        className="flex items-center justify-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <motion.span
                          className="flex gap-1"
                          animate={{ opacity: [0.4, 1, 0.4] }}
                          transition={{ duration: 1.2, repeat: Infinity }}
                        >
                          {[0, 1, 2].map((i) => (
                            <motion.span
                              key={i}
                              className="w-1 h-1 rounded-full bg-cyan-400 inline-block"
                              animate={{ scale: [1, 1.6, 1] }}
                              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.12 }}
                            />
                          ))}
                        </motion.span>
                        Creating room…
                      </motion.span>
                    ) : (
                      <motion.span
                        key="idle"
                        className="flex items-center justify-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Sparkles size={15} />
                        Create Room
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
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.25)",
                }}
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <span className="font-medium">Error · </span>{message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success */}
          <AnimatePresence>
            {createdEvent && (
              <div ref={successRef} className="w-full scroll-mt-6">
                <SuccessCard
                  event={createdEvent}
                  onGoToRoom={() => router.push(`/room/${createdEvent.room_code}`)}
                />
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </main>
  );      
}