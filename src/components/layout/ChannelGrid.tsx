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
        "grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
        className,
      )}
    >
      {items}
    </div>
  );
}
