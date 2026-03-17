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
                        <h2 className="text-3xl font-black italic text-white uppercase tracking-tight leading-none">
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

          {/* LOADING MODE */}
          {currentTabState.mode === "loading" && (
            <div className="flex-1 flex flex-col items-center justify-center relative animate-in fade-in duration-700 overflow-hidden">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full animate-pulse" />
               
               <div className="z-10 flex flex-col items-center space-y-12 w-full max-w-2xl px-8">
                  {/* Visual Automation Pipeline Flow */}
                  <div className="flex items-center justify-between w-full relative px-4">
                     {/* Dynamic Pipeline Path */}
                     <div className="absolute top-[31px] left-[15%] right-[15%] h-[2px] bg-muted shadow-inner rounded-full z-0">
                        {/* Progress Fill */}
                        <div 
                           className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-500"
                           style={{ width: `${Math.min(100, currentTabState.progress * 1.5)}%` }}
                        />
                     </div>

                     {/* Animated Data Packets (Automation Event Flow) */}
                     {currentTabState.progress > 0 && currentTabState.progress < 100 && (
                        <div className="absolute top-[31px] left-[15%] right-[15%] z-0 pointer-events-none">
                           <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_12px_2px_rgba(96,165,250,0.8)] animate-[flow_2s_linear_infinite]" />
                           <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_10px_2px_rgba(52,211,153,0.8)] animate-[flow_2s_linear_infinite_0.7s]" />
                           <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_15px_3px_rgba(34,211,238,0.8)] animate-[flow_2.5s_linear_infinite_1.4s]" />
                        </div>
                     )}
                     
                     {[
                       { icon: Database, label: "Data Input", threshold: 1, delay: 0 },
                       { icon: Activity, label: "AI Analysis", threshold: 30, delay: 200 },
                       { icon: Layout, label: "Final Output", threshold: 85, delay: 400 }
                     ].map(({ icon: Icon, label, threshold, delay }) => {
                        const active = currentTabState.progress >= threshold;
                        return (
                          <div key={label} className="flex flex-col items-center gap-4 relative z-10 w-24">
                             <div className={cn(
                               "w-16 h-16 rounded-2xl border-2 flex items-center justify-center transition-all duration-700 relative bg-background z-20",
                               active 
                                  ? "border-primary text-primary shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)] scale-110" 
                                  : "border-border text-muted-foreground scale-100"
                             )}>
                                {/* Active Processing Pulse */}
                                {active && currentTabState.progress < 100 && (
                                   <div className="absolute inset-0 border-2 border-blue-400/50 rounded-2xl animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                                )}
                                <Icon className={cn("w-7 h-7 relative z-10", active && "animate-pulse")} />
                             </div>
                             <span className={cn(
                               "text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors duration-500 text-center mt-2", 
                               active ? "text-primary" : "text-muted-foreground"
                             )}>
                                {label}
                             </span>
                          </div>
                        );
                     })}
                  </div>

                  <div className="space-y-5 text-center w-full max-w-sm">
                     <div className="h-8">
                       <h3 className="text-xl font-bold text-foreground/90 animate-in fade-in slide-in-from-bottom-2">
                          {currentTabState.progress < 30 ? "Initializing Neural Synapses..." : 
                           currentTabState.progress < 75 ? "Synthesizing Creative Variation..." : 
                           "Finalizing Visual Assets..."}
                       </h3>
                     </div>
                     
                     <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden shadow-inner border border-border/50">
                        <div 
                           className="h-full bg-gradient-to-r from-primary via-primary/80 to-emerald-500 transition-all duration-300 ease-out rounded-full relative" 
                           style={{ width: `${currentTabState.progress}%` }}
                        >
                           <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-background/50 blur-sm animate-pulse" />
                        </div>
                     </div>
                     <span className="text-[12px] font-mono font-bold text-muted-foreground block">{Math.floor(currentTabState.progress)}% COMPLETED</span>
                  </div>
               </div>

               <button onClick={cancelProcess} className="absolute bottom-12 px-8 py-2.5 bg-muted/50 border border-border rounded-full text-[11px] font-bold tracking-widest uppercase hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive transition-all text-foreground">
                  Abort Pipeline
               </button>

               <style dangerouslySetInnerHTML={{__html: `
                  @keyframes flow {
                    0% { left: 0%; opacity: 0; transform: scale(0.5); }
                    10% { opacity: 1; transform: scale(1); }
                    90% { opacity: 1; transform: scale(1); }
                    100% { left: 100%; opacity: 0; transform: scale(0.5); }
                  }
               `}} />
            </div>
          )}

          {/* COMPLETE MODE */}
          {currentTabState.mode === "complete" && currentTabState.result && (
            <div className="flex-1 flex flex-col animate-in zoom-in-95 duration-700 h-full overflow-hidden">
               <div className="flex-1 relative group overflow-hidden bg-background flex items-center justify-center">
                  {currentTabState.result.imageUrl ? (
                    <img src={currentTabState.result.imageUrl} className="w-full h-full object-contain transition-transform duration-[20s] group-hover:scale-105" alt="" />
                  ) : (
                    <div className="flex flex-col items-center justify-center opacity-40">
                      <ImageIcon className="w-24 h-24 mb-4 text-muted-foreground" />
                      <p className="text-sm font-semibold text-muted-foreground">Image Generation Failed / Skipped</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-80 pointer-events-none" />
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
                  <button onClick={() => window.open(currentTabState.result.imageUrl)} className="px-5 py-2 bg-muted text-foreground border border-border rounded-lg font-semibold text-[11px] flex items-center gap-2 hover:bg-muted/80 transition-all">
                     <Download className="w-3.5 h-3.5" /> Export
                  </button>
                  </div>
               </div>

               <div className="absolute bottom-6 left-6 max-w-lg space-y-2">
                  <Badge className="bg-primary/10 border-primary/30 text-[9px] font-semibold px-3 py-1 rounded-full backdrop-blur-xl text-primary">
                    Generated Creative
                  </Badge>
                  <h2 className="text-2xl font-bold text-foreground drop-shadow-xl">
                     {currentTabState.result.copywriting?.headline?.primary || currentTabState.result.metaAd?.headline || "Creative Generated"}
                  </h2>
               </div>
            </div>
          )}

          {currentTabState.mode === "complete" && currentTabState.result && (
            <div className="shrink-0 p-6 grid grid-cols-[1fr_200px] gap-4 bg-background border-t border-border">
               <div className="bg-muted/30 border border-border rounded-xl p-5 relative flex items-center min-h-[80px]">
                 <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 pr-10">
                    {currentTabState.result.copywriting?.body?.primary || currentTabState.result.metaAd?.primaryText || "High-performance creative generated."}
                 </p>
                 <button onClick={() => { navigator.clipboard.writeText(currentTabState.result.copywriting?.body?.primary || ""); toast.success("Copied!"); }} className="absolute top-3 right-3 p-2 text-muted-foreground hover:text-primary transition-all bg-muted border border-border rounded-lg">
                   <Copy className="w-4 h-4" />
                 </button>
               </div>
               <div className="flex flex-col gap-3">
                  <div className="flex-1 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col justify-center">
                     <span className="text-[9px] font-semibold text-emerald-500/60 uppercase tracking-wider">Score</span>
                     <div className="text-2xl font-bold font-mono text-emerald-500">
                       {currentTabState.result?.creativeConcept?.targetScore || (currentTabState.result?.targetScore) || "8.5"}
                       <span className="text-xs opacity-30 ml-1">/10</span>
                     </div>
                  </div>
                  <div className="flex-1 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex flex-col justify-center">
                     <span className="text-[9px] font-semibold text-blue-400/60 uppercase tracking-wider">Tier</span>
                     <div className="text-lg font-bold text-blue-400 capitalize">
                       {currentTabState.result?.creativeConcept?.performanceTier || currentTabState.result?.performanceTier || "PREMIUM"}
                     </div>
                  </div>
               </div>
            </div>
          )}
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
