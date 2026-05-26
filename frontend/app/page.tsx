"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Camera,
  CloudUpload,
  DoorOpen,
  Images,
  Lock,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRound,
  UsersRound,
} from "lucide-react";

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

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

const roleCards = [
  {
    title: "Uploader",
    text: "Create a room and upload event photos.",
    href: "/room/create",
    icon: CloudUpload,
  },
  {
    title: "Participant",
    text: "Join with a room code and view matched photos.",
    href: "/room/join",
    icon: UsersRound,
  },
  {
    title: "Guest",
    text: "Use temporary selfie matching without an account.",
    href: "/room/join",
    icon: UserRound,
  },
];

const steps = [
  {
    label: "Create Room",
    icon: DoorOpen,
  },
  {
    label: "Upload Photos",
    icon: Camera,
  },
  {
    label: "FaceIt Scans",
    icon: ScanFace,
  },
  {
    label: "Private Gallery",
    icon: Images,
  },
];

const trustBadges = [
  {
    label: "Private storage",
    icon: Lock,
  },
  {
    label: "Signed URLs",
    icon: ShieldCheck,
  },
  {
    label: "Temporary guest session",
    icon: Sparkles,
  },
  {
    label: "Auto expiry",
    icon: Timer,
  },
];

export default function HomePage() {
  return (
    <main className="faceit-page relative min-h-screen overflow-hidden p-5 sm:p-6">
      <BackgroundOrbs />

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl flex-col">
        {/* Top Nav */}
        <motion.nav
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          className="flex items-center justify-between py-2"
        >
          <Link href="/" className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{
                background: "rgba(34,211,238,0.1)",
                border: "1px solid rgba(34,211,238,0.22)",
              }}
            >
              <ScanFace className="text-cyan-300" size={18} />
            </div>
            <span className="text-sm font-semibold tracking-tight text-white/90">
              FaceIt
            </span>
          </Link>
          
          
          <div className="flex items-center gap-2">

              <Link
              href="/about"
              className="rounded-xl px-3 py-2 text-sm font-medium text-white/55 transition hover:text-white/80"
            >
              About
            </Link>

            <Link
              href="/login"
              className="rounded-xl px-3 py-2 text-sm font-medium text-white/55 transition hover:text-white/80"
            >
              Login
            </Link>

            <Link
              href="/signup"
              className="faceit-secondary-button rounded-xl px-3 py-2 text-sm font-medium transition"
            >
              Sign Up
            </Link>
          </div>
        </motion.nav>

        {/* Hero */}
        <section className="flex flex-1 items-center justify-center py-16 text-center sm:py-20">
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 28 }}
            className="mx-auto max-w-3xl"
          >
            <p
              className="mb-4 text-[11px] uppercase tracking-[0.16em] text-cyan-400/80"
              style={{ fontFamily: "var(--font-dm-mono), monospace" }}
            >
              Private photo routing
            </p>

            <h1 className="text-5xl font-semibold tracking-tight text-white/95 sm:text-7xl">
              FaceIt
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/45 sm:text-lg">
              Private event photo matching
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/room/create"
                className="faceit-primary-button inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Create Room
                <ArrowRight size={16} />
              </Link>

              <Link
                href="/room/join"
                className="faceit-secondary-button inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition hover:scale-[1.02] active:scale-[0.98]"
              >
                Join Room
              </Link>
            </div>

            <div className="mt-4">
              <Link
                href="/enroll"
                className="text-sm font-medium text-cyan-300/80 transition hover:text-cyan-200"
              >
                Enroll Face
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Role Cards */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                staggerChildren: 0.075,
                delayChildren: 0.12,
              },
            },
          }}
          className="grid gap-4 md:grid-cols-3"
        >
          {roleCards.map((card) => {
            const Icon = card.icon;

            return (
              <motion.div
                key={card.title}
                variants={{
                  hidden: { opacity: 0, y: 18, scale: 0.98 },
                  show: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      type: "spring",
                      stiffness: 240,
                      damping: 26,
                    },
                  },
                }}
              >
                <Link
                  href={card.href}
                  className="faceit-glass faceit-card-hover block h-full rounded-2xl p-5"
                >
                  <div
                    className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{
                      background: "rgba(34,211,238,0.08)",
                      border: "1px solid rgba(34,211,238,0.2)",
                    }}
                  >
                    <Icon className="text-cyan-300" size={20} />
                  </div>

                  <h2 className="text-base font-semibold text-white/90">
                    {card.title}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-white/40">
                    {card.text}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-sm font-medium text-cyan-300/80">
                    Continue
                    <ArrowRight size={14} />
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.section>

        {/* How It Works */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 28,
            delay: 0.24,
          }}
          className="mt-5 rounded-2xl p-4 sm:p-5"
          style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(255,255,255,0.07)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >
          <div className="grid gap-3 sm:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.label}
                  className="flex items-center gap-3 rounded-2xl p-3"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <Icon className="text-cyan-300" size={17} />
                  </div>

                  <div>
                    <p
                      className="text-[10px] uppercase tracking-[0.12em] text-white/25"
                      style={{ fontFamily: "var(--font-dm-mono), monospace" }}
                    >
                      Step {index + 1}
                    </p>
                    <p className="text-sm font-medium text-white/75">
                      {step.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.section>

        {/* Trust Badges */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 28,
            delay: 0.3,
          }}
          className="mt-5 flex flex-wrap justify-center gap-2 pb-4"
        >
          {trustBadges.map((badge) => {
            const Icon = badge.icon;

            return (
              <div
                key={badge.label}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-white/50"
                style={{
                  background: "rgba(255,255,255,0.025)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <Icon className="text-cyan-300/70" size={14} />
                {badge.label}
              </div>
            );
          })}
        </motion.section>
      </div>
    </main>
  );
}