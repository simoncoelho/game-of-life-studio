import type { ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

export function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format: (value: number) => string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm font-medium text-foreground">{format(value)}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(next) => onChange(next[0] ?? value)} />
    </div>
  )
}

export function CompactColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)_34px] items-center gap-2 border-b border-border/50 py-1.5 last:border-b-0 last:pb-0 first:pt-0">
      <Label className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="h-8 rounded-lg px-2.5 text-sm" />
      <div className="shrink-0">
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="size-8 cursor-pointer rounded-lg border border-border bg-transparent p-1"
        />
      </div>
    </div>
  )
}

export function PanelBlock({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-[24px] border border-border/70 bg-panel/85 p-3.5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description ? <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </div>
  )
}

export function CompactToggle({
  label,
  checked,
  onCheckedChange,
}: {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/70 bg-input/45 px-2.5 py-2">
      <p className="text-[13px] font-medium text-foreground whitespace-nowrap">{label}</p>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}
