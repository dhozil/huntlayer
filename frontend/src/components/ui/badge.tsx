import * as React from "react"
import { cn } from "@/lib/utils"

export function Badge({ className, variant="default", ...props }: React.HTMLAttributes<HTMLDivElement> & {variant?: "default"|"secondary"|"outline"|"success"|"warning"|"danger"}) {
  const v: Record<string,string> = {
    default:"bg-primary/15 text-primary border-primary/20",
    secondary:"bg-secondary text-secondary-foreground border-transparent",
    outline:"text-foreground",
    success:"bg-zinc-400/15 text-zinc-200 border-zinc-400/20",
    warning:"bg-amber-500/15 text-amber-400 border-amber-500/20",
    danger:"bg-red-500/15 text-red-400 border-red-500/20",
  }
  return <div className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", v[variant], className)} {...props} />
}
