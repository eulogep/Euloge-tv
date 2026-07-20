"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "premium-surface flex min-h-[40vh] flex-col items-center justify-center gap-4 px-5 py-10 text-center",
        className,
      )}
      data-system-state="empty"
    >
      <span className="border-border text-accent-bright flex h-12 w-12 items-center justify-center rounded-2xl border bg-[var(--state-selected)]">
        <Sparkles className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <h2 className="type-section">{title}</h2>
        {description && (
          <p className="text-muted mx-auto mt-2 max-w-md text-sm leading-6">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
