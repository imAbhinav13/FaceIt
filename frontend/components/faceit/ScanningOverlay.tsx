"use client";

import { motion } from "motion/react";

type ScanningOverlayProps = {
  active: boolean;
  label?: string;
};

export function ScanningOverlay({
  active,
  label = "Scanning faces",
}: ScanningOverlayProps) {
  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <div className="absolute inset-0 bg-cyan-400/5" />

      <motion.div
        className="absolute left-0 h-1 w-full bg-cyan-300 shadow-[0_0_26px_rgba(34,211,238,0.95)]"
        initial={{ y: "0%" }}
        animate={{ y: ["0%", "8000%", "0%"] }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          willChange: "transform",
        }}
      />

      <motion.div
        className="absolute inset-0 border border-cyan-300/40"
        animate={{
          opacity: [0.25, 0.75, 0.25],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <div className="absolute bottom-3 left-3 rounded-full border border-cyan-300/30 bg-black/70 px-3 py-1 text-xs font-medium text-cyan-100 backdrop-blur">
        {label}
      </div>
    </div>
  );
}