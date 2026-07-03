"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Search,
  Calendar,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { getSavedCreativesList } from "@/server/actions/studio-actions";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── Shared image cache for thumbnails ─────────────────────────────────────
const historyImageCache: Record<string, string | null> = {};
const historyImageInflight: Record<string, Promise<string | null>> = {};

// ── Lazy thumbnail loader ─────────────────────────────────────────────────
const HistoryThumbnail = React.memo(function HistoryThumbnail({
  creativeId,
  immediateUrl,
}: {
  creativeId: string;
  immediateUrl: string | null;
}) {
  const [loadedUrl, setLoadedUrl] = useState<string | null>(() => {
    if (immediateUrl) return immediateUrl;
    if (creativeId && creativeId in historyImageCache) return historyImageCache[creativeId];
    return null;
  });
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (immediateUrl || loadedUrl || fetchedRef.current) return;
    if (!creativeId) return;

    if (creativeId in historyImageCache) {
      setLoadedUrl(historyImageCache[creativeId]);
      return;
    }

    fetchedRef.current = true;
    setLoading(true);

    if (!(creativeId in historyImageInflight)) {
      historyImageInflight[creativeId] = fetch(`/api/history-image?id=${encodeURIComponent(creativeId)}`)
        .then((r) => r.json())
        .then((data) => {
          const url = data.imageUrl || null;
          historyImageCache[creativeId] = url;
          return url;
        })
        .catch(() => {
          historyImageCache[creativeId] = null;
          return null;
        })
        .finally(() => {
          delete historyImageInflight[creativeId];
        });
    }

    historyImageInflight[creativeId]!.then((url) => {
      setLoadedUrl(url);
      setLoading(false);
    });
  }, [creativeId, immediateUrl, loadedUrl]);

  if (loadedUrl) return <img src={loadedUrl} alt="" className="h-full w-full object-cover" />;
  if (loading)
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted/30">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      </div>
    );
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
    </div>
  );
});

