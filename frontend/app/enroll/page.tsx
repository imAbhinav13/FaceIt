"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Check,
  LogOut,
  AlertCircle,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import CameraCapture from "@/components/CameraCaptureTemp";

function BackgroundOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.07) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      <motion.div
        className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(34,211,238,0.02) 0%, transparent 60%)",
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
      />

      {/* Light square grid overlay */}
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

      {/* Subtle noise grain */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

function ScanningOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl"
      style={{
        background: "rgba(7,7,10,0.72)",
        backdropFilter: "blur(10px)",
      }}
    >
      <div className="text-center">
        <motion.div
          animate={{ y: ["-90px", "90px", "-90px"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto mb-5 h-1 w-56 rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, rgb(34,211,238), transparent)",
            boxShadow: "0 0 24px rgba(34,211,238,0.55)",
          }}
        />
        <p className="text-sm font-medium text-white/80">Creating face profile</p>
        <p className="mt-1 text-xs text-white/35">
          Generating your secure face embedding...
        </p>
      </div>
    </motion.div>
  );
}

export default function EnrollPage() {
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [frames, setFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!data.session) {
        router.push("/login");
        return;
      }

      setEmail(data.session.user.email ?? null);
      setLoading(false);
    }

    checkSession();
  }, [router]);

  async function handleSubmitEnrollment() {
    setMessage("");

    if (frames.length !== 3) {
      setMessage("Please capture exactly 3 frames before creating your profile.");
      return;
    }

    setSubmitting(true);

    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (!token) {
      setMessage("Session expired. Please login again.");
      setSubmitting(false);
      router.push("/login");
      return;
    }

    try {
      const response = await api.post(
        "/enroll",
        { frames },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setMessage("Face profile created successfully.");

        setTimeout(() => {
          router.push("/room/join");
        }, 1400);
      } else {
        setMessage("Enrollment failed. Please try again.");
      }
    } catch (error: any) {
      setMessage(error.response?.data?.detail || error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main
        className="relative flex min-h-screen items-center justify-center p-6 text-white/70"
        style={{
          background: "rgb(7,7,10)",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        Checking session...
      </main>
    );
  }

  return (
  <main
    className="relative min-h-screen p-5 sm:p-6"
    style={{
      background: "rgb(7,7,10)",
      fontFamily: "'DM Sans', system-ui, sans-serif",
    }}
  >
    <BackgroundOrbs />

    <div className="relative z-10 mx-auto max-w-6xl space-y-8">
      {/* Centered title section - no box */}
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
        className="pt-6 text-center"
      >
        <p
          className="mb-3 text-[11px] uppercase tracking-[0.14em] text-cyan-400/80"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          FaceIt enrollment
        </p>

        <h1 className="text-3xl font-semibold tracking-tight text-white/90 sm:text-4xl">
          Face Enrollment
        </h1>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/40">
          Capture 3 frames to create your private matching profile.
        </p>
      </motion.header>

      {/* Main centered enrollment area */}
      <div className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-[1fr_240px] lg:items-stretch">
        {/* Camera capture panel */}
        <motion.section
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="relative overflow-hidden rounded-2xl p-4 sm:p-5"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
            backdropFilter: "blur(20px)",
          }}
        >
          <AnimatePresence>{submitting && <ScanningOverlay />}</AnimatePresence>

          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white/90">
                Camera capture
              </h2>
              <p className="text-sm text-white/35">
                Position your face clearly and capture 3 frames.
              </p>
            </div>

            <div
              className="shrink-0 rounded-full px-3 py-1 text-xs text-cyan-300"
              style={{
                background: "rgba(34,211,238,0.08)",
                border: "1px solid rgba(34,211,238,0.2)",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              {frames.length}/3
            </div>
          </div>

          <CameraCapture onFramesCaptured={setFrames} maxFrames={3} />
        </motion.section>

        {/* Right vertical progress panel */}
        <motion.aside
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            type: "spring",
            stiffness: 240,
            damping: 26,
            delay: 0.05,
          }}
          className="rounded-2xl p-5"
          style={{
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="mb-5">
            <h2 className="font-semibold text-white/90">Enrollment progress</h2>
            <p className="mt-1 text-xs text-white/35">
              Complete all 3 frames
            </p>
          </div>

          <div className="space-y-3">
            {[0, 1, 2].map((index) => {
              const captured = frames.length > index;

              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: 16, scale: 0.96 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    scale: captured ? 1.02 : 1,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 240,
                    damping: 22,
                    delay: index * 0.05,
                  }}
                  className="flex items-center gap-3 rounded-2xl p-3"
                  style={{
                    background: captured
                      ? "rgba(52,211,153,0.12)"
                      : "rgba(255,255,255,0.025)",
                    border: captured
                      ? "1px solid rgba(52,211,153,0.35)"
                      : "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: captured
                        ? "rgba(52,211,153,0.16)"
                        : "rgba(255,255,255,0.04)",
                      border: captured
                        ? "1px solid rgba(52,211,153,0.28)"
                        : "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    {captured ? (
                      <Check className="text-emerald-400" size={18} />
                    ) : (
                      <span
                        className="text-xs text-white/35"
                        style={{ fontFamily: "'DM Mono', monospace" }}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>

                  <div>
                    <p
                      className={
                        captured
                          ? "text-sm font-medium text-emerald-300"
                          : "text-sm font-medium text-white/60"
                      }
                    >
                      Frame {index + 1}
                    </p>
                    <p className="text-xs text-white/25">
                      {captured ? "Captured" : "Waiting"}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <button
            onClick={handleSubmitEnrollment}
            disabled={frames.length !== 3 || submitting || success}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-black outline-none transition disabled:opacity-50"
            style={{
              background:
                "linear-gradient(135deg, rgb(34,211,238), rgb(6,182,212))",
              boxShadow: "0 0 20px rgba(34,211,238,0.25)",
            }}
          >
            {submitting ? "Creating Profile..." : "Create Face Profile"}
          </button>

          <button
            onClick={handleLogout}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white/55 transition"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </motion.aside>
      </div>

      {/* Success / error message below main area */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="mx-auto max-w-5xl rounded-2xl p-4 text-sm"
            style={{
              background: success
                ? "rgba(52,211,153,0.12)"
                : "rgba(239,68,68,0.08)",
              border: success
                ? "1px solid rgba(52,211,153,0.3)"
                : "1px solid rgba(239,68,68,0.25)",
              color: success
                ? "rgb(52,211,153)"
                : "rgba(252,165,165,0.9)",
            }}
          >
            <div className="flex items-start gap-3">
              {success ? <Check size={18} /> : <AlertCircle size={18} />}
              <span>{message}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </main>
  )
};