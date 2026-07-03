"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Sparkles,
  Image as ImageIcon,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  Calendar,
  Loader2,
  MessageSquare,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { getHistoryList, getConversationMessages } from "@/server/actions/studio-actions";
import { buildChatMessagesFromTurns, type ChatMessage } from "@/components/studio/studio-shared";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreativeHistoryViewProps {
  onClose?: () => void;
  onRegenerate?: (payload: { tab: string; conversationId: string | null; messages: ChatMessage[] }) => void;
}

// Build the list of page controls: always show first + last, the current page
// with a neighbor on each side, and "…" gaps where pages are skipped.
function getPageItems(current: number, total: number): (number | "…")[] {
  if (total <= 1) return [1];

  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages)
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b);

  const items: (number | "…")[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (n - prev > 1) items.push("…");
    items.push(n);
    prev = n;
  }
  return items;
}

// ── Shared image cache for thumbnails ─────────────────────────────────────
const historyImageCache: Record<string, string | null> = {};
const historyImageInflight: Record<string, Promise<string | null>> = {};

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
      <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
    </div>
  );
});

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
        className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-md border border-border bg-card animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-background/80 text-foreground transition-colors hover:bg-background"
          aria-label="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-background p-4 md:p-8">
          {url && <img src={url} alt={title} className="max-h-[65vh] max-w-full object-contain" />}
        </div>
        <div className="border-t border-border p-4">
          <h3 className="line-clamp-2 break-words text-sm font-medium">{title}</h3>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function getEntryDate(entry: any): string | null {
  return entry.createdAt || entry.savedAt || null;
}

function getTabLabel(tab: string): string {
  switch (tab) {
    case "top-ads":
      return "Top Ads";
    case "studio":
      return "Studio";
    case "custom":
      return "Custom";
    case "ad-library":
      return "Ad Library";
    default:
      return tab ? tab.charAt(0).toUpperCase() + tab.slice(1) : "Custom";
  }
}

