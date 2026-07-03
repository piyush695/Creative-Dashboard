"use client"

import React, { useEffect, useRef } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import {
  Plus,
  ChevronDown,
  Check,
  Sparkles,
  ArrowRight,
  X,
  Image as ImageIcon,
  Film,
  FileText,
  Code2,
  FileType,
  Loader2,
  Database,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  GEN_TYPES,
  STYLE_PRESETS,
  type StudioAttachment,
  type AttachmentKind,
} from "./studio-shared"

const KIND_ICON: Record<AttachmentKind, React.ElementType> = {
  image: ImageIcon,
  video: Film,
  doc: FileText,
  html: Code2,
  text: FileType,
  file: FileText,
}

interface StudioComposerProps {
  prompt: string
  onPromptChange: (v: string) => void
  placeholder?: string

  attachments: StudioAttachment[]
  onOpenAttachments: () => void
  onRemoveAttachment: (id: string) => void

  /** Selected Top Ads used as generation context (shown as removable chips). */
  contextAds?: { id: string; name: string; thumbnailUrl?: string }[]
  onRemoveContextAd?: (id: string) => void

  genTypes: string[]
  onToggleGenType: (t: string) => void
  style: string
  onStyleChange: (s: string) => void
  directMode: boolean
  onDirectModeChange: (v: boolean) => void

  onGenerate: () => void
  isGenerating: boolean
  generateLabel?: string
}

export function StudioComposer({
  prompt,
  onPromptChange,
  placeholder = "Describe the ad creative — offer, tone, colors… or pick a starter above",
  attachments,
  onOpenAttachments,
  onRemoveAttachment,
  contextAds = [],
  onRemoveContextAd,
  genTypes,
  onToggleGenType,
  style,
  onStyleChange,
  directMode,
  onDirectModeChange,
  onGenerate,
  isGenerating,
  generateLabel = "Generate",
}: StudioComposerProps) {
  const taRef = useRef<HTMLTextAreaElement>(null)

  // Autogrow the textarea up to a cap.
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(150, el.scrollHeight)}px`
  }, [prompt])

  return (
    <div className="shrink-0 border-t border-border bg-background/80 px-3 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
      <div
        className={cn(
          "mx-auto w-full max-w-3xl rounded-2xl border border-input bg-muted/40 shadow-sm transition-all",
          "focus-within:border-primary/60 focus-within:shadow-[0_0_0_3px_oklch(from_var(--primary)_l_c_h/0.12)]"
        )}
      >
        {/* Top Ads context chips */}
        {contextAds.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <Database className="h-3 w-3" /> Top ads context
            </span>
            {contextAds.map((ad) => (
              <div
                key={ad.id}
                className="flex max-w-[200px] items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 py-1.5 pl-2 pr-1.5"
              >
                {ad.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ad.thumbnailUrl} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover" />
                ) : (
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Database className="h-3.5 w-3.5" />
                  </span>
                )}
                <span className="truncate text-xs font-medium">{ad.name}</span>
                {onRemoveContextAd && (
                  <button
                    type="button"
                    onClick={() => onRemoveContextAd(ad.id)}
                    aria-label={`Remove ${ad.name}`}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Attachment tray */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((a) => {
              const Icon = KIND_ICON[a.kind]
              return (
                <div
                  key={a.id}
                  className="flex max-w-[200px] items-center gap-2 rounded-xl border border-border bg-card py-1.5 pl-2 pr-1.5"
                >
                  {a.url && a.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover" />
                  ) : (
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <span className="truncate text-xs font-medium">{a.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveAttachment(a.id)}
                    aria-label={`Remove ${a.name}`}
                    className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Prompt */}
        <textarea
          ref={taRef}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              if (!isGenerating) onGenerate()
            }
          }}
          rows={1}
          placeholder={placeholder}
          className="block max-h-[150px] min-h-[48px] w-full resize-none border-none bg-transparent px-4 pt-3.5 pb-1 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/70"
        />

        {/* Control bar */}
        <div className="flex flex-wrap items-center gap-2 px-2.5 pb-2.5 pt-1">
          {/* Attach "+" */}
          <button
            type="button"
            onClick={onOpenAttachments}
            aria-label="Add attachments"
            className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary active:scale-95"
          >
            <Plus className="h-4 w-4" />
            {attachments.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground">
                {attachments.length}
              </span>
            )}
          </button>

          {/* Generation popover */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-all",
                  "border-border bg-card text-muted-foreground hover:border-input hover:text-foreground",
                  "data-[state=open]:border-primary data-[state=open]:bg-primary/5 data-[state=open]:text-primary"
                )}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Generation</span>
                <span className="grid min-w-5 place-items-center rounded-full bg-primary/10 px-1.5 text-[11px] font-bold text-primary">
                  {genTypes.length}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" side="top" className="w-[280px] p-2">
              <p className="px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Generation type · pick one or more
              </p>
              <div className="flex flex-col">
                {GEN_TYPES.map((t) => {
                  const active = genTypes.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      role="menuitemcheckbox"
                      aria-checked={active}
                      onClick={() => onToggleGenType(t)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted",
                        active ? "font-semibold text-primary" : "text-foreground"
                      )}
                    >
                      <span
                        className={cn(
                          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-all",
                          active ? "border-primary bg-primary text-primary-foreground" : "border-input"
                        )}
                      >
                        {active && <Check className="h-3 w-3" strokeWidth={3} />}
                      </span>
                      {t}
                    </button>
                  )
                })}
              </div>

              <div className="my-1.5 h-px bg-border" />

              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Style
              </p>
              <div className="flex flex-wrap gap-1.5 px-1 pb-1">
                {STYLE_PRESETS.map((s) => {
                  const label = s === "" ? "None" : s
                  const active = style === s
                  return (
                    <button
                      key={label}
                      type="button"
                      aria-pressed={active}
                      onClick={() => onStyleChange(s)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-input hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              <div className="my-1.5 h-px bg-border" />

              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-muted">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">Direct mode</span>
                  <span className="block text-[11px] leading-snug text-muted-foreground">
                    Bypass pipeline — send prompt verbatim
                  </span>
                </span>
                <Switch checked={directMode} onCheckedChange={onDirectModeChange} />
              </label>
            </PopoverContent>
          </Popover>

          <span className="flex-1" />

          {/* Generate */}
          <button
            type="button"
            onClick={onGenerate}
            disabled={isGenerating}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Working…
              </>
            ) : (
              <>
                <ArrowRight className="h-4 w-4" />
                {generateLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