// ── Image preview modal ───────────────────────────────────────────────────
function ImagePreviewModal({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-border bg-background/80 text-foreground transition-colors hover:bg-background"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-background p-4 md:p-8">
          {url && <img src={url} alt={title} className="max-h-[65vh] max-w-full object-contain" />}
        </div>
        <div className="border-t border-border p-4">
          <h4 className="line-clamp-2 break-words text-sm font-medium">{title}</h4>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function getEntryDate(entry: any): string | null {
  return entry.savedAt || entry.createdAt || null;
}

export default function SavedCreativesView() {
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [previewImagePopup, setPreviewImagePopup] = useState<{ url: string; title: string } | null>(null);
  const router = useRouter();

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const loadSavedCreatives = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getSavedCreativesList(page, itemsPerPage, searchQuery);
      if (data && !data.error) {
        setEntries(data.items);
        setTotalItems(data.totalCount);
      } else {
        toast.error(data.error || "Failed to load saved creatives");
      }
    } catch {
      toast.error("Failed to load saved creatives");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

  // Debounced search trigger
  useEffect(() => {
    const t = setTimeout(() => {
      if (searchQuery !== inputValue) {
        setSearchQuery(inputValue);
        setPage(1);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [inputValue, searchQuery]);

  useEffect(() => {
    loadSavedCreatives();
  }, [loadSavedCreatives]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Saved Creatives</h1>
          <p className="text-sm text-muted-foreground">
            Your bookmarked creatives. {totalItems > 0 && <span className="text-foreground">{totalItems} total</span>}
          </p>
        </div>
        <div className="relative w-full md:w-[280px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search saved creatives…"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="h-9 pl-9 pr-8 text-sm"
          />
          {inputValue && !isLoading && (
            <button
              onClick={() => {
                setInputValue("");
                setSearchQuery("");
              }}
              className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isLoading && inputValue && (
            <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Body */}
      {isLoading && entries.length === 0 ? (
        <SkeletonRows />
      ) : entries.length === 0 ? (
        <EmptyState
          searchQuery={searchQuery}
          onClear={() => {
            setInputValue("");
            setSearchQuery("");
          }}
          onExploreStudio={() => router.push("/studio")}
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="card-premium hidden flex-1 overflow-y-auto rounded-xl md:block">
            <table className="w-full text-left">
              <thead className="sticky top-0 z-10 border-b border-border bg-muted/40 backdrop-blur">
                <tr>
                  <Th className="w-24">Preview</Th>
                  <Th>Creative</Th>
                  <Th className="w-44">Saved</Th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => (
                  <tr
                    key={entry.creativeId || idx}
                    className="border-b border-border last:border-b-0 hover:bg-accent/40"
                  >
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          const url = entry.result?.imageUrl || entry.imageUrl || "";
                          if (url) setPreviewImagePopup({ url, title: entry.headline || "Saved Creative" });
                        }}
                        className="relative block h-14 w-14 cursor-pointer overflow-hidden rounded-lg border border-border bg-muted transition-transform hover:scale-[1.03]"
                      >
                        <HistoryThumbnail
                          creativeId={entry.creativeId}
                          immediateUrl={entry.result?.imageUrl || entry.imageUrl || null}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <h4 className="line-clamp-1 text-sm font-medium">
                          {entry.headline || "Untitled creative"}
                        </h4>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {(entry.creativeId || "").slice(-8) || "—"}
                          </span>
                          <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                            {entry.tab || "Studio"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-foreground">
                        <Calendar className="h-3.5 w-3.5 text-sky-500" />
                        <span>
                          {getEntryDate(entry)
                            ? new Date(getEntryDate(entry)!).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—"}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto md:hidden">
            {entries.map((entry, idx) => (
              <button
                key={entry.creativeId || idx}
                type="button"
                onClick={() => {
                  const url = entry.result?.imageUrl || entry.imageUrl || "";
                  if (url) setPreviewImagePopup({ url, title: entry.headline || "Saved Creative" });
                }}
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-primary/40 hover:bg-accent"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                  <HistoryThumbnail
                    creativeId={entry.creativeId}
                    immediateUrl={entry.result?.imageUrl || entry.imageUrl || null}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="line-clamp-1 text-sm font-medium">{entry.headline || "Untitled"}</h4>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                      {entry.tab || "Studio"}
                    </span>
                    {getEntryDate(entry) && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Calendar className="h-3 w-3 text-sky-500" />
                        {new Date(getEntryDate(entry)!).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-xs text-muted-foreground">
                Page <span className="text-foreground">{page}</span> of{" "}
                <span className="text-foreground">{totalPages}</span> · {totalItems} total
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let n =
                    page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                  if (n <= 0 || n > totalPages) return null;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={cn(
                        "h-8 min-w-8 cursor-pointer rounded-md px-2 text-xs font-medium transition-colors",
                        page === n
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {n}
                    </button>
                  );
                })}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {previewImagePopup && (
        <ImagePreviewModal
          url={previewImagePopup.url}
          title={previewImagePopup.title}
          onClose={() => setPreviewImagePopup(null)}
        />
      )}
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────
function Th({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
    >
      {children}
    </th>
  );
}

function SkeletonRows() {
  return (
    <div className="flex flex-1 flex-col gap-2 overflow-hidden">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <div className="skeleton h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
          <div className="skeleton h-7 w-12 rounded-md" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  searchQuery,
  onClear,
  onExploreStudio,
}: {
  searchQuery: string;
  onClear: () => void;
  onExploreStudio: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-background/40 p-8 text-center sm:p-10">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
        <Bookmark className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight">
          {searchQuery ? "No matches" : "No saved creatives yet"}
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {searchQuery ? (
            <>
              Nothing matches <span className="font-medium text-foreground">"{searchQuery}"</span>.
            </>
          ) : (
            "Save your best generations from the Studio and they'll appear here."
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" className="h-9 gap-1.5" onClick={onExploreStudio}>
          <Sparkles className="h-4 w-4" />
          Open Studio
        </Button>
        {searchQuery && (
          <Button variant="outline" size="sm" className="h-9" onClick={onClear}>
            Clear search
          </Button>
        )}
      </div>
    </div>
  );
}