export default function CreativeHistoryView({ onClose, onRegenerate }: CreativeHistoryViewProps) {
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [previewImagePopup, setPreviewImagePopup] = useState<{ url: string; title: string } | null>(null);
  // Tracks which row is loading its full creative for "View Chat".
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const router = useRouter();

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getHistoryList(page, itemsPerPage, searchQuery);
      if (data && !data.error) {
        setEntries(data.history);
        setTotalItems(data.historyLength);
      } else {
        toast.error(data.error || "Failed to load history");
      }
    } catch {
      toast.error("Failed to load history");
    } finally {
      setIsLoading(false);
    }
  }, [page, searchQuery]);

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
    loadHistory();
  }, [loadHistory]);

  const handleRegenerate = async (entry: any) => {
    const tab = entry.tab || "custom";

    if (onRegenerate) {
      // Rebuild the WHOLE conversation thread (every turn), not just one creative.
      setLoadingId(entry.creativeId || "__");
      let messages: ChatMessage[] = [];
      try {
        const turns = await getConversationMessages(entry.conversationId || null, entry.creativeId);
        messages = buildChatMessagesFromTurns(turns);
      } catch {
        /* fall through to the single-entry fallback below */
      } finally {
        setLoadingId(null);
      }
      if (messages.length === 0) {
        if (entry.prompt) messages.push({ id: "hu-0", role: "user", text: entry.prompt });
        messages.push({ id: "ha-0", role: "assistant", result: entry.result || {}, prompt: entry.prompt || "", creativeId: entry.creativeId });
      }
      // Continue under the entry's GROUP KEY (conversationId from the grouped
      // list, or the creativeId for a legacy row). New creatives generated next
      // save with this same id, so they update THIS entry instead of forking one.
      const groupKey = entry.conversationId || entry.creativeId || null;
      onRegenerate({ tab, conversationId: groupKey, messages });
    } else {
      // Standalone /history route — bounce to Studio with regenerate intent
      const params = new URLSearchParams();
      params.set("regenerate", entry.creativeId || "");
      router.push(`/studio?${params.toString()}`);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">History</h2>
          <p className="text-sm text-muted-foreground">
            Every creative you've generated, newest first.
            {totalItems > 0 && <span className="ml-1 text-foreground">{totalItems} total</span>}
          </p>
        </div>
        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative w-full md:w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search history…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="h-9 pl-9 pr-9 text-sm"
            />
            {inputValue && !isLoading && (
              <button
                onClick={() => {
                  setInputValue("");
                  setSearchQuery("");
                }}
                className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {isLoading && inputValue && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted/60 hover:text-foreground cursor-pointer"
              aria-label="Back"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>
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
          onExploreStudio={() => {
            // History is an overlay inside the Studio page — closing it returns
            // to the Studio chat. Only the standalone route needs a push.
            if (onClose) onClose();
            else router.push("/studio");
          }}
        />
      ) : (
        <>
          {/* Desktop table — no inner scroll; the page/panel scrolls as one */}
          <div className="card-premium hidden rounded-xl md:block">
            <table className="w-full text-left">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <Th className="w-24">Preview</Th>
                  <Th>Headline</Th>
                  <Th className="w-40">Created</Th>
                  <Th className="w-28 text-right">Action</Th>
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
                          if (url) setPreviewImagePopup({ url, title: entry.headline || "Creative" });
                        }}
                        className="relative block h-14 w-14 cursor-pointer overflow-hidden rounded-md border border-border bg-muted transition-transform hover:scale-[1.02]"
                      >
                        <HistoryThumbnail
                          creativeId={entry.creativeId}
                          immediateUrl={entry.result?.imageUrl || entry.imageUrl || null}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <h3 className="line-clamp-1 text-sm font-medium text-foreground">
                          {entry.headline || "Untitled creative"}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
                            {getTabLabel(entry.tab)}
                          </span>
                          {entry.count > 1 && (
                            <span className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                              {entry.count} creatives
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
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
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 cursor-pointer gap-1.5"
                        onClick={() => handleRegenerate(entry)}
                        disabled={loadingId === entry.creativeId}
                        title="Open this creative in chat"
                      >
                        {loadingId === entry.creativeId ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <MessageSquare className="h-3.5 w-3.5" />
                        )}
                        View Chat
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-1 flex-col gap-2 overflow-y-auto md:hidden">
            {entries.map((entry, idx) => (
              <div
                key={entry.creativeId || idx}
                className="flex flex-col gap-3 rounded-md border border-border bg-card p-3"
              >
                <button
                  type="button"
                  onClick={() => {
                    const url = entry.result?.imageUrl || entry.imageUrl || "";
                    if (url) setPreviewImagePopup({ url, title: entry.headline || "Creative" });
                  }}
                  className="flex cursor-pointer items-center gap-3 text-left"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                    <HistoryThumbnail
                      creativeId={entry.creativeId}
                      immediateUrl={entry.result?.imageUrl || entry.imageUrl || null}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-1 text-sm font-medium text-foreground">{entry.headline || "Untitled"}</h3>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="rounded-md border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                        {getTabLabel(entry.tab)}
                      </span>
                      {entry.count > 1 && (
                        <span className="rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {entry.count}
                        </span>
                      )}
                      {getEntryDate(entry) && (
                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3" />
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
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-full cursor-pointer gap-1.5"
                  onClick={() => handleRegenerate(entry)}
                  disabled={loadingId === entry.creativeId}
                >
                  {loadingId === entry.creativeId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <MessageSquare className="h-3.5 w-3.5" />
                  )}
                  View Chat
                </Button>
              </div>
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
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  aria-label="First page"
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
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
                {getPageItems(page, totalPages).map((item, i) =>
                  item === "…" ? (
                    <span
                      key={`ellipsis-${i}`}
                      className="flex h-8 min-w-8 items-center justify-center px-1 text-xs text-muted-foreground"
                      aria-hidden="true"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      aria-current={page === item ? "page" : undefined}
                      className={cn(
                        "h-8 min-w-8 cursor-pointer rounded-md px-2 text-xs font-medium transition-colors",
                        page === item
                          ? "bg-primary text-primary-foreground"
                          : "border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {item}
                    </button>
                  ),
                )}
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
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  aria-label="Last page"
                >
                  <ChevronsRight className="h-4 w-4" />
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
        <div key={i} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
          <div className="skeleton h-12 w-12 rounded-md" />
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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border bg-background/40 p-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-muted">
        <Clock className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-semibold tracking-tight">
          {searchQuery ? "No matches" : "No history yet"}
        </h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          {searchQuery ? (
            <>
              Nothing matches <span className="font-medium text-foreground">"{searchQuery}"</span>.
            </>
          ) : (
            "Generate your first creative in Studio and it'll show up here."
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button size="sm" className="h-9 cursor-pointer gap-1.5" onClick={onExploreStudio}>
          <Sparkles className="h-4 w-4" />
          Open Studio
        </Button>
        {searchQuery && (
          <Button variant="outline" size="sm" className="h-9 cursor-pointer" onClick={onClear}>
            Clear search
          </Button>
        )}
      </div>
    </div>
  );
}
