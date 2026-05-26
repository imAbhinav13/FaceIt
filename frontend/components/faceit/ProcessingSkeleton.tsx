"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProcessingSkeleton() {
  return (
    <section className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Skeleton className="h-4 w-56 bg-zinc-800" />
          <Skeleton className="mt-4 h-8 w-72 bg-zinc-800" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full bg-zinc-800" />
        </div>

        <Skeleton className="h-9 w-32 rounded-full bg-zinc-800" />
      </div>

      <Card className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-24 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <Skeleton className="h-4 w-36 bg-zinc-800" />
            <div className="mt-3 flex items-end gap-3">
              <Skeleton className="h-16 w-28 bg-zinc-800" />
              <Skeleton className="mb-2 h-8 w-8 bg-zinc-800" />
            </div>
            <Skeleton className="mt-4 h-4 w-72 bg-zinc-800" />
          </div>

          <div className="w-full max-w-xl">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16 bg-zinc-800" />
              <Skeleton className="h-3 w-12 bg-zinc-800" />
            </div>

            <Skeleton className="mt-3 h-3 w-full rounded-full bg-zinc-800" />

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[1, 2, 3, 4].map((item) => (
                <Skeleton key={item} className="h-4 w-20 bg-zinc-800" />
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card
            key={item}
            className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.045] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl"
          >
            <Skeleton className="h-11 w-11 rounded-2xl bg-zinc-800" />
            <Skeleton className="mt-5 h-4 w-24 bg-zinc-800" />
            <Skeleton className="mt-3 h-10 w-16 bg-zinc-800" />
            <Skeleton className="mt-3 h-4 w-full bg-zinc-800" />
          </Card>
        ))}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card
            key={item}
            className="rounded-2xl border border-white/10 bg-white/[0.035] p-4"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-9 w-9 rounded-xl bg-zinc-800" />
              <div className="flex-1">
                <Skeleton className="h-4 w-20 bg-zinc-800" />
                <Skeleton className="mt-3 h-3 w-full bg-zinc-800" />
                <Skeleton className="mt-2 h-3 w-4/5 bg-zinc-800" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}