"use client";

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
        "flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center",
        className,
      )}
    >
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-muted mx-auto mt-1 max-w-md text-sm">{description}</p>}
      </div>
      {action}
    </div>
  );
}
