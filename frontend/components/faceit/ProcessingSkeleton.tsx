"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProcessingSkeleton() {
  return (
    <section className="space-y-5">
      <div>
        <Skeleton className="h-6 w-56 bg-zinc-800" />
        <Skeleton className="mt-2 h-4 w-80 bg-zinc-800" />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className="border-zinc-800 bg-zinc-950 p-5">
            <Skeleton className="h-10 w-10 rounded-xl bg-zinc-800" />
            <Skeleton className="mt-5 h-4 w-24 bg-zinc-800" />
            <Skeleton className="mt-3 h-8 w-16 bg-zinc-800" />
          </Card>
        ))}
      </div>

      <Card className="border-zinc-800 bg-zinc-950 p-5">
        <div className="flex justify-between">
          <Skeleton className="h-4 w-40 bg-zinc-800" />
          <Skeleton className="h-4 w-12 bg-zinc-800" />
        </div>

        <Skeleton className="mt-4 h-2 w-full rounded-full bg-zinc-800" />

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <Skeleton key={item} className="h-4 w-24 bg-zinc-800" />
          ))}
        </div>
      </Card>
    </section>
  );
}