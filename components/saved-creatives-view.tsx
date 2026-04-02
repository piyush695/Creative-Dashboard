"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import {
   Sparkles,
   Image as ImageIcon,
   X,
   Zap,
   Download,
   LayoutGrid,
   ChevronLeft,
   ChevronRight,
   BookOpen,
   Plus,
   Bookmark,
   History,
   Search,
   Filter,
   Calendar,
   Layers,
   Loader2,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createPortal } from "react-dom"
import { getSavedCreativesList } from "@/actions/studio-actions"
import { useRouter } from "next/navigation"

// ── Shared image cache for thumbnails ──
const historyImageCache: Record<string, string | null> = {};
const historyImageInflight: Record<string, Promise<string | null>> = {};

// ── HistoryThumbnail: Lazy-loads images ──
const HistoryThumbnail = React.memo(function HistoryThumbnail({ creativeId, immediateUrl }: { creativeId: string; immediateUrl: string | null }) {
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
            .then(r => r.json())
            .then(data => {
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

      historyImageInflight[creativeId]!.then(url => {
         setLoadedUrl(url);
         setLoading(false);
      });
   }, [creativeId, immediateUrl, loadedUrl]);

   return loadedUrl ? (
      <img src={loadedUrl} alt="thumbnail" className="w-full h-full object-cover" />
   ) : loading ? (
      <div className="w-full h-full flex items-center justify-center bg-muted/30">
         <div className="w-4 h-4 border-2 border-primary/40 border-t-transparent rounded-full animate-spin" />
      </div>
   ) : (
      <ImageIcon className="w-4 h-4 text-muted-foreground/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
   );
});

