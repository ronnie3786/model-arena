"use client";

import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function Shell({ children }: PropsWithChildren) {
  return (
    <main className="min-h-screen bg-surface text-text">
      <div className="accent-grid min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </div>
    </main>
  );
}

export function Pill({ children, className }: PropsWithChildren<{ className?: string }>) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-muted", className)}>
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "rounded-2xl px-4 py-3 font-semibold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-3">
      <Pill>Arcade Pulse</Pill>
      <div>
        <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">{subtitle}</p>
      </div>
    </div>
  );
}
