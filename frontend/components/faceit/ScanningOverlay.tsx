"use client";

import { motion } from "motion/react";

type ScanningOverlayProps = {
  active: boolean;
  label?: string;
};

export function ScanningOverlay({
  active,
  label = "Facial vector scan active",
}: ScanningOverlayProps) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
      {/* Dark AI-tint overlay */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Subtle scanning grid */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(34,211,238,0.22) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.22) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Animated horizontal scan beam */}
      <motion.div
        className="absolute left-0 top-0 h-24 w-full"
        initial={{ y: "-20%" }}
        animate={{ y: ["-20%", "360%", "-20%"] }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          willChange: "transform",
        }}
      >
        <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-cyan-200 shadow-[0_0_24px_rgba(103,232,249,1),0_0_60px_rgba(34,211,238,0.75)]" />
        <div className="h-full w-full bg-gradient-to-b from-transparent via-cyan-300/20 to-transparent blur-sm" />
      </motion.div>

      {/* Pulsing border */}
      <motion.div
        className="absolute inset-0 rounded-2xl border border-cyan-300/40"
        animate={{
          opacity: [0.35, 0.85, 0.35],
          boxShadow: [
            "0 0 0 rgba(34,211,238,0)",
            "0 0 32px rgba(34,211,238,0.35)",
            "0 0 0 rgba(34,211,238,0)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Corner brackets */}
      <div className="absolute left-4 top-4 h-8 w-8 border-l-2 border-t-2 border-cyan-200/90" />
      <div className="absolute right-4 top-4 h-8 w-8 border-r-2 border-t-2 border-cyan-200/90" />
      <div className="absolute bottom-4 left-4 h-8 w-8 border-b-2 border-l-2 border-cyan-200/90" />
      <div className="absolute bottom-4 right-4 h-8 w-8 border-b-2 border-r-2 border-cyan-200/90" />

      {/* Floating scan label */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-full border border-cyan-300/25 bg-black/70 px-4 py-2 text-xs font-medium text-cyan-100 shadow-2xl shadow-cyan-950/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-cyan-200" />
          </span>

          <span className="uppercase tracking-[0.22em]">{label}</span>
        </div>

        <div className="flex items-center gap-1">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              className="size-1.5 rounded-full bg-cyan-200"
              animate={{ opacity: [0.25, 1, 0.25] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: dot * 0.18,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}