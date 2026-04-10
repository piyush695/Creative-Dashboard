"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
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
  ThumbsUp,
  ThumbsDown,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  History,
  Save,
  Bookmark,
  Clock,
  Loader2,
  RefreshCcw,
  Pause,
  Play
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
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

interface CreativeStudioViewProps {
  onClose?: () => void
  onHistoryChange?: (isOpen: boolean) => void
  initialPrompt?: string;
  initialResult?: any;
  initialTab?: string;
  initialGenOptions?: any;
}

type ViewportMode = 'standby' | 'ad-details' | 'loading' | 'complete'
type TopAdsStep = 'aspects' | 'generate' | 'results'

export default function CreativeStudioView({ onClose, onHistoryChange, initialPrompt, initialResult, initialTab, initialGenOptions }: CreativeStudioViewProps) {
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
  }>>({
    custom: { mode: 'standby', isGenerating: false, result: null, progress: 0, prompt: "" },
    'top-ads': { mode: 'standby', isGenerating: false, result: null, progress: 0, prompt: "" },
    studio: { mode: 'standby', isGenerating: false, result: null, progress: 0, prompt: "" },
    'ad-library': { mode: 'standby', isGenerating: false, result: null, progress: 0, prompt: "" }
  })

  // Prepopulate if props provided (from History page Regenerate CTA)
  // Restores the exact tab and state from the original generation
  useEffect(() => {
    if (initialPrompt || initialResult) {
      // Determine the correct tab to restore (default to 'custom' if not specified)
      const targetTab = initialTab || 'custom';
      
      // Switch to the original tab where the creative was generated
      setActiveMainTab(targetTab);
      
      // Restore full state for that tab: prompt, result, mode, and generationOptions
      updateTabState(targetTab, { 
        prompt: initialPrompt || "", 
        result: initialResult || null,
        mode: initialResult ? 'complete' : 'standby',
        generationOptions: initialGenOptions || undefined,
      });
      if (initialResult) setSelectedVariantIdx(0);

      // For top-ads tab, jump to results step so user sees the generated creative
      if (targetTab === 'top-ads' && initialResult) {
        setTopAdsStep('results');
      }
    }
  }, [initialPrompt, initialResult, initialTab, initialGenOptions]);

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
  const [previewImagePopup, setPreviewImagePopup] = useState<{ url: string; title: string } | null>(null)
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0)
  const [feedbackState, setFeedbackState] = useState<Record<string, 'like' | 'dislike' | null>>({})
  const [isLearning, setIsLearning] = useState(false)

  // ── History & Previous Creatives ──
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyEntries, setHistoryEntries] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [previousCreatives, setPreviousCreatives] = useState<any[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [regenerateConfirm, setRegenerateConfirm] = useState<{ prompt: string; result?: any; tab: string; newRequirement?: string } | null>(null)

  // ── Ad Library State ──
  const [adLibraryAds, setAdLibraryAds] = useState<any[]>([])
  const [adLibraryLoading, setAdLibraryLoading] = useState(false)
  const [adLibrarySource, setAdLibrarySource] = useState<'own' | 'competitor'>('own')
  const [adLibrarySearch, setAdLibrarySearch] = useState('')
  const [brandDNA, setBrandDNA] = useState<any>(null)
  const [brandDNALoading, setBrandDNALoading] = useState(false)
  const [knownCompetitors, setKnownCompetitors] = useState<{ name: string; pageId?: string }[]>([])

  const [creatives, setCreatives] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null)
  const [fullData, setFullData] = useState<Record<string, any>>({})
  const [selectedAspects, setSelectedAspects] = useState<Record<string, any>>({})
  
  const [latestResults, setLatestResults] = useState<Record<string, any>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  
  const totalPages = Math.ceil(creatives.length / itemsPerPage)
  const displayedCreatives = creatives.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const generationInterval = useRef<NodeJS.Timeout | null>(null)
  const pausedTabsRef = useRef<Set<string>>(new Set())
  const [_, forceUpdate] = useState({})

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

  // ── Auto-save generated creative to history DB ──
  const autoSaveToHistory = async (tab: string, result: any) => {
    try {
      const creativeId = `creative-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const primaryVariant = (result.variants || []).find((v: any) => v.imageUrl) || {}
      await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 'save-history',
          creativeId,
          tab,
          prompt: tabStates[tab]?.prompt || '',
          generationOptions: tabStates[tab]?.generationOptions || {},
          result,
          imageUrl: primaryVariant.imageUrl || result.imageUrl || null,
        })
      })
      console.log('[Studio] Creative auto-saved to history:', creativeId)
    } catch (err) {
      console.warn('[Studio] Auto-save to history failed (non-blocking):', err)
    }
  }

  // ── Fetch history from database ──
  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const res = await fetch("/api/history-lite")
      const data = await res.json()
      setHistoryEntries(data.history || [])
    } catch (err) {
      console.error("Failed to load history", err)
      toast.error("Failed to load history")
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // ── Manual save to saved_creative collection ──
  const handleManualSave = async (result: any) => {
    if (!result) return
    setIsSaving(true)
    try {
      const creativeId = `saved-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const primaryVariant = (result.variants || []).find((v: any) => v.imageUrl) || {}
      const res = await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 'save-creative',
          creativeId,
          tab: activeMainTab,
          prompt: currentTabState.prompt,
          generationOptions: currentTabState.generationOptions || {},
          result,
          imageUrl: primaryVariant.imageUrl || result.imageUrl || null,
        })
      })
      const data = await res.json()
      if (data.success) {
        setSavedIds(prev => new Set([...prev, creativeId]))
        toast.success("Creative saved to vault!")
      } else {
        throw new Error(data.error || "Save failed")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save creative")
    } finally {
      setIsSaving(false)
    }
  }

  // ── Toggle history panel ──
  const toggleHistory = () => {
    const next = !isHistoryOpen
    setIsHistoryOpen(next)
    onHistoryChange?.(next)
    if (next) fetchHistory()
  }

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
          recommendations: (data.recommendations || []).map((_: any, i: number) => i),
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
    
    // Notify API about selection change if needed
    fetch("/api/studio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: 'selection-change',
        adId,
        selected: !selectedIds.includes(adId)
      })
    }).catch(err => console.warn("Failed to notify selection change", err))
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

  const handleGenerate = async (optionsOverride?: any, promptOverride?: string) => {
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
    
    let cur = 0
    if (generationInterval.current) clearInterval(generationInterval.current)
    generationInterval.current = setInterval(() => {
      if (pausedTabsRef.current.has(targetTab)) return
      
      // Extremely smooth and slow progress updating every 80ms
      // Designed to never 'feel' stuck but move very gradually
      let increment = 0
      if (cur < 30) {
        increment = Math.random() * 0.4 + 0.2 // Initial momentum
      } else if (cur < 60) {
        increment = Math.random() * 0.15 + 0.05
      } else if (cur < 85) {
        increment = Math.random() * 0.05 + 0.02
      } else if (cur < 95) {
        increment = Math.random() * 0.02 + 0.005
      } else {
        increment = 0.001 // Micro-crawl to keep it 'alive'
      }
      
      cur = Math.min(cur + increment, 99.9)
      updateTabState(targetTab, { progress: cur })
    }, 80)

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
        body: JSON.stringify({
          ...body,
          prompt: promptOverride || body.prompt
        })
      })
      
      const data = await response.json()
      
      if (generationInterval.current) clearInterval(generationInterval.current)
      updateTabState(targetTab, { progress: 100 })
      
      setTimeout(() => {
        if (data.creative) {
          // Move current creative (if any) to history before showing the new one
          if (currentTabState.result) {
            const oldRes = currentTabState.result;
            const oldPrimaryVariant = (oldRes.variants || []).find((v: any) => v.imageUrl) || {}
            setPreviousCreatives(prev => [{
              id: `creative-${Date.now()}`,
              tab: targetTab,
              prompt: currentTabState.prompt,
              imageUrl: oldPrimaryVariant.imageUrl || oldRes.imageUrl,
              headline: oldRes.copywriting?.headline?.primary || oldRes.creativeConcept?.title || 'Creative',
              score: oldRes.creativeConcept?.targetScore || oldPrimaryVariant.score?.overall || null,
              createdAt: new Date().toISOString(),
              result: oldRes,
            }, ...prev].slice(0, 30))
          }

          setSelectedVariantIdx(0)
          setLatestResults(prev => ({ ...prev, [targetTab]: data.creative }))
          updateTabState(targetTab, { 
            result: data.creative, 
            mode: "complete", 
            isGenerating: false 
          })
          // Auto-save to history database
          autoSaveToHistory(targetTab, data.creative)
        } else {
          throw new Error(data.error || "Generation failed")
        }
      }, 500)

    } catch (err: any) {
      if (generationInterval.current) clearInterval(generationInterval.current)
      updateTabState(targetTab, { isGenerating: false, mode: targetTab === 'top-ads' ? 'ad-details' : 'standby' })
      if (targetTab === 'top-ads') setTopAdsStep('generate')
      toast.error(err.message || "Generation failed")
    }
  }

  const cancelProcess = () => {
    if (generationInterval.current) clearInterval(generationInterval.current)
    updateTabState(activeMainTab, { isGenerating: false, mode: 'standby', progress: 0 })
    if (activeMainTab === 'top-ads') {
      setTopAdsStep('aspects')
      setSelectedIds([])
      setPreviewUrl(null)
      setCurrentPreviewId(null)
    }
  }

  const handleFeedback = async (variantId: string, feedback: 'like' | 'dislike') => {
    const r = currentTabState.result
    if (!r) return

    const variant = (r.variants || []).find((v: any) => v.id === variantId)
    const prev = feedbackState[variantId]
    // Toggle off if same feedback clicked again
    if (prev === feedback) {
      setFeedbackState(s => ({ ...s, [variantId]: null }))
      return
    }

    setFeedbackState(s => ({ ...s, [variantId]: feedback }))
    setIsLearning(true)
    setTimeout(() => setIsLearning(false), 3000)

    try {
      await fetch("/api/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: 'feedback',
          generationId: r.generationId || '',
          variantId,
          feedback,
          variantMeta: {
            label: variant?.label || variantId,
            psychologyFramework: variant?.id || '',
            colorPalette: r.visualDesign?.colorPalette || undefined,
            layoutType: r.visualDesign?.layout || undefined,
            headline: r.copywriting?.headline?.primary || undefined,
            tone: r.tone || undefined,
            score: variant?.score?.overall || undefined,
          }
        })
      })
      toast.success(feedback === 'like' ? 'Preference saved — will generate more like this' : 'Noted — will avoid this style')
    } catch {
      toast.error("Failed to save feedback")
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden font-sans select-none" suppressHydrationWarning>
      
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
              <button onClick={() => setActiveMainTab("studio")} className={cn("flex-1 sm:flex-none px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all", activeMainTab === "studio" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>Studio</button>
              <button onClick={() => setActiveMainTab("ad-library")} className={cn("flex-1 sm:flex-none px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-md transition-all", activeMainTab === "ad-library" ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Ad Library
                </span>
              </button>
            </div>
            <button 
              onClick={toggleHistory}
              className={cn(
                "px-3 py-1.5 text-[10px] sm:text-[11px] font-semibold rounded-lg transition-all flex items-center gap-1.5 border",
                isHistoryOpen 
                  ? "bg-blue-600 text-white border-blue-500 shadow-sm" 
                  : "bg-white/[0.04] text-muted-foreground hover:text-foreground border-white/[0.06]"
              )}
            >
              <History className="w-3 h-3" />
              History
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
        <main className="flex-1 flex flex-col md:flex-row overflow-hidden w-full relative min-h-0">
        
        {/* Sidebar — Hidden for Top Ads */}
        <aside className={cn(
          "w-full md:w-[300px] border-b md:border-b-0 md:border-r border-border flex flex-col bg-card/50 transition-all duration-300 z-40 shrink-0",
          // Only hide automatically for Top Ads if no history
          activeMainTab === 'top-ads' && previousCreatives.length === 0 && "hidden"
        )}>
          <div className="p-4 shrink-0 border-b border-white/[0.04]">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider">
                {currentTabState.mode === 'complete' ? (
                  <>
                    <History className="w-3 h-3 text-blue-400" />
                    Visual History
                  </>
                ) : (
                  <>
                    <LayoutGrid className="w-3 h-3" />
                    {activeMainTab === "studio" ? "Synthesis Assets" : "Neural Context"}
                  </>
                )}
              </h2>
              {currentTabState.mode === 'complete' && latestResults[activeMainTab] && currentTabState.result !== latestResults[activeMainTab] && (
                <button 
                  onClick={() => {
                    updateTabState(activeMainTab, { result: latestResults[activeMainTab] });
                    setSelectedVariantIdx(0);
                  }}
                  className="px-2 py-1 bg-blue-600/10 text-blue-400 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all animate-in fade-in slide-in-from-right-1 duration-300"
                >
                  View Latest
                </button>
              )}
            </div>
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
                  className="w-full flex-1 min-h-[120px] bg-muted/20 border border-border rounded-xl p-4 text-sm outline-none focus:ring-1 focus:ring-primary/30 transition-all leading-relaxed placeholder:opacity-30 custom-scrollbar resize-none text-foreground/80"
                />
              </div>
            )}

            {/* Generated Output History List in Sidebar */}
              <div className={cn(
                "mt-4 pt-4 border-t border-white/[0.04]",
                currentTabState.mode === 'complete' && "mt-0 pt-0 border-t-0"
              )}>
                {previousCreatives.length > 0 && currentTabState.mode !== 'complete' && (
                  <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <History className="w-3 h-3" /> Generation Archive
                  </h3>
                )}
                <div className="flex flex-col gap-2">
                  {previousCreatives
                    .filter(item => activeMainTab === 'top-ads' || item.tab === activeMainTab)
                    .map((item, idx) => (
                    <div 
                      key={item.id || idx} 
                      className={cn(
                        "group p-2.5 rounded-xl border transition-all cursor-pointer mb-2",
                        currentTabState.result === item.result 
                          ? "bg-primary/10 border-primary/30 shadow-sm" 
                          : "bg-muted/30 border-border hover:bg-muted/50 hover:border-primary/20"
                      )}
                      onClick={() => {
                        updateTabState(activeMainTab, { prompt: item.prompt });
                        if (item.result) {
                          updateTabState(activeMainTab, { result: item.result, mode: 'complete', progress: 100 });
                          setSelectedVariantIdx(0);
                        }
                      }}
                    >
                       <div className="flex items-center gap-3 min-w-0">
                         {item.imageUrl && (
                           <div className="w-10 h-10 rounded-lg shrink-0 bg-muted overflow-hidden border border-border shadow-sm">
                             <img src={item.imageUrl} className="w-full h-full object-cover" alt="" />
                           </div>
                         )}
                         <div className="min-w-0">
                           <p className="text-[11px] font-bold text-foreground truncate max-w-[140px] leading-tight">{item.headline}</p>
                           <p className="text-[9px] text-muted-foreground truncate max-w-[140px] mt-0.5">{item.prompt}</p>
                         </div>
                       </div>
                       <button
                         onClick={(e) => {
                           e.stopPropagation();
                           setRegenerateConfirm({ prompt: item.prompt, result: item.result, tab: activeMainTab });
                         }}
                         className="opacity-0 group-hover:opacity-100 p-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white rounded-lg transition-all shrink-0 ml-2 shadow-inner"
                         title="Regenerate"
                       >
                         <Zap className="w-3.5 h-3.5" />
                       </button>
                    </div>
                  ))}
                </div>
              </div>
            
            {/* ── Ad Library Tab ── */}
            {activeMainTab === "ad-library" && (
              <div className="flex-1 space-y-3 animate-in slide-in-from-bottom-2 flex flex-col h-full min-h-0 overflow-y-auto custom-scrollbar">
                {/* Source Toggle */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setAdLibrarySource('own')}
                    className={cn("flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-md transition-all border", adLibrarySource === 'own' ? "bg-blue-600/20 text-blue-400 border-blue-500/30" : "bg-muted/10 text-muted-foreground border-white/[0.06]")}
                  >Our Ads</button>
                  <button
                    onClick={() => setAdLibrarySource('competitor')}
                    className={cn("flex-1 px-2 py-1.5 text-[10px] font-semibold rounded-md transition-all border", adLibrarySource === 'competitor' ? "bg-orange-600/20 text-orange-400 border-orange-500/30" : "bg-muted/10 text-muted-foreground border-white/[0.06]")}
                  >Competitors</button>
                </div>

                {/* Search / Fetch Controls */}
                {adLibrarySource === 'competitor' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={adLibrarySearch}
                      onChange={(e) => setAdLibrarySearch(e.target.value)}
                      placeholder="Search competitor (e.g. FTMO, Funded Next)..."
                      className="w-full bg-muted/20 border border-border rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-primary/30 text-foreground"
                    />
                    {/* Quick competitor chips */}
                    <div className="flex flex-wrap gap-1">
                      {['FTMO', 'Funded Next', 'The Funded Trader', 'Topstep', 'E8 Funding'].map(name => (
                        <button
                          key={name}
                          onClick={() => { setAdLibrarySearch(name); }}
                          className="px-2 py-0.5 bg-muted/20 text-[9px] rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all border border-white/[0.04]"
                        >{name}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fetch Button */}
                <button
                  disabled={adLibraryLoading || (adLibrarySource === 'competitor' && !adLibrarySearch)}
                  onClick={async () => {
                    setAdLibraryLoading(true);
                    setAdLibraryAds([]);
                    try {
                      const endpoint = adLibrarySource === 'own'
                        ? '/api/adlibrary?action=own&limit=25'
                        : `/api/adlibrary?action=competitor&q=${encodeURIComponent(adLibrarySearch)}&limit=15`;
                      const res = await fetch(endpoint);
                      const data = await res.json();
                      if (data.error) {
                        toast.error(data.error);
                      } else {
                        setAdLibraryAds(data.ads || []);
                        toast.success(`Found ${data.totalCount || 0} ads from ${adLibrarySource === 'own' ? 'Hola Prime' : adLibrarySearch}`);
                      }
                    } catch (err: any) {
                      toast.error('Failed to fetch ads: ' + err.message);
                    } finally {
                      setAdLibraryLoading(false);
                    }
                  }}
                  className="w-full h-9 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg font-semibold text-[11px] flex items-center justify-center gap-2 transition-all disabled:opacity-40 shrink-0"
                >
                  {adLibraryLoading ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Fetching from Meta...
                    </>
                  ) : (
                    <>
                      <Database className="w-3.5 h-3.5" />
                      {adLibrarySource === 'own' ? 'Fetch Hola Prime Ads' : `Search "${adLibrarySearch || '...'}"`}
                    </>
                  )}
                </button>

                {/* Brand DNA Extract Button */}
                {adLibrarySource === 'own' && (
                  <button
                    disabled={brandDNALoading}
                    onClick={async () => {
                      setBrandDNALoading(true);
                      try {
                        const res = await fetch('/api/adlibrary?action=brand-dna');
                        const data = await res.json();
                        if (data.error) {
                          toast.error(data.error);
                        } else {
                          setBrandDNA(data.brandDNA);
                          toast.success(`Brand DNA extracted from ${data.adsSummary?.totalAds || 0} ads!`);
                        }
                      } catch (err: any) {
                        toast.error('Failed to extract Brand DNA: ' + err.message);
                      } finally {
                        setBrandDNALoading(false);
                      }
                    }}
                    className="w-full h-9 bg-gradient-to-r from-purple-600/80 to-pink-600/80 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold text-[11px] flex items-center justify-center gap-2 transition-all disabled:opacity-40 shrink-0"
                  >
                    {brandDNALoading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Extracting Brand DNA...
                      </>
                    ) : (
                      <>
                        <Brain className="w-3.5 h-3.5" />
                        {brandDNA ? '✓ Brand DNA Loaded — Refresh' : 'Extract Brand DNA'}
                      </>
                    )}
                  </button>
                )}

                {/* Brand DNA Summary */}
                {brandDNA && adLibrarySource === 'own' && (
                  <div className="bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/20 rounded-lg p-3 space-y-2">
                    <h4 className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">🧬 Brand DNA Active</h4>
                    <div className="space-y-1.5">
                      <div className="text-[10px] text-zinc-400">
                        <span className="text-zinc-500">Colors:</span>{' '}
                        <span className="text-foreground/70">{brandDNA.colorPalette?.primary}, {brandDNA.colorPalette?.secondary}, {brandDNA.colorPalette?.accent}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        <span className="text-zinc-500">Style:</span>{' '}
                        <span className="text-foreground/70">{brandDNA.visualStyle?.overallAesthetic}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        <span className="text-zinc-500">Tone:</span>{' '}
                        <span className="text-foreground/70">{brandDNA.copyPatterns?.toneOfVoice}</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        <span className="text-zinc-500">Maturity:</span>{' '}
                        <span className="text-foreground/70">{brandDNA.consistency?.brandMaturityLevel}</span>
                      </div>
                    </div>
                    <p className="text-[9px] text-green-400/70 mt-1">✓ This DNA is auto-injected into all creative generations</p>
                  </div>
                )}

                {/* Ad List */}
                {adLibraryAds.length > 0 && (
                  <div className="space-y-2 flex-1">
                    <h4 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{adLibraryAds.length} Ads Found</h4>
                    <div className="space-y-1.5">
                      {adLibraryAds.slice(0, 20).map((ad: any, idx: number) => (
                        <div key={ad.id || idx} className="bg-muted/10 border border-white/[0.04] rounded-lg p-2.5 space-y-1.5 hover:border-white/[0.08] transition-all">
                          <div className="flex items-center justify-between">
                            <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", ad.isActive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400")}>
                              {ad.isActive ? '🟢 ACTIVE' : '🔴 STOPPED'}
                            </span>
                            <span className="text-[9px] text-zinc-500">{ad.daysRunning || 0}d running</span>
                          </div>
                          {ad.ad_creative_link_titles?.[0] && (
                            <p className="text-[11px] text-foreground/80 font-medium leading-tight">{ad.ad_creative_link_titles[0]}</p>
                          )}
                          {ad.ad_creative_bodies?.[0] && (
                            <p className="text-[10px] text-zinc-400 leading-snug line-clamp-2">{ad.ad_creative_bodies[0]}</p>
                          )}
                          <div className="flex items-center gap-2 text-[9px] text-zinc-500">
                            {ad.publisher_platforms && <span>{ad.publisher_platforms.join(', ')}</span>}
                            {ad.spend && <span>Spend: ${ad.spend.lower_bound}-${ad.spend.upper_bound}</span>}
                          </div>
                          {ad.ad_snapshot_url && (
                            <a href={ad.ad_snapshot_url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-400 hover:underline">View Snapshot →</a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!adLibraryLoading && adLibraryAds.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-6">
                    <Database className="w-8 h-8 text-zinc-600" />
                    <p className="text-[11px] text-zinc-500 max-w-[200px]">
                      Fetch ads from Meta Ad Library to analyze brand patterns and competitor intelligence
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Restored sidebar Generate CTA for Custom and Studio tabs */}
          {(activeMainTab === 'custom' || activeMainTab === 'studio') && (
            <div className="p-4 border-t border-white/[0.04] shrink-0">
              <button 
                disabled={currentTabState.isGenerating}
                onClick={() => {
                  if (currentTabState.mode === 'complete') {
                    setRegenerateConfirm({ 
                      prompt: currentTabState.prompt, 
                      tab: activeMainTab,
                      result: currentTabState.result 
                    })
                  } else {
                    handleGenerate()
                  }
                }}
                className="w-full h-10 bg-primary text-primary-foreground rounded-lg font-semibold text-[11px] tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 hover:opacity-90 shadow-lg group"
              >
                {currentTabState.isGenerating ? "Processing..." : "Generate"}
                <Sparkles className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}
        </aside>

        {/* Viewport */}
        <section 
          ref={scrollRef}
          className="flex-1 bg-background relative flex flex-col min-w-0 min-h-0 overflow-y-auto custom-scrollbar scroll-smooth"
        >
          
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.015] pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '60px 60px' }} 
          />

          {/* STANDBY MODE */}
          {currentTabState.mode === "standby" && (
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
                        <h2 className="text-2xl md:text-3xl font-black italic text-foreground uppercase tracking-tighter leading-none">
                          Winning <span className="text-blue-500">Library</span>
                        </h2>
                        <p className="text-[11px] text-zinc-500 font-medium max-w-sm hidden sm:block">
                          Select winning patterns to generate high-converting variations.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 lg:gap-4">
                        {/* selection & analyze - HIDDEN ON MOBILE HEADER, SHOWN ON DESKTOP */}
                        <div className={cn(
                          "hidden lg:flex items-center gap-3 bg-muted/50 backdrop-blur-xl px-3 py-2 rounded-2xl border border-border transition-all duration-500 shadow-xl overflow-hidden",
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
                          <div className="hidden lg:flex items-center bg-muted/50 backdrop-blur-xl p-1.5 rounded-2xl border border-border shadow-xl h-12">
                            <button
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              className={cn(
                                "size-9 rounded-xl flex items-center justify-center transition-all",
                                currentPage === 1 
                                  ? "text-muted-foreground cursor-not-allowed opacity-30" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90"
                              )}
                            >
                              <ChevronLeftIcon className="size-4" />
                            </button>
                            
                            <div className="px-4 flex items-center justify-center min-w-[60px]">
                              <span className="text-[11px] font-black text-foreground px-3 py-1.5 bg-primary/10 rounded-lg border border-primary/20 shadow-sm">
                                {currentPage < 10 ? `0${currentPage}` : currentPage}
                              </span>
                            </div>

                            <button
                              disabled={currentPage === totalPages}
                              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              className={cn(
                                "size-9 rounded-xl flex items-center justify-center transition-all",
                                currentPage === totalPages 
                                  ? "text-muted-foreground cursor-not-allowed opacity-30" 
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90"
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
                        <div className="flex items-center bg-white/[0.03] backdrop-blur-xl p-2 rounded-2xl border border-white/[0.08] shadow-2xl h-14">
                          <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            className={cn(
                              "size-10 rounded-xl flex items-center justify-center transition-all",
                              currentPage === 1 
                                ? "text-zinc-800 cursor-not-allowed opacity-50" 
                                : "text-zinc-400 hover:text-white"
                            )}
                          >
                            <ChevronLeftIcon className="size-5" />
                          </button>
                          
                          <div className="px-5 flex items-center justify-center min-w-[70px]">
                            <span className="text-[14px] font-black text-white px-4 py-2 bg-blue-600/10 rounded-lg border border-blue-500/20 shadow-[0_0_20px_rgba(37,99,235,0.1)]">
                              {currentPage < 10 ? `0${currentPage}` : currentPage}
                            </span>
                          </div>

                          <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            className={cn(
                              "size-10 rounded-xl flex items-center justify-center transition-all",
                              currentPage === totalPages 
                                ? "text-zinc-800 cursor-not-allowed opacity-50" 
                                : "text-zinc-400 hover:text-white"
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
            <div className="flex-1 flex flex-col animate-in fade-in duration-300 min-h-full">
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

              <div className="flex-1 p-3 md:p-6 overflow-y-auto custom-scrollbar">
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
                            onClick={() => toggleAdSelection(currentPreviewId)}
                            className={cn(
                              "absolute bottom-2 left-2 right-2 py-1.5 rounded-md text-[9px] font-semibold flex items-center justify-center gap-1 transition-all border backdrop-blur-md cursor-pointer active:scale-95 group/sel",
                              selectedIds.includes(currentPreviewId) 
                                ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-500/20" 
                                : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                            )}
                          >
                            {selectedIds.includes(currentPreviewId) ? "Selected" : "Select"}
                            <CheckCircle2 className={cn("w-3 h-3 transition-opacity", selectedIds.includes(currentPreviewId) ? "opacity-100" : "opacity-40 group-hover/sel:opacity-70")} />
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
                          <div className="flex items-center justify-between mb-3 px-1">
                            <h4 className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">DNA: Winning Elements</h4>
                            <span className="text-[10px] text-zinc-600">Toggle to include in brief</span>
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
                            <h4 className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider">AIDA Framework Flow</h4>
                            <span className="text-[10px] text-zinc-600">Select to include in strategy</span>
                          </div>
                          {Object.entries(fullData[currentPreviewId]?.aida || {}).map(([key, val]: any) => (
                            <div 
                              key={key} 
                              onClick={() => toggleAspect(currentPreviewId, "aida", key)}
                              className={cn(
                                "p-4 rounded-xl border transition-all cursor-pointer group/aida",
                                selectedAspects[currentPreviewId]?.aida?.includes(key)
                                  ? "bg-blue-500/8 border-blue-500/20"
                                  : "bg-muted/20 border-border text-muted-foreground hover:border-blue-500/20"
                              )}
                            >
                              <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className={cn("w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all", selectedAspects[currentPreviewId]?.aida?.includes(key) ? "bg-blue-500 border-blue-500" : "bg-white/5 border-white/[0.08]")}>
                                    <CheckCircle2 className={cn("w-2.5 h-2.5 text-white", selectedAspects[currentPreviewId]?.aida?.includes(key) ? "block" : "hidden")} />
                                  </div>
                                  <span className={cn("text-[11px] font-bold uppercase tracking-wider", selectedAspects[currentPreviewId]?.aida?.includes(key) ? "text-blue-400" : "text-zinc-500 group-hover/aida:text-zinc-400")}>{key}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="w-24 sm:w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(val.score || 0)*10}%` }} />
                                  </div>
                                  <span className="text-xs font-bold font-mono text-blue-400">{val.score}/10</span>
                                </div>
                              </div>
                              <p className={cn("text-[11px] leading-relaxed", selectedAspects[currentPreviewId]?.aida?.includes(key) ? "text-foreground/80 font-medium" : "text-zinc-500")}>{val.analysis || "Analysis pending."}</p>
                            </div>
                          ))}
                        </TabsContent>

                        <TabsContent value="neural" className="grid grid-cols-1 sm:grid-cols-2 gap-3 outline-none">
                          <div className="col-span-full flex items-center justify-between mb-1 px-1">
                            <h4 className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider">Neural & Psychological Context</h4>
                            <span className="text-[10px] text-zinc-600">Select to influence tone</span>
                          </div>
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
                            <h4 className="text-[10px] font-semibold text-amber-500 uppercase tracking-wider">Growth Recommendations</h4>
                            <span className="text-[10px] text-zinc-600">Select to imply in creation</span>
                          </div>
                          {(fullData[currentPreviewId]?.recommendations || []).map((rec: string, i: number) => (
                            <div 
                              key={i} 
                              onClick={() => toggleAspect(currentPreviewId, "recommendations", i)}
                              className={cn(
                                "p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-4 grow",
                                selectedAspects[currentPreviewId]?.recommendations?.includes(i)
                                  ? "bg-amber-500/8 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.05)]"
                                  : "bg-muted/20 border-border text-muted-foreground hover:border-amber-500/20"
                              )}
                            >
                              <div className={cn("w-5 h-5 mt-0.5 rounded-lg flex items-center justify-center shrink-0 transition-all", selectedAspects[currentPreviewId]?.recommendations?.includes(i) ? "bg-amber-500 text-white" : "bg-amber-500/10 text-amber-500/40")}>
                                {selectedAspects[currentPreviewId]?.recommendations?.includes(i) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-4 h-4" />}
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", selectedAspects[currentPreviewId]?.recommendations?.includes(i) ? "text-amber-500" : "text-amber-500/40")}>Recommendation #{i+1}</span>
                                  {selectedAspects[currentPreviewId]?.recommendations?.includes(i) && <span className="text-[9px] font-bold bg-amber-500 text-white px-1.5 py-px rounded flex items-center gap-1 uppercase tracking-tighter">Applied</span>}
                                </div>
                                <p className={cn("text-[12px] leading-relaxed", selectedAspects[currentPreviewId]?.recommendations?.includes(i) ? "text-foreground font-medium" : "text-zinc-500")}>{rec}</p>
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
                      <button
                        onClick={() => handleGenerate()}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-[11px] flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg shrink-0"
                      >
                        Generate <Sparkles className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LOADING MODE — Automation Pipeline Animation */}
          {currentTabState.mode === "loading" && (() => {
            const progress = currentTabState.progress;

            const stages = [
              { id: 'input',   label: 'Source Input',       sub: activeMainTab === 'top-ads' ? `${selectedIds.length} creative${selectedIds.length !== 1 ? 's' : ''} selected` : 'Prompt received', color: '#3b82f6', threshold: 0  },
              { id: 'extract', label: 'Pattern Extraction', sub: 'Analyzing winning elements',   color: '#8b5cf6', threshold: 20 },
              { id: 'brief',   label: 'Brief Generation',   sub: 'Synthesizing creative strategy',       color: '#06b6d4', threshold: 45 },
              { id: 'render',  label: 'Visual Rendering',   sub: 'Generating image assets',      color: '#10b981', threshold: 70 },
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
                <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.025]"
                  style={{ backgroundImage: 'linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
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
                      Holaprime Creative Engine · Active
                    </span>
                  </div>
                  <h2 className="text-sm md:text-xl font-black text-foreground uppercase tracking-tight">{activeStage.label}</h2>
                  <p className="text-[11px] font-medium transition-all duration-700 opacity-70" style={{ color: activeStage.color }}>{activeStage.sub}</p>
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
                          <line x1={`${x1}%`} y1={y} x2={`${x2}%`} y2={y} stroke="currentColor" className="text-muted-foreground/20" strokeWidth="1" strokeDasharray="3 3" />
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
                      const col = isDone || isActive ? stage.color : 'hsl(var(--muted-foreground)/.5)';

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
                                  : 'hsl(var(--muted))',
                                border: `2px solid ${isDone ? stage.color + '80' : isActive ? stage.color : 'rgba(100,100,100,0.25)'}`,
                                boxShadow: isActive ? `0 0 0 3px ${stage.color}18, 0 0 30px ${stage.color}35` : isDone ? `0 0 12px ${stage.color}22` : 'none',
                                color: col, zIndex: 10,
                              }}>
                              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                            <p className="text-[6px] md:text-[9px] font-bold uppercase tracking-tight md:tracking-wider leading-tight transition-colors duration-500 break-words"
                              style={{ color: isDone ? stage.color : isActive ? 'var(--foreground)' : 'currentColor', opacity: (!isDone && !isActive) ? 0.7 : 1 }}>
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
                    <div key={s.label} className="p-2 md:p-4 rounded-xl md:rounded-2xl text-center transition-all duration-700 backdrop-blur-md shadow-sm bg-zinc-100/80 border border-zinc-200/50 dark:bg-white/[0.02] dark:border-white/[0.04]"
                      style={{ boxShadow: `0 8px 32px 0 rgba(0,0,0,0.03)` }}>
                      <div className="text-[7px] md:text-[9px] font-bold uppercase tracking-widest mb-1 md:mb-1.5" style={{ color: s.color, opacity: 0.7 }}>{s.label}</div>
                      <div className="text-lg md:text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[7px] md:text-[9px] mt-0.5" style={{ color: s.color, opacity: 0.5 }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="w-full space-y-2.5">
                  <div className="w-full h-1.5 rounded-full overflow-hidden bg-muted/30 border border-border/50">
                    <div className="h-full rounded-full relative overflow-hidden transition-all duration-500 ease-out"
                      style={{ width: `${progress}%`, background: `linear-gradient(90deg, #1d4ed8, ${activeStage.color}, #06b6d4)` }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        style={{ animation: 'shimmerBar 1.2s ease-in-out infinite' }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-1.5 h-1.5 rounded-full bg-blue-500", pausedTabsRef.current.has(activeMainTab) ? "opacity-50" : "animate-pulse")} />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                        {pausedTabsRef.current.has(activeMainTab) ? 'Pipeline Paused' : 'Processing pipeline'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          if (pausedTabsRef.current.has(activeMainTab)) {
                            pausedTabsRef.current.delete(activeMainTab)
                          } else {
                            pausedTabsRef.current.add(activeMainTab)
                          }
                          forceUpdate({})
                        }}
                        className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all hover:text-blue-500 text-muted-foreground/60 px-2 py-1 rounded-md hover:bg-muted/50 border border-transparent hover:border-border"
                      >
                        {pausedTabsRef.current.has(activeMainTab) ? (
                          <><Play className="w-3 h-3" /> Resume</>
                        ) : (
                          <><Pause className="w-3 h-3" /> Pause</>
                        )}
                      </button>

                      <button onClick={cancelProcess}
                        className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 transition-all hover:text-red-500 text-muted-foreground/60 px-2 py-1 rounded-md hover:bg-muted/50 border border-transparent hover:border-border"
                      >
                        <X className="w-3 h-3" /> Cancel
                      </button>
                    </div>
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
          {currentTabState.mode === "complete" && currentTabState.result && (() => {
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
            // Resolve the best real vision scorer score from variants
            const variantScore = activeVariant?.score?.overall || null;
            const score = variantScore || r.creativeConcept?.targetScore || r.targetScore || "8.5";
            const tier = r.creativeConcept?.performanceTier || r.performanceTier || "PREMIUM";
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
                       <div key={v.id} className="shrink-0 flex items-center gap-0.5">
                         <button
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
                         {/* Like/Dislike Feedback */}
                         {v.imageUrl && (
                           <div className="flex items-center gap-0.5 ml-0.5">
                             <button
                               onClick={(e) => { e.stopPropagation(); handleFeedback(v.id, 'like') }}
                               className={cn(
                                 "w-6 h-6 rounded-md flex items-center justify-center transition-all active:scale-90",
                                 feedbackState[v.id] === 'like'
                                   ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                   : "text-zinc-600 hover:text-emerald-400 hover:bg-emerald-500/10"
                               )}
                               title="Like — more like this"
                             >
                               <ThumbsUp className="w-3 h-3" />
                             </button>
                             <button
                               onClick={(e) => { e.stopPropagation(); handleFeedback(v.id, 'dislike') }}
                               className={cn(
                                 "w-6 h-6 rounded-md flex items-center justify-center transition-all active:scale-90",
                                 feedbackState[v.id] === 'dislike'
                                   ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                   : "text-zinc-600 hover:text-rose-400 hover:bg-rose-500/10"
                               )}
                               title="Dislike — avoid this style"
                             >
                               <ThumbsDown className="w-3 h-3" />
                             </button>
                           </div>
                         )}
                       </div>
                     ))}
                     {/* Learning indicator */}
                     {isLearning && (
                       <div className="shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 animate-in fade-in slide-in-from-right-2 duration-300">
                         <Brain className="w-3 h-3 text-purple-400 animate-pulse" />
                         <span className="text-[9px] font-semibold text-purple-400">Learning your style...</span>
                       </div>
                     )}
                   </div>
                   {/* Score details for active variant — 11 dimensions grouped */}
                   {activeVariant?.score && (
                     <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 text-[9px] text-muted-foreground overflow-x-auto">
                       {/* Content */}
                       <span className="text-[8px] font-bold text-blue-400/50 uppercase shrink-0">Content</span>
                       <span className="flex items-center gap-1 shrink-0">Text <span className="font-bold text-foreground">{activeVariant.score.textAccuracy}/10</span></span>
                       {activeVariant.score.messageClarity != null && (
                         <span className="flex items-center gap-1 shrink-0">Clarity <span className="font-bold text-foreground">{activeVariant.score.messageClarity}/10</span></span>
                       )}
                       <span className="w-px h-3 bg-border shrink-0" />
                       {/* Design */}
                       <span className="text-[8px] font-bold text-purple-400/50 uppercase shrink-0">Design</span>
                       <span className="flex items-center gap-1 shrink-0">Layout <span className="font-bold text-foreground">{activeVariant.score.layoutQuality}/10</span></span>
                       {activeVariant.score.gridAlignment != null && (
                         <span className="flex items-center gap-1 shrink-0">Grid <span className="font-bold text-foreground">{activeVariant.score.gridAlignment}/10</span></span>
                       )}
                       {activeVariant.score.typographyPairing != null && (
                         <span className="flex items-center gap-1 shrink-0">Type <span className="font-bold text-foreground">{activeVariant.score.typographyPairing}/10</span></span>
                       )}
                       {activeVariant.score.visualBalance != null && (
                         <span className="flex items-center gap-1 shrink-0">Balance <span className="font-bold text-foreground">{activeVariant.score.visualBalance}/10</span></span>
                       )}
                       {activeVariant.score.whitespaceUsage != null && (
                         <span className="flex items-center gap-1 shrink-0">Space <span className="font-bold text-foreground">{activeVariant.score.whitespaceUsage}/10</span></span>
                       )}
                       <span className="w-px h-3 bg-border shrink-0" />
                       {/* Color & Brand */}
                       <span className="text-[8px] font-bold text-amber-400/50 uppercase shrink-0">Color</span>
                       {activeVariant.score.colorHarmony != null && (
                         <span className="flex items-center gap-1 shrink-0">Harmony <span className="font-bold text-foreground">{activeVariant.score.colorHarmony}/10</span></span>
                       )}
                       <span className="flex items-center gap-1 shrink-0">Brand <span className="font-bold text-foreground">{activeVariant.score.brandCompliance}/10</span></span>
                       <span className="w-px h-3 bg-border shrink-0" />
                       {/* Impact */}
                       <span className="text-[8px] font-bold text-emerald-400/50 uppercase shrink-0">Impact</span>
                       <span className="flex items-center gap-1 shrink-0">Psych <span className="font-bold text-foreground">{activeVariant.score.psychologyScore}/10</span></span>
                       {activeVariant.score.creativityScore != null && (
                         <span className="flex items-center gap-1 shrink-0">Creative <span className="font-bold text-foreground">{activeVariant.score.creativityScore}/10</span></span>
                       )}
                       {activeVariant.score.innovativeness != null && (
                         <span className="flex items-center gap-1 shrink-0">Innov <span className={`font-bold ${activeVariant.score.innovativeness >= 7 ? 'text-emerald-400' : activeVariant.score.innovativeness >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>{activeVariant.score.innovativeness}/10</span></span>
                       )}
                       {activeVariant.score.predictedCtr && (
                         <span className="flex items-center gap-1 shrink-0">CTR <span className="font-bold text-emerald-500">{activeVariant.score.predictedCtr}</span></span>
                       )}
                       {activeVariant.score.verdict && (
                         <span className="hidden md:block ml-auto italic truncate max-w-[250px] shrink-0">{activeVariant.score.verdict}</span>
                       )}
                     </div>
                   )}
                 </div>
               )}

               {/* Image area */}
               <div className="flex-1 relative group overflow-hidden bg-background flex items-center justify-center min-h-[180px] md:min-h-0">
                  {displayImageUrl ? (
                    <img src={displayImageUrl} className="w-full h-full object-contain transition-transform duration-[20s] group-hover:scale-105" alt="Creative" />
                  ) : (
                    <div className="flex flex-col items-center justify-center opacity-40 px-4">
                      <ImageIcon className="w-12 md:w-24 h-12 md:h-24 mb-2 md:mb-4 text-muted-foreground" />
                      <p className="text-xs font-semibold text-muted-foreground text-center">Image Generation / No Provider</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60 pointer-events-none" />

                  {/* V2 source badge — md+ only */}
                  {isImprovement && selectedIds.length > 0 && (
                    <div className="hidden md:flex absolute top-4 left-4 z-20 items-center gap-2">
                      <div className="px-2.5 py-1.5 rounded-lg bg-black/70 backdrop-blur-xl border border-emerald-500/30 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">V2 — Improved from source</span>
                      </div>
                      <div className="flex -space-x-2">
                        {selectedIds.slice(0, 3).map(id => (
                          <div key={id} className="w-7 h-7 rounded-md overflow-hidden border-2 border-emerald-500/40 shadow-md">
                            <img src={creatives.find(c => c.adId === id)?.thumbnailUrl} className="w-full h-full object-cover" alt="source" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clear button — visible on md+ AND mobile as a floating button */}
                  <div className="absolute top-4 right-4 z-20">
                    <button
                      onClick={() => {
                        updateTabState(activeMainTab, { result: null, mode: activeMainTab === 'top-ads' ? 'ad-details' : 'standby', progress: 0 });
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

                  {/* Headline overlay — md+ only */}
                  <div className="hidden md:block absolute bottom-6 left-6 max-w-lg space-y-1">
                    <Badge className="bg-primary/10 border-primary/30 text-[9px] font-semibold px-3 py-1 rounded-full backdrop-blur-xl text-primary">
                      {isImprovement ? 'Version 2 — Improvement Based' : 'Generated Creative'}
                    </Badge>
                    <h2 className="text-2xl font-bold text-foreground drop-shadow-xl">{headline}</h2>
                  </div>

                  {/* Action buttons — md+ only overlay */}
                  <div className="hidden md:flex absolute bottom-6 right-6 items-center gap-3">
                    <button
                      onClick={() => handleManualSave(r)}
                      disabled={isSaving || (activeVariant ? savedIds.has(activeVariant.id) : savedIds.has(r.id))}
                      className="px-5 py-2 bg-blue-600 text-white rounded-lg font-semibold text-[11px] flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      <Save className="w-3.5 h-3.5" /> {(activeVariant ? savedIds.has(activeVariant.id) : savedIds.has(r.id)) ? "Saved" : "Save"}
                    </button>
                    <button
                      onClick={() => { 
                        setRegenerateConfirm({ prompt: currentTabState.prompt, result: currentTabState.result, tab: activeMainTab })
                      }}
                      className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-[11px] flex items-center gap-2 hover:opacity-90 transition-all font-sans"
                    >
                      <Zap className="w-3.5 h-3.5" /> Regenerate
                    </button>
                    <button onClick={handleExport} className="px-5 py-2 bg-muted text-foreground border border-border rounded-lg font-semibold text-[11px] flex items-center gap-2 hover:bg-muted/80 transition-all">
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
                    <div className="flex items-center gap-2">
                       <button
                         onClick={() => handleManualSave(r)}
                         disabled={isSaving || (activeVariant ? savedIds.has(activeVariant.id) : savedIds.has(r.id))}
                         className="w-9 h-9 flex items-center justify-center bg-blue-600 text-white rounded-lg active:scale-95 transition-all disabled:opacity-50"
                       >
                         <Save className="w-4 h-4" />
                       </button>
                       <button
                         onClick={() => { 
                           setRegenerateConfirm({ prompt: currentTabState.prompt, result: currentTabState.result, tab: activeMainTab })
                         }}
                         className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-[11px] flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                       >
                         <Zap className="w-3.5 h-3.5" /> Regen
                       </button>
                       <button 
                         onClick={handleExport} 
                         className="w-9 h-9 flex items-center justify-center bg-muted text-foreground border border-border rounded-lg active:scale-95 transition-all"
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
            // Prefer the real vision scorer score from the active variant
            const variants2 = r.variants || [];
            const activeVariant2 = variants2[selectedVariantIdx] || variants2[0] || null;
            const variantScore2 = activeVariant2?.score?.overall || null;
            const score     = variantScore2 || r.creativeConcept?.targetScore || r.targetScore || '8.5';
            const tier      = r.creativeConcept?.performanceTier || r.performanceTier || 'PREMIUM';
            const improvementSummary = r.creativeConcept?.improvementSummary || r.creativeConcept?.rationale || '';
            const primaryTrigger    = r.psychologyBlueprint?.primaryTrigger || '';
            const scoreNum  = typeof score === 'number' ? score : (parseFloat(String(score)) || 8.5);
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
               <div className="flex flex-col gap-3">
                  <div className="flex-1 p-4 rounded-xl border flex flex-col justify-center" style={{ backgroundColor: `${scoreColor}10`, borderColor: `${scoreColor}20` }}>
                     <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: `${scoreColor}99` }}>Score</span>
                     <div className="text-2xl font-bold font-mono" style={{ color: scoreColor }}>
                       {typeof score === 'number' ? score.toFixed(1) : String(score)}
                       <span className="text-xs opacity-30 ml-1">/10</span>
                     </div>
                     {activeVariant2?.score?.overall && (
                       <span className="text-[8px] opacity-50 mt-0.5">Vision scored</span>
                     )}
                  </div>
                  <div className="flex-1 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex flex-col justify-center">
                     <span className="text-[9px] font-semibold text-blue-400/60 uppercase tracking-wider">Tier</span>
                     <div className="text-lg font-bold text-blue-400 capitalize">
                       {tier}
                     </div>
                  </div>
               </div>
            </div>
            );
          })()}

        </section>

        {/* Global Image Popup Modal */}
        {previewImagePopup && (
          <EnlargedImageModal 
            url={previewImagePopup.url}
            title={previewImagePopup.title || "Ad Preview"}
            onClose={() => setPreviewImagePopup(null)}
          />
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
      `}</style>

      {/* Regeneration Confirmation Sheet (Right Sidebar) */}
      <Sheet 
        open={!!regenerateConfirm} 
        onOpenChange={(open) => !open && setRegenerateConfirm(null)}
      >
        <SheetContent side="right" className="w-[400px] sm:w-[500px] p-0 border-l border-white/[0.08] bg-zinc-950 text-white overflow-hidden flex flex-col">
          <SheetHeader className="p-6 border-b border-white/[0.04] bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <RefreshCcw className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <SheetTitle className="text-xl font-bold text-white tracking-tight">Refine Creative</SheetTitle>
                <SheetDescription className="text-zinc-500 text-[11px] font-semibold uppercase tracking-wider">
                  Update requirements and generate a new version
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-10 custom-scrollbar">
            {/* Previous Requirements Display */}
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                <Database className="w-3 h-3" /> Previous Requirement
              </Label>
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[13px] text-white/50 leading-relaxed font-normal italic">
                {regenerateConfirm?.prompt ? `"${regenerateConfirm.prompt}"` : "No previous prompt detected."}
              </div>
            </div>

            {/* New Requirement Input */}
            <div className="space-y-4">
              <Label className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2">
                <Sparkles className="w-3 h-3" /> New Requirement
              </Label>
              <Textarea 
                value={regenerateConfirm?.newRequirement || ""}
                onChange={(e) => setRegenerateConfirm(prev => prev ? { ...prev, newRequirement: e.target.value } : null)}
                placeholder="What should be changed or improved?"
                className="min-h-[180px] bg-white/[0.03] border-white/[0.08] focus:border-blue-500/50 rounded-xl p-4 text-[14px] leading-relaxed resize-none text-white placeholder:text-zinc-600 outline-none ring-0 focus-visible:ring-0 transition-all shadow-inner"
              />
            </div>
          </div>

          <SheetFooter className="p-6 border-t border-white/[0.04] bg-zinc-900/50">
            <Button 
              onClick={() => {
                if (regenerateConfirm) {
                  const combinedPrompt = regenerateConfirm.newRequirement 
                    ? `${regenerateConfirm.prompt}\n\nAdditional Requirement: ${regenerateConfirm.newRequirement}`
                    : regenerateConfirm.prompt;
                  
                  updateTabState(regenerateConfirm.tab, { prompt: combinedPrompt })
                  handleGenerate(undefined, combinedPrompt)
                  setRegenerateConfirm(null)
                }
              }}
              disabled={currentTabState.isGenerating || !regenerateConfirm?.newRequirement?.trim()}
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95 border-t border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
