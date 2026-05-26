"use client";

import { Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";

type InfoHintProps = {
  text: string;
  side?: "left" | "right";
};

export function InfoHint({ text, side = "left" }: InfoHintProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex size-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-500 backdrop-blur-md transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-300/40"
        aria-label={text}
      >
        <Info className="size-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.span
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className={`absolute bottom-9 z-50 w-64 rounded-2xl border border-white/10 bg-zinc-950/90 p-3 text-left text-xs leading-5 text-zinc-300 shadow-2xl shadow-black/40 backdrop-blur-xl ${
              side === "right" ? "left-0" : "right-0"
            }`}
          >
            {text}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}