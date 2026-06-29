"use client"

/**
 * DateRangePicker — a professional, responsive date-range calendar dropdown.
 *
 * Replaces the old fixed 7D / 30D / 90D pills across the dashboard. Presets sit
 * alongside a range calendar (2 months on desktop, 1 on mobile) so users can
 * pick a quick window or an exact custom span. The selected range drives the
 * data shown by each consumer (KPIs, charts, ad records).
 *
 * Controlled component: pass `value` + `onChange`. An empty `{}` range means
 * "All time" (no date filtering).
 */

import * as React from "react"
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  isSameDay,
  startOfDay,
  endOfDay,
} from "date-fns"
import type { DateRange } from "react-day-picker"
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { useIsMobile } from "@/hooks/use-mobile"

export type { DateRange }

interface Preset {
  label: string
  /** Returns the range for this preset. `undefined` = All time (no filter). */
  range: () => DateRange | undefined
}

const PRESETS: Preset[] = [
  { label: "Last 7 days", range: () => ({ from: startOfDay(subDays(new Date(), 6)), to: endOfDay(new Date()) }) },
  { label: "Last 30 days", range: () => ({ from: startOfDay(subDays(new Date(), 29)), to: endOfDay(new Date()) }) },
  { label: "Last 90 days", range: () => ({ from: startOfDay(subDays(new Date(), 89)), to: endOfDay(new Date()) }) },
  { label: "This month", range: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }) },
  { label: "Last month", range: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "All time", range: () => undefined },
]

function rangesMatch(a?: DateRange, b?: DateRange) {
  const aEmpty = !a || !a.from
  const bEmpty = !b || !b.from
  if (aEmpty || bEmpty) return aEmpty && bEmpty // both "All time"
  const sameFrom = a!.from && b!.from && isSameDay(a!.from, b!.from)
  const sameTo = (!a!.to && !b!.to) || (a!.to && b!.to && isSameDay(a!.to, b!.to))
  return Boolean(sameFrom && sameTo)
}

function formatLabel(value?: DateRange): string {
  if (!value || (!value.from && !value.to)) return "All time"
  // Surface the preset name when the range matches one exactly.
  const preset = PRESETS.find((p) => rangesMatch(p.range(), value))
  if (preset) return preset.label
  if (value.from && value.to) {
    const sameYear = value.from.getFullYear() === value.to.getFullYear()
    const left = format(value.from, sameYear ? "MMM d" : "MMM d, yyyy")
    const right = format(value.to, "MMM d, yyyy")
    return `${left} – ${right}`
  }
  if (value.from) return `From ${format(value.from, "MMM d, yyyy")}`
  return "All time"
}

export interface DateRangePickerProps {
  value?: DateRange
  onChange: (range: DateRange | undefined) => void
  /** Popover alignment relative to the trigger. */
  align?: "start" | "center" | "end"
  /** Brand accent (hex) used to highlight the active preset. */
  accent?: string
  className?: string
}

export function DateRangePicker({
  value,
  onChange,
  align = "end",
  accent,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<DateRange | undefined>(value)
  const isMobile = useIsMobile()

  // Keep the draft in sync whenever the popover (re)opens.
  React.useEffect(() => {
    if (open) setDraft(value)
  }, [open, value])

  const applyPreset = (preset: Preset) => {
    const next = preset.range()
    onChange(next)
    setOpen(false)
  }

  const apply = () => {
    onChange(draft)
    setOpen(false)
  }

  const activePresetLabel = PRESETS.find((p) => rangesMatch(p.range(), value))?.label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "h-9 gap-2 rounded-lg border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm hover:bg-muted/60",
            className,
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="max-w-[160px] truncate">{formatLabel(value)}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className="w-auto max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <div className="flex flex-col sm:flex-row">
          {/* Presets — horizontal scroll on mobile, vertical rail on desktop */}
          <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-border p-2 sm:w-40 sm:flex-col sm:overflow-x-visible sm:border-b-0 sm:border-r">
            {PRESETS.map((preset) => {
              const active = activePresetLabel === preset.label
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "whitespace-nowrap rounded-md px-3 py-1.5 text-left text-xs font-medium transition-colors sm:w-full",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                  style={active && accent ? { backgroundColor: `${accent}1a`, color: accent } : undefined}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          {/* Calendar + apply */}
          <div className="flex flex-col">
            <Calendar
              mode="range"
              numberOfMonths={isMobile ? 1 : 2}
              defaultMonth={value?.from ?? subMonths(new Date(), isMobile ? 0 : 1)}
              selected={draft}
              onSelect={setDraft}
              disabled={{ after: new Date() }}
              className="p-2 sm:p-3"
            />
            <div className="flex items-center justify-between gap-2 border-t border-border p-2.5">
              <span className="px-1 text-xs text-muted-foreground">
                {draft?.from && draft?.to
                  ? `${format(draft.from, "MMM d")} – ${format(draft.to, "MMM d, yyyy")}`
                  : "Pick a start and end date"}
              </span>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="h-7 px-3 text-xs"
                  disabled={!draft?.from || !draft?.to}
                  onClick={apply}
                  style={accent ? { backgroundColor: accent, borderColor: accent } : undefined}
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default DateRangePicker
