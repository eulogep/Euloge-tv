"use client";

import { cn } from "@/lib/utils";

export function ChannelGrid({
  items,
  className,
}: {
  items: React.ReactNode[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
        className,
      )}
    >
      {items}
    </div>
  );
}
