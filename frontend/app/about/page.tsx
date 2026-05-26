"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Camera,
  CloudUpload,
  Download,
  DoorOpen,
  Eye,
  FileArchive,
  Hourglass,
  Images,
  Lock,
  LogIn,
  ScanFace,
  ShieldCheck,
  Sparkles,
  Timer,
  UserRound,
  UsersRound,
  VectorSquare,
} from "lucide-react";

function FaceItLogoTitle() {
  return (
    <h1 className="flex items-end justify-center text-5xl font-semibold tracking-tight text-white/95 sm:text-7xl">
      <span>Face</span>
      <span
        className="mx-[0.015em] leading-none text-white"
        style={{
          fontFamily: '"Times New Roman", "Cormorant Garamond", serif',
          fontWeight: 700,
          transform: "translateY(0.015em)",
        }}
      >
        I
      </span>
      <span>t</span>
    </h1>
  );
}

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
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
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
    </div>
  );
}

const workflow = [
  { title: "Create Room", icon: DoorOpen, href: "/room/create" },
  { title: "Upload Photos", icon: CloudUpload, href: "/room/create" },
  { title: "AI Face Scan", icon: ScanFace, href: "/about" },
  { title: "Private Gallery", icon: Images, href: "/room/join" },
];

const privacy = [
  { title: "Signed URLs", icon: ShieldCheck, hint: "Secure photo access." },
  { title: "Temporary guests", icon: UserRound, hint: "Guest sessions are not persistent." },
  { title: "Room expiry", icon: Timer, hint: "Rooms can expire after TTL." },
  { title: "Private galleries", icon: Lock, hint: "Users see only matched photos." },
];

const features = [
  { title: "AI face matching", label: "Match faces to users.", icon: ScanFace },
  { title: "Review queue", label: "Approve uncertain matches.", icon: Eye },
  { title: "Guest matching", label: "Temporary selfie flow.", icon: UserRound },
  { title: "Private galleries", label: "Matched photos only.", icon: Images },
  { title: "Temporary sessions", label: "Guest data stays short-lived.", icon: Hourglass },
  { title: "ZIP download", label: "Download matched photos.", icon: FileArchive },
  { title: "Batch processing", label: "Process many photos.", icon: CloudUpload },
];

const matching = [
  { title: "Detect", label: "Find faces in photos.", icon: Camera },
  { title: "Embed", label: "Generate face vectors.", icon: VectorSquare },
  { title: "Match", label: "Compare privately.", icon: ScanFace },
];

export default function AboutPage() {
  return (
    <main className="faceit-page relative min-h-screen overflow-hidden p-5 sm:p-6">
      <BackgroundOrbs />

      <div className="relative z-10 mx-auto max-w-6xl space-y-8">
        <nav className="flex items-center justify-between py-2">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold text-white/90">
            <ScanFace className="text-cyan-300" size={18} />
            FaceIt
          </Link>

          <div className="flex items-center gap-3 text-sm text-white/55">
            <Link href="/about" className="text-cyan-300">About</Link>
            <Link href="/room/create">Create Room</Link>
            <Link href="/room/join">Join Room</Link>
            <Link href="/login">Login</Link>
          </div>
        </nav>

        <section className="pt-10">
          <div className="mb-8 text-center">
            <p className="font-faceit-mono text-[11px] uppercase tracking-[0.14em] text-cyan-400/80">
              About FaceIt
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white/90 sm:text-5xl">
              Event photo sharing without manual sorting.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/45 sm:text-base">
              FaceIt helps an uploader create an event room, upload photos, and let each
              participant retrieve only the photos they appear in.
            </p>
          </div>
        </section>

        <section>
          <SectionTitle eyebrow="Workflow" title="What FaceIt does" />

          <div className="grid gap-3 md:grid-cols-4">
            {workflow.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Link href={item.href} className="faceit-glass faceit-card-hover block rounded-2xl p-5">
                    <Icon className="mb-4 text-cyan-300" size={24} />
                    <p className="font-faceit-mono text-[10px] uppercase tracking-[0.14em] text-white/25">
                      Step {index + 1}
                    </p>
                    <h3 className="mt-1 font-semibold text-white/85">{item.title}</h3>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle eyebrow="Privacy" title="Private by default" />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {privacy.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="faceit-glass-soft rounded-2xl p-4">
                  <Icon className="mb-3 text-cyan-300" size={21} />
                  <h3 className="font-semibold text-white/85">{item.title}</h3>
                  <p className="mt-1 text-sm text-white/35">{item.hint}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle eyebrow="Features" title="Core product features" />

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.045 }}
                  className="faceit-glass faceit-card-hover rounded-2xl p-5"
                >
                  <Icon className="mb-4 text-cyan-300" size={22} />
                  <h3 className="font-semibold text-white/85">{feature.title}</h3>
                  <p className="mt-1 text-sm text-white/35">{feature.label}</p>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section>
          <SectionTitle eyebrow="Matching" title="How matching works" />

          <div className="grid gap-4 md:grid-cols-3">
            {matching.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="faceit-glass rounded-3xl p-6 text-center">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity }}
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{
                      background: "rgba(34,211,238,0.1)",
                      border: "1px solid rgba(34,211,238,0.22)",
                    }}
                  >
                    <Icon className="text-cyan-300" size={26} />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-white/90">{item.title}</h3>
                  <p className="mt-1 text-sm text-white/35">{item.label}</p>
                </div>
              );
            })}
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="faceit-glass rounded-3xl p-8 text-center sm:p-10"
        >
          <h2 className="text-2xl font-semibold text-white/90 sm:text-3xl">
            Ready to create your room?
          </h2>

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/room/create" className="faceit-primary-button rounded-xl px-6 py-3 text-sm font-semibold">
              Create Room
            </Link>
            <Link href="/room/join" className="faceit-secondary-button rounded-xl px-6 py-3 text-sm font-semibold">
              Join Room
            </Link>
            <Link href="/enroll" className="faceit-secondary-button rounded-xl px-6 py-3 text-sm font-semibold">
              Enroll Face
            </Link>
          </div>
        </motion.section>
      </div>
    </main>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-4 text-center">
      <p className="font-faceit-mono text-[11px] uppercase tracking-[0.14em] text-cyan-400/80">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white/90 sm:text-3xl">
        {title}
      </h2>
    </div>
  );
}