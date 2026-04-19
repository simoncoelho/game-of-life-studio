import { cn } from "@/lib/utils"

export function toolButtonClass(active: boolean) {
  return cn(
    "group flex min-w-14 flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[10px] font-medium transition-all",
    active
      ? "border-primary/60 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
      : "border-border bg-card/70 text-muted-foreground hover:border-primary/30 hover:text-foreground",
  )
}
