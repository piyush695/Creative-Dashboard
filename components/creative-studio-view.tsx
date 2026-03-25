"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { 
  Sparkles, 
  Image as ImageIcon, 
  UploadCloud, 
  CheckCircle2, 
  X, 
  Zap, 
  Film,
  Download,
  Copy,
  LayoutGrid,
  Eye,
  Target,
  Lightbulb,
  ShieldCheck,
  AlertCircle,
  ChevronLeft,
  ArrowRight,
  Settings2,
  Database,
  Activity,
  Layout,
  Brain,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Save,
  Clock,
  History,
  MessageSquare,
  Send,
  PanelRightOpen,
  BookOpen,
  Plus
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
// Lightweight custom fetch for history
import { toast } from "sonner"
import { EnlargedImageModal } from "./enlarged-image-modal"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { createPortal } from "react-dom"

interface CreativeStudioViewProps {
  onClose?: () => void
  onHistoryChange?: (isOpen: boolean) => void
}

type ViewportMode = 'standby' | 'ad-details' | 'loading' | 'complete'
type TopAdsStep = 'aspects' | 'generate' | 'results'



export default function CreativeStudioView({ onClose, onHistoryChange }: CreativeStudioViewProps) {
  const [activeMainTab, setActiveMainTab] = useState<string>("custom")
  const [studioSubTab, setStudioSubTab] = useState<"image" | "video">("image")
  const [topAdsStep, setTopAdsStep] = useState<TopAdsStep>('aspects')
  const [tabStates, setTabStates] = useState<Record<string, {
    mode: ViewportMode;
    isGenerating: boolean;
    result: any;
    progress: number;
    prompt: string;
    generationOptions?: any;
    sessionHistory: any[];
  }>>({
    custom: { mode: 'standby', isGenerating: false, result: null, progress: 0, prompt: "", sessionHistory: [] },
    'top-ads': { mode: 'standby', isGenerating: false, result: null, progress: 0, prompt: "", sessionHistory: [] },
    studio: { mode: 'standby', isGenerating: false, result: null, progress: 0, prompt: "", sessionHistory: [] }
  })

  const currentTabState = tabStates[activeMainTab]
  
  const updateTabState = (tab: string, updates: Partial<typeof tabStates['custom']>) => {
    setTabStates(prev => ({
      ...prev,
      [tab]: { ...prev[tab], ...updates }
    }))
  }
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [base64File, setBase64File] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [copiedText, setCopiedText] = useState(false)
  const [previewImagePopup, setPreviewImagePopup] = useState<{ url: string; title: string; id?: string } | null>(null)
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0)

  const [creatives, setCreatives] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null)
  const [fullData, setFullData] = useState<Record<string, any>>({})
  const [selectedAspects, setSelectedAspects] = useState<Record<string, any>>({})
  
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const totalPages = Math.ceil(creatives.length / itemsPerPage)
  const displayedCreatives = creatives.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const generationInterval = useRef<NodeJS.Timeout | null>(null)

  // ── Regenerate Dialog State ──
  const [isRegenDialogOpen, setIsRegenDialogOpen] = useState(false)
  const [regenPrompt, setRegenPrompt] = useState("")
  const [previousInputs, setPreviousInputs] = useState<{ prompt: string; timestamp: string }[]>([])
  const [currentCreativeId, setCurrentCreativeId] = useState<string | null>(null)

  // ── History State ──
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  useEffect(() => { onHistoryChange?.(isHistoryOpen) }, [isHistoryOpen, onHistoryChange])
  const [historyEntries, setHistoryEntries] = useState<any[]>([])
  const [isHistoryLoading, setIsHistoryLoading] = useState(false)
  const [totalHistoryItems, setTotalHistoryItems] = useState(0)
  const [historySearchQuery, setHistorySearchQuery] = useState("")
  const [historyPage, setHistoryPage] = useState(1)
  const historyItemsPerPage = 10
  const totalHistoryPages = Math.max(1, Math.ceil(totalHistoryItems / historyItemsPerPage))
  const displayedHistory = historyEntries.slice((historyPage - 1) * historyItemsPerPage, historyPage * historyItemsPerPage)
  // ── Recent Creatives State ──
  const [recentCreatives, setRecentCreatives] = useState<any[]>([])

  // ── Save State ──
  const [isSaving, setIsSaving] = useState(false)
  const [savedCreativeIds, setSavedCreativeIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCreatives()
  }, [])

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentPage])

  useEffect(() => {
    setCurrentPage(1)
  }, [activeMainTab])

  const fetchCreatives = async () => {
    try {
      const res = await fetch("/api/studio?action=list")
      const data = await res.json()
      
      // Deduplicate creatives by adId
      const uniqueCreatives: any[] = [];
      const seen = new Set();
      (data.creatives || []).forEach((c: any) => {
        if (!seen.has(c.adId)) {
          seen.add(c.adId);
          uniqueCreatives.push(c);
        }
      });
      setCreatives(uniqueCreatives);
    } catch (err) {
      console.error("Failed to load creatives", err)
      setCreatives([])
    }
  }

  // ── Load History items for the preview sidebar ──
  const loadHistoryForPreview = useCallback(async () => {
    try {
      const res = await fetch("/api/history-lite");
      const data = await res.json();
      setRecentCreatives(data.history || [])
    } catch (err) {
      console.error("Failed to load history for preview", err)
    }
  }, [])

  // ── Load History — single fetch, all records ──
  const loadHistory = useCallback(async (search: string = "") => {
    setIsHistoryLoading(true)
    try {
      const res = await fetch(`/api/history-lite?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setHistoryEntries(data.history || [])
      setTotalHistoryItems(data.historyLength || 0)
    } catch (err) {
      console.error("Failed to load history", err)
      toast.error("Failed to load creative history")
    } finally {
      setIsHistoryLoading(false)
    }
  }, [])

  // EFFECT: Handle search query changes
  useEffect(() => {
    if (isHistoryOpen) {
      const timer = setTimeout(() => {
        loadHistory(historySearchQuery)
      }, 300) // Debounce search
      return () => clearTimeout(timer)
    }
  }, [historySearchQuery, isHistoryOpen, loadHistory])

  // ── Save to History ──
  const saveToHistory = useCallback(async (result: any, tab: string, prompt: string, parentId?: string | null, genOptions?: any) => {
    const creativeId = `creative-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const variants = result.variants || []
    const primaryVariant = variants.find((v: any) => v.imageUrl) || variants[0]
    const imageUrl = primaryVariant?.imageUrl || result.imageUrl || null

    setIsSaving(true)
    try {
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "save-history",
          creativeId,
          parentId: parentId || null,
          childId: null,
          tab,
          prompt,
          generationOptions: genOptions || {},
          result,
          imageUrl,
          previousInputs: previousInputs,
        })
      })
      const data = await res.json()
      if (data.success) {
        setCurrentCreativeId(creativeId)
        setSavedCreativeIds(prev => new Set(prev).add(creativeId))
        toast.success("Creative saved to history!")
        loadHistoryForPreview()
      }
    } catch (err) {
      console.error("Failed to save to history", err)
      toast.error("Failed to save creative")
    } finally {
      setIsSaving(false)
    }
    return creativeId
  }, [previousInputs, loadHistoryForPreview])

  // ── Open Regenerate Dialog ──
  const openRegenDialog = useCallback(() => {
    const tabState = tabStates[activeMainTab]
    if (tabState.prompt) {
      setPreviousInputs(prev => [
        ...prev,
        { prompt: tabState.prompt, timestamp: new Date().toISOString() }
      ])
    }
    setRegenPrompt("")
    setIsRegenDialogOpen(true)
  }, [activeMainTab, tabStates])

  // ── Handle Regeneration from Dialog ──
  const handleRegenerate = useCallback(async () => {
    if (!regenPrompt.trim()) {
      toast.error("Please enter new requirements")
      return
    }

    // Add the new prompt to previous inputs
    setPreviousInputs(prev => [
      ...prev,
      { prompt: regenPrompt, timestamp: new Date().toISOString() }
    ])

    // Update the tab prompt with the new one
    updateTabState(activeMainTab, { prompt: regenPrompt })
    setIsRegenDialogOpen(false)

    // Generate with the new prompt (don't restart, just regenerate)
    const parentId = currentCreativeId
    
    // Trigger generation
    setTimeout(() => {
      handleGenerate().then(() => {
        // After generation, save with parent reference
        const tabState = tabStates[activeMainTab]
        if (tabState.result) {
          saveToHistory(tabState.result, activeMainTab, regenPrompt, parentId, tabState.generationOptions)
        }
      })
    }, 100)
  }, [regenPrompt, activeMainTab, currentCreativeId, tabStates, saveToHistory])

  // Load history for preview on mount
  useEffect(() => {
    loadHistoryForPreview()
  }, [loadHistoryForPreview])

  // ── Handle clicking a recent creative card ──
  const handleRecentCreativeClick = useCallback(async (creative: any) => {
    if (!creative.result) {
      // Try fetching the full entry
      try {
        const res = await fetch(`/api/studio?action=history-detail&creativeId=${creative.creativeId}`)
        const data = await res.json()
        if (data.entry?.result) {
          setSelectedVariantIdx(0)
          updateTabState(creative.tab || activeMainTab, {
            result: data.entry.result,
            mode: 'complete',
            isGenerating: false,
            prompt: data.entry.prompt || ''
          })
          if (creative.tab && creative.tab !== activeMainTab) {
            // We can't change tab state externally, so stay on current
          }
          setCurrentCreativeId(creative.creativeId)
        }
      } catch {
        toast.error("Failed to load creative details")
      }
    } else {
      setSelectedVariantIdx(0)
      updateTabState(activeMainTab, {
        result: creative.result,
        mode: 'complete',
        isGenerating: false
      })
      setCurrentCreativeId(creative.creativeId)
    }
  }, [activeMainTab])

  const handleAdCardClick = async (ad: any) => {
    const adId = ad.adId
    setCurrentPreviewId(adId)
    updateTabState('top-ads', { mode: 'ad-details' })
    
    if (!fullData[adId]) {
      try {
        const res = await fetch(`/api/studio?action=aspects&adId=${adId}`)
        const data = await res.json()
        if (data.error) {
          toast.error(data.error)
          return
        }
        setFullData(prev => ({ ...prev, [adId]: data }))
        
        const defaults = {
          whatWorks: (data.whatWorks || []).map((_: any, i: number) => i),
          scores: Object.keys(data.scores || {}),
          psychology: Object.keys(data.psychology || {}).filter(k => data.psychology[k]?.present),
          aida: Object.keys(data.aida || {}),
          recommendations: (data.recommendations || []).map((_: any, i: number) => i)
        }
        setSelectedAspects(prev => ({ ...prev, [adId]: defaults }))
      } catch (err) {
        console.error("Failed to fetch aspects", err)
        toast.error("Failed to load ad analysis")
      }
    }
  }

  const toggleAdSelection = (adId: string) => {
    setSelectedIds(prev =>
      prev.includes(adId) ? prev.filter(id => id !== adId) : [...prev, adId]
    )
    // Clear generation inputs whenever the selection changes so stale text doesn't carry over
    updateTabState('top-ads', { prompt: '', generationOptions: {} })
  }

  const toggleAspect = (adId: string, category: string, value: any) => {
    setSelectedAspects(prev => {
      const current = prev[adId] || {}
      const cat = current[category] || []
      const nextCat = cat.includes(value) 
        ? cat.filter((v: any) => v !== value) 
        : [...cat, value]
      return { ...prev, [adId]: { ...current, [category]: nextCat } }
    })
  }

  const handleGenerate = async (optionsOverride?: any) => {
    const targetTab = activeMainTab

    if (targetTab === "custom" && !currentTabState.prompt) {
      toast.error("Please provide a prompt")
      return
    }
    if (targetTab === "studio" && (!currentTabState.prompt || !previewUrl)) {
      toast.error("Provide a reference and instruction")
      return
    }
    if (targetTab === "top-ads" && selectedIds.length === 0) {
      toast.error("Select at least one winning creative")
      return
    }

    updateTabState(targetTab, { isGenerating: true, mode: 'loading', progress: 0 })
    if (targetTab === 'top-ads') setTopAdsStep('results')
    
    // ── Smooth staged progress: increments tied to real processing phases ──
    // Stage thresholds: 0→20 (Source), 20→45 (Pattern), 45→70 (Brief), 70→92 (Render)
    let cur = 0
    const stageTargets = [20, 45, 70, 88, 92]
    let stageIdx = 0
    let elapsedTicks = 0
    
    generationInterval.current = setInterval(() => {
      elapsedTicks++
      const target = stageTargets[stageIdx] || 92
      
      // Smooth eased increment toward current stage target
      const remaining = target - cur
      const increment = Math.max(0.3, remaining * 0.08 + Math.random() * 0.5)
      cur = Math.min(cur + increment, target)
      
      // Advance to next stage every ~25 ticks (roughly 5 seconds per stage)
      if (cur >= target - 0.5 && stageIdx < stageTargets.length - 1) {
        if (elapsedTicks > (stageIdx + 1) * 20) {
          stageIdx++
          elapsedTicks = 0
        }
      }
      
      updateTabState(targetTab, { progress: Math.min(cur, 92) })
    }, 200)

    try {
      let body: any = {}
      if (targetTab === "custom") {
        body = { prompt: currentTabState.prompt, type: "custom" }
      } else if (targetTab === "studio") {
        body = { prompt: currentTabState.prompt, reference: base64File || previewUrl, type: studioSubTab }
      } else {
        body = { 
          adIds: selectedIds, 
          selectedAspects, 
          type: "pattern-based",
          prompt: currentTabState.prompt,
          ...(optionsOverride || currentTabState.generationOptions || {})
        }
      }

      const response = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      })
      
      const data = await response.json()
      
      if (generationInterval.current) clearInterval(generationInterval.current)
      
      // Snappy finish: 92 → 94 → 96 → 98 → 100
      updateTabState(targetTab, { progress: 94 })
      await new Promise(r => setTimeout(r, 100))
      updateTabState(targetTab, { progress: 96 })
      await new Promise(r => setTimeout(r, 100))
      updateTabState(targetTab, { progress: 98 })
      await new Promise(r => setTimeout(r, 100))
      updateTabState(targetTab, { progress: 100 })
      
      setTimeout(() => {
        if (data.creative) {
          setSelectedVariantIdx(0)
          
          // Use functional update or grab the latest state for sessionHistory
          setTabStates(prev => {
             const prevHistory = prev[targetTab].sessionHistory || [];
             return {
               ...prev,
               [targetTab]: {
                 ...prev[targetTab],
                 result: data.creative,
                 sessionHistory: [...prevHistory, data.creative],
                 mode: "complete",
                 isGenerating: false
               }
             }
          });
        } else {
          throw new Error(data.error || "Generation failed")
        }
      }, 200)

    } catch (err: any) {
      if (generationInterval.current) clearInterval(generationInterval.current)
      updateTabState(targetTab, { isGenerating: false, mode: targetTab === 'top-ads' ? 'ad-details' : 'standby', progress: 0 })
      if (targetTab === 'top-ads') setTopAdsStep('generate')
      toast.error(err.message || "Generation failed")
    }
  }

  const cancelProcess = () => {
    if (generationInterval.current) clearInterval(generationInterval.current)
    updateTabState(activeMainTab, { isGenerating: false, mode: 'standby', progress: 0, sessionHistory: [] })
    if (activeMainTab === 'top-ads') {
      setTopAdsStep('aspects')
      setSelectedIds([])
      setPreviewUrl(null)
      setCurrentPreviewId(null)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-sans select-none" suppressHydrationWarning>
      
      {/* Header */}
        <header className="px-3 md:px-5 py-2 md:py-3 border-b border-white/[0.06] bg-background/90 backdrop-blur-xl z-50 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-500/8 border border-blue-500/15 rounded-full shrink-0">
                <Sparkles className="w-3 h-3 text-blue-400" />
              </div>
              <h1 className="text-sm font-bold tracking-tight italic text-foreground/90 truncate">Creative Analyzer</h1>
            </div>
            {onClose && (
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors border border-border shrink-0 sm:hidden">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06] flex w-full sm:w-auto">
              <button onClick={() => setActiveMainTab("custom")} className={cn("flex-1 sm:flex-none px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all", activeMainTab === "custom" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Custom</button>
              <button onClick={() => setActiveMainTab("top-ads")} className={cn("flex-1 sm:flex-none px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all", activeMainTab === "top-ads" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Top Ads</button>
              <button onClick={() => setActiveMainTab("studio")} className={cn("flex-1 sm:flex-none px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all", activeMainTab === "studio" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>AI Studio</button>
            </div>
            <button
               onClick={() => { setIsHistoryOpen(true); loadHistory(""); }}
               className="hidden sm:flex px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-lg transition-all bg-white/[0.04] border border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.08] items-center gap-1.5 shadow-sm"
            >
               <History className="w-3.5 h-3.5" /> History
            </button>
            {onClose && (
              <button onClick={onClose} className="hidden sm:flex w-8 h-8 rounded-full bg-muted items-center justify-center hover:bg-muted/80 transition-colors border border-border shrink-0">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
        <main className="flex-1 flex flex-col md:flex-row w-full relative">
        
        {/* Sidebar — Hidden for Top Ads unless in complete mode */}
        <aside className={cn(
          "w-full md:w-[280px] md:min-w-[280px] border-b md:border-b-0 md:border-r border-border md:sticky md:top-0 md:h-screen flex flex-col bg-card/50 transition-all duration-300 z-40 shrink-0",
          activeMainTab === 'top-ads' && currentTabState.mode !== 'complete' && "hidden"
        )}>
          <div className="p-4 shrink-0 border-b border-white/[0.04]">
            <h2 className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider">
              <LayoutGrid className="w-3 h-3" />
              {activeMainTab === "studio" ? "Synthesis Assets" : "Neural Context"}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 md:py-4 space-y-3 custom-scrollbar min-h-0 max-h-[40vh] md:max-h-none">
            {activeMainTab === "studio" && (
              <div className="space-y-4 animate-in slide-in-from-bottom-2">
                <div className="grid grid-cols-2 bg-muted p-0.5 rounded-lg border border-border">
                  <button onClick={() => setStudioSubTab("image")} className={cn("h-8 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-medium transition-all", studioSubTab === "image" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    <ImageIcon className="w-3.5 h-3.5" /> Image
                  </button>
                  <button onClick={() => setStudioSubTab("video")} className={cn("h-8 rounded-md flex items-center justify-center gap-1.5 text-[11px] font-medium transition-all", studioSubTab === "video" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    <Film className="w-3.5 h-3.5" /> Video
                  </button>
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "w-full h-28 bg-muted/30 border border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-muted/50 relative overflow-hidden group",
                    previewUrl ? "border-primary/30" : "border-border"
                  )}
                >
                  {previewUrl ? (
                    studioSubTab === "image" ? (
                      <img src={previewUrl} className="w-full h-full object-cover" alt="Ref" />
                    ) : (
                      <video src={previewUrl} className="w-full h-full object-cover" autoPlay muted loop />
                    )
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-zinc-600">
                       <UploadCloud className="w-7 h-7 opacity-40" />
                       <p className="text-[11px] font-medium opacity-60">Upload reference {studioSubTab}</p>
                    </div>
                  )}
                  {previewUrl && (
                    <button onClick={(e) => { e.stopPropagation(); setPreviewUrl(null); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center border border-white/20 hover:bg-destructive/20 transition-all text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <input type="file" ref={fileInputRef} className="hidden" accept={studioSubTab === "image" ? "image/*" : "video/*"} onChange={(e) => {
                   const file = e.target.files?.[0]
                   if (file) {
                     setPreviewUrl(URL.createObjectURL(file))
                     const reader = new FileReader()
                     reader.onloadend = () => setBase64File(reader.result as string)
                     reader.readAsDataURL(file)
                   }
                }} />

                <div className="space-y-2 pt-3 border-t border-white/[0.04]">
                   <h3 className="text-[11px] font-medium text-zinc-500">Transform Instructions</h3>
                    <textarea 
                      value={currentTabState.prompt}
                      onChange={(e) => updateTabState('studio', { prompt: e.target.value })}
                      placeholder={`Describe how the AI should adapt this ${studioSubTab}...`}
                      className="w-full h-20 bg-muted/20 border border-border rounded-lg p-3 text-sm outline-none focus:ring-1 focus:ring-primary/30 transition-all placeholder:opacity-30 resize-none text-foreground"
                    />
                </div>
              </div>
            )}

            {activeMainTab === "custom" && (
              <div className="flex-1 space-y-3 animate-in slide-in-from-bottom-2 flex flex-col h-full min-h-0">
                <div className="flex items-center justify-between shrink-0">
                  <h3 className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Prompt</h3>
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                </div>
                <textarea 
                  value={currentTabState.prompt}
                  onChange={(e) => updateTabState('custom', { prompt: e.target.value })}
                  placeholder="Describe your creative vision in natural language..."
                  className="w-full flex-1 bg-muted/20 border border-border rounded-xl p-4 text-sm outline-none focus:ring-1 focus:ring-primary/30 transition-all leading-relaxed placeholder:opacity-30 custom-scrollbar resize-none text-foreground/80"
                />
              </div>
            )}

            {/* PREVIOUS REQUIREMENTS (Visible in complete mode) */}
            {currentTabState.mode === "complete" && previousInputs.length > 0 && (
              <div className="space-y-3 pt-6 mt-6 border-t border-white/[0.04] animate-in fade-in pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Previous Prompts</h3>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="space-y-2">
                  {previousInputs.map((input: any, idx: number) => (
                    <div key={idx} className="p-3 bg-muted/30 border border-border rounded-xl">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold text-primary">Req {idx + 1}</span>
                        <span className="text-[9px] text-muted-foreground">{new Date(input.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-foreground/80 leading-relaxed italic border-l-2 border-primary/30 pl-2.5 ml-1">{input.prompt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SESSION HISTORY (Now in sidebar) */}
            {currentTabState.mode === "complete" && (
              <div className="space-y-4 pt-6 mt-6 border-t border-white/[0.04] animate-in fade-in">
                <div className="flex items-center justify-between">
                   <h3 className="text-[11px] font-bold text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider">
                     <Clock className="w-3 h-3" /> Latest Generation
                   </h3>
                   {((activeMainTab === 'top-ads' && currentTabState.result?.sourceAdIds) || (currentTabState.sessionHistory && currentTabState.sessionHistory.length > 1)) && (
                      <div className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">
                          {currentTabState.sessionHistory && currentTabState.sessionHistory.length > 1 
                            ? `V${currentTabState.sessionHistory.length}` 
                            : 'V2'}
                        </span>
                      </div>
                   )}
                </div>

                <div className="space-y-3">
                  {currentTabState.sessionHistory && currentTabState.sessionHistory.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-1 pb-2">
                       {currentTabState.sessionHistory.map((hist: any, i: number) => {
                          const hVariants = hist.variants || [];
                          const validIdx = selectedVariantIdx < hVariants.length ? selectedVariantIdx : 0;
                          const imgUrl = (hVariants.length > 0 && hVariants[validIdx].imageUrl) || hist.imageUrl;
                          const isViewing = currentTabState.result === hist || currentTabState.result?.creativeId === hist.creativeId;
                          const isLatest = i === currentTabState.sessionHistory.length - 1;
                          
                          return (
                            <button 
                              key={i} 
                              className={cn(
                                "group/h relative aspect-[4/5] rounded-xl overflow-hidden border bg-muted transition-all hover:scale-[1.02] animate-in zoom-in-90 duration-300 text-left",
                                isViewing ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-emerald-500/50"
                              )} 
                              onClick={() => updateTabState(activeMainTab, { result: hist })}
                            >
                                {imgUrl ? (
                                    <img src={imgUrl} className={cn("w-full h-full object-cover transition-opacity", isViewing ? "opacity-100" : "opacity-60 group-hover/h:opacity-100")} alt="" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                                      <ImageIcon className="w-4 h-4 text-muted-foreground/20" />
                                    </div>
                                  )}
                                <div className={cn(
                                  "absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-black text-white uppercase backdrop-blur-md border shadow-sm leading-none",
                                  isLatest ? "bg-primary/90 border-primary/50" : "bg-black/80 border-white/10"
                                )}>
                                  V{i + 1}
                                </div>
                                {isLatest && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.6)]" />}
                            </button>
                          );
                       })}
                    </div>
                  ) : (
                    activeMainTab === 'top-ads' && currentTabState.result?.sourceAdIds && (
                      <div className="flex -space-x-1.5 pl-1">
                        {currentTabState.result.sourceAdIds.slice(0, 3).map((id: string) => (
                          <div key={id} className="w-10 h-10 rounded-lg overflow-hidden border border-emerald-500/30 shadow-md bg-muted">
                            <img src={creatives.find(c => c.adId === id)?.thumbnailUrl} className="w-full h-full object-cover" alt="source" />
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>

                <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-2">
                   <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                      <Sparkles className="w-3 h-3" /> Neural Context
                   </div>
                   <p className="text-[10px] text-blue-400/60 leading-relaxed font-medium">
                      Select versions to compare visual patterns. Your generation history is preserved throughout this session.
                   </p>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-white/[0.04] shrink-0 space-y-2">
            {activeMainTab !== "top-ads" && (
              <button 
                disabled={currentTabState.isGenerating}
                onClick={() => handleGenerate()}
                className="w-full h-10 bg-blue-600/10 text-blue-600 dark:bg-primary dark:text-primary-foreground border border-blue-600/20 dark:border-none rounded-lg font-semibold text-[11px] tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 hover:opacity-90 shadow-lg cursor-pointer"
              >
                {currentTabState.isGenerating ? "Processing..." : "Generate"}
                <Sparkles className="w-4 h-4 text-blue-600 dark:text-yellow-400 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </div>
        </aside>

        {/* Viewport */}
        <section 
          ref={scrollRef}
          className="flex-1 bg-background relative flex flex-col min-w-0"
        >
          
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.015] pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '60px 60px' }} 
          />

          {/* HISTORY MODE */}
          {isHistoryOpen && (
            <div className="w-full relative z-[100] bg-background animate-in fade-in duration-300 pb-20">
              {/* Header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 sticky top-0 bg-background/95 backdrop-blur-xl z-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <BookOpen className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Creative History</h2>
                    <p className="text-[10px] text-muted-foreground">{totalHistoryItems} creatives saved</p>
                  </div>
                </div>

                {/* History Search */}
                <div className="flex-1 max-w-md px-10 hidden md:block">
                  <div className="relative group">
                    <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                      type="text"
                      value={historySearchQuery}
                      onChange={(e) => setHistorySearchQuery(e.target.value)}
                      placeholder="Search by Creative ID or Headline..."
                      className="w-full h-10 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-xl pl-10 pr-4 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-white dark:focus:bg-zinc-900/80 transition-all placeholder:text-muted-foreground/50"
                    />
                    {historySearchQuery && (
                      <button 
                        onClick={() => setHistorySearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="h-10 px-4 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all cursor-pointer group"
                >
                  <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:-translate-x-1.5 transition-transform duration-300" />
                  <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white">Back</span>
                </button>
              </div>

              {/* History List */}
              <div className="flex-1 p-4 md:p-6 relative flex flex-col">
                {isHistoryLoading && historyEntries.length === 0 ? (
                  <div className="flex items-center justify-center h-40">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px] text-muted-foreground">Loading history...</span>
                    </div>
                  </div>
                ) : historyEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[500px] text-center px-4 animate-in fade-in zoom-in duration-700">
                    <div className="w-28 h-28 mb-8 relative animate-float">
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20" />
                      <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl animate-pulse opacity-20" />
                      <div className="relative z-10 w-full h-full flex items-center justify-center bg-zinc-900 border border-white/10 rounded-full shadow-2xl overflow-hidden">
                        <History className="w-12 h-12 text-primary/70" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black bg-gradient-to-b from-zinc-900 to-zinc-500 dark:from-white dark:to-white/40 bg-clip-text text-transparent mb-4 tracking-tighter uppercase">
                      {historySearchQuery ? "No Matching Results" : "History Empty"}
                    </h3>
                    <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-10 font-medium">
                      {historySearchQuery 
                        ? <>No neural matches found for <span className="text-primary font-bold italic">"{historySearchQuery}"</span>. Refine your query or check for typos.</>
                        : "Your creative vault is awaiting its first entry. Start generating to build your library."}
                    </p>
                    {historySearchQuery && (
                      <button 
                        onClick={() => setHistorySearchQuery("")}
                        className="h-12 px-8 bg-primary text-primary-foreground rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all active:scale-95 flex items-center gap-2 group"
                      >
                        <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" /> Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col relative">
                    {isHistoryLoading && (
                      <div className="absolute inset-0 z-20 bg-background/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                        <div className="flex flex-col items-center justify-center gap-3 bg-card/80 p-4 rounded-xl shadow-lg border border-border">
                          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          <span className="text-[10px] font-semibold text-muted-foreground">Loading...</span>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 flex flex-col max-w-[1600px] mx-auto w-full">
                      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead>
                            <tr className="border-b border-border bg-muted/30">
                              <th className="px-6 py-3.5 text-[10px] font-black tracking-widest text-muted-foreground uppercase text-center w-16">Preview</th>
                              <th className="px-6 py-3.5 text-[10px] font-black tracking-widest text-muted-foreground uppercase">Details</th>
                              <th className="px-6 py-3.5 text-[10px] font-black tracking-widest text-muted-foreground uppercase text-center w-24">Performance</th>
                              <th className="px-6 py-3.5 text-[10px] font-black tracking-widest text-muted-foreground uppercase w-32">Date Gen</th>

                            </tr>
                          </thead>
                          <tbody>
                            {displayedHistory.map((entry, idx) => (
                              <tr 
                                key={entry.creativeId || idx}
                                className="border-b border-border/50 transition-colors"
                              >
                                <td className="px-6 py-4 text-center">
                                  <div 
                                    className="w-12 h-12 rounded-xl border border-border overflow-hidden bg-muted/30 mx-auto relative isolate shadow-sm cursor-pointer group/preview"
                                    onClick={() => {
                                      const rawUrl = entry.result?.imageUrl || entry.imageUrl || "";
                                      if (rawUrl) {
                                        setPreviewImagePopup({ 
                                          url: rawUrl, 
                                          title: entry.headline || "Creative Preview" 
                                        });
                                      }
                                    }}
                                  >
                                    {entry.result?.imageUrl || entry.imageUrl ? (
                                      <img 
                                        src={entry.result?.imageUrl || entry.imageUrl} 
                                        alt="thumbnail" 
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <ImageIcon className="w-4 h-4 text-muted-foreground/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    )}
                                    
                                    {/* Plus Icon On Hover */}
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity">
                                      <Plus className="w-5 h-5 text-white" />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-black text-foreground uppercase tracking-tight line-clamp-1">
                                        {entry.headline || 'Direct Response Creative'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest bg-muted/50 px-1.5 py-0.5 rounded">
                                        ID: {(entry.creativeId || '').slice(-6)}
                                      </span>
                                      <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">
                                        {entry.tab || 'custom'}
                                      </span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {entry.score ? (
                                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mx-auto">
                                      <span className="text-[13px] font-black text-emerald-500">{entry.score}</span>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/30">-</span>
                                  )}
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[11px] text-foreground font-bold tracking-tight">
                                      {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                    </span>
                                    <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-tighter">
                                      {entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                  </div>
                                </td>

                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Enhanced Pagination */}
                    {totalHistoryPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12 mb-16 max-w-[1600px] mx-auto w-full px-6">
                         <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setHistoryPage(p => Math.max(1, p - 1));
                                if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              disabled={historyPage === 1}
                              className="h-11 w-11 flex items-center justify-center rounded-2xl border border-border bg-card hover:bg-muted disabled:opacity-20 transition-all active:scale-90"
                            >
                              <ChevronLeftIcon className="w-5 h-5" />
                            </button>

                            <div className="flex items-center gap-1.5 px-2">
                               {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map(p => (
                                 <button
                                   key={p}
                                   onClick={() => {
                                     setHistoryPage(p);
                                     if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                                   }}
                                   className={cn(
                                     "w-11 h-11 rounded-2xl text-[13px] font-black transition-all hover:scale-105 active:scale-95",
                                     historyPage === p 
                                       ? "bg-primary text-primary-foreground shadow-[0_10px_20px_-5px_rgba(59,130,246,0.3)]" 
                                       : "bg-muted/40 text-muted-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                   )}
                                 >
                                   {p}
                                 </button>
                               ))}
                            </div>

                            <button
                              onClick={() => {
                                setHistoryPage(p => Math.min(totalHistoryPages, p + 1));
                                if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              disabled={historyPage === totalHistoryPages}
                              className="h-11 w-11 flex items-center justify-center rounded-2xl border border-border bg-card hover:bg-muted disabled:opacity-20 transition-all active:scale-90"
                            >
                              <ChevronRightIcon className="w-5 h-5" />
                            </button>
                         </div>

                         <div className="h-11 px-6 flex items-center rounded-2xl bg-muted/20 border border-border/10 text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                            Page {historyPage} of {totalHistoryPages} • {totalHistoryItems} Items Total
                         </div>
                      </div>
                     )}

                  </div>
                )}
              </div>
            </div>
          )}

          {/* STANDBY MODE */}
          {!isHistoryOpen && currentTabState.mode === "standby" && (
            <div className="flex-1 flex flex-col min-h-full">
              {activeMainTab === "top-ads" && (
                <div className="flex-1 flex flex-col">
                  <div className="px-4 md:px-8 py-5 md:py-8 border-b border-white/[0.04] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                          <Database className="size-3" /> Pattern Repository
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black italic text-zinc-950 dark:text-white uppercase tracking-tighter leading-none">
                          Winning <span className="text-blue-500">Library</span>
                        </h2>
                        <p className="text-[11px] text-zinc-500 font-medium max-w-sm hidden sm:block">
                          Select winning patterns to generate high-converting variations.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                        {/* selection & analyze - HIDDEN ON MOBILE HEADER, SHOWN ON DESKTOP */}
                        <div className={cn(
                          "hidden lg:flex items-center gap-3 bg-white/[0.03] backdrop-blur-xl px-3 py-2 rounded-2xl border border-white/[0.08] transition-all duration-500 shadow-2xl overflow-hidden",
                          selectedIds.length > 0 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
                        )}>
                          <div className="flex flex-col items-start px-1">
                            <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest">{selectedIds.length} SELECTED</span>
                            <div className="flex gap-0.5 mt-0.5">
                              {Array.from({ length: Math.min(selectedIds.length, 3) }).map((_, i) => (
                                <div key={i} className="size-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              const ad = creatives.find(c => c.adId === selectedIds[0])
                              if (ad) handleAdCardClick(ad)
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white h-9 px-5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-[0_10px_20px_-5px_rgba(37,99,235,0.4)] border border-blue-400/30 group"
                          >
                            Analyze <ArrowRight className="size-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </div>

                        {/* Pagination - HIDDEN ON MOBILE HEADER */}
                        {totalPages > 1 && (
                          <div className="hidden lg:flex items-center bg-muted/40 dark:bg-white/[0.03] backdrop-blur-xl p-1.5 rounded-2xl border border-border dark:border-white/[0.08] shadow-2xl h-12">
                            <button
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              className={cn(
                                "size-9 rounded-xl flex items-center justify-center transition-all",
                                currentPage === 1 
                                  ? "text-zinc-300 dark:text-zinc-800 cursor-not-allowed opacity-50" 
                                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.07] active:scale-90"
                              )}
                            >
                              <ChevronLeftIcon className="size-4" />
                            </button>
                            
                            <div className="px-4 flex items-center justify-center min-w-[60px]">
                              <span className="text-[11px] font-black text-zinc-950 dark:text-white px-3 py-1.5 bg-blue-600/10 rounded-lg border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.1)]">
                                {currentPage < 10 ? `0${currentPage}` : currentPage}
                              </span>
                            </div>

                            <button
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              className={cn(
                                "size-9 rounded-xl flex items-center justify-center transition-all",
                                currentPage === totalPages 
                                  ? "text-zinc-800 cursor-not-allowed opacity-50" 
                                  : "text-zinc-400 hover:text-white hover:bg-white/[0.07] active:scale-90"
                              )}
                            >
                              <ChevronRightIcon className="size-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Ad Grid - Fixed columns */}
                  <div className="flex-1 p-3 md:p-6">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 max-w-[1600px] mx-auto pb-16">
                      {displayedCreatives.map((ad, idx) => (
                        <div 
                          key={`lib-${ad.adId || idx}`}
                          onClick={() => toggleAdSelection(ad.adId)}
                          className={cn(
                            "group relative rounded-xl overflow-hidden border transition-all duration-300 cursor-pointer",
                            selectedIds.includes(ad.adId) 
                              ? "border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.15)]" 
                              : "border-white/[0.06] hover:border-white/15 hover:-translate-y-1"
                          )}
                        >
                          <div className="aspect-[4/5] relative overflow-hidden">
                            <img src={ad.thumbnailUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            
                            {/* Score Badge */}
                            <div className="absolute top-2 left-2">
                               <div className="bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/10 flex items-center gap-1">
                                 <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                                 <span className="text-[10px] font-bold text-white font-mono">{ad.compositeRating || '—'}</span>
                               </div>
                            </div>

                            {/* Selection Indicator */}
                            {selectedIds.includes(ad.adId) && (
                              <div className="absolute inset-0 border-2 border-blue-500/50 rounded-xl pointer-events-none" />
                            )}
                             {/* Eye Button (Preview) */}
                             <button 
                               onClick={(e) => { e.stopPropagation(); setPreviewImagePopup({ url: ad.thumbnailUrl, title: ad.adName }); }}
                               className="absolute top-2 right-2 w-7 h-7 rounded-md bg-white/20 border border-white/20 flex items-center justify-center opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all hover:bg-white group-hover:bg-white hover:text-black shadow-lg"
                             >
                               <Eye className="w-3.5 h-3.5 text-white group-hover:text-primary transition-colors" />
                            </button>

                            <div className="absolute bottom-2 left-2 right-2 space-y-0.5 pointer-events-none">
                               <h3 className="text-[11px] font-semibold text-white truncate">{ad.adName || "Unnamed"}</h3>
                               <div className="flex items-center gap-1">
                                 <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                 <span className="text-[9px] font-bold text-emerald-400">{ad.ctr ? (ad.ctr * 100).toFixed(2) : "—"}% CTR</span>
                               </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Mobile Only Pagination - Bottom of list as requested */}
                    {totalPages > 1 && (
                      <div className="lg:hidden flex justify-center py-6 pb-24">
                        <div className="flex items-center bg-muted/40 dark:bg-white/[0.03] backdrop-blur-xl p-2 rounded-2xl border border-border dark:border-white/[0.08] shadow-2xl h-14">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={cn(
                              "size-10 rounded-xl flex items-center justify-center transition-all",
                              currentPage === 1 
                                ? "text-zinc-300 dark:text-zinc-800 cursor-not-allowed opacity-50" 
                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                            )}
                          >
                            <ChevronLeftIcon className="size-5" />
                          </button>
                          
                          <div className="px-5 flex items-center justify-center min-w-[70px]">
                            <span className="text-[14px] font-black text-zinc-950 dark:text-white px-4 py-2 bg-blue-600/10 rounded-lg border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.1)]">
                              {currentPage < 10 ? `0${currentPage}` : currentPage}
                            </span>
                          </div>

                          <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={cn(
                              "size-10 rounded-xl flex items-center justify-center transition-all",
                              currentPage === totalPages 
                                ? "text-zinc-300 dark:text-zinc-800 cursor-not-allowed opacity-50" 
                                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white"
                            )}
                          >
                            <ChevronRightIcon className="size-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Mobile Sticky Bar for Selection & Analyze */}
                  <div className={cn(
                    "lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[calc(100%-48px)] max-w-sm z-[100] transition-all duration-500",
                    selectedIds.length > 0 ? "translate-y-0 opacity-100" : "translate-y-24 opacity-0 pointer-events-none"
                  )}>
                    <div className="bg-zinc-950/90 backdrop-blur-2xl px-4 py-3 rounded-2xl border border-white/[0.1] shadow-2xl flex items-center justify-between gap-4">
                      <div className="flex flex-col items-start min-w-[100px]">
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none">{selectedIds.length} SELECTED</span>
                        <div className="flex gap-1 mt-1.5">
                          {Array.from({ length: Math.min(selectedIds.length, 3) }).map((_, i) => (
                            <div key={i} className="size-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)] animate-pulse" />
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const ad = creatives.find(c => c.adId === selectedIds[0])
                          if (ad) handleAdCardClick(ad)
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white h-11 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xl border border-blue-400/30"
                      >
                        Analyze Now <ArrowRight className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeMainTab !== "top-ads" && (
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-3 animate-in fade-in duration-500 min-h-[400px]">
                  <div className="relative mb-1">
                    <div className="absolute inset-0 bg-blue-500/5 blur-[60px] rounded-full animate-pulse scale-150" />
                    <div className="w-16 h-16 rounded-2xl bg-muted/30 border border-border flex items-center justify-center relative z-10 text-primary">
                      {activeMainTab === "custom" ? <Sparkles className="w-8 h-8" /> : <Settings2 className="w-8 h-8" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-foreground/80">Standby</h3>
                    <p className="text-[11px] text-muted-foreground font-medium max-w-[280px] mx-auto">
                      Provide a prompt to begin creative generation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AD DETAILS MODE — Clean, compact layout */}
          {currentTabState.mode === "ad-details" && activeMainTab === "top-ads" && (
            <div className="animate-in fade-in duration-300 w-full pb-10">
              {/* Step Header */}
                 <div className="px-3 md:px-6 py-2 md:py-3 border-b border-border bg-background/90 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => cancelProcess()}
                    className="p-1.5 rounded-lg bg-muted border border-border hover:bg-muted/80 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-foreground" />
                  </button>
                  
                  <div className="flex items-center gap-1 overflow-x-auto shrink min-w-0">
                    {['aspects', 'generate', 'results'].map((step, i) => (
                      <React.Fragment key={step}>
                        {i > 0 && <div className="w-4 h-px bg-white/10 shrink-0" />}
                        <button
                          disabled={step === 'results' && !currentTabState.result}
                          onClick={() => setTopAdsStep(step as TopAdsStep)}
                          className={cn(
                            "flex items-center gap-1 text-[9px] md:text-[10px] font-semibold uppercase tracking-wider transition-all disabled:opacity-30 shrink-0",
                            topAdsStep === step ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          <span className={cn("w-4 h-4 md:w-5 md:h-5 rounded-md flex items-center justify-center text-[8px] md:text-[9px] border transition-all shrink-0", topAdsStep === step ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border")}>{i + 1}</span>
                          <span className="hidden sm:inline">{step === 'aspects' ? 'Aspects' : step === 'generate' ? 'Generate' : 'Results'}</span>
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* MOBILE HEADER 'NEXT' BUTTON - Visible immediately on load */}
                  {topAdsStep === 'aspects' && (
                    <button
                      onClick={() => setTopAdsStep('generate')}
                      className="lg:hidden bg-blue-600 text-white px-4 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all shadow-lg border border-blue-400/30"
                    >
                      Next <ArrowRight className="size-3" />
                    </button>
                  )}
                  {selectedIds.length > 1 && (
                    <div className="hidden lg:flex items-center gap-1 mr-2">
                      {selectedIds.map(id => (
                        <button 
                          key={id} 
                          onClick={() => {
                            const ad = creatives.find(c => c.adId === id)
                            if (ad) handleAdCardClick(ad)
                          }}
                          className={cn(
                            "w-7 h-7 rounded-md overflow-hidden border transition-all shrink-0 hover:scale-105",
                            currentPreviewId === id ? "border-blue-500" : "border-white/10 opacity-50 hover:opacity-100"
                          )}
                        >
                          <img src={creatives.find(c => c.adId === id)?.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="text-[10px] font-semibold text-blue-400 bg-blue-500/8 px-3 py-1 rounded-full border border-blue-500/15">
                    {selectedIds.length} Locked
                  </div>
                </div>
              </div>

              <div className="p-3 md:p-6 w-full relative">
                {/* ASPECTS STEP */}
                {topAdsStep === 'aspects' && currentPreviewId && fullData[currentPreviewId] && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-5xl mx-auto w-full space-y-4 pb-4">
                    
                    {/* Compact Card */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                      <div className="flex flex-col sm:flex-row gap-0">
                        {/* Image */}
                        <div 
                          className="w-full h-36 sm:w-[180px] sm:h-auto shrink-0 relative overflow-hidden border-b sm:border-b-0 sm:border-r border-border group cursor-pointer" 
                          onClick={() => setPreviewImagePopup({ 
                            url: fullData[currentPreviewId].thumbnailUrl, 
                            title: fullData[currentPreviewId].adName 
                          })}
                        >
                          <img src={fullData[currentPreviewId].thumbnailUrl} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-white pointer-events-none">
                             <Eye className="w-5 h-5" />
                          </div>
                          <div 
                            className={cn(
                              "absolute bottom-2 left-2 right-2 py-1.5 rounded-md text-[9px] font-semibold flex items-center justify-center gap-1 transition-all border backdrop-blur-md",
                              selectedIds.includes(currentPreviewId) 
                                ? "bg-blue-600 border-blue-400 text-white cursor-default" 
                                : "bg-white/10 text-white border-white/20"
                            )}
                          >
                            {selectedIds.includes(currentPreviewId) ? "Selected" : "Select"}
                            <CheckCircle2 className={cn("w-3 h-3", selectedIds.includes(currentPreviewId) ? "opacity-100" : "opacity-40")} />
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 p-5 space-y-4 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <h2 className="text-sm font-bold text-white truncate" title={fullData[currentPreviewId].adName}>
                                {fullData[currentPreviewId].adName || "Unnamed Ad"}
                              </h2>
                              <div className="flex items-center gap-3 mt-1.5">
                                <div className="text-[10px] text-muted-foreground">
                                  CTR: <span className="text-foreground font-semibold">{((Number(fullData[currentPreviewId].ctr) || 0) * 100).toFixed(2)}%</span>
                                </div>
                                <div className="w-px h-3 bg-border" />
                                <div className="text-[10px] text-muted-foreground">
                                  Score: <span className="text-primary font-semibold font-mono">{fullData[currentPreviewId].compositeRating || '—'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/15">
                              <span className="text-[9px] font-semibold text-blue-400">Verified</span>
                            </div>
                          </div>

                          {fullData[currentPreviewId].verdictSummary && (
                            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] flex gap-2.5 items-start">
                              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{fullData[currentPreviewId].verdictSummary}</p>
                            </div>
                          )}

                          {fullData[currentPreviewId].keyInsight && (
                            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] flex gap-2.5 items-start">
                              <Lightbulb className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                              <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{fullData[currentPreviewId].keyInsight}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Analysis Tabs */}
                    <div className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm overflow-hidden">
                      <Tabs defaultValue="highlights" className="w-full">
                        <TabsList className="bg-muted p-0.5 rounded-xl h-auto w-full flex flex-nowrap overflow-x-auto custom-scrollbar gap-0.5 mb-5 border border-border justify-start">
                          <TabsTrigger value="highlights" className="flex-1 min-w-[100px] text-[10px] font-semibold uppercase tracking-wide rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all py-2.5">DNA Points</TabsTrigger>
                          <TabsTrigger value="aida" className="flex-1 min-w-[80px] text-[10px] font-semibold uppercase tracking-wide rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all py-2.5">AIDA</TabsTrigger>
                          <TabsTrigger value="neural" className="flex-1 min-w-[100px] text-[10px] font-semibold uppercase tracking-wide rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all py-2.5">Psychology</TabsTrigger>
                          <TabsTrigger value="insights" className="flex-1 min-w-[80px] text-[10px] font-semibold uppercase tracking-wide rounded-lg data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all py-2.5">Insights</TabsTrigger>
                        </TabsList>
                             
                        <TabsContent value="highlights" className="space-y-2 outline-none">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">Winning Elements</h4>
                            <span className="text-[10px] text-zinc-600">Toggle to include</span>
                          </div>
                          {(fullData[currentPreviewId]?.whatWorks || []).map((item: string, i: number) => (
                            <div 
                              key={i} 
                              onClick={() => toggleAspect(currentPreviewId, "whatWorks", i)}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                                selectedAspects[currentPreviewId]?.whatWorks?.includes(i) 
                                 ? "bg-emerald-500/8 border-emerald-500/20 text-foreground" 
                                 : "bg-muted/30 border-border text-muted-foreground hover:border-primary/20"
                              )}
                            >
                               <div className={cn("w-5 h-5 mt-0.5 rounded-md border flex items-center justify-center shrink-0 transition-all", selectedAspects[currentPreviewId]?.whatWorks?.includes(i) ? "bg-emerald-500 border-emerald-500" : "bg-white/5 border-white/[0.08]")}>
                                 <CheckCircle2 className={cn("w-3 h-3 text-white", selectedAspects[currentPreviewId]?.whatWorks?.includes(i) ? "block" : "hidden")} />
                               </div>
                               <span className="text-[12px] leading-relaxed font-medium">{item}</span>
                            </div>
                          ))}
                        </TabsContent>
                        
                        <TabsContent value="aida" className="space-y-3 outline-none">
                          <div className="flex items-center justify-between mb-1 px-1">
                            <h4 className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">AIDA Framework</h4>
                            <span className="text-[10px] text-zinc-600">Click to toggle influence</span>
                          </div>
                          {Object.entries(fullData[currentPreviewId]?.aida || {}).map(([key, val]: any) => (
                            <div 
                              key={key} 
                              onClick={() => toggleAspect(currentPreviewId, "aida", key)}
                              className={cn(
                                "p-4 rounded-xl border space-y-3 transition-all cursor-pointer",
                                selectedAspects[currentPreviewId]?.aida?.includes(key)
                                  ? "bg-blue-500/8 border-blue-500/20 shadow-sm shadow-blue-500/5 ring-1 ring-blue-500/10"
                                  : "bg-muted/20 border-border text-muted-foreground opacity-60 hover:opacity-100 hover:border-primary/20"
                              )}
                            >
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                  <div className={cn("w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all", selectedAspects[currentPreviewId]?.aida?.includes(key) ? "bg-blue-500 border-blue-500" : "bg-white/5 border-white/[0.08]")}>
                                    <CheckCircle2 className={cn("w-2.5 h-2.5 text-white", selectedAspects[currentPreviewId]?.aida?.includes(key) ? "block" : "hidden")} />
                                  </div>
                                  <span className={cn("text-[11px] font-semibold uppercase tracking-wider", selectedAspects[currentPreviewId]?.aida?.includes(key) ? "text-blue-400" : "text-zinc-500")}>{key}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full transition-all duration-500", selectedAspects[currentPreviewId]?.aida?.includes(key) ? "bg-blue-500" : "bg-zinc-700")} style={{ width: `${(val.score || 0)*10}%` }} />
                                  </div>
                                  <span className={cn("text-xs font-bold font-mono", selectedAspects[currentPreviewId]?.aida?.includes(key) ? "text-blue-400" : "text-zinc-600")}>{val.score}/10</span>
                                </div>
                              </div>
                              <p className="text-[11px] leading-relaxed line-clamp-2">{val.analysis || "Analysis pending."}</p>
                            </div>
                          ))}
                        </TabsContent>

                        <TabsContent value="neural" className="grid grid-cols-1 sm:grid-cols-2 gap-3 outline-none">
                          {Object.entries(fullData[currentPreviewId]?.psychology || {}).map(([key, val]: any) => (
                            <div 
                              key={key} 
                              onClick={() => toggleAspect(currentPreviewId, "psychology", key)}
                              className={cn(
                                "p-4 rounded-xl border transition-all cursor-pointer",
                                selectedAspects[currentPreviewId]?.psychology?.includes(key)
                                 ? "bg-purple-500/8 border-purple-500/20 text-foreground"
                                 : "bg-muted/20 border-border text-muted-foreground hover:border-primary/20"
                              )}
                            >
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[11px] font-semibold uppercase tracking-wide">{key.replace(/([A-Z])/g, ' $1')}</span>
                                <Badge className={cn("text-[9px] font-semibold px-2 py-0.5 rounded-full", val.present ? "text-purple-400 border-purple-400/30 bg-purple-400/8" : "text-zinc-700 border-zinc-700/30")}>{val.strength || 'N/A'}</Badge>
                              </div>
                              <p className="text-[11px] leading-relaxed opacity-60">{val.evidence || 'Not detected.'}</p>
                            </div>
                          ))}
                        </TabsContent>
                        
                        <TabsContent value="insights" className="space-y-3 outline-none">
                          <div className="flex items-center justify-between mb-1 px-1">
                            <h4 className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Strategic Recommendations</h4>
                            <span className="text-[10px] text-zinc-600">Click to toggle inclusion</span>
                          </div>
                          {(fullData[currentPreviewId]?.recommendations || []).map((rec: string, i: number) => (
                            <div 
                              key={i} 
                              onClick={() => toggleAspect(currentPreviewId, "recommendations", i)}
                              className={cn(
                                "p-4 rounded-xl border flex items-start gap-4 transition-all cursor-pointer",
                                selectedAspects[currentPreviewId]?.recommendations?.includes(i)
                                  ? "bg-amber-500/8 border-amber-500/20 shadow-sm shadow-amber-500/5 ring-1 ring-amber-500/10"
                                  : "bg-muted/10 border-border text-muted-foreground opacity-50 hover:opacity-100 hover:border-primary/20"
                              )}
                            >
                              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all shadow-inner", selectedAspects[currentPreviewId]?.recommendations?.includes(i) ? "bg-amber-500/20" : "bg-white/5")}>
                                {selectedAspects[currentPreviewId]?.recommendations?.includes(i) ? (
                                  <CheckCircle2 className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                                )}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-[9px] font-black uppercase tracking-[0.15em]", selectedAspects[currentPreviewId]?.recommendations?.includes(i) ? "text-amber-500" : "text-zinc-600 animate-pulse")}>Recommendation #{i+1}</span>
                                  {selectedAspects[currentPreviewId]?.recommendations?.includes(i) && <Badge className="bg-amber-500/10 text-amber-500 border-none text-[8px] h-3.5 px-1.5">Selected</Badge>}
                                </div>
                                <p className={cn("text-[12px] leading-relaxed", selectedAspects[currentPreviewId]?.recommendations?.includes(i) ? "text-zinc-300 font-medium" : "text-zinc-600 line-clamp-1")}>{rec}</p>
                              </div>
                            </div>
                          ))}
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Next Step Button — fixed floating at bottom on mobile, inline on desktop */}
                    <div className="flex justify-end pt-6 pb-4">
                      <button
                        disabled={selectedIds.length === 0}
                        onClick={() => setTopAdsStep('generate')}
                        className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-semibold text-[11px] flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shadow-lg w-auto"
                      >
                        Next: Configure Generation <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* GENERATE STEP */}
                {topAdsStep === 'generate' && (
                  <div className="max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16 space-y-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-400 uppercase tracking-widest">
                        <Settings2 className="w-3 h-3" /> Step 02: Configuration
                      </div>
                      <h2 className="text-2xl font-bold text-foreground">Generation Options</h2>
                      <p className="text-[11px] text-muted-foreground">Configure the parameters for your new creative.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Ad Type</span>
                        <select 
                          className="w-full h-11 bg-muted/20 border border-border rounded-lg px-4 text-[12px] font-medium text-foreground focus:ring-1 focus:ring-primary/30 outline-none transition-all appearance-none"
                          onChange={(e) => updateTabState('top-ads', { generationOptions: { ...currentTabState.generationOptions, adType: e.target.value } })}
                        >
                           <option value="Trading Challenge">Trading Challenge</option>
                           <option value="Limited Time Offer">Limited Time Offer</option>
                           <option value="Branding/Logo Focus">Branding/Logo Focus</option>
                           <option value="Social Proof Showcase">Social Proof Showcase</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Quality Tier</span>
                        <select 
                          className="w-full h-11 bg-muted/20 border border-border rounded-lg px-4 text-[12px] font-medium text-foreground focus:ring-1 focus:ring-primary/30 outline-none transition-all appearance-none"
                          onChange={(e) => updateTabState('top-ads', { generationOptions: { ...currentTabState.generationOptions, tier: e.target.value } })}
                        >
                           <option value="pro">HD (Pro)</option>
                           <option value="standard">Standard</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Target Audience</span>
                        <textarea 
                           placeholder="e.g. Failed traders looking for fair prop firm"
                           className="w-full h-20 bg-muted/20 border border-border rounded-lg p-4 text-[12px] font-medium text-foreground focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:opacity-30 resize-none"
                           onChange={(e) => updateTabState('top-ads', { prompt: e.target.value })}
                           value={currentTabState.prompt}
                        />
                      </div>
                      <div className="space-y-2">
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Tone / Style Override</span>
                        <textarea 
                           placeholder="e.g. Bold, meme-friendly, trader-culture"
                           className="w-full h-20 bg-muted/20 border border-border rounded-lg p-4 text-[12px] font-medium text-foreground focus:ring-1 focus:ring-primary/30 outline-none transition-all placeholder:opacity-30 resize-none"
                           value={currentTabState.generationOptions?.tone || ''}
                           onChange={(e) => updateTabState('top-ads', { generationOptions: { ...currentTabState.generationOptions, tone: e.target.value } })}
                        />
                      </div>
                    </div>

                    {/* Generate Button */}
                    <div className="flex items-center justify-between gap-4 pt-4 pb-4 border-t border-border">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Ready to Generate</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{selectedIds.length} creatives · {Object.keys(selectedAspects).reduce((acc, k) => acc + (selectedAspects[k]?.whatWorks?.length || 0), 0)} aspects active</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleGenerate()}
                          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-[11px] flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg cursor-pointer"
                        >
                          Generate <Sparkles className="w-4 h-4 text-blue-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LOADING MODE — Automation Pipeline Animation */}
          {!isHistoryOpen && currentTabState.mode === "loading" && (() => {
            const progress = currentTabState.progress;

            const stages = [
              { id: 'input',   label: 'Source Input',       sub: activeMainTab === 'top-ads' ? `${selectedIds.length} creative${selectedIds.length !== 1 ? 's' : ''} selected` : 'Prompt received', color: '#3b82f6', threshold: 0  },
              { id: 'extract', label: 'Pattern Extraction', sub: 'Analyzing winning elements',   color: '#8b5cf6', threshold: 20 },
              { id: 'brief',   label: 'Brief Generation',   sub: 'Neural engine synthesizing',       color: '#06b6d4', threshold: 45 },
              { id: 'render',  label: 'Visual Rendering',   sub: 'Generating creative assets',      color: '#10b981', threshold: 70 },
              { id: 'output',  label: 'Output Ready',       sub: 'Packaging creative',           color: '#f59e0b', threshold: 92 },
            ];

            const activeIdx   = stages.reduce((acc: number, s: any, i: number) => progress >= s.threshold ? i : acc, 0);
            const activeStage = stages[activeIdx];

            const iconPaths: Record<string, string> = {
              input:   'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
              extract: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
              brief:   'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
              render:  'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
              output:  'M5 13l4 4L19 7',
            };

            return (
            <div className="flex-1 flex flex-col items-center justify-center relative p-4 md:p-8 animate-in fade-in duration-500 overflow-hidden bg-background h-full">

              {/* Ambient background */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.025]"
                  style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
                <div className="absolute inset-0 transition-all duration-[1200ms]"
                  style={{ background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${activeStage.color}12, transparent 70%)` }} />
                <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full blur-[120px] transition-all duration-[1200ms]"
                  style={{ background: activeStage.color, opacity: 0.05 }} />
              </div>

              <div className="relative w-full max-w-3xl flex flex-col items-center gap-5 md:gap-10 animate-in fade-in zoom-in-98 duration-700">

                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-1 transition-all duration-700"
                    style={{ background: `${activeStage.color}10`, borderColor: `${activeStage.color}30` }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: activeStage.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest transition-colors duration-700" style={{ color: activeStage.color }}>
                      Holaprime Neural Engine · Active
                    </span>
                  </div>
                  <h2 className="text-sm md:text-xl font-black text-foreground uppercase tracking-tight">{activeStage.label}</h2>
                  <p className="text-[11px] font-medium transition-all duration-700" style={{ color: `${activeStage.color}aa` }}>{activeStage.sub}</p>
                </div>

                {/* Pipeline */}
                <div className="w-full relative">
                  {/* SVG connector lines — height responsive */}
                  <svg className="absolute top-0 left-0 w-full pointer-events-none" height="40" style={{ zIndex: 0 }} preserveAspectRatio="none">
                    {stages.map((_: any, i: number) => {
                      if (i >= stages.length - 1) return null;
                      const segW = 100 / (stages.length - 1);
                      const x1 = i * segW + segW * 0.12;
                      const x2 = (i + 1) * segW - segW * 0.12;
                      const y = 28;
                      const done   = i < activeIdx;
                      const active = i === activeIdx;
                      return (
                        <g key={i}>
                          <line x1={`${x1}%`} y1={y} x2={`${x2}%`} y2={y} stroke="rgba(150,150,150,0.15)" strokeWidth="1.5" />
                          {done && (
                            <>
                              <defs>
                                <linearGradient id={`lg${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                  <stop offset="0%" stopColor={stages[i].color} stopOpacity="0.7" />
                                  <stop offset="100%" stopColor={stages[i + 1].color} stopOpacity="0.7" />
                                </linearGradient>
                              </defs>
                              <line x1={`${x1}%`} y1={y} x2={`${x2}%`} y2={y} stroke={`url(#lg${i})`} strokeWidth="1.5" />
                            </>
                          )}
                          {active && (
                            <>
                              <line x1={`${x1}%`} y1={y} x2={`${x2}%`} y2={y} stroke={stages[i].color} strokeWidth="1" strokeOpacity="0.35" />
                              <line x1={`${x1}%`} y1={y} x2={`${x2}%`} y2={y}
                                stroke={stages[i].color} strokeWidth="2" strokeOpacity="0.2"
                                strokeDasharray="4 7" strokeLinecap="round"
                                style={{ animation: 'dashFlow 0.9s linear infinite' }} />
                            </>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Nodes */}
                  <div className="flex items-start justify-between pt-0" style={{ zIndex: 1, position: 'relative', marginTop: 0 }}>
                    {stages.map((stage: any, i: number) => {
                      const isDone   = i < activeIdx;
                      const isActive = i === activeIdx;
                      const col = isDone || isActive ? stage.color : 'rgba(150,150,150,0.3)';

                      return (
                        <div key={stage.id} className="flex flex-col items-center gap-1 md:gap-3" style={{ width: '20%' }}>
                          <div className="relative flex items-center justify-center">
                            {isActive && <div className="absolute w-10 md:w-20 h-10 md:h-20 rounded-full animate-ping" style={{ background: `${stage.color}06`, border: `1px solid ${stage.color}20` }} />}
                            {isActive && <div className="absolute w-8 md:w-16 h-8 md:h-16 rounded-full animate-pulse" style={{ background: `${stage.color}0c`, border: `1px solid ${stage.color}30` }} />}
                            {isDone   && <div className="absolute w-7 md:w-14 h-7 md:h-14 rounded-full" style={{ border: `1px solid ${stage.color}25` }} />}

                            {/* Main node */}
                            <div className="w-8 h-8 md:w-12 md:h-12 rounded-full flex items-center justify-center relative transition-all duration-700"
                              style={{
                                background: isDone ? `linear-gradient(135deg, ${stage.color}22, ${stage.color}0a)`
                                  : isActive ? `linear-gradient(135deg, ${stage.color}30, ${stage.color}10)`
                                  : 'rgba(150,150,150,0.05)',
                                border: `2px solid ${isDone ? stage.color + '80' : isActive ? stage.color : 'rgba(150,150,150,0.15)'}`,
                                boxShadow: isActive ? `0 0 0 3px ${stage.color}18, 0 0 30px ${stage.color}35` : isDone ? `0 0 12px ${stage.color}22` : 'none',
                                color: col, zIndex: 10,
                              }}>
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {isDone
                                  ? <polyline points="20 6 9 17 4 12" strokeWidth="2.5" />
                                  : <path d={iconPaths[stage.id] || ''} />
                                }
                              </svg>
                            </div>

                            {/* Spinning arc for active */}
                            {isActive && (
                              <svg className="absolute w-[28px] h-[28px] md:w-[60px] md:h-[60px]" viewBox="0 0 60 60"
                                style={{ animation: 'spinRing 2s linear infinite', position: 'absolute' }}>
                                <circle cx="30" cy="30" r="28" fill="none"
                                  stroke={stage.color} strokeWidth="2" strokeOpacity="0.6"
                                  strokeDasharray="44 132" strokeLinecap="round" />
                              </svg>
                            )}
                          </div>

                          <div className="text-center space-y-0.5 max-w-[40px] md:max-w-none">
                            <p className={cn(
                              "text-[6px] md:text-[9px] font-bold uppercase tracking-tight md:tracking-wider leading-tight transition-colors duration-500 break-words",
                              isActive && "text-foreground",
                              !isDone && !isActive && "text-muted-foreground/50"
                            )}
                              style={{ color: isDone ? stage.color + 'bb' : undefined }}>
                              {stage.label.split(' ')[0]}
                            </p>
                            {isActive && (
                              <div className="flex justify-center gap-[2px] md:gap-[3px]">
                                {[0, 110, 220].map((d: number) => (
                                  <div key={d} className="w-[2px] h-[2px] md:w-[3px] md:h-[3px] rounded-full animate-bounce"
                                    style={{ background: stage.color, animationDelay: `${d}ms` }} />
                                ))}
                              </div>
                            )}
                            {isDone && <div className="text-[6px] md:text-[8px] font-semibold" style={{ color: stage.color + '70' }}>done</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 md:gap-4 w-full">
                  {[
                    { label: 'Sources',  value: activeMainTab === 'top-ads' ? String(selectedIds.length) : '—', sub: activeMainTab === 'top-ads' ? 'creatives' : 'prompt', color: '#3b82f6' },
                    { label: 'Stage',    value: `${activeIdx + 1}`,  sub: 'of 5 steps',    color: activeStage.color },
                    { label: 'Progress', value: `${Math.floor(progress)}%`, sub: 'complete', color: '#10b981' },
                  ].map((s: any) => (
                    <div key={s.label} className="p-2 md:p-4 rounded-xl md:rounded-2xl text-center transition-all duration-700"
                      style={{ background: `${s.color}08`, border: `1px solid ${s.color}18` }}>
                      <div className="text-[7px] md:text-[9px] font-semibold uppercase tracking-widest mb-1 md:mb-1.5" style={{ color: `${s.color}65` }}>{s.label}</div>
                      <div className="text-lg md:text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[7px] md:text-[9px] mt-0.5" style={{ color: `${s.color}45` }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="w-full space-y-2.5">
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(150,150,150,0.15)' }}>
                    <div className="h-full rounded-full relative overflow-hidden transition-all duration-500 ease-out"
                      style={{ width: `${progress}%`, background: `linear-gradient(90deg, #1d4ed8, ${activeStage.color}, #06b6d4)` }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        style={{ animation: 'shimmerBar 1.2s ease-in-out infinite' }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground/60">
                    <span className="text-[9px] font-semibold uppercase tracking-widest">Processing pipeline</span>
                    <button onClick={cancelProcess}
                      className="text-[9px] font-semibold uppercase tracking-widest flex items-center gap-1 transition-colors hover:text-red-400">
                      <X className="w-3 h-3" /> Cancel
                    </button>
                  </div>
                </div>
              </div>

              <style dangerouslySetInnerHTML={{__html: `
                @keyframes spinRing { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes dashFlow { from{stroke-dashoffset:0} to{stroke-dashoffset:-20} }
                @keyframes shimmerBar { 0%{transform:translateX(-200%)} 100%{transform:translateX(600%)} }
              `}} />
            </div>
            );
          })()}

          {/* COMPLETE MODE — Image Viewport */}
          {!isHistoryOpen && currentTabState.mode === "complete" && currentTabState.result && (() => {
            const r = currentTabState.result;
            const variants = r.variants || [];
            const hasVariants = variants.length > 1;
            const activeVariant = hasVariants ? variants[selectedVariantIdx] || variants[0] : null;
            const displayImageUrl = activeVariant?.imageUrl || r.imageUrl;

            // Resolve all possible result shapes from different API paths
            const headline = r.copywriting?.headline?.primary || r.metaAd?.headline || r.creativeConcept?.title || "Creative Generated";
            const bodyText = r.copywriting?.body?.primary 
              || r.metaAd?.primaryText 
              || r.copywriting?.body?.variations?.[0]
              || r.psychologyBlueprint?.emotionalJourney
              || r.creativeConcept?.rationale
              || "Your Holaprime creative has been generated based on the selected winning patterns and prompt.";
            const ctaText = r.copywriting?.cta?.primary || r.metaAd?.cta || "";
            const hookText = r.copywriting?.hookText || "";
            const baseScoreVal = activeVariant?.score?.overall || parseFloat((r.creativeConcept?.targetScore || r.targetScore || "8.5").toString().replace('/10',''));
            const displayScoreNum = typeof baseScoreVal === 'number' && !isNaN(baseScoreVal) ? baseScoreVal : 8.5;
            const score = displayScoreNum.toFixed(1);
            
            let tier = "STANDARD";
            if (displayScoreNum >= 9.0) tier = "ELITE";
            else if (displayScoreNum >= 8.0) tier = "PRO";
            else if (displayScoreNum >= 7.0) tier = "PREMIUM";
            const isImprovement = activeMainTab === 'top-ads' && r.sourceAdIds;
            const improvementSummary = r.creativeConcept?.improvementSummary;

            const handleCopyText = () => {
              const fullCopy = [headline, bodyText, ctaText, hookText].filter(Boolean).join("\n\n");
              navigator.clipboard.writeText(fullCopy);
              setCopiedText(true);
              setTimeout(() => setCopiedText(false), 3500);
            };

            const handleExport = async () => {
              const exportUrl = displayImageUrl;
              if (!exportUrl) {
                toast.info("No image to export");
                return;
              }
              try {
                if (exportUrl.startsWith('data:')) {
                  const a = document.createElement('a');
                  a.href = exportUrl;
                  a.download = `holaprime-creative-${activeVariant?.id || 'output'}-${Date.now()}.png`;
                  a.click();
                } else {
                  const resp = await fetch(exportUrl);
                  const blob = await resp.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = `holaprime-creative-${activeVariant?.id || 'output'}-${Date.now()}.png`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                }
                toast.success("Creative downloaded!");
              } catch {
                window.open(exportUrl);
              }
            };

            return (
            <div className="flex-1 flex flex-col animate-in zoom-in-95 duration-700 overflow-hidden min-h-0">

               {/* Variant selector bar with scores */}
               {hasVariants && (
                 <div className="shrink-0 border-b border-border">
                   <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto">
                     {variants.map((v: any, idx: number) => (
                       <button
                         key={v.id}
                         onClick={() => setSelectedVariantIdx(idx)}
                         className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                           idx === selectedVariantIdx
                             ? 'bg-primary text-primary-foreground shadow-sm'
                             : 'bg-background text-muted-foreground hover:text-foreground hover:bg-muted border border-border'
                         }`}
                       >
                         <span className={`w-1.5 h-1.5 rounded-full ${v.imageUrl ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                         <span>{v.label || `Variant ${idx + 1}`}</span>
                         {v.score?.overall && (
                           <span className={`ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                             v.score.overall >= 8 ? 'bg-emerald-500/20 text-emerald-500' :
                             v.score.overall >= 6 ? 'bg-amber-500/20 text-amber-500' :
                             'bg-rose-500/20 text-rose-500'
                           }`}>{v.score.overall}/10</span>
                         )}
                       </button>
                     ))}
                   </div>
                   {/* Score details for active variant */}
                   {activeVariant?.score && (
                     <div className="flex items-center gap-3 px-3 py-1.5 bg-muted/30 text-[9px] text-muted-foreground overflow-x-auto">
                       <span className="flex items-center gap-1">Text <span className="font-bold text-foreground">{activeVariant.score.textAccuracy}/10</span></span>
                       <span className="flex items-center gap-1">Layout <span className="font-bold text-foreground">{activeVariant.score.layoutQuality}/10</span></span>
                       <span className="flex items-center gap-1">Psychology <span className="font-bold text-foreground">{activeVariant.score.psychologyScore}/10</span></span>
                       <span className="flex items-center gap-1">Brand <span className="font-bold text-foreground">{activeVariant.score.brandCompliance}/10</span></span>
                       {activeVariant.score.predictedCtr && (
                         <span className="flex items-center gap-1">Est. CTR <span className="font-bold text-emerald-500">{activeVariant.score.predictedCtr}</span></span>
                       )}
                       {activeVariant.score.verdict && (
                         <span className="hidden md:block ml-auto italic truncate max-w-[300px]">{activeVariant.score.verdict}</span>
                       )}
                     </div>
                   )}
                 </div>
               )}

               {/* Image area — fixed visibility */}
               <div className="flex-1 relative group overflow-hidden bg-background flex items-center justify-center min-h-[200px] md:min-h-[300px] max-h-[50vh] md:max-h-[60vh]">
                  {displayImageUrl ? (
                    <img 
                      src={displayImageUrl} 
                      className="max-w-full max-h-full w-auto h-auto object-contain transition-transform duration-[20s] group-hover:scale-105" 
                      alt="Creative" 
                      style={{ display: 'block', minHeight: '200px' }}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const placeholder = target.nextElementSibling as HTMLElement;
                        if (placeholder) placeholder.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div className={cn("flex-col items-center justify-center opacity-40 px-4", displayImageUrl ? "hidden" : "flex")}>
                    <ImageIcon className="w-12 md:w-24 h-12 md:h-24 mb-2 md:mb-4 text-muted-foreground" />
                    <p className="text-xs font-semibold text-muted-foreground text-center">Image Generation / No Provider</p>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60 pointer-events-none" />



                  {/* Clear button — visible on md+ AND mobile as a floating button */}
                  <div className="absolute top-4 right-4 z-20">
                    <button
                      onClick={() => {
                        updateTabState(activeMainTab, { result: null, mode: activeMainTab === 'top-ads' ? 'ad-details' : 'standby', progress: 0, sessionHistory: [] });
                        if (activeMainTab === 'top-ads') setTopAdsStep('generate');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-xl border border-white/10 hover:bg-rose-500/25 hover:border-rose-400/50 transition-all shadow-xl"
                    >
                      <div className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center">
                        <X className="w-2.5 h-2.5 text-rose-400" />
                      </div>
                      <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Clear</span>
                    </button>
                  </div>

                </div>

                {/* Desktop action bar - BELOW image */}
                <div className="hidden md:flex items-end justify-between p-6 bg-background border-b border-border shrink-0">
                  <div className="max-w-lg space-y-2">
                    <Badge className="bg-primary/10 border-primary/30 text-[9px] font-semibold px-3 py-1 rounded-full backdrop-blur-xl text-primary">
                      {isImprovement ? 'Version 2 — Improvement Based' : 'Generated Creative'}
                    </Badge>
                    <h2 className="text-2xl font-bold text-foreground drop-shadow-xl">{headline}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                     <button
                       onClick={openRegenDialog}
                       className="px-4 py-2 bg-blue-600/10 text-blue-600 dark:bg-primary dark:text-primary-foreground border border-blue-600/20 dark:border-none rounded-lg font-semibold text-[11px] flex items-center gap-2 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] shrink-0"
                     >
                       <Zap className="w-3.5 h-3.5" /> Regenerate
                     </button>
                     <button
                       onClick={() => {
                         const r = currentTabState.result;
                         if (r) saveToHistory(r, activeMainTab, currentTabState.prompt, currentCreativeId, currentTabState.generationOptions);
                       }}
                       disabled={isSaving}
                       className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-600 dark:text-white border border-emerald-500/20 dark:border-none rounded-lg font-semibold text-[11px] flex items-center gap-2 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 shrink-0"
                     >
                       <Save className="w-3.5 h-3.5" /> {isSaving ? 'Saving...' : 'Save'}
                     </button>
                     <button onClick={handleExport} className="px-4 py-2 bg-muted text-foreground border border-border rounded-lg font-semibold text-[11px] flex items-center gap-2 hover:bg-muted/80 transition-all cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] shrink-0">
                       <Download className="w-3.5 h-3.5" /> Export
                     </button>
                  </div>
                </div>

                {/* Mobile action bar - BELOW image */}
                <div className="md:hidden flex flex-col gap-3 p-4 bg-background border-b border-border shrink-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <Badge className="bg-primary/10 border-primary/30 text-[9px] font-semibold px-2 py-0.5 rounded-full text-primary mb-1">
                        {isImprovement ? 'V2 · Improved' : 'Generated'}
                      </Badge>
                      <h2 className="text-sm font-bold text-foreground truncate">{headline}</h2>
                    </div>
                    <div className="flex items-center gap-1.5">
                       <button
                         onClick={openRegenDialog}
                         className="px-3 py-2 bg-blue-600/10 text-blue-600 dark:bg-primary dark:text-primary-foreground border border-blue-600/20 dark:border-none rounded-lg font-bold text-[10px] flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                       >
                         <Zap className="w-3 h-3" /> Regen
                       </button>
                       <button
                         onClick={() => {
                           const r = currentTabState.result;
                           if (r) saveToHistory(r, activeMainTab, currentTabState.prompt, currentCreativeId, currentTabState.generationOptions);
                         }}
                         disabled={isSaving}
                         className="w-9 h-9 flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:bg-emerald-600 dark:text-white border border-emerald-500/20 dark:border-none rounded-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                       >
                         <Save className="w-4 h-4" />
                       </button>
                       <button 
                         onClick={handleExport} 
                         className="w-9 h-9 flex items-center justify-center bg-muted text-foreground border border-border rounded-lg active:scale-95 transition-all cursor-pointer"
                       >
                         <Download className="w-4 h-4" />
                       </button>
                    </div>
                  </div>
                </div>
            </div>
            );
          })()}

          {currentTabState.mode === "complete" && currentTabState.result && (() => {
            const r = currentTabState.result;

            // --- Dynamic content from AI result ---
            const headline = r.copywriting?.headline?.primary || r.metaAd?.headline || r.creativeConcept?.title || 'Creative Generated';
            const bodyText = r.copywriting?.body?.primary
              || r.metaAd?.primaryText
              || r.copywriting?.body?.variations?.[0]
              || r.psychologyBlueprint?.emotionalJourney
              || r.creativeConcept?.rationale
              || `Creative generated from ${selectedIds.length} source creative${selectedIds.length !== 1 ? 's' : ''}.`;
            const ctaText   = r.copywriting?.cta?.primary || r.metaAd?.cta || '';
            const hookText  = r.copywriting?.hookText || r.psychologyBlueprint?.aidaFlow?.attention || '';
            const urgency   = r.copywriting?.urgencyText || '';
            const trust     = r.copywriting?.trustText || '';
            const score     = r.creativeConcept?.targetScore || r.targetScore || '8.5';
            const tier      = r.creativeConcept?.performanceTier || r.performanceTier || 'PREMIUM';
            const improvementSummary = r.creativeConcept?.improvementSummary || r.creativeConcept?.rationale || '';
            const primaryTrigger    = r.psychologyBlueprint?.primaryTrigger || '';
            const scoreNum  = parseFloat(String(score)) || 8.5;
            const scoreColor = scoreNum >= 9 ? '#10b981' : scoreNum >= 8 ? '#3b82f6' : scoreNum >= 7 ? '#f59e0b' : '#ef4444';

            const handleCopyText = () => {
              const fullCopy = [headline, hookText, bodyText, ctaText, urgency].filter(Boolean).join('\n\n');
              navigator.clipboard.writeText(fullCopy);
              setCopiedText(true);
              setTimeout(() => setCopiedText(false), 3500);
            };

            return (
            <div className="shrink-0 p-3 md:p-6 grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3 md:gap-4 bg-background border-t border-border">
               <div className="bg-muted/30 border border-border rounded-xl p-5 relative flex items-start min-h-[80px]">
                 <div className="flex-1 pr-10 space-y-2">
                   {hookText && (
                     <p className="text-xs font-bold text-primary/80 leading-tight">{hookText}</p>
                   )}
                   <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                      {bodyText}
                   </p>
                   {ctaText && (
                     <span className="inline-block text-[10px] font-bold text-primary uppercase tracking-wider border border-primary/30 rounded-full px-3 py-0.5">{ctaText}</span>
                   )}
                   {improvementSummary && (
                     <div className="mt-2 pt-2 border-t border-border">
                       <span className="text-[9px] font-bold text-emerald-400/70 uppercase tracking-wider">Improvements applied:</span>
                       <p className="text-[10px] text-emerald-400/60 leading-relaxed mt-0.5 line-clamp-2">
                         {Array.isArray(improvementSummary) ? improvementSummary.join(' • ') : improvementSummary}
                       </p>
                     </div>
                   )}
                 </div>
                 <button
                   onClick={handleCopyText}
                   className={cn(
                     "absolute top-3 right-3 p-2 transition-all border rounded-lg",
                     copiedText
                       ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/30"
                       : "text-muted-foreground hover:text-primary bg-muted border-border"
                   )}
                   title={copiedText ? "Copied!" : "Copy creative text"}
                 >
                   {copiedText ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                 </button>
               </div>
               <div className="flex flex-col gap-3 min-w-[200px]">
                  <div className="flex-1 px-5 py-4 rounded-[14px] bg-[#e6f8ef] dark:bg-emerald-500/10 border border-[#00b87c]/30 dark:border-emerald-500/20 flex flex-col justify-center shadow-sm">
                     <span className="text-[10px] font-bold text-[#00b87c] dark:text-emerald-400 uppercase tracking-wider">Score</span>
                     <div className="text-4xl font-black font-sans text-[#00b87c] dark:text-emerald-400 tracking-tight mt-1">
                       {score}
                       <span className="text-[14px] opacity-50 font-semibold ml-1 tracking-normal">/10</span>
                     </div>
                  </div>
                  <div className="flex-1 px-5 py-4 rounded-[14px] bg-[#f0f5ff] dark:bg-blue-500/10 border border-[#3b82f6]/30 dark:border-blue-500/20 flex flex-col justify-center shadow-sm">
                     <span className="text-[10px] font-bold text-[#3b82f6] dark:text-blue-400 uppercase tracking-wider">Tier</span>
                     <div className="text-2xl font-black font-sans text-[#3b82f6] dark:text-blue-400 tracking-tight uppercase mt-1">
                       {tier}
                     </div>
                  </div>
               </div>
            </div>
            );
          })()}

        </section>

        {/* ── REGENERATE DIALOG — Right-side panel ── */}
        {isRegenDialogOpen && typeof document !== "undefined" && createPortal(
          <div className="fixed inset-0 z-[200] flex" onClick={() => setIsRegenDialogOpen(false)}>
            <div className="flex-1 bg-black/40 backdrop-blur-sm" />
            <div 
              className="w-full max-w-md h-[100dvh] bg-card border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 ml-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Regenerate Creative</h3>
                    <p className="text-[10px] text-muted-foreground">Enter new requirements</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsRegenDialogOpen(false)}
                  className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center hover:bg-destructive/10 hover:border-destructive/30 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* New Requirements Input — placed at top */}
                <div className="px-5 py-4 space-y-3">
                  <h4 className="text-[10px] font-semibold text-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-primary" /> New Requirements
                  </h4>
                  <textarea
                    value={regenPrompt}
                    onChange={(e) => setRegenPrompt(e.target.value)}
                    placeholder="Describe what should change in the regenerated creative..."
                    className="w-full h-32 bg-muted/20 border border-border rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all placeholder:opacity-40 resize-none text-foreground leading-relaxed"
                    autoFocus
                  />
                  <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-blue-400/70 leading-relaxed">
                      The creative will regenerate based on your new input without losing previous context.
                    </p>
                  </div>

                  {/* Generate Button — right after input */}
                  <button
                    onClick={() => { setIsRegenDialogOpen(false); handleRegenerate(); }}
                    disabled={!regenPrompt.trim()}
                    className="w-full h-11 bg-blue-600/10 text-blue-600 dark:bg-blue-600 dark:text-white border border-blue-600/20 dark:border-none rounded-xl font-bold text-[13px] tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 hover:opacity-90 shadow-xl cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-white" /> Generate
                  </button>
                </div>

                {/* Previous Inputs — below */}
                {previousInputs.length > 0 && (
                  <div className="px-5 py-4 border-t border-border/50 space-y-3">
                    <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Previous Requirements
                    </h4>
                    <div className="space-y-2">
                      {previousInputs.map((input, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-1 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-semibold text-primary/70 uppercase tracking-wider">Input #{idx + 1}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {new Date(input.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-foreground/80 leading-relaxed">{input.prompt}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* ── HISTORY PANEL — Full overlay ── */}
        {isHistoryOpen && (
          <div id="history-modal" className="fixed inset-0 z-[200] bg-background flex flex-col overflow-hidden animate-in fade-in duration-300">
            <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between shrink-0 bg-background z-50 gap-4 sticky top-0">
              
              <div className="flex items-center justify-between w-full sm:w-auto">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <BookOpen className="w-4.5 h-4.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">Creative History</h2>
                    <p className="text-[10px] text-muted-foreground">{totalHistoryItems} creatives saved</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsHistoryOpen(false)}
                  className="sm:hidden h-9 px-4 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 flex items-center gap-2 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all cursor-pointer group shadow-sm hover:shadow-md"
                >
                  <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400 transition-transform duration-300" />
                  <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400">Back</span>
                </button>
              </div>

              {/* History Search Overlay */}
              <div className="w-full sm:flex-1 max-w-md sm:px-10 order-last sm:order-none">
                <div className="relative group">
                  <History className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input 
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search by Creative ID or Headline..."
                    className="w-full h-11 bg-zinc-100 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/10 rounded-2xl pl-10 pr-4 text-xs outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 focus:bg-white dark:focus:bg-zinc-900/80 transition-all placeholder:text-muted-foreground/50"
                  />
                  {historySearchQuery && (
                    <button 
                      onClick={() => setHistorySearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="hidden sm:flex h-9 px-4 rounded-xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 items-center gap-2 hover:bg-zinc-200 dark:hover:bg-white/10 transition-all cursor-pointer group shadow-sm hover:shadow-md"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-600 dark:text-zinc-400 group-hover:-translate-x-1.5 transition-transform duration-300" />
                <span className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white">Back</span>
              </button>
            </div>
            


            {/* History List */}
            <div id="history-scroll-container" className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-4 md:p-6 relative flex flex-col scroll-smooth">
              {isHistoryLoading && historyEntries.length === 0 ? (
                <div className="flex items-center justify-center h-40">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[11px] text-muted-foreground">Loading history...</span>
                  </div>
                </div>
              ) : historyEntries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center min-h-[600px] text-center px-4 animate-in fade-in zoom-in duration-700">
                     <div className="w-28 h-28 mb-8 relative animate-float">
                      <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-20" />
                      <div className="absolute -inset-4 bg-primary/10 rounded-full blur-2xl animate-pulse opacity-20" />
                      <div className="relative z-10 w-full h-full flex items-center justify-center bg-zinc-900 border border-white/10 rounded-full shadow-2xl">
                        <History className="w-12 h-12 text-primary/70" />
                      </div>
                    </div>
                    <h3 className="text-3xl font-black bg-gradient-to-b from-zinc-900 to-zinc-500 dark:from-white dark:to-white/40 bg-clip-text text-transparent mb-4 tracking-tighter uppercase">
                      {historySearchQuery ? "No Matching Results" : "History Empty"}
                    </h3>
                    <p className="text-sm text-zinc-500 max-w-sm leading-relaxed mb-10 font-medium">
                      {historySearchQuery 
                        ? <>No neural matches found for <span className="text-primary font-bold italic">"{historySearchQuery}"</span>. Refine your query or check for typos in the creative ID.</>
                        : "Your creative vault is awaiting its first entry. Start generating to build your library."}
                    </p>
                    {historySearchQuery && (
                      <button 
                        onClick={() => setHistorySearchQuery("")}
                        className="h-12 px-10 bg-primary text-primary-foreground rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all active:scale-95 flex items-center gap-2 group"
                      >
                        <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" /> Reset Search Engine
                      </button>
                    )}
                  </div>
              ) : (
                <div className="w-full relative">
                  {isHistoryLoading && (
                    <div className="absolute inset-0 z-20 bg-background/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                      <div className="flex flex-col items-center justify-center gap-3 bg-card/80 p-4 rounded-xl shadow-lg border border-border">
                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-[10px] font-semibold text-muted-foreground">Loading...</span>
                      </div>
                    </div>
                  )}
                  <div className="w-full max-w-[1600px] mx-auto">
                    <div className="rounded-2xl border border-border bg-card shadow-sm">
                      <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                          <thead>
                          <tr className="border-b border-border bg-muted/40">
                            <th className="px-3 md:px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16 md:w-28 text-center md:text-left">Preview</th>
                            <th className="px-3 md:px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground max-w-[200px] md:max-w-[300px]">Creative Detail</th>
                            <th className="px-3 md:px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground hidden md:table-cell">Requirements</th>
                            <th className="px-3 md:px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-16 md:w-20 text-center">Score</th>
                            <th className="px-3 md:px-6 py-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-24 md:w-32">Date</th>

                          </tr>
                        </thead>
                        <tbody>
                          {displayedHistory.map((entry: any, idx: number) => (
                            <tr 
                              key={entry.creativeId || idx}
                              className="border-b border-border/50 transition-colors"
                            >
                              <td className="px-3 md:px-6 py-2.5 md:py-4">
                                <div 
                                  className="w-10 h-10 md:w-16 md:h-16 rounded-lg md:rounded-xl overflow-hidden bg-muted/30 relative shrink-0 border border-border/50 cursor-pointer group/preview mx-auto md:mx-0"
                                  onClick={() => {
                                    const rawUrl = entry.result?.imageUrl || entry.imageUrl || "";
                                    if (rawUrl) {
                                      setPreviewImagePopup({ 
                                        url: rawUrl, 
                                        title: entry.headline || "Creative Preview" 
                                      });
                                    }
                                  }}
                                >
                                  {(entry.result?.imageUrl || entry.imageUrl) ? (
                                    <img src={entry.result?.imageUrl || entry.imageUrl} alt="thumbnail" className="w-full h-full object-cover" />
                                  ) : (
                                    <ImageIcon className="w-4 h-4 text-muted-foreground/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                  )}
                                  
                                  {/* Plus Icon On Hover */}
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity">
                                    <Plus className="w-6 h-6 text-white" />
                                  </div>
                                  
                                  {entry.parentId && (
                                     <div className="absolute top-1 left-1 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-card animate-pulse shadow-sm" title="Refined Version" />
                                  )}
                                </div>
                              </td>
                              <td className="px-3 md:px-6 py-2.5 md:py-4">
                                <div className="flex flex-col gap-1 md:gap-1.5 max-w-[200px] md:max-w-[280px]">
                                  <h3 className="text-[13px] font-black leading-tight text-foreground uppercase tracking-tight line-clamp-2">
                                    {entry.headline || 'Direct Response Creative'}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded-md border border-border text-[9px] font-mono text-muted-foreground flex items-center gap-1 bg-muted/20">
                                      ID: {(entry.creativeId || '').slice(-6)}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-[9px] font-black text-primary uppercase tracking-wider">
                                      {entry.tab || 'custom'}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 md:px-6 py-2.5 md:py-4 hidden md:table-cell max-w-[400px]">
                                {entry.prompt ? (
                                  <p className="text-[11px] text-muted-foreground/80 italic leading-relaxed line-clamp-2">
                                    "{entry.prompt}"
                                  </p>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/30">No requirements specified</span>
                                )}
                              </td>
                              <td className="px-3 md:px-6 py-2.5 md:py-4 text-center">
                                {entry.score ? (
                                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mx-auto">
                                    <span className="text-[13px] font-black text-emerald-500">{entry.score}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/30">-</span>
                                )}
                              </td>
                              <td className="px-3 md:px-6 py-2.5 md:py-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[11px] text-foreground font-bold tracking-tight">
                                    {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                                  </span>
                                  <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-tighter">
                                    {entry.createdAt ? new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                  </span>
                                </div>
                              </td>

                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                  {/* Pagination */}
                  {totalHistoryPages > 1 && (
                    <div className="flex flex-col sm:flex-row items-center sm:justify-end gap-4 sm:gap-6 mt-6 pt-6 pb-6 max-w-[1600px] mx-auto w-full px-4 sm:px-6">
                       <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setHistoryPage(p => Math.max(1, p - 1));
                              document.getElementById('history-scroll-container')?.scrollTo({ top: 0, behavior: 'auto' });
                            }}
                            disabled={historyPage === 1}
                            className="h-11 w-11 flex items-center justify-center rounded-2xl border border-border bg-card hover:bg-muted disabled:opacity-20 transition-all active:scale-90"
                          >
                            <ChevronLeftIcon className="w-5 h-5" />
                          </button>
                          <div className="flex items-center gap-1.5 px-2">
                             {Array.from({ length: totalHistoryPages }, (_, i) => i + 1).map(p => (
                               <button
                                 key={p}
                                 onClick={() => {
                                   setHistoryPage(p);
                                   document.getElementById('history-scroll-container')?.scrollTo({ top: 0, behavior: 'auto' });
                                 }}
                                 className={cn(
                                   "w-11 h-11 rounded-2xl text-[13px] font-black transition-all hover:scale-105 active:scale-95",
                                   historyPage === p 
                                     ? "bg-primary text-primary-foreground shadow-[0_10px_20px_-5px_rgba(59,130,246,0.3)]" 
                                     : "bg-muted/40 text-muted-foreground hover:bg-zinc-200 dark:hover:bg-zinc-800"
                                 )}
                               >
                                 {p}
                               </button>
                             ))}
                          </div>
                          <button
                            onClick={() => {
                              setHistoryPage(p => Math.min(totalHistoryPages, p + 1));
                              document.getElementById('history-scroll-container')?.scrollTo({ top: 0, behavior: 'auto' });
                            }}
                            disabled={historyPage === totalHistoryPages}
                            className="h-11 w-11 flex items-center justify-center rounded-2xl border border-border bg-card hover:bg-muted disabled:opacity-20 transition-all active:scale-90"
                          >
                            <ChevronRightIcon className="w-5 h-5" />
                          </button>
                       </div>
                       <div className="h-11 px-6 flex items-center rounded-2xl bg-muted/20 border border-border/10 text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                          Page {historyPage} of {totalHistoryPages} • {totalHistoryItems} Items Total
                       </div>
                    </div>
                  )}

                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {/* Global Image Popup Modal - Using Portal for viewport stability */}
        {previewImagePopup && typeof document !== 'undefined' && createPortal(
          <EnlargedImageModal 
            url={previewImagePopup.url}
            title={previewImagePopup.title || "Ad Preview"}
            id={previewImagePopup.id}
            onClose={() => setPreviewImagePopup(null)}
          />,
          document.body
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
         .custom-scrollbar::-webkit-scrollbar-thumb {
           background: var(--border);
           border-radius: 10px;
         }
         .custom-scrollbar::-webkit-scrollbar-thumb:hover {
           background: var(--muted-foreground);
         }
         @keyframes float {
           0%, 100% { transform: translateY(0); }
           50% { transform: translateY(-12px); }
         }
         .animate-float {
           animation: float 4s ease-in-out infinite;
         }
      `}</style>
    </div>
  )
}
