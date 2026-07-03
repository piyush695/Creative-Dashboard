"use client"

import React, { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Check, Eye, Search, Database, ImageOff } from "lucide-react"
import { cn } from "@/lib/utils"

interface TopAd {
  adId: string
  adName?: string
  thumbnailUrl?: string
  compositeRating?: number | string
  ctr?: number
}

interface TopAdsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creatives: TopAd[]
  /** Currently-committed selection (ad ids) used to seed the modal. */
  initialSelected: string[]
  /** Commit the selection — called when the user confirms. */
  onConfirm: (ids: string[]) => void
  /** Optional: open an enlarged preview of an ad image. */
  onEnlarge?: (url: string, title: string) => void
}

export function TopAdsModal({
  open,
  onOpenChange,
  creatives,
  initialSelected,
  onConfirm,
  onEnlarge,
}: TopAdsModalProps) {
  const [sel, setSel] = useState<string[]>(initialSelected)
  const [query, setQuery] = useState("")

  // Reseed selection + clear search each time the modal opens.
  useEffect(() => {
    if (open) {
      setSel(initialSelected)
      setQuery("")
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const toggle = (id: string) =>
    setSel((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const term = query.trim().toLowerCase()
  const filtered = term
    ? creatives.filter(
        (c) => (c.adName || "").toLowerCase().includes(term) || (c.adId || "").toLowerCase().includes(term)
      )
    : creatives

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] w-[min(96vw,1040px)] max-w-none flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4 text-left">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-primary text-white shadow-sm">
              <Database className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="text-base">Select Top Ads</DialogTitle>
              <DialogDescription className="text-xs">
                Pick winning creatives to use as context. Your prompt + these patterns guide the generation.
              </DialogDescription>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 flex h-9 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 text-sm transition-colors focus-within:border-primary/50 focus-within:bg-background">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search winning ads by name or ID…"
              className="min-w-0 flex-1 border-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              aria-label="Search Top Ads"
            />
          </div>
        </DialogHeader>

        {/* Grid */}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
              <Database className="h-8 w-8 text-muted-foreground" />
              <p className="max-w-[260px] text-sm text-muted-foreground">
                {creatives.length === 0
                  ? "No winning ads available yet."
                  : "No ads match your search."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filtered.map((ad) => {
                const selected = sel.includes(ad.adId)
                return (
                  <button
                    key={ad.adId}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggle(ad.adId)}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border text-left transition-all duration-200",
                      selected
                        ? "border-primary shadow-[0_0_0_2px_oklch(from_var(--primary)_l_c_h/0.35)]"
                        : "border-border hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md"
                    )}
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                      {ad.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ad.thumbnailUrl}
                          alt={ad.adName || "Top ad"}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-muted-foreground">
                          <ImageOff className="h-6 w-6" />
                        </div>
                      )}
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                      {/* Checkbox */}
                      <span
                        className={cn(
                          "absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-md border transition-all",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-white/40 bg-black/30 text-transparent backdrop-blur-sm"
                        )}
                      >
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </span>

                      {/* Score */}
                      {ad.compositeRating != null && ad.compositeRating !== "" && (
                        <span className="absolute right-2 top-2 rounded-md border border-white/20 bg-black/45 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white backdrop-blur-sm">
                          {ad.compositeRating}
                        </span>
                      )}

                      {/* Enlarge */}
                      {onEnlarge && ad.thumbnailUrl && (
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => {
                            e.stopPropagation()
                            onEnlarge(ad.thumbnailUrl!, ad.adName || "Top ad")
                          }}
                          className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-md border border-white/20 bg-black/45 text-white opacity-0 backdrop-blur-sm transition-opacity hover:bg-black/70 group-hover:opacity-100"
                          aria-label="Preview ad"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </span>
                      )}

                      {/* Name + CTR */}
                      <div className="pointer-events-none absolute inset-x-2 bottom-2 space-y-0.5">
                        <p className="truncate text-[11px] font-semibold text-white">{ad.adName || "Unnamed"}</p>
                        {ad.ctr != null && (
                          <p className="text-[9px] font-bold text-emerald-300">
                            {(Number(ad.ctr) * 100).toFixed(2)}% CTR
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-border px-5 py-4">
          <span className="mr-auto text-sm text-muted-foreground">
            <span className="font-semibold text-foreground nums">{sel.length}</span> selected
          </span>
          {sel.length > 0 && (
            <button
              type="button"
              onClick={() => setSel([])}
              className="rounded-lg px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            disabled={sel.length === 0}
            onClick={() => {
              onConfirm(sel)
              onOpenChange(false)
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-105 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to chat
            {sel.length > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-white/20 px-1.5 text-[11px] font-bold">
                {sel.length}
              </span>
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
