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
   RefreshCcw,
   Clock,
   Tag,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { createPortal } from "react-dom"
import { getHistoryList } from "@/actions/studio-actions"
import { useRouter } from "next/navigation"

interface CreativeHistoryViewProps {
   onClose: () => void;
   onRegenerate: (prompt: string, result?: any, tab?: string, generationOptions?: any) => void;
}

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

// ── Helper to get display label for the source tab ──
function getTabLabel(tab: string): string {
   switch (tab) {
      case 'top-ads': return 'Top Ads';
      case 'studio': return 'Studio';
      case 'custom': return 'Custom';
      case 'ad-library': return 'Ad Library';
      default: return tab ? tab.charAt(0).toUpperCase() + tab.slice(1) : 'Custom';
   }
}

export default function CreativeHistoryView({ onClose, onRegenerate }: CreativeHistoryViewProps) {
   const [entries, setEntries] = useState<any[]>([])
   const [isLoading, setIsLoading] = useState(true)
   const [searchQuery, setSearchQuery] = useState("")
   const [inputValue, setInputValue] = useState("")
   const [page, setPage] = useState(1)
   const [totalItems, setTotalItems] = useState(0)
   const [previewImagePopup, setPreviewImagePopup] = useState<{ url: string; title: string } | null>(null)
   const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
   const router = useRouter()

   const itemsPerPage = 10
   const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage))

   const loadHistoryCreatives = useCallback(async () => {
      setIsLoading(true)
      try {
         const data = await getHistoryList(
            page,
            itemsPerPage,
            searchQuery
         )

         if (data && !data.error) {
            setEntries(data.history)
            setTotalItems(data.historyLength)
         } else {
            toast.error(data.error || "Failed to load history")
         }
      } catch (err) {
         console.error("Error loading creative history:", err)
         toast.error("An error occurred while loading history")
      } finally {
         setIsLoading(false)
      }
   }, [page, searchQuery])

   // Debounce the actual API search
   useEffect(() => {
      const timer = setTimeout(() => {
         if (searchQuery !== inputValue) {
            setSearchQuery(inputValue)
            setPage(1)
         }
      }, 500)
      return () => clearTimeout(timer)
   }, [inputValue, searchQuery])

   const isInitialLoad = useRef(true)
   useEffect(() => {
      if (isInitialLoad.current) {
         isInitialLoad.current = false
         loadHistoryCreatives()
         return
      }
      loadHistoryCreatives()
   }, [loadHistoryCreatives])

   // ── Handle Regenerate: directly navigate, no popup ──
   const handleRegenerate = (entry: any) => {
      const tab = entry.tab || 'custom';
      const prompt = entry.prompt || '';
      const result = entry.result || null;
      const generationOptions = entry.generationOptions || {};
      onRegenerate(prompt, result, tab, generationOptions);
   }

   return (
      <div className="flex-1 flex flex-col h-full animate-in fade-in duration-500 overflow-hidden bg-[#fafafa] dark:bg-[#09090b]">
         {/* Minimal Navigation & Header */}
         <div className="shrink-0 px-6 pt-6 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 max-w-[1600px] mx-auto">
               
               {/* Brand & Stats */}
               <div className="flex items-center gap-5">
                  <div className="flex flex-col">
                     <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
                        <History className="w-6 h-6 text-blue-500" />
                        Creative History
                     </h1>
                     <div className="flex items-center gap-3 mt-1">
                        <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                           {totalItems} total artifacts
                        </span>
                        <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        <span className="text-[11px] font-semibold text-blue-500 uppercase tracking-wider">
                           Active Vault
                        </span>
                     </div>
                  </div>
               </div>

               {/* Search & Actions Group */}
               <div className="flex items-center gap-4 flex-1 max-w-2xl justify-end">
                  <div className="relative group w-full max-w-[440px]">
                     <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-blue-500 transition-colors" />
                     <input
                        type="text"
                        placeholder="Search workspace by ID, title, or prompt..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="w-full h-11 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-11 pr-11 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500/50 transition-all shadow-sm"
                     />
                     {inputValue && (
                        <button 
                           onClick={() => setInputValue("")}
                           className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-all"
                        >
                           <X className="w-3.5 h-3.5" />
                        </button>
                     )}
                     {isLoading && !inputValue && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                           <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        </div>
                     )}
                  </div>
                  
                  <div className="h-11 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

                  <button 
                     onClick={onClose}
                     className="h-11 px-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold text-xs flex items-center gap-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all shadow-sm hover:shadow active:scale-95"
                  >
                     <ChevronLeft className="w-4 h-4" />
                     Back
                  </button>
               </div>
            </div>
         </div>

         {/* Workspace Content Area */}
         <div className="flex-1 min-h-0 flex flex-col p-6 pt-2">
            <div className="flex-1 max-w-[1600px] mx-auto w-full flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[28px] overflow-hidden shadow-2xl shadow-zinc-200/50 dark:shadow-black/50 relative">
               
               {isLoading && entries.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-5">
                     <div className="w-12 h-12 border-[3px] border-blue-500/10 border-t-blue-500 rounded-full animate-spin" />
                     <div className="flex flex-col items-center gap-1">
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tightest">Synchronizing Vault</p>
                        <p className="text-xs text-zinc-500 font-medium tracking-wide">Accessing generation history...</p>
                     </div>
                  </div>
               ) : entries.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-[#fafafa] dark:bg-[#09090b] animate-in fade-in zoom-in-95 duration-700">
                     <div className="relative mb-8 group">
                        <div className="absolute -inset-4 bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-700" />
                        <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shadow-2xl relative z-10 group-hover:scale-110 transition-transform duration-500">
                           <Clock className="w-10 h-10 text-blue-500 animate-pulse" />
                        </div>
                     </div>
                     <h3 className="text-3xl font-black text-zinc-900 dark:text-zinc-100 mb-3 tracking-tighter italic">History</h3>
                     <p className="text-[13px] text-zinc-500 max-w-xs mx-auto leading-relaxed font-medium">
                        {searchQuery 
                           ? `No matches found for "${searchQuery}". Try refining your search parameters.`
                           : "Your generation workspace is currently empty. Re-run or Analyze creatives to build your history."}
                     </p>
                  </div>
               ) : (
                  <div className="flex-1 overflow-hidden flex flex-col">
                     {/* Desktop Table View */}
                     <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse table-fixed">
                           <thead className="sticky top-0 z-30">
                              <tr className="bg-[#fcfcfc] dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800/50">
                                 <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 w-[120px]">Preview</th>
                                 <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500">Asset Identity</th>
                                 <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 hidden xl:table-cell w-[45%]">Neural Context</th>
                                 <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400 dark:text-zinc-500 text-right w-[180px]">Timeline</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/40">
                              {entries.map((entry, idx) => {
                                 const entryKey = entry.creativeId || `entry-${idx}`;
                                 const isSelected = selectedEntryId === entryKey;
                                 return (
                                 <tr 
                                    key={entryKey} 
                                    className={cn(
                                       "group transition-colors duration-200 cursor-pointer",
                                       isSelected 
                                          ? "bg-blue-50/40 dark:bg-blue-500/[0.06] ring-1 ring-inset ring-blue-500/20" 
                                          : "hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30"
                                    )}
                                    onClick={() => setSelectedEntryId(isSelected ? null : entryKey)}
                                 >
                                    <td className="px-8 py-6 align-top">
                                       <div
                                          className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/50 relative group/thumb cursor-pointer shadow-sm hover:shadow-md hover:scale-105 transition-all duration-300"
                                          onClick={(e) => {
                                             e.stopPropagation();
                                             const url = entry.result?.imageUrl || entry.imageUrl || "";
                                             if (url) setPreviewImagePopup({ url, title: entry.headline || "Artifact Preview" });
                                          }}
                                       >
                                          <HistoryThumbnail creativeId={entry.creativeId} immediateUrl={entry.result?.imageUrl || entry.imageUrl || null} />
                                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                                             <Plus className="w-5 h-5 text-white" />
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-8 py-6 align-top">
                                       <div className="flex flex-col gap-1.5 min-w-0">
                                          <h4 className={cn(
                                             "text-[13px] font-bold leading-tight truncate transition-colors",
                                             isSelected ? "text-blue-500" : "text-zinc-900 dark:text-zinc-100"
                                          )}>
                                             {entry.headline || 'Untitled Generation'}
                                          </h4>
                                          <div className="flex items-center gap-2">
                                             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/50 dark:border-white/5">
                                                <Tag className="w-2.5 h-2.5 text-zinc-400" />
                                                <span className="text-[10px] font-mono font-medium text-zinc-500 uppercase tracking-tight">
                                                   {(entry.creativeId || '').slice(-8)}
                                                </span>
                                             </div>
                                             <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-500/10 px-1.5 py-0.5 rounded">
                                                {getTabLabel(entry.tab)}
                                             </span>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-8 py-6 align-top hidden xl:table-cell min-w-0">
                                       <div className="flex flex-col gap-2">
                                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium leading-[1.6] line-clamp-3 italic">
                                             {entry.prompt ? `"${entry.prompt}"` : <span className="opacity-30">No neural context captured</span>}
                                          </p>
                                       </div>
                                    </td>

                                    <td className="px-8 py-6 align-top text-right">
                                       <div className="flex flex-col items-end gap-2">
                                          <div className="flex flex-col items-end gap-1">
                                             <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                                                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                                                {getEntryDate(entry) ? new Date(getEntryDate(entry)!).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                             </div>
                                             <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                                                <Clock className="w-3 h-3 opacity-60" />
                                                {getEntryDate(entry) ? new Date(getEntryDate(entry)!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                             </div>
                                          </div>
                                          {isSelected && (
                                             <button
                                                onClick={(e) => {
                                                   e.stopPropagation();
                                                   handleRegenerate(entry);
                                                }}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all active:scale-95 animate-in fade-in slide-in-from-right-2 duration-300"
                                                title="Regenerate with this prompt"
                                             >
                                                <Zap className="w-3 h-3" />
                                                Regenerate
                                             </button>
                                          )}
                                       </div>
                                    </td>
                                 </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>

                     {/* Professional Pagination Footer */}
                     <div className="shrink-0 border-t border-zinc-100 dark:border-zinc-800 bg-[#fcfcfc] dark:bg-[#0d0d0f] px-8 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                           <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-[0.2em] flex items-center gap-2.5">
                              Neural Page <span className="text-zinc-900 dark:text-zinc-100 font-black">{page}</span> 
                              <div className="w-[3px] h-[3px] rounded-full bg-zinc-300 dark:bg-zinc-700" />
                              Total Artifacts <span className="text-blue-500 font-black">{totalItems}</span>
                           </div>
                        </div>

                        {totalPages > 1 && (
                           <div className="flex items-center gap-2">
                              <button
                                 onClick={() => setPage(p => Math.max(1, p - 1))}
                                 disabled={page === 1}
                                 className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 disabled:opacity-30 transition-all shadow-sm"
                              >
                                 <ChevronLeft className="w-4 h-4" />
                              </button>

                              <div className="flex items-center gap-1 px-1">
                                 {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                                    if (pageNum <= 0 || pageNum > totalPages) return null;

                                    return (
                                       <button
                                          key={pageNum}
                                          onClick={() => setPage(pageNum)}
                                          className={cn(
                                             "w-10 h-10 rounded-xl text-[11px] font-bold transition-all duration-300",
                                             page === pageNum
                                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                                                : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
                                 className="w-10 h-10 flex items-center justify-center rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 disabled:opacity-30 transition-all shadow-sm"
                              >
                                 <ChevronRight className="w-4 h-4" />
                              </button>
                           </div>
                        )}
                     </div>
                  </div>
               )}
            </div>
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
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
         .custom-scrollbar::-webkit-scrollbar-thumb {
           background: rgba(0,0,0,0.05);
           border-radius: 10px;
         }
         .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255,255,255,0.05);
         }
      `}</style>
      </div>
   )
}
