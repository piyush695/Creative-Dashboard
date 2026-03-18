"use client"

import React, { useState, useRef, useEffect } from "react"
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
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface CreativeStudioViewProps {
  onClose?: () => void
}

type ViewportMode = 'standby' | 'ad-details' | 'loading' | 'complete'
type TopAdsStep = 'aspects' | 'generate' | 'results'

export default function CreativeStudioView({ onClose }: CreativeStudioViewProps) {
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
    studio: { mode: 'standby', isGenerating: false, result: null, progress: 0, prompt: "" }
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

  const [creatives, setCreatives] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [currentPreviewId, setCurrentPreviewId] = useState<string | null>(null)
  const [fullData, setFullData] = useState<Record<string, any>>({})
  const [selectedAspects, setSelectedAspects] = useState<Record<string, any>>({})
  
  const generationInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchCreatives()
  }, [])

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
    
    let cur = 0
    generationInterval.current = setInterval(() => {
      cur += Math.random() * 8
      if (cur >= 98) {
        if (generationInterval.current) clearInterval(generationInterval.current)
        updateTabState(targetTab, { progress: 98 })
      } else {
        updateTabState(targetTab, { progress: cur })
      }
    }, 150)

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
      updateTabState(targetTab, { progress: 100 })
      
      setTimeout(() => {
        if (data.creative) {
          updateTabState(targetTab, { 
            result: data.creative, 
            mode: "complete", 
            isGenerating: false 
            })
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

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden font-sans select-none" suppressHydrationWarning>
      
      {/* Header */}
         <header className="px-5 py-3 border-b border-white/[0.06] dark:border-white/[0.06] bg-background/90 backdrop-blur-xl z-50 shrink-0">
        <div className="flex items-center justify-between w-full gap-4">
           <div className="flex items-center gap-3">
             <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/8 border border-blue-500/15 rounded-full">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-[10px] font-semibold text-blue-400 tracking-wide">Holaprime Neural Core</span>
             </div>
             <h1 className="text-base font-bold tracking-tight italic text-foreground/90">Creative Analyzer</h1>
           </div>
           
           <div className="flex items-center gap-3">
             <div className="bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.06]">
               <button 
                 onClick={() => setActiveMainTab("custom")}
                 className={cn("px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all", activeMainTab === "custom" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
               >Custom</button>
               <button 
                 onClick={() => setActiveMainTab("top-ads")}
                 className={cn("px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all", activeMainTab === "top-ads" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
               >Top Ads</button>
               <button 
                 onClick={() => setActiveMainTab("studio")}
                 className={cn("px-4 py-1.5 text-[11px] font-semibold rounded-md transition-all", activeMainTab === "studio" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
               >AI Studio</button>
             </div>
             {onClose && (
               <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors border border-border">
                 <X className="w-4 h-4 text-muted-foreground" />
               </button>
             )}
           </div>
        </div>
      </header>

      {/* Main Container */}
         <main className="flex-1 flex overflow-hidden w-full relative">
        
        {/* Sidebar — Hidden for Top Ads */}
        <aside className={cn(
          "w-[280px] border-r border-border flex flex-col bg-card/50 transition-all duration-300 z-40 shrink-0",
          activeMainTab === 'top-ads' && "hidden"
        )}>
          <div className="p-4 shrink-0 border-b border-white/[0.04]">
            <h2 className="text-[10px] font-semibold text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider">
              <LayoutGrid className="w-3 h-3" />
              {activeMainTab === "studio" ? "Synthesis Assets" : "Neural Context"}
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar min-h-0">
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
          </div>

          <div className="p-4 border-t border-white/[0.04] shrink-0">
            <button 
              disabled={currentTabState.isGenerating}
              onClick={() => handleGenerate()}
              className="w-full h-10 bg-primary text-primary-foreground rounded-lg font-semibold text-[11px] tracking-wide flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 hover:opacity-90 shadow-lg"
            >
              {currentTabState.isGenerating ? "Processing..." : "Generate"}
              <Sparkles className="w-4 h-4 text-yellow-400 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </aside>

        {/* Viewport */}
        <section className="flex-1 bg-background relative flex flex-col min-w-0 overflow-y-auto custom-scrollbar scroll-smooth">
          
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.015] pointer-events-none" 
            style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '60px 60px' }} 
          />

          {/* STANDBY MODE */}
          {currentTabState.mode === "standby" && (
            <div className="flex-1 flex flex-col min-h-full">
              {activeMainTab === "top-ads" && (
                <div className="flex-1 flex flex-col">
                  {/* Library Header */}
                     <div className="px-8 py-8 border-b border-white/[0.04] relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none" />
                    <div className="relative z-10 flex items-end justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-400 uppercase tracking-widest">
                          <Database className="w-3 h-3" /> Pattern Repository
                        </div>
                        <h2 className="text-3xl font-black italic text-foreground uppercase tracking-tight leading-none">
                          Winning <span className="text-blue-500">Library</span>
                        </h2>
                        <p className="text-[11px] text-zinc-500 font-medium max-w-md">
                          Select creatives to analyze their winning patterns, then generate new variations.
                        </p>
                      </div>
                      
                      {selectedIds.length > 0 && (
                        <div className="flex items-center gap-3 animate-in slide-in-from-right-4">
                          <span className="text-[10px] font-semibold text-zinc-500">{selectedIds.length} selected</span>
                          <button 
                            onClick={() => {
                              const ad = creatives.find(c => c.adId === selectedIds[0])
                              if (ad) handleAdCardClick(ad)
                            }}
                            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg font-semibold text-[11px] flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-md"
                          >
                            Analyze <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ad Grid */}
                  <div className="flex-1 p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 max-w-[1600px] mx-auto pb-20">
                      {creatives.map((ad, idx) => (
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

                            {/* Eye Button */}
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAdCardClick(ad); }}
                              className="absolute top-2 right-2 w-7 h-7 rounded-md bg-white/10 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-black"
                            >
                               <Eye className="w-3.5 h-3.5 text-white group-hover:text-primary transition-colors" />
                            </button>

                            <div className="absolute bottom-2 left-2 right-2 space-y-0.5">
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

                    {/* Floating Selection Bar */}
                    {selectedIds.length > 0 && (
                      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 duration-500">
                        <div className="bg-black/90 backdrop-blur-2xl border border-white/10 py-2 px-3 rounded-full shadow-2xl flex items-center gap-3">
                          <div className="flex -space-x-3 ml-1">
                            {selectedIds.slice(0, 3).map((id) => (
                              <div key={id} className="w-8 h-8 rounded-full border-2 border-black overflow-hidden bg-zinc-900">
                                <img src={creatives.find(c => c.adId === id)?.thumbnailUrl} className="w-full h-full object-cover" alt="" />
                              </div>
                            ))}
                            {selectedIds.length > 3 && (
                              <div className="w-8 h-8 rounded-full border-2 border-black bg-zinc-800 flex items-center justify-center text-[9px] font-bold text-white">
                                +{selectedIds.length - 3}
                              </div>
                            )}
                          </div>
                          <div className="h-6 w-px bg-white/10" />
                          <span className="text-[11px] font-semibold text-white">{selectedIds.length} selected</span>
                          <button 
                            onClick={() => {
                              const ad = creatives.find(c => c.adId === selectedIds[0])
                              if (ad) handleAdCardClick(ad)
                            }}
                            className="bg-primary text-primary-foreground px-5 py-2 rounded-full font-semibold text-[11px] flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all"
                          >
                            Analyze <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
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
                 <div className="px-6 py-3 border-b border-border bg-background/90 backdrop-blur-xl sticky top-0 z-50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => cancelProcess()}
                    className="p-1.5 rounded-lg bg-muted border border-border hover:bg-muted/80 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-foreground" />
                  </button>
                  
                  <div className="flex items-center gap-2">
                    {['aspects', 'generate', 'results'].map((step, i) => (
                      <React.Fragment key={step}>
                        {i > 0 && <div className="w-6 h-px bg-white/10" />}
                        <button 
                          disabled={step === 'results' && !currentTabState.result}
                          onClick={() => setTopAdsStep(step as TopAdsStep)}
                          className={cn(
                            "flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all disabled:opacity-30",
                            topAdsStep === step ? "text-primary" : "text-muted-foreground"
                          )}
                        >
                          <span className={cn("w-5 h-5 rounded-md flex items-center justify-center text-[9px] border transition-all", topAdsStep === step ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border")}>{i + 1}</span>
                          {step === 'aspects' ? 'Aspects' : step === 'generate' ? 'Generate' : 'Results'}
                        </button>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
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

              <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                {/* ASPECTS STEP */}
                {topAdsStep === 'aspects' && currentPreviewId && fullData[currentPreviewId] && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-5xl mx-auto w-full space-y-6 pb-16">
                    
                    {/* Compact Card */}
                    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                      <div className="flex gap-0">
                        {/* Image — Fixed small size */}
                        <div className="w-[180px] shrink-0 relative overflow-hidden border-r border-border">
                          <img src={fullData[currentPreviewId].thumbnailUrl} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <button 
                            onClick={() => toggleAdSelection(currentPreviewId)}
                            className={cn(
                              "absolute bottom-2 left-2 right-2 py-1.5 rounded-md text-[9px] font-semibold flex items-center justify-center gap-1 transition-all border backdrop-blur-md",
                              selectedIds.includes(currentPreviewId) 
                                ? "bg-blue-600 border-blue-400 text-white" 
                                : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                            )}
                          >
                            {selectedIds.includes(currentPreviewId) ? "Selected" : "Select"}
                            <CheckCircle2 className={cn("w-3 h-3", selectedIds.includes(currentPreviewId) ? "opacity-100" : "opacity-40")} />
                          </button>
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
                    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
                      <Tabs defaultValue="highlights" className="w-full">
                        <TabsList className="bg-muted p-0.5 rounded-lg h-auto w-full flex gap-0.5 mb-5 border border-border">
                          <TabsTrigger value="highlights" className="flex-1 text-[10px] font-semibold uppercase tracking-wide rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all py-2">DNA Points</TabsTrigger>
                          <TabsTrigger value="aida" className="flex-1 text-[10px] font-semibold uppercase tracking-wide rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all py-2">AIDA</TabsTrigger>
                          <TabsTrigger value="neural" className="flex-1 text-[10px] font-semibold uppercase tracking-wide rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all py-2">Psychology</TabsTrigger>
                          <TabsTrigger value="insights" className="flex-1 text-[10px] font-semibold uppercase tracking-wide rounded-md data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all py-2">Insights</TabsTrigger>
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
                          {Object.entries(fullData[currentPreviewId]?.aida || {}).map(([key, val]: any) => (
                            <div key={key} className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
                              <div className="flex justify-between items-center">
                                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{key}</span>
                                <div className="flex items-center gap-3">
                                  <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(val.score || 0)*10}%` }} />
                                  </div>
                                  <span className="text-sm font-bold font-mono text-blue-400">{val.score}/10</span>
                                </div>
                              </div>
                              <p className="text-[11px] text-zinc-500 leading-relaxed">{val.analysis || "Analysis pending."}</p>
                            </div>
                          ))}
                        </TabsContent>

                        <TabsContent value="neural" className="grid grid-cols-2 gap-3 outline-none">
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
                          {(fullData[currentPreviewId]?.recommendations || []).map((rec: string, i: number) => (
                            <div key={i} className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                              </div>
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-semibold text-amber-500/60 uppercase tracking-wider">Recommendation #{i+1}</span>
                                <p className="text-[12px] leading-relaxed text-zinc-400">{rec}</p>
                              </div>
                            </div>
                          ))}
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Next Step Button */}
                    <div className="flex justify-end">
                      <button 
                        disabled={selectedIds.length === 0}
                        onClick={() => setTopAdsStep('generate')}
                        className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-semibold text-[11px] flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 shadow-lg"
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

                    <div className="p-5 rounded-xl bg-blue-600/5 border border-blue-500/10 flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Ready to Generate</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{selectedIds.length} creatives selected · {Object.keys(selectedAspects).reduce((acc, k) => acc + (selectedAspects[k]?.whatWorks?.length || 0), 0)} aspects active</p>
                      </div>
                      <button 
                        onClick={() => handleGenerate()}
                        className="px-8 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-[11px] flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg"
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
              { id: 'brief',   label: 'Brief Generation',   sub: 'Claude AI synthesizing',       color: '#06b6d4', threshold: 45 },
              { id: 'render',  label: 'Visual Rendering',   sub: 'Gemini generating image',      color: '#10b981', threshold: 70 },
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
            <div className="flex-1 flex flex-col items-center justify-center relative p-8 animate-in fade-in duration-500 overflow-hidden bg-background h-full">

              {/* Ambient background */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 opacity-[0.025]"
                  style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(59,130,246,1) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />
                <div className="absolute inset-0 transition-all duration-[1200ms]"
                  style={{ background: `radial-gradient(ellipse 80% 60% at 50% 40%, ${activeStage.color}12, transparent 70%)` }} />
                <div className="absolute top-1/4 left-1/3 w-64 h-64 rounded-full blur-[120px] transition-all duration-[1200ms]"
                  style={{ background: activeStage.color, opacity: 0.05 }} />
              </div>

              <div className="relative w-full max-w-3xl flex flex-col items-center gap-10 animate-in fade-in zoom-in-98 duration-700">

                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-1 transition-all duration-700"
                    style={{ background: `${activeStage.color}10`, borderColor: `${activeStage.color}30` }}>
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: activeStage.color }} />
                    <span className="text-[10px] font-bold uppercase tracking-widest transition-colors duration-700" style={{ color: activeStage.color }}>
                      Holaprime Neural Engine · Active
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight">{activeStage.label}</h2>
                  <p className="text-[11px] font-medium transition-all duration-700" style={{ color: `${activeStage.color}aa` }}>{activeStage.sub}</p>
                </div>

                {/* Pipeline */}
                <div className="w-full relative">
                  {/* SVG connector lines */}
                  <svg className="absolute top-0 left-0 w-full pointer-events-none" height="56" style={{ zIndex: 0 }} preserveAspectRatio="none">
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
                          <line x1={`${x1}%`} y1={y} x2={`${x2}%`} y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" />
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
                  <div className="flex items-start justify-between" style={{ zIndex: 1, position: 'relative' }}>
                    {stages.map((stage: any, i: number) => {
                      const isDone   = i < activeIdx;
                      const isActive = i === activeIdx;
                      const col = isDone || isActive ? stage.color : 'rgba(255,255,255,0.18)';

                      return (
                        <div key={stage.id} className="flex flex-col items-center gap-3" style={{ width: '20%' }}>
                          <div className="relative flex items-center justify-center">
                            {isActive && <div className="absolute w-20 h-20 rounded-full animate-ping" style={{ background: `${stage.color}06`, border: `1px solid ${stage.color}20` }} />}
                            {isActive && <div className="absolute w-16 h-16 rounded-full animate-pulse" style={{ background: `${stage.color}0c`, border: `1px solid ${stage.color}30` }} />}
                            {isDone   && <div className="absolute w-14 h-14 rounded-full" style={{ border: `1px solid ${stage.color}25` }} />}

                            {/* Main node */}
                            <div className="w-12 h-12 rounded-full flex items-center justify-center relative transition-all duration-700"
                              style={{
                                background: isDone ? `linear-gradient(135deg, ${stage.color}22, ${stage.color}0a)`
                                  : isActive ? `linear-gradient(135deg, ${stage.color}30, ${stage.color}10)`
                                  : 'rgba(255,255,255,0.025)',
                                border: `2px solid ${isDone ? stage.color + '80' : isActive ? stage.color : 'rgba(255,255,255,0.1)'}`,
                                boxShadow: isActive ? `0 0 0 3px ${stage.color}18, 0 0 30px ${stage.color}35` : isDone ? `0 0 12px ${stage.color}22` : 'none',
                                color: col, zIndex: 10,
                              }}>
                              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                {isDone
                                  ? <polyline points="20 6 9 17 4 12" strokeWidth="2.5" />
                                  : <path d={iconPaths[stage.id] || ''} />
                                }
                              </svg>
                            </div>

                            {/* Spinning arc for active */}
                            {isActive && (
                              <svg className="absolute w-[60px] h-[60px]" viewBox="0 0 60 60"
                                style={{ animation: 'spinRing 2s linear infinite', position: 'absolute' }}>
                                <circle cx="30" cy="30" r="28" fill="none"
                                  stroke={stage.color} strokeWidth="1.5" strokeOpacity="0.6"
                                  strokeDasharray="44 132" strokeLinecap="round" />
                              </svg>
                            )}
                          </div>

                          <div className="text-center space-y-1">
                            <p className="text-[9px] font-bold uppercase tracking-wider leading-tight transition-colors duration-500"
                              style={{ color: isDone ? stage.color + 'bb' : isActive ? '#f1f5f9' : 'rgba(255,255,255,0.18)' }}>
                              {stage.label}
                            </p>
                            {isActive && (
                              <div className="flex justify-center gap-[3px]">
                                {[0, 110, 220].map((d: number) => (
                                  <div key={d} className="w-[3px] h-[3px] rounded-full animate-bounce"
                                    style={{ background: stage.color, animationDelay: `${d}ms` }} />
                                ))}
                              </div>
                            )}
                            {isDone && <div className="text-[8px] font-semibold" style={{ color: stage.color + '70' }}>done</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 w-full">
                  {[
                    { label: 'Sources',  value: activeMainTab === 'top-ads' ? String(selectedIds.length) : '—', sub: activeMainTab === 'top-ads' ? 'creatives' : 'prompt', color: '#3b82f6' },
                    { label: 'Stage',    value: `${activeIdx + 1}`,  sub: 'of 5 steps',    color: activeStage.color },
                    { label: 'Progress', value: `${Math.floor(progress)}%`, sub: 'complete', color: '#10b981' },
                  ].map((s: any) => (
                    <div key={s.label} className="p-4 rounded-2xl text-center transition-all duration-700"
                      style={{ background: `${s.color}08`, border: `1px solid ${s.color}18` }}>
                      <div className="text-[9px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: `${s.color}65` }}>{s.label}</div>
                      <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[9px] mt-0.5" style={{ color: `${s.color}45` }}>{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="w-full space-y-2.5">
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                    <div className="h-full rounded-full relative overflow-hidden transition-all duration-500 ease-out"
                      style={{ width: `${progress}%`, background: `linear-gradient(90deg, #1d4ed8, ${activeStage.color}, #06b6d4)` }}>
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                        style={{ animation: 'shimmerBar 1.2s ease-in-out infinite' }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.2)' }}>Processing pipeline</span>
                    <button onClick={cancelProcess}
                      className="text-[9px] font-semibold uppercase tracking-widest flex items-center gap-1 transition-colors hover:text-red-400"
                      style={{ color: 'rgba(255,255,255,0.2)' }}>
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
          {currentTabState.mode === "complete" && currentTabState.result && (() => {
            const r = currentTabState.result;
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
            const score = r.creativeConcept?.targetScore || r.targetScore || "8.5";
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
              if (!r.imageUrl) {
                toast.info("No image to export");
                return;
              }
              try {
                // Try downloading via fetch (works for data URIs and same-origin)
                if (r.imageUrl.startsWith('data:')) {
                  const a = document.createElement('a');
                  a.href = r.imageUrl;
                  a.download = `holaprime-creative-${Date.now()}.png`;
                  a.click();
                } else {
                  const resp = await fetch(r.imageUrl);
                  const blob = await resp.blob();
                  const blobUrl = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = `holaprime-creative-${Date.now()}.png`;
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
                }
                toast.success("Creative downloaded!");
              } catch {
                // Fallback: open in new tab
                window.open(r.imageUrl);
              }
            };

            return (
            <div className="flex-1 flex flex-col animate-in zoom-in-95 duration-700 h-full overflow-hidden">
               <div className="flex-1 relative group overflow-hidden bg-background flex items-center justify-center">
                  {r.imageUrl ? (
                    <img src={r.imageUrl} className="w-full h-full object-contain transition-transform duration-[20s] group-hover:scale-105" alt="Creative" />
                  ) : (
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <ImageIcon className="w-24 h-24 mb-4 text-muted-foreground" />
                      <p className="text-sm font-semibold text-muted-foreground">Image Generation Processing / No Image Provider</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80 pointer-events-none" />

                  {/* Top-right: Clear Creative × button */}
                  <div className="absolute top-4 right-4 z-20 animate-in fade-in slide-in-from-top-2 duration-500">
                    <button
                      onClick={() => {
                        updateTabState(activeMainTab, { result: null, mode: activeMainTab === 'top-ads' ? 'ad-details' : 'standby', progress: 0 });
                        if (activeMainTab === 'top-ads') setTopAdsStep('generate');
                      }}
                      className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-black/70 backdrop-blur-xl border border-white/10 hover:bg-rose-500/25 hover:border-rose-400/50 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] transition-all duration-300 group/clear shadow-xl"
                      title="Remove this creative — keeps the full preview open"
                    >
                      <div className="w-4 h-4 rounded-full bg-rose-500/20 border border-rose-400/40 flex items-center justify-center group-hover/clear:bg-rose-500/40 transition-colors">
                        <X className="w-2.5 h-2.5 text-rose-400" />
                      </div>
                      <span className="text-[10px] font-bold text-white/60 group-hover/clear:text-rose-300 uppercase tracking-widest transition-colors">Clear Creative</span>
                    </button>
                  </div>
                  
                  {/* Source creative reference thumbnails (top-left) */}
                  {isImprovement && selectedIds.length > 0 && (
                    <div className="absolute top-4 left-4 z-20 animate-in fade-in slide-in-from-top-2 duration-500">
                      <div className="flex items-center gap-2">
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
                    </div>
                  )}

                  {/* Bottom-right: Action buttons */}
                  <div className="absolute bottom-6 right-6 flex items-center gap-3">
                        <button 
                     onClick={() => {
                        if (activeMainTab === 'top-ads') {
                           setTopAdsStep('generate')
                           updateTabState('top-ads', { mode: 'ad-details' })
                        } else {
                           handleGenerate()
                        }
                     }} 
                     className="px-5 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-[11px] flex items-center gap-2 hover:opacity-90 transition-all"
                  >
                     <Zap className="w-3.5 h-3.5" /> Regenerate
                  </button>
                  <button onClick={handleExport} className="px-5 py-2 bg-muted text-foreground border border-border rounded-lg font-semibold text-[11px] flex items-center gap-2 hover:bg-muted/80 transition-all">
                     <Download className="w-3.5 h-3.5" /> Export
                  </button>
                  </div>
               </div>

               <div className="absolute bottom-6 left-6 max-w-lg space-y-2">
                  <Badge className="bg-primary/10 border-primary/30 text-[9px] font-semibold px-3 py-1 rounded-full backdrop-blur-xl text-primary">
                    {isImprovement ? 'Version 2 — Improvement Based' : 'Generated Creative'}
                  </Badge>
                  <h2 className="text-2xl font-bold text-foreground drop-shadow-xl">
                     {headline}
                  </h2>
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
            <div className="shrink-0 p-6 grid grid-cols-[1fr_200px] gap-4 bg-background border-t border-border">
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
                       <p className="text-[10px] text-emerald-400/60 leading-relaxed mt-0.5 line-clamp-2">{improvementSummary}</p>
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
                  <div className="flex-1 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-center">
                     <span className="text-[9px] font-semibold text-emerald-500/60 uppercase tracking-wider">Score</span>
                     <div className="text-2xl font-bold font-mono text-emerald-500">
                       {score}
                       <span className="text-xs opacity-30 ml-1">/10</span>
                     </div>
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
    </div>
  )
}
