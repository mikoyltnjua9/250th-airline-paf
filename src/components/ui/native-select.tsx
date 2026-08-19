import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * A plain native <select>, styled to match the shadcn Input. Used in forms
 * that are progressively-enhanced <form action={serverAction}> submissions
 * (no client JS required) — the Radix-based Select component needs "use
 * client" and doesn't post a value with a plain form submit without extra
 * wiring, which isn't worth it for a simple dropdown.
 */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };
