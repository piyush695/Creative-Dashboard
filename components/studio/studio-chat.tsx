"use client"

import React, { useEffect, useRef, useState } from "react"
import {
  Sparkles,
  Save,
  Download,
  Maximize2,
  ThumbsUp,
  ThumbsDown,
  Check,
  Copy,
  Image as ImageIcon,
  Database,
  Pause,
  Play,
  X,
  FileText,
  Brain,
  Wand2,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "./studio-shared"

// ── Derive display fields from any of the result shapes the API returns ──────
function deriveDisplay(result: any, variantIdx: number) {
  const variants: any[] = result?.variants || []
  const hasVariants = variants.length > 0
  const activeVariant = hasVariants ? variants[variantIdx] || variants[0] : null
  const imageUrl = activeVariant?.imageUrl || result?.imageUrl || null

  const headline =
    result?.copywriting?.headline?.primary ||
    result?.metaAd?.headline ||
    result?.creativeConcept?.title ||
    "Creative generated"
  const hookText = result?.copywriting?.hookText || ""
  const bodyText =
    result?.copywriting?.body?.primary ||
    result?.metaAd?.primaryText ||
    result?.copywriting?.body?.variations?.[0] ||
    result?.creativeConcept?.rationale ||
    ""
  const ctaText = result?.copywriting?.cta?.primary || result?.metaAd?.cta || ""

  const variantScore = activeVariant?.score?.overall ?? null
  // `result.score` is the restored score preserved by getConversationMessages
  // (direct-mode creatives keep their score only on variants, which are stripped
  // when reopening from History) — so the Score stays visible either way.
  const rawScore = variantScore ?? result?.creativeConcept?.targetScore ?? result?.targetScore ?? result?.score ?? null
  const scoreNum = typeof rawScore === "number" ? rawScore : parseFloat(String(rawScore)) || null
  const tier = result?.creativeConcept?.performanceTier || result?.performanceTier || null

  const idTail = String(result?.generationId || result?.id || "").slice(-6)
  const fileName = `holaprime-creative${idTail ? `-${idTail}` : ""}.png`

  // Pipeline transparency: which engine ran, what the compliance gate stripped,
  // and the vision verifier's (agent 5) verdict on the finished creative.
  const engine = result?.engine || null
  const gated = activeVariant?.gated || null
  const verification = activeVariant?.verification || null

  return { variants, hasVariants, activeVariant, imageUrl, headline, hookText, bodyText, ctaText, scoreNum, tier, fileName, engine, gated, verification }
}

function scoreColor(n: number | null): string {
  if (n == null) return "var(--muted-foreground)"
  if (n >= 9) return "#10b981"
  if (n >= 8) return "var(--primary)"
  if (n >= 7) return "#f59e0b"
  return "#ef4444"
}

interface AssistantMessageProps {
  message: ChatMessage
  saved: boolean
  isSaving: boolean
  onSave: (m: ChatMessage) => void
  onExport: (url: string, name: string) => void
  onExpand: (url: string, title: string) => void
  feedbackState: Record<string, "like" | "dislike" | null>
  onFeedback: (variantId: string, fb: "like" | "dislike") => void
}

function AssistantMessage({
  message,
  saved,
  isSaving,
  onSave,
  onExport,
  onExpand,
  feedbackState,
  onFeedback,
}: AssistantMessageProps) {
  const [variantIdx, setVariantIdx] = useState(0)
  const [lazyUrl, setLazyUrl] = useState<string | null>(null)
  const r = message.result
  const d = deriveDisplay(r, variantIdx)

  // Restored conversation turns have their base64 stripped — lazy-load the image
  // by creativeId (same endpoint the History thumbnails use).
  useEffect(() => {
    if (d.imageUrl || !message.creativeId) return
    let cancelled = false
    fetch(`/api/history-image?id=${encodeURIComponent(message.creativeId)}`)
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setLazyUrl(data.imageUrl || null) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [d.imageUrl, message.creativeId])

  const shownImage = d.imageUrl || lazyUrl

  // Failed generation — render a clear inline error instead of an empty bubble.
  if (message.error) {
    return (
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-destructive/15 text-destructive shadow-sm">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 w-full max-w-[88%] rounded-2xl rounded-tl-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-foreground sm:max-w-[440px]">
          <p className="font-semibold text-destructive">Generation failed</p>
          <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{message.error}</p>
        </div>
      </div>
    )
  }

  // Feedback shows for EVERY creative — restored-from-History turns have no
  // variant array, so fall back to the creativeId/message id for the key.
  const fbId = d.activeVariant?.id || message.creativeId || message.id
  const fb = feedbackState[fbId] ?? null

  return (
    <div className="flex items-start gap-2.5 sm:gap-3">
      {/* Avatar */}
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-primary text-white shadow-sm">
        <Sparkles className="h-4 w-4" />
      </div>

      {/* Bubble — sized to fit the creative. A max-height cap keeps tall/portrait
          creatives from towering; the bubble shrinks to the image so the score
          footer stays aligned to its width. */}
      <div className="min-w-0 w-fit max-w-[80%] sm:max-w-[300px]">
        <div className="overflow-hidden rounded-2xl rounded-tl-md border border-border bg-card shadow-sm">
          {/* Image */}
          <div className="relative bg-muted">
            {shownImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shownImage}
                alt={d.headline}
                className="block h-auto w-auto max-h-[360px] max-w-full"
              />
            ) : (
              <div className="flex aspect-square w-full min-w-[240px] flex-col items-center justify-center gap-2 text-muted-foreground">
                {message.creativeId ? (
                  <Loader2 className="h-5 w-5 animate-spin opacity-50" />
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 opacity-40" />
                    <p className="text-xs">No image returned</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Variant strip */}
          {d.hasVariants && d.variants.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto border-t border-border px-2.5 py-2">
              {d.variants.map((v: any, i: number) => (
                <button
                  key={v.id || i}
                  type="button"
                  onClick={() => setVariantIdx(i)}
                  className={cn(
                    "shrink-0 overflow-hidden rounded-md border transition-all",
                    i === variantIdx ? "border-primary ring-1 ring-primary" : "border-border opacity-70 hover:opacity-100"
                  )}
                  aria-label={`Variant ${i + 1}`}
                >
                  {v.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.imageUrl} alt="" className="h-10 w-10 object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center bg-muted text-muted-foreground">
                      <ImageIcon className="h-4 w-4" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Action row — icon-only: Save · Export · Expand · feedback */}
          <div className="flex items-center gap-0.5 border-t border-border px-2 py-1.5">
            <ActionButton
              icon={saved ? Check : Save}
              label={saved ? "Saved" : "Save"}
              onClick={() => !saved && onSave(message)}
              disabled={isSaving || saved}
              active={saved}
            />
            <ActionButton
              icon={Download}
              label="Export"
              onClick={() => shownImage && onExport(shownImage, d.fileName)}
              disabled={!shownImage}
            />
            <ActionButton
              icon={Maximize2}
              label="Expand"
              onClick={() => shownImage && onExpand(shownImage, d.headline)}
              disabled={!shownImage}
            />
            <span className="flex-1" />
            {shownImage && (
              <>
                <button
                  type="button"
                  onClick={() => onFeedback(fbId, "like")}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-lg transition-colors",
                    fb === "like" ? "bg-emerald-500/15 text-emerald-500" : "text-muted-foreground hover:bg-muted hover:text-emerald-500"
                  )}
                  title="More like this"
                  aria-label="Like"
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback(fbId, "dislike")}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-lg transition-colors",
                    fb === "dislike" ? "bg-rose-500/15 text-rose-500" : "text-muted-foreground hover:bg-muted hover:text-rose-500"
                  )}
                  title="Avoid this style"
                  aria-label="Dislike"
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          {/* Pipeline chips: engine · compliance gate · agent-5 QA verdict */}
          {(d.engine || d.gated || d.verification) && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-3.5 py-2">
              {d.engine && (
                <span className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                  d.engine === "template"
                    ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-400"
                    : "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-400"
                )}>
                  {d.engine === "template" ? "Design Engine" : "AI Image"}
                </span>
              )}
              {Array.isArray(d.gated) && d.gated.length > 0 && (
                <span
                  className="rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400"
                  title={d.gated.map((g: any) => `${g.field}: "${g.token}" → ${g.action}`).join("\n")}
                >🛡 {d.gated.length} claim{d.gated.length > 1 ? "s" : ""} stripped</span>
              )}
              {d.verification && (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    d.verification.pass
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                  )}
                  title={d.verification.pass ? "Vision QA: subject, text, legibility and figures all verified" : (d.verification.issues || []).join("\n")}
                >{d.verification.pass ? "✓ QA verified" : "⚠ QA issues"}</span>
              )}
            </div>
          )}

          {/* Score — relocated from the image overlay to below the creative,
              in place of the removed headline/description content. */}
          {d.scoreNum != null && (
            <div className="flex items-center justify-between border-t border-border px-3.5 py-2.5">
              <span className="text-xs font-medium text-muted-foreground">Creative score</span>
              <span
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-bold tabular-nums"
                style={{
                  color: scoreColor(d.scoreNum),
                  borderColor: `color-mix(in oklab, ${scoreColor(d.scoreNum)} 35%, transparent)`,
                  background: `color-mix(in oklab, ${scoreColor(d.scoreNum)} 12%, var(--card))`,
                }}
                title="Creative score"
              >
                {d.scoreNum.toFixed(1)}
                <span className="opacity-50">/10</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: React.ElementType
  label: string
  onClick: () => void
  disabled?: boolean
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "grid h-8 w-8 place-items-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active ? "text-emerald-500" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

// ── User (input) turn ────────────────────────────────────────────────────────
// Image and text live in TWO separate sections: an attachment strip (each image
// opens the zoomable modal on click) and the text bubble (selectable, with a
// dedicated Copy button revealed on hover). Keeps the two concerns independent
// so inspecting an image never fights with grabbing the text.
function UserMessage({
  message: m,
  onExpand,
}: {
  message: ChatMessage
  onExpand: (url: string, title: string) => void
}) {
  const [copied, setCopied] = useState(false)
  const text = (m.text || "").trim()

  const imageAttachments = (m.attachments || []).filter((a) => a.kind === "image" && a.previewUrl)
  const fileAttachments = (m.attachments || []).filter((a) => !(a.kind === "image" && a.previewUrl))
  const imageAds = (m.contextAds || []).filter((ad) => ad.thumbnailUrl)
  const chipAds = (m.contextAds || []).filter((ad) => !ad.thumbnailUrl)
  const hasMedia =
    imageAttachments.length > 0 || imageAds.length > 0 || fileAttachments.length > 0 || chipAds.length > 0

  const handleCopy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable — text is still selectable */
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {/* ── Image / attachment section ── click a thumbnail to zoom */}
      {hasMedia && (
        <div className="flex max-w-[85%] flex-wrap justify-end gap-2 sm:max-w-[80%]">
          {imageAttachments.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onExpand(a.previewUrl as string, a.name)}
              title="Click to zoom"
              aria-label={`Zoom ${a.name}`}
              className="group relative h-20 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-border bg-muted shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.previewUrl as string} alt={a.name} className="h-full w-full object-cover" />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/35 group-hover:opacity-100">
                <Maximize2 className="h-4 w-4 text-white" />
              </span>
            </button>
          ))}
          {imageAds.map((ad) => (
            <button
              key={ad.id}
              type="button"
              onClick={() => onExpand(ad.thumbnailUrl as string, ad.name)}
              title="Click to zoom"
              aria-label={`Zoom ${ad.name}`}
              className="group relative h-20 w-20 shrink-0 cursor-zoom-in overflow-hidden rounded-xl border border-border bg-muted shadow-sm"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ad.thumbnailUrl as string} alt={ad.name} className="h-full w-full object-cover" />
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/35 group-hover:opacity-100">
                <Maximize2 className="h-4 w-4 text-white" />
              </span>
            </button>
          ))}
          {fileAttachments.map((a) => (
            <span
              key={a.id}
              title={a.name}
              className="flex max-w-[160px] items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 text-[11px] font-medium text-foreground shadow-sm"
            >
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{a.name}</span>
            </span>
          ))}
          {chipAds.map((ad) => (
            <span
              key={ad.id}
              title={ad.name}
              className="flex max-w-[160px] items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 text-[11px] font-medium text-foreground shadow-sm"
            >
              <Database className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{ad.name}</span>
            </span>
          ))}
        </div>
      )}

      {/* Fallback labels for restored turns without inline previews */}
      {!m.contextAds?.length && m.contextAdCount ? (
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <Database className="h-3 w-3" /> {m.contextAdCount} top ad{m.contextAdCount === 1 ? "" : "s"} as context
        </span>
      ) : null}
      {!m.attachments?.length && m.attachmentCount ? (
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          <ImageIcon className="h-3 w-3" /> {m.attachmentCount} image{m.attachmentCount === 1 ? "" : "s"} attached
        </span>
      ) : null}

      {/* ── Text section ── own bubble, selectable, with a hover Copy button */}
      {text && (
        <div className="group flex max-w-[85%] items-end gap-1.5 sm:max-w-[80%]">
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied" : "Copy text"}
            aria-label={copied ? "Copied" : "Copy text"}
            className={cn(
              "mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-muted hover:text-foreground focus-visible:opacity-100",
              "opacity-0 group-hover:opacity-100",
              copied && "text-emerald-500 opacity-100"
            )}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </button>
          <div className="min-w-0 rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground shadow-sm">
            <p className="select-text whitespace-pre-wrap break-words">{text}</p>
          </div>
        </div>
      )}
    </div>
  )
}

interface StudioChatThreadProps {
  messages: ChatMessage[]
  isGenerating: boolean
  progress: number
  isPaused?: boolean
  onTogglePause?: () => void
  onCancel?: () => void
  emptyState: React.ReactNode
  savedMsgIds: Set<string>
  isSaving: boolean
  onSave: (m: ChatMessage) => void
  onExport: (url: string, name: string) => void
  onExpand: (url: string, title: string) => void
  feedbackState: Record<string, "like" | "dislike" | null>
  onFeedback: (variantId: string, fb: "like" | "dislike") => void
}

export function StudioChatThread({
  messages,
  isGenerating,
  progress,
  isPaused = false,
  onTogglePause,
  onCancel,
  emptyState,
  savedMsgIds,
  isSaving,
  onSave,
  onExport,
  onExpand,
  feedbackState,
  onFeedback,
}: StudioChatThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, isGenerating])

  if (messages.length === 0 && !isGenerating) {
    return <>{emptyState}</>
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-3 py-5 sm:px-4 sm:py-6">
      {messages.map((m) =>
        m.role === "user" ? (
          // Skip empty user turns (no text, no attachments, no context) so a
          // restored/blank turn never renders as an empty bubble.
          !m.text?.trim() && !m.attachments?.length && !m.contextAds?.length && !m.attachmentCount && !m.contextAdCount ? null : (
            <UserMessage key={m.id} message={m} onExpand={onExpand} />
          )
        ) : (
          <AssistantMessage
            key={m.id}
            message={m}
            saved={savedMsgIds.has(m.id)}
            isSaving={isSaving}
            onSave={onSave}
            onExport={onExport}
            onExpand={onExpand}
            feedbackState={feedbackState}
            onFeedback={onFeedback}
          />
        )
      )}

      {/* Live generating bubble — modern AI "thinking" indicator */}
      {isGenerating && (
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-primary text-white shadow-sm">
            <Sparkles className="h-4 w-4 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1 sm:max-w-[440px]">
            {(() => {
              // Automation pipeline: Input → AI thinking → Generation → Output.
              const stages = [
                { icon: FileText, label: "Initializing input" },
                { icon: Brain, label: "AI thinking" },
                { icon: Wand2, label: "Generating content" },
                { icon: ImageIcon, label: "Finalizing output" },
              ]
              const active = progress < 25 ? 0 : progress < 55 ? 1 : progress < 85 ? 2 : 3
              return (
                <div className="rounded-2xl rounded-tl-md border border-border bg-card p-3.5 shadow-sm">
                  {/* Pipeline nodes + flowing connector */}
                  <div className="relative flex items-center justify-between">
                    <div className="absolute left-[12%] right-[12%] top-1/2 h-0.5 -translate-y-1/2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-gradient-primary transition-[width] duration-500 ease-out"
                        style={{ width: `${Math.max(6, progress)}%` }}
                      />
                      {!isPaused && <span className="absolute inset-0 animate-shimmer-x" aria-hidden="true" />}
                    </div>
                    {stages.map((s, i) => {
                      const Icon = s.icon
                      const done = i < active
                      const on = i === active
                      return (
                        <div key={s.label} className="relative z-10">
                          <div
                            className={cn(
                              "relative grid h-7 w-7 place-items-center rounded-full border-2 bg-card transition-all duration-300",
                              done
                                ? "border-primary bg-primary text-primary-foreground"
                                : on
                                  ? "border-primary text-primary"
                                  : "border-border text-muted-foreground"
                            )}
                            title={s.label}
                          >
                            {on && !isPaused && (
                              <span className="absolute inset-0 rounded-full border-2 border-primary/50 animate-ping" aria-hidden="true" />
                            )}
                            {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon className="h-3.5 w-3.5" />}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Current stage + percent */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium">
                      {!isPaused && (
                        <span className="flex items-center gap-0.5" aria-hidden="true">
                          {[0, 150, 300].map((d) => (
                            <span
                              key={d}
                              className="h-1 w-1 animate-bounce rounded-full bg-primary"
                              style={{ animationDelay: `${d}ms`, animationDuration: "1s" }}
                            />
                          ))}
                        </span>
                      )}
                      <span className="bg-gradient-primary bg-clip-text text-transparent">
                        {isPaused ? "Generation paused" : stages[active].label + "…"}
                      </span>
                    </span>
                    <span className="ml-auto text-[11px] font-medium tabular-nums text-muted-foreground">
                      {Math.floor(progress)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div
                    className={cn(
                      "relative mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted",
                      !isPaused && "animate-shimmer-x"
                    )}
                  >
                    <div
                      className="h-full rounded-full bg-gradient-primary transition-[width] duration-300"
                      style={{ width: `${Math.max(4, Math.floor(progress))}%` }}
                    />
                  </div>
                </div>
              )
            })()}

            {/* Pause / Cancel controls below the generation container */}
            <div className="mt-2 flex items-center gap-2 pl-1">
              {onTogglePause && (
                <button
                  type="button"
                  onClick={onTogglePause}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {isPaused ? "Resume" : "Pause"}
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}