// ── Portal-based Image Preview Modal ──
function ImagePreviewModal({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
   const [mounted, setMounted] = useState(false);

   useEffect(() => {
      setMounted(true);
      return () => setMounted(false);
   }, []);

   if (!mounted) return null;

   return createPortal(
      <div
         className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4"
         onClick={onClose}
      >
         <div
            className="relative w-full max-w-3xl max-h-[85vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col ring-1 ring-black/5 dark:ring-white/10 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
         >
            <button
               onClick={onClose}
               className="absolute top-3 right-3 z-[10000] h-9 w-9 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all border border-white/20 shadow-2xl active:scale-90"
            >
               <X className="h-4 w-4" />
            </button>

            <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 md:p-8 min-h-0 overflow-hidden relative">
               {url && (
                  <img
                     src={url}
                     alt={title}
                     className="max-w-full max-h-[65vh] w-auto h-auto object-contain shadow-2xl rounded-sm"
                  />
               )}
            </div>

            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-white/10 shrink-0">
               <h4 className="text-[11px] leading-tight font-bold text-zinc-900 dark:text-white break-words line-clamp-2 uppercase tracking-tight">{title}</h4>
            </div>
         </div>
      </div>,
      document.body
   );
}

// ── Helper to get display date from entry ──
function getEntryDate(entry: any): string | null {
   return entry.savedAt || entry.createdAt || null;
}

export default function SavedCreativesView() {
   const [entries, setEntries] = useState<any[]>([])
   const [isLoading, setIsLoading] = useState(true)
   const [searchQuery, setSearchQuery] = useState("")
   const [inputValue, setInputValue] = useState("")
   const [page, setPage] = useState(1)
   const [totalItems, setTotalItems] = useState(0)
   const [previewImagePopup, setPreviewImagePopup] = useState<{ url: string; title: string } | null>(null)
   const router = useRouter()

   const itemsPerPage = 10
   const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

   const loadSavedCreatives = useCallback(async () => {
      setIsLoading(true)
      try {
         const data = await getSavedCreativesList(
            page,
            itemsPerPage,
            searchQuery
         )

         if (data && !data.error) {
            setEntries(data.items)
            setTotalItems(data.totalCount)
         } else {
            toast.error(data.error || "Failed to load saved creatives")
         }
      } catch (err) {
         console.error("Error loading saved creatives:", err)
         toast.error("An error occurred while loading your vault")
      } finally {
         setIsLoading(false)
      }
   }, [page, searchQuery])

   // Debounce the actual API search, while keeping input completely lag-free
   useEffect(() => {
      const timer = setTimeout(() => {
         if (searchQuery !== inputValue) {
            setSearchQuery(inputValue)
            setPage(1)
         }
      }, 500)
      return () => clearTimeout(timer)
   }, [inputValue, searchQuery])

   // Load immediately when dependencies change (the actual search trigger)
   const isInitialLoad = useRef(true)
   useEffect(() => {
      if (isInitialLoad.current) {
         isInitialLoad.current = false
         loadSavedCreatives()
         return
      }
      loadSavedCreatives()
   }, [loadSavedCreatives])

   return (
      <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500 overflow-hidden">
         {/* Header Area */}
         <div className="shrink-0 space-y-4 sm:space-y-4 mb-4 sm:mb-6 mt-2 px-3 sm:px-0">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-4 mr-0 sm:mr-4">
               <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                     <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-zinc-800 border border-transparent dark:border-white/10 flex items-center justify-center shrink-0 shadow-sm">
                        <Bookmark className="w-5 h-5 text-[#007AFF] dark:text-blue-400" />
                     </div>
                     <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-zinc-900 dark:text-white leading-none">
                        Saved <span className="text-[#007AFF]">Creatives.</span>
                     </h1>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium max-w-2xl leading-relaxed mt-2">
                     Your curated collection of high-performing assets. Access your explicitly saved generations and historical winners in one neural workspace.
                  </p>
               </div>

               <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5 flex items-center gap-3 shadow-sm hover:shadow transition-shadow">
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground mb-0.5">Total Assets</span>
                        <span className="text-base sm:text-lg font-black text-foreground leading-none">{totalItems}</span>
                     </div>
                     <div className="w-px h-6 sm:h-7 bg-zinc-200 dark:bg-white/10" />
                     <div className="w-8 h-8 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
                        <Layers className="w-4 h-4 text-[#007AFF]" />
                     </div>
                  </div>
               </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 mr-0 sm:mr-4">
               <div className="relative flex-1 w-full group">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-[#007AFF] transition-colors" />
                  <input
                     type="text"
                     placeholder="Search vault by Headline, ID or Requirement..."
                     value={inputValue}
                     onChange={(e) => setInputValue(e.target.value)}
                     className="w-full h-10 sm:h-11 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-xl pl-10 pr-10 text-xs font-medium outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF]/50 transition-all placeholder:text-muted-foreground/50 shadow-sm"
                  />
                  {inputValue && !isLoading && (
                     <button
                        onClick={() => { setInputValue(""); setSearchQuery(""); }}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                     >
                        <X className="w-3 h-3" />
                     </button>
                  )}
                  {isLoading && inputValue && (
                     <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#007AFF]" />
                     </div>
                  )}
               </div>
               <button className="h-10 sm:h-11 px-5 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-white/5 text-zinc-600 dark:text-zinc-400 font-bold text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all shadow-sm shrink-0 w-full sm:w-auto justify-center sm:justify-start">
                  <Filter className="w-3.5 h-3.5" /> Filter
               </button>
            </div>
         </div>

         {/* Content Area */}
         <div className="flex-1 min-h-0 flex flex-col mr-0 sm:mr-4 px-3 sm:px-0">
            {isLoading && entries.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center p-10 sm:p-20 gap-4">
                  <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-[#007AFF]/20 border-t-[#007AFF] rounded-full animate-spin" />
                  <p className="text-[10px] md:text-xs font-bold text-muted-foreground uppercase tracking-widest animate-pulse">Accessing Vault...</p>
               </div>
            ) : entries.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 text-center bg-transparent rounded-3xl border border-dashed border-zinc-200 dark:border-white/10 animate-in fade-in zoom-in duration-1000 relative overflow-hidden group">
                  {/* Animated Background Accents */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] bg-blue-500/5 rounded-full blur-[80px] animate-pulse" />
                  <div className="absolute top-10 right-10 w-20 h-20 bg-indigo-500/5 rounded-full blur-[50px] animate-float" />

                  <div className="relative z-10 flex flex-col items-center">
                     <div className="w-20 h-20 sm:w-24 sm:h-24 mb-6 relative">
                        <div className="absolute inset-0 bg-blue-500/20 rounded-2xl rotate-6 animate-pulse opacity-20" />
                        <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl -rotate-6 animate-pulse opacity-20 delay-500" />
                        <div className="relative z-10 w-full h-full flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-xl group-hover:scale-105 transition-transform duration-500">
                           <Bookmark className="w-8 h-8 sm:w-10 sm:h-10 text-[#007AFF] drop-shadow-[0_0_12px_rgba(0,122,255,0.3)]" />
                        </div>
                     </div>

                     <div className="space-y-2 max-w-sm">
                        <h3 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mb-1">
                           {searchQuery ? "Saved Creatives Search Results" : "No Artifacts Found"}
                        </h3>
                        <p className="text-[11px] sm:text-xs font-medium text-muted-foreground leading-relaxed">
                           {searchQuery
                              ? <>No neural match found for <span className="text-[#007AFF] font-bold">"{searchQuery}"</span>. Refine your query or check our global history.</>
                              : "Your creative vault is currently in a state of pending activity. Begin archiving your high-performing generations from the AI Studio."}
                        </p>
                     </div>

                     <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-3">
                        <button
                           onClick={() => router.push('/?platform=home&view=ai-studio', { scroll: false })}
                           className="h-9 sm:h-10 px-5 sm:px-6 bg-[#007AFF] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 group/btn"
                        >
                           Explore AI Studio <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                        </button>
                        {searchQuery && (
                           <button
                              onClick={() => setSearchQuery("")}
                              className="h-9 sm:h-10 px-5 sm:px-6 bg-transparent text-foreground border border-zinc-200 dark:border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-50 dark:hover:bg-white/5 active:scale-95 transition-all shadow-sm"
                           >
                              Clear Search
                           </button>
                        )}
                     </div>
                  </div>
               </div>
            ) : (
               <div className="flex-1 flex flex-col min-h-0">
                  {/* Desktop Table View */}
                  <div className="hidden md:flex flex-1 overflow-y-auto custom-scrollbar rounded-3xl border border-zinc-200 dark:border-white/5 bg-white dark:bg-zinc-900/50 shadow-xl shadow-black/5">
                     <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-20">
                           <tr className="bg-zinc-50/80 dark:bg-zinc-800/80 backdrop-blur-md border-b border-zinc-200 dark:border-white/5">
                              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-28">Preview</th>
                              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Generation Detail</th>
                              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden lg:table-cell">Neural Context</th>
                              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20 text-center">Score</th>
                              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-36">Saved At</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                           {entries.map((entry, idx) => (
                              <tr key={entry.creativeId || idx} className="group hover:bg-zinc-50/50 dark:hover:bg-white/[0.02] transition-colors">
                                 <td className="px-5 py-4">
                                    <div
                                       className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 relative group/thumb cursor-pointer shadow-sm hover:shadow-md transition-all active:scale-95"
                                       onClick={() => {
                                          const url = entry.result?.imageUrl || entry.imageUrl || "";
                                          if (url) setPreviewImagePopup({ url, title: entry.headline || "Saved Creative" });
                                       }}
                                    >
                                       <HistoryThumbnail creativeId={entry.creativeId} immediateUrl={entry.result?.imageUrl || entry.imageUrl || null} />
                                       <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                          <Plus className="w-5 h-5 text-white" />
                                       </div>
                                    </div>
                                 </td>
                                 <td className="px-5 py-4">
                                    <div className="flex flex-col gap-1 max-w-[300px]">
                                       <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-1 group-hover:text-[#007AFF] transition-colors">
                                          {entry.headline || 'Production Creative'}
                                       </h4>
                                       <div className="flex items-center gap-2 mt-0.5">
                                          <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] font-mono text-muted-foreground uppercase">
                                             {(entry.creativeId || '').slice(-8)}
                                          </span>
                                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                             {entry.tab || 'Studio'}
                                          </span>
                                       </div>
                                       <p className="text-[11px] text-muted-foreground/80 font-medium line-clamp-1 italic mt-0.5">
                                          {entry.result?.metaAd?.primaryText || entry.result?.copywriting?.headline?.primary || 'Stored neural output'}
                                       </p>
                                    </div>
                                 </td>
                                 <td className="px-5 py-4 hidden lg:table-cell max-w-[400px]">
                                    <div className="flex flex-col gap-1.5">
                                       <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                                          <Zap className="w-3 h-3" /> Requirements
                                       </div>
                                       <p className="text-[11px] text-foreground/80 font-medium leading-relaxed line-clamp-2">
                                          {entry.prompt ? `"${entry.prompt}"` : <span className="opacity-40 italic">No neural context captured</span>}
                                       </p>
                                    </div>
                                 </td>
                                 <td className="px-5 py-4 text-center">
                                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/5 border border-blue-500/10 shadow-inner">
                                       <span className="text-sm font-black text-blue-500">{entry.score || entry.result?.targetScore || '8.5'}</span>
                                    </div>
                                 </td>
                                 <td className="px-5 py-4">
                                    <div className="flex flex-col gap-1">
                                       <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                          {getEntryDate(entry) ? new Date(getEntryDate(entry)!).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                       </div>
                                       <span className="text-[10px] text-muted-foreground/60 font-mono pl-5">
                                          {getEntryDate(entry) ? new Date(getEntryDate(entry)!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                       </span>
                                    </div>
                                 </td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="flex md:hidden flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-4">
                     {entries.map((entry, idx) => (
                        <div key={entry.creativeId || idx} className="bg-white dark:bg-zinc-900/50 rounded-2xl border border-zinc-200 dark:border-white/5 shadow-sm overflow-hidden">
                           <div className="flex items-start gap-3 p-4">
                              {/* Thumbnail */}
                              <div
                                 className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/10 relative flex-shrink-0 cursor-pointer active:scale-95 transition-all"
                                 onClick={() => {
                                    const url = entry.result?.imageUrl || entry.imageUrl || "";
                                    if (url) setPreviewImagePopup({ url, title: entry.headline || "Saved Creative" });
                                 }}
                              >
                                 <HistoryThumbnail creativeId={entry.creativeId} immediateUrl={entry.result?.imageUrl || entry.imageUrl || null} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                 <h4 className="text-xs font-bold text-foreground leading-tight line-clamp-1 mb-1">
                                    {entry.headline || 'Production Creative'}
                                 </h4>
                                 <div className="flex items-center gap-1.5 mb-1.5">
                                    <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[8px] font-mono text-muted-foreground uppercase">
                                       {(entry.creativeId || '').slice(-8)}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-[8px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                       {entry.tab || 'Studio'}
                                    </span>
                                 </div>
                                 <p className="text-[10px] text-muted-foreground/80 font-medium line-clamp-1 italic">
                                    {entry.result?.metaAd?.primaryText || entry.result?.copywriting?.headline?.primary || 'Stored neural output'}
                                 </p>
                              </div>

                              {/* Score */}
                              <div className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/5 border border-blue-500/10">
                                 <span className="text-[11px] font-black text-blue-500">{entry.score || entry.result?.targetScore || '8.5'}</span>
                              </div>
                           </div>

                           {/* Bottom bar with date */}
                           <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-white/5">
                              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                                 <Calendar className="w-3 h-3" />
                                 <span className="font-bold">
                                    {getEntryDate(entry) ? new Date(getEntryDate(entry)!).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                 </span>
                                 {getEntryDate(entry) && (
                                    <span className="font-mono opacity-60 ml-1">
                                       {new Date(getEntryDate(entry)!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                 )}
                              </div>
                              {entry.prompt && (
                                 <div className="flex items-center gap-1 text-[9px] text-muted-foreground/50 uppercase tracking-widest">
                                    <Zap className="w-2.5 h-2.5" /> Context
                                 </div>
                              )}
                           </div>
                        </div>
                     ))}
                  </div>

                  {/* Pagination Area */}
                  {totalPages > 1 && (
                     <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 sm:mt-6 px-2 pb-6 sm:pb-10">
                        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800/50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-zinc-200 dark:border-white/5">
                           Page <span className="text-foreground">{page}</span> of <span className="text-foreground">{totalPages}</span>
                           <span className="mx-2 opacity-30">•</span>
                           <span className="text-foreground">{totalItems}</span> Artifacts
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                           <button
                              onClick={() => setPage(p => Math.max(1, p - 1))}
                              disabled={page === 1}
                              className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 text-foreground hover:bg-zinc-50 disabled:opacity-20 transition-all active:scale-90 shadow-sm"
                           >
                              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                           </button>

                           <div className="flex items-center gap-1 sm:gap-1.5">
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                 let pageNum = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                                 if (pageNum <= 0) return null;
                                 if (pageNum > totalPages) return null;

                                 return (
                                    <button
                                       key={pageNum}
                                       onClick={() => setPage(pageNum)}
                                       className={cn(
                                          "w-9 h-9 sm:w-11 sm:h-11 rounded-xl text-xs font-black transition-all shadow-sm",
                                          page === pageNum
                                             ? "bg-[#007AFF] text-white shadow-blue-500/20"
                                             : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 text-muted-foreground hover:bg-zinc-50"
                                       )}
                                    >
                                       {pageNum}
                                    </button>
                                 )
                              })}
                           </div>

                           <button
                              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                              disabled={page === totalPages}
                              className="w-9 h-9 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/5 text-foreground hover:bg-zinc-50 disabled:opacity-20 transition-all active:scale-90 shadow-sm"
                           >
                              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                           </button>
                        </div>
                     </div>
                  )}
               </div>
            )}
         </div>

         {previewImagePopup && (
            <ImagePreviewModal
               url={previewImagePopup.url}
               title={previewImagePopup.title}
               onClose={() => setPreviewImagePopup(null)}
            />
         )}

         <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
         .custom-scrollbar::-webkit-scrollbar-thumb {
           background: rgba(0,0,0,0.1);
           border-radius: 10px;
         }
         .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.05);
         }
         @keyframes float {
           0%, 100% { transform: translateY(0); }
           50% { transform: translateY(-10px); }
         }
         .animate-float {
           animation: float 4s ease-in-out infinite;
         }
      `}</style>
      </div>
   )
}
