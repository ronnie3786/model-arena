"use client";

import Link from "next/link";
import { PropsWithChildren } from "react";
import { Pill, Shell } from "@/components/ui";
import { cn } from "@/lib/utils";

export function ConnectionBadge({ connected }: { connected: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200">
      <span className={cn("h-2.5 w-2.5 rounded-full", connected ? "bg-emerald-400" : "bg-rose-500")} />
      {connected ? "Connected" : "Disconnected"}
    </div>
  );
}

export function GameShell({ title, accent, children }: PropsWithChildren<{ title: string; accent: string }>) {
  return (
    <Shell>
      <div className="flex flex-1 flex-col gap-6 py-4 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-3">
            <Pill className={accent}>{title}</Pill>
            <Link href="/" className="text-sm text-slate-300 hover:text-white">
              Back to lobby
            </Link>
          </div>
        </div>
        {children}
      </div>
    </Shell>
  );
}
