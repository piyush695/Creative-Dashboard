"use client"

import { Suspense, useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Search, ChevronDown, BarChart3, Zap, TestTube, Loader2, ChevronsLeft, ChevronsRight, Settings, LogOut, User, LayoutDashboard, Lock, Menu, RefreshCcw, X, Activity, Maximize2, Sparkles, HelpCircle, GripHorizontal, Grip, ListFilter, Bot, Calendar, Trophy, BookOpen, Check, TrendingUp, Globe, LayoutGrid, List, Table as TableIcon, Grid2X2, Shield } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import { signOut } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { Moon, Sun, Settings2 } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import DashboardHeader from "@/components/dashboard-header"
import MetricsGrid from "@/components/metrics-grid"
import ScoresSection from "@/components/scores-section"
import InsightsSection from "@/components/insights-section"
import SampleAds from "@/components/sample-ads"
import AnalysisSidebar from "@/components/analysis-sidebar"
import Footer from "@/components/footer"
import { useIsMobile } from "@/hooks/use-mobile"
import { fetchAdsFromMongo } from "@/actions/ads"
import { AdData } from "@/lib/types"
import ScoreRadarChart from "@/components/score-radar-chart"
import { EnlargedImageModal } from "@/components/enlarged-image-modal"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import ProfileView from "@/components/profile-view"
import SettingsView from "@/components/settings-view"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

const ACCOUNT_LIST = [
    { id: "25613137998288459", name: "HP FOREX - EU" },
    { id: "1333109771382157", name: "HP FOREX - LATAM" },
    { id: "1002675181794911", name: "HP FOREX - UK" },
    { id: "1507386856908357", name: "HP FOREX - USA + CA" },
    { id: "1024147486590417", name: "HP FUTURES - USA + CA" },
];

function DashboardContent() {
    const { toast } = useToast()
    const { data: session, status } = useSession()
    const { setTheme, theme, resolvedTheme } = useTheme()
    const searchParams = useSearchParams()
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedAdId, setSelectedAdId] = useState<string | null>(null)
    const [selectedAccountId, setSelectedAccountId] = useState<string>("all")
    const [ads, setAds] = useState<AdData[]>([])
    const [recentHistory, setRecentHistory] = useState<string[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
    const [activeAnalysis, setActiveAnalysis] = useState<{ type: 'score' | 'metric', name: string } | null>(null)
    const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())
    const [relativeTime, setRelativeTime] = useState("just now")
    const [newEntriesCount, setNewEntriesCount] = useState(0)
    const [isSyncing, setIsSyncing] = useState(false)
    const [showRefreshText, setShowRefreshText] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string; accountName?: string } | null>(null)
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false)
    const isMobile = useIsMobile()
    const [viewFilter, setViewFilter] = useState("Top Perf.")
    const [isGuideOpen, setIsGuideOpen] = useState(false)
    const [isViewAllAdsOpen, setIsViewAllAdsOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [discoveryAccountFilter, setDiscoveryAccountFilter] = useState("all")
    const [discoveryViewMode, setDiscoveryViewMode] = useState<"grid" | "list" | "table" | "compact">("grid")
    const [isGlassmorphismEnabled, setIsGlassmorphismEnabled] = useState(true)
    const [isCompactModeEnabled, setIsCompactModeEnabled] = useState(false)
    const [isReducedMotionEnabled, setIsReducedMotionEnabled] = useState(false)
    const [isAlertSystemEnabled, setIsAlertSystemEnabled] = useState(false)

    // Synchronize settings from localStorage
    useEffect(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("dashboard_settings")
            if (saved) {
                const settings = JSON.parse(saved)
                setIsGlassmorphismEnabled(settings.glassmorphism ?? true)
                setIsCompactModeEnabled(settings.compactMode ?? false)
                setIsReducedMotionEnabled(settings.reducedMotion ?? false)
                setIsAlertSystemEnabled(settings.alertSystem ?? false)
                if (settings.compactMode) {
                    setDiscoveryViewMode("compact")
                }
            }
        }
    }, [isSettingsOpen]) // Refresh when settings view is closed

    // Force cleanup of body lock on mount
    useEffect(() => {
        setMounted(true)
        document.body.style.pointerEvents = 'auto'
        document.body.style.overflow = ''
    }, [])

    // Update relative time text every minute
    useEffect(() => {
        const timer = setInterval(() => {
            setRelativeTime(formatDistanceToNow(lastRefreshTime, { addSuffix: true }))
        }, 60000) // update every 1m
        setRelativeTime(formatDistanceToNow(lastRefreshTime, { addSuffix: true }))

        return () => clearInterval(timer)
    }, [lastRefreshTime])

    useEffect(() => {
        if (status === "unauthenticated") {
            router.replace("/login")
        }
    }, [status, router])

    // 1. Extract unique accounts from ad data (Dynamic from DB)
    const accounts = useMemo(() => {
        return ACCOUNT_LIST.sort((a, b) => a.name.localeCompare(b.name))
    }, [])

    // Calculate ad counts per account
    const accountStats = useMemo(() => {
        return accounts.map(account => ({
            ...account,
            count: ads.filter(ad => ad.adAccountId === account.id).length
        })).filter(acc => acc.count > 0);
    }, [ads, accounts]);

    // 2. Load data from MongoDB with real-time polling
    const loadData = async (isManual = false) => {
        if (isSyncing) return
        if (isManual) setIsSyncing(true)

        try {
            const data = await fetchAdsFromMongo()

            const oldCount = ads.length
            const newCount = data.length

            if (oldCount > 0 && newCount > oldCount) {
                setNewEntriesCount(newCount - oldCount)
                if (isManual) {
                    toast({
                        title: "Scan Complete",
                        description: `Found ${newCount - oldCount} new entries since last check.`,
                        duration: 5000,
                    })
                }
            } else if (isManual) {
                toast({
                    title: "Dashboard Up to Date",
                    description: "No new entries found in the database.",
                    duration: 5000,
                })
            }

            setAds(data)
            setLastRefreshTime(new Date())

            // Show refresh text for 5 seconds only on manual refresh
            if (isManual) {
                setShowRefreshText(true)
                setTimeout(() => setShowRefreshText(false), 5000)
            }

            if (isLoading && data.length > 0) {
                const topPerformer = data.find(ad => ad.performanceLabel === "TOP_PERFORMER") || data[0]
                const firstId = topPerformer.id
                setSelectedAdId(firstId)
                setRecentHistory([firstId])
                setIsLoading(false)
            }
        } catch (error) {
            console.error("Fetch error:", error)
        } finally {
            if (isManual) {
                setIsSyncing(false)
                if (isAlertSystemEnabled) {
                    const { dismiss } = toast({
                        title: "Sync Synchronized",
                        description: "System has successfully finalized current database polling.",
                        duration: 3000
                    })
                    setTimeout(() => dismiss(), 3000)
                }
            }
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [isLoading]) // Removed interval for manual-only refresh

    // handle login success toast
    useEffect(() => {
        const loggedIn = searchParams.get("loggedIn") === "true"
        const welcome = searchParams.get("welcome") === "true"
        const nameParam = searchParams.get("name")

        if (loggedIn && status === "authenticated") {
            const userName = nameParam || session?.user?.name || "User"

            if (welcome) {
                toast({
                    title: "Account Created Successfully!",
                    description: `You are now logged in as ${userName}`,
                    variant: "success",
                })
            } else {
                toast({
                    title: `Welcome, ${userName}!`,
                    description: "You have successfully logged in.",
                    variant: "success",
                })
            }

            // Remove the query param without refreshing
            router.replace("/")
        }
    }, [searchParams, router, toast, session, status])

    // 3. Memoized displayed ads (Isolated filtering)
    const { displayedAds, hasAdsInAccount } = useMemo(() => {
        let filteredAds = [...ads]

        // 1. Filter by account
        if (selectedAccountId !== "all") {
            filteredAds = filteredAds.filter(ad => ad.adAccountId === selectedAccountId)
        }

        const accountHasAds = filteredAds.length > 0
        const query = searchQuery.trim().toLowerCase()

        // 2. Sort/Filter based on Analysis Mode (viewFilter)
        if (viewFilter === "AI Rec.") {
            filteredAds.sort((a, b) => (b.scoreOverall || 0) - (a.scoreOverall || 0))
        } else if (viewFilter === "Updated") {
            filteredAds.sort((a, b) => new Date(b.analysisDate).getTime() - new Date(a.analysisDate).getTime())
        } else if (viewFilter === "Top Perf.") {
            const top = filteredAds.filter(ad => ad.performanceLabel === "TOP_PERFORMER")
            const others = filteredAds.filter(ad => ad.performanceLabel !== "TOP_PERFORMER")
            filteredAds = [...top, ...others]
        }

        // 3. Search and Final Result Logic
        let results = []
        if (!query) {
            // Strictly show only 10 ads to keep the dashboard clean
            results = filteredAds.slice(0, 10)
        } else {
            results = filteredAds.filter(ad => {
                const idStr = String(ad.adId || "").toLowerCase()
                const nameStr = String(ad.adName || "").toLowerCase()
                return idStr.includes(query) || nameStr.includes(query)
            })
        }

        return { displayedAds: results, hasAdsInAccount: accountHasAds }
    }, [ads, searchQuery, selectedAccountId, viewFilter])

    // 4. Selection Sync
    useEffect(() => {
        const query = searchQuery.trim().toLowerCase()

        if (query && displayedAds.length > 0) {
            const firstResultId = displayedAds[0].id
            if (selectedAdId !== firstResultId) {
                setSelectedAdId(firstResultId)
                updateHistory(firstResultId)
                setActiveAnalysis(null) // Reset on change
            }
        } else if (query && displayedAds.length === 0) {
            setSelectedAdId(null)
            setActiveAnalysis(null)
        } else if (!query && displayedAds.length > 0) {
            if (!selectedAdId || !displayedAds.some(ad => ad.id === selectedAdId)) {
                const firstId = displayedAds[0].id
                setSelectedAdId(firstId)
                updateHistory(firstId)
            }
            setActiveAnalysis(null) // Instant hide when search is cleared
        }
    }, [searchQuery, displayedAds, selectedAdId])

    const updateHistory = (id: string) => {
        if (!id) return
        setRecentHistory(prev => {
            const filtered = prev.filter(item => item !== id)
            return [id, ...filtered].slice(0, 3)
        })
    }

    const handleSelectAd = (id: string) => {
        setSelectedAdId(id)
        updateHistory(id)
    }

    const selectedAdData = ads.find(ad => ad.id === selectedAdId) || null

    const recentAds = recentHistory
        .map(id => ads.find(ad => ad.id === id))
        .filter((ad): ad is AdData => !!ad)

    const handleAction = (action: string) => {
        // Action handled here
    }

    // 5. Calculate Dynamic Benchmarks
    const benchmarkScores = useMemo(() => {
        if (displayedAds.length === 0) return null

        const total = displayedAds.length
        const sums = displayedAds.reduce((acc, ad) => ({
            scoreComposition: acc.scoreComposition + (ad.scoreComposition || 0),
            scoreColorUsage: acc.scoreColorUsage + (ad.scoreColorUsage || 0),
            scoreTypography: acc.scoreTypography + (ad.scoreTypography || 0),
            // Mapping "Hook" to Visual Design for now (or Emotional Appeal)
            scoreVisualDesign: acc.scoreVisualDesign + (ad.scoreVisualDesign || 0),
            // Mapping "Prop" to Trust Signals?
            scoreTrustSignals: acc.scoreTrustSignals + (ad.scoreTrustSignals || 0),
            scoreCTA: acc.scoreCTA + (ad.scoreCTA || 0),
        }), {
            scoreComposition: 0,
            scoreColorUsage: 0,
            scoreTypography: 0,
            scoreVisualDesign: 0,
            scoreTrustSignals: 0,
            scoreCTA: 0,
        })

        return {
            scoreComposition: Math.round((sums.scoreComposition / total) * 10) / 10,
            scoreColorUsage: Math.round((sums.scoreColorUsage / total) * 10) / 10,
            scoreTypography: Math.round((sums.scoreTypography / total) * 10) / 10,
            scoreVisualDesign: Math.round((sums.scoreVisualDesign / total) * 10) / 10,
            scoreTrustSignals: Math.round((sums.scoreTrustSignals / total) * 10) / 10,
            scoreCTA: Math.round((sums.scoreCTA / total) * 10) / 10,
        }
    }, [displayedAds])

    return (
        <div suppressHydrationWarning className="flex flex-col h-[100dvh] bg-background dark:bg-[#000000] overflow-hidden relative">
            {/* Global Sticky Banner - True Full Width */}
            <div className="flex items-center justify-between px-6 md:px-8 bg-zinc-50 dark:bg-zinc-900/50 border-b border-border shadow-sm h-14 md:h-16 z-[70] shrink-0 sticky top-0 backdrop-blur-sm transition-all duration-300 relative">
                <button
                    onClick={() => {
                        setIsProfileOpen(false)
                        setIsSettingsOpen(false)
                        setIsGuideOpen(false)
                        setIsViewAllAdsOpen(false)
                    }}
                    className="hover:opacity-80 transition-opacity relative z-10"
                >
                    <div className="flex flex-col items-start leading-none cursor-pointer">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xl md:text-2xl font-black tracking-tightest text-zinc-900 dark:text-white">
                                hola<span className="text-[#007AFF]">prime</span>
                            </span>
                            <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-[#007AFF] animate-pulse" />
                        </div>
                        <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-[#007AFF] opacity-80 mt-1">Creative Analyzer</span>
                    </div>
                </button>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100/50 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5 backdrop-blur-md shadow-sm group hover:scale-105 transition-all duration-500 cursor-default">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse shadow-[0_0_8px_rgba(0,122,255,0.6)]"></span>
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-r from-zinc-600 via-zinc-900 to-zinc-600 dark:from-zinc-400 dark:via-white dark:to-zinc-400 bg-[length:200%_auto] animate-gradient">
                        Hola Prime Creative AI Analyzer
                    </span>
                </div>

                {/* Right Side: Options & Help */}
                <div className="flex items-center gap-3 md:gap-4 relative z-20">
                    {/* Desktop Controls */}
                    <div className="hidden md:flex items-center gap-3">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 px-4 text-[10px] font-black uppercase tracking-[0.15em] bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl border-zinc-200 dark:border-white/10 hover:border-[#007AFF]/50 transition-all duration-300 rounded-full gap-2.5 group relative">
                                    <div className="relative flex items-center gap-2">
                                        <ListFilter className="w-3.5 h-3.5 text-[#007AFF] transition-transform group-hover:rotate-12" />
                                        <span className="text-zinc-700 dark:text-zinc-300">
                                            {viewFilter === "Top Perf." ? "Top Performer" :
                                                viewFilter === "AI Rec." ? "AI Recommendation" :
                                                    viewFilter === "Updated" ? "Last Updated" :
                                                        viewFilter}
                                        </span>
                                        <ChevronDown className="w-3 h-3 opacity-30 group-hover:translate-y-0.5 transition-transform" />
                                    </div>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuContent align="end" className="w-52 z-[1000] p-1.5 rounded-[1.5rem] border-zinc-200 dark:border-white/10 bg-white/98 dark:bg-zinc-900/98 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] animate-in fade-in zoom-in-95 duration-300">
                                    <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-[#007AFF]/60 border-b border-zinc-100 dark:border-white/5 mb-1.5">Analysis Lens</div>

                                    {[
                                        { id: "AI Rec.", label: "AI Recommendation", icon: Bot, color: "text-indigo-500", bg: "bg-indigo-50/50 dark:bg-indigo-500/10" },
                                        { id: "Updated", label: "Last Updated Date", icon: Calendar, color: "text-blue-500", bg: "bg-blue-50/50 dark:bg-blue-500/10" },
                                        { id: "Top Perf.", label: "Top Performer", icon: Trophy, color: "text-amber-500", bg: "bg-amber-50/50 dark:bg-amber-500/10" }
                                    ].map((item) => (
                                        <DropdownMenuItem
                                            key={item.id}
                                            className={cn(
                                                "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-0.5",
                                                viewFilter === item.id
                                                    ? `${item.bg} border border-[#007AFF]/10 text-[#007AFF]`
                                                    : "hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-transparent"
                                            )}
                                            onClick={() => setViewFilter(item.id)}
                                        >
                                            <div className="flex items-center gap-2.5">
                                                <item.icon className={cn("w-4 h-4", viewFilter === item.id ? "text-[#007AFF]" : item.color)} />
                                                <span className="text-xs font-bold">{item.label}</span>
                                            </div>
                                            {viewFilter === item.id && <Check className="w-3.5 h-3.5 text-[#007AFF] animate-in zoom-in-50" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenuPortal>
                        </DropdownMenu>

                        <div className="h-4 w-px bg-zinc-300 dark:bg-zinc-700 mx-1"></div>

                        <div className="relative group/help flex items-center pr-2 -mr-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-full text-zinc-400 hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-all relative z-10 group"
                                onClick={() => {
                                    setIsGuideOpen(true)
                                    setIsProfileOpen(false)
                                    setIsSettingsOpen(false)
                                    setIsViewAllAdsOpen(false)
                                }}
                            >
                                <HelpCircle className="w-4 h-4 animate-pulse group-hover:scale-110 transition-transform" />
                            </Button>
                            <div className="absolute right-[100%] top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover/help:opacity-100 group-hover/help:pointer-events-auto transition-all duration-300 translate-x-1 group-hover/help:translate-x-0 z-30 pr-3">
                                <button className="flex" onClick={() => {
                                    setIsGuideOpen(true)
                                    setIsProfileOpen(false)
                                    setIsSettingsOpen(false)
                                    setIsViewAllAdsOpen(false)
                                }}>
                                    <div className="px-3 py-1.5 bg-zinc-900 dark:bg-white text-zinc-50 dark:text-zinc-900 text-[10px] font-black rounded-lg shadow-2xl whitespace-nowrap flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all border border-black/10 dark:border-white/10">
                                        <BookOpen className="w-3.5 h-3.5 text-[#007AFF]" />
                                        Help & Guide
                                    </div>
                                </button>
                            </div>
                            {/* Invisible Bridge to maintain hover state */}
                            <div className="absolute right-full top-0 bottom-0 w-12 hidden group-hover/help:block" />
                        </div>
                    </div>

                    {/* Mobile Controls (9-dots Menu) */}
                    <div className="md:hidden">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-[#007AFF] hover:bg-[#007AFF]/10 rounded-xl transition-all active:scale-95 group">
                                    <Grip className="w-5 h-5 transition-transform group-active:rotate-45 animate-pulse" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuPortal>
                                <DropdownMenuContent align="end" className="w-56 z-[1000] p-1.5 rounded-[1.8rem] border-zinc-200/60 dark:border-white/10 bg-white/98 dark:bg-zinc-900/98 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in slide-in-from-top-4 duration-300">
                                    <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-100 dark:border-white/5 mb-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#007AFF]/70">Insights</span>
                                    </div>

                                    {[
                                        { id: "AI Rec.", label: "AI Recommendation", icon: Bot, color: "text-indigo-500", bg: "bg-indigo-500/10" },
                                        { id: "Updated", label: "Last Updated Date", icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" },
                                        { id: "Top Perf.", label: "Top Performer", icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" }
                                    ].map((item) => (
                                        <DropdownMenuItem
                                            key={item.id}
                                            className={cn(
                                                "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all mb-0.5 active:scale-[0.98]",
                                                viewFilter === item.id
                                                    ? "bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/20 shadow-sm"
                                                    : "hover:bg-zinc-50 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-400 border border-transparent"
                                            )}
                                            onClick={() => setViewFilter(item.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <item.icon className={cn("w-4 h-4", viewFilter === item.id ? "text-[#007AFF]" : item.color)} />
                                                <span className="text-xs font-black tracking-tight">{item.label}</span>
                                            </div>
                                            {viewFilter === item.id && <Check className="w-3.5 h-3.5 text-[#007AFF] animate-in zoom-in-50" />}
                                        </DropdownMenuItem>
                                    ))}

                                    <DropdownMenuSeparator className="bg-zinc-100 dark:bg-white/5 mx-2 my-1" />

                                    <DropdownMenuItem
                                        className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 group"
                                        onClick={() => {
                                            setIsGuideOpen(true)
                                            setIsProfileOpen(false)
                                            setIsSettingsOpen(false)
                                            setIsViewAllAdsOpen(false)
                                        }}
                                    >
                                        <BookOpen className="w-4 h-4 text-[#007AFF]" />
                                        <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">Help & Guide</span>
                                        <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-20 -rotate-90 group-hover:translate-x-0.5 transition-transform" />
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenuPortal>
                        </DropdownMenu>
                    </div>

                </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Ambient Background Glows - Login Page Style (Enhanced) */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                    <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-[0.05] dark:opacity-[0.15] blur-[120px] bg-[#007AFF] transition-all duration-1000" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-[0.03] dark:opacity-[0.1] blur-[100px] bg-indigo-600 transition-all duration-1000" />
                    <div className="absolute top-[40%] left-[20%] w-[30%] h-[30%] rounded-full opacity-[0.02] dark:opacity-[0.05] blur-[80px] bg-purple-600 transition-all duration-1000" />
                </div>

                {/* Sidebar - Desktop */}
                <aside
                    className={`${isSidebarCollapsed ? "w-[70px]" : "w-72"} transition-all duration-300 border-r border-border bg-card/80 dark:bg-zinc-900/80 backdrop-blur-xl hidden md:flex flex-col flex-shrink-0 relative z-20`}
                >
                    {/* Top: User Profile / Workspace Switcher */}
                    <div className="px-2 flex items-center border-b border-border h-16 py-[5px]">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className={`group w-full justify-start p-1.5 h-10 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors duration-200 ${isSidebarCollapsed ? "px-0 justify-center" : ""}`}>
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm">
                                        {session?.user?.name?.[0] || "U"}
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <div className="ml-3 flex flex-col items-start overflow-hidden w-full">
                                            <span className="text-sm font-semibold truncate w-full text-left text-zinc-900 dark:text-zinc-100">{session?.user?.name || "User"}</span>
                                            <span className="text-[10px] text-muted-foreground truncate w-full text-left capitalize">{((session?.user as any)?.role || "Viewer")} Plan</span>
                                        </div>
                                    )}
                                    {!isSidebarCollapsed && <ChevronDown className="h-4 w-4 ml-auto text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64" side="right" sideOffset={10}>
                                <div className="px-2 py-1.5 text-sm font-semibold border-b mb-1">
                                    My Account
                                </div>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => {
                                        setIsProfileOpen(true)
                                        setIsSettingsOpen(false)
                                        setIsViewAllAdsOpen(false)
                                        setIsGuideOpen(false)
                                    }}
                                >
                                    <User className="mr-2 h-4 w-4" /> Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => {
                                        setIsSettingsOpen(true)
                                        setIsProfileOpen(false)
                                        setIsViewAllAdsOpen(false)
                                        setIsGuideOpen(false)
                                    }}
                                >
                                    <Settings className="mr-2 h-4 w-4" /> Settings
                                </DropdownMenuItem>
                                {(session?.user as any)?.provider === "credentials" && (
                                    <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)}>
                                        <Lock className="mr-2 h-4 w-4" /> Change Password
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => signOut({ callbackUrl: "/login" })}>
                                    <LogOut className="mr-2 h-4 w-4" /> Log out
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    {/* Middle: Accounts & Navigation */}
                    <div className="flex-1 overflow-auto py-4 space-y-4">
                        {/* Account Switcher */}
                        <div className={`px-3 ${isSidebarCollapsed ? "flex justify-center" : ""}`}>
                            {!isSidebarCollapsed ? (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-muted-foreground ml-1">AD ACCOUNT</label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-between bg-primary/5 dark:bg-primary/10 text-foreground hover:bg-primary/10 dark:hover:bg-primary/20 border-primary/20 font-semibold h-9 text-xs"
                                            >
                                                <span className="truncate">
                                                    {selectedAccountId === "all" ? "All Accounts" : accounts.find(a => a.id === selectedAccountId)?.name || "Unknown Account"}
                                                </span>
                                                <ChevronDown className="h-3 w-3 opacity-50 ml-2 flex-shrink-0" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="start" className="w-60 max-h-80 overflow-y-auto">
                                            <DropdownMenuItem
                                                onClick={() => setSelectedAccountId("all")}
                                                className={selectedAccountId === "all" ? "bg-primary/10 font-bold" : ""}
                                            >
                                                <BarChart3 className="h-4 w-4 mr-2" />
                                                <span>All Accounts</span>
                                            </DropdownMenuItem>
                                            {accounts.map((account) => (
                                                <DropdownMenuItem
                                                    key={account.id}
                                                    onClick={() => {
                                                        setSelectedAccountId(account.id)
                                                        setIsViewAllAdsOpen(false)
                                                        const firstAdInAccount = ads.find(ad => ad.adAccountId === account.id)
                                                        if (firstAdInAccount) handleSelectAd(firstAdInAccount.id)
                                                    }}
                                                    className={selectedAccountId === account.id ? "bg-primary/10 font-bold" : ""}
                                                >
                                                    <BarChart3 className="h-4 w-4 mr-2" />
                                                    <div className="flex flex-col items-start leading-tight">
                                                        <span>{account.name}</span>
                                                        <span className="text-[9px] text-muted-foreground font-mono leading-none mt-1">{account.id}</span>
                                                    </div>
                                                </DropdownMenuItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ) : (
                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg bg-primary/10">
                                    <BarChart3 className="h-4 w-4 text-primary" />
                                </Button>
                            )}
                        </div>

                        {/* Desktop Search (Collapsed: Hidden or Icon) */}
                        <div className={`px-3 ${isSidebarCollapsed ? "hidden" : ""}`}>
                            <div className="relative group z-50">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                <Input
                                    placeholder="Search ads by ID..."
                                    value={searchQuery}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                        const val = e.target.value
                                        setSearchQuery(val)
                                        if (!val.trim()) {
                                            setSelectedAccountId("all")
                                        }
                                        setIsSearchDropdownOpen(true)
                                    }}
                                    onFocus={() => setIsSearchDropdownOpen(true)}
                                    onBlur={() => {
                                        // Slight delay to allow click event on dropdown items to fire
                                        setTimeout(() => setIsSearchDropdownOpen(false), 200)
                                    }}
                                    className="pl-8 pr-8 h-8 text-xs bg-muted/40 dark:bg-zinc-800/40 border-muted dark:border-zinc-700/50 focus-visible:ring-primary/20 rounded-lg"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => {
                                            setSearchQuery("")
                                            setSelectedAccountId("all")
                                            setIsSearchDropdownOpen(false)
                                        }}
                                        className="absolute right-2 top-2 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-all"
                                        title="Clear search"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                )}

                                {/* Search Results Dropdown */}
                                {searchQuery.trim().length > 0 && isSearchDropdownOpen && (
                                    <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg z-50">
                                        <div className="py-1">
                                            {ads.filter(ad =>
                                                String(ad.adId).toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                String(ad.adName).toLowerCase().includes(searchQuery.toLowerCase())
                                            ).length > 0 ? (
                                                ads.filter(ad =>
                                                    String(ad.adId).toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    String(ad.adName).toLowerCase().includes(searchQuery.toLowerCase())
                                                ).slice(0, 10).map((ad) => (
                                                    <button
                                                        key={ad.id}
                                                        onClick={() => {
                                                            // Only switch account if the ad's account exists in our known list
                                                            const accountExists = accounts.some(a => a.id === ad.adAccountId)
                                                            if (accountExists) {
                                                                setSelectedAccountId(ad.adAccountId)
                                                            }
                                                            // Otherwise, keep the current selection (e.g., "All Accounts")

                                                            setSelectedAdId(ad.id)
                                                            setSearchQuery(ad.adId) // Auto-fill search with exact ID
                                                            updateHistory(ad.id)
                                                            setIsSearchDropdownOpen(false) // Close dropdown
                                                            setIsViewAllAdsOpen(false) // Close view all ads if open
                                                        }}
                                                        className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 flex flex-col gap-0.5 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                                                    >
                                                        <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{ad.adName}</span>
                                                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                                            <span className="font-mono truncate max-w-[120px]">{ad.adId}</span>
                                                            <span className="opacity-70">{accounts.find(a => a.id === ad.adAccountId)?.name}</span>
                                                        </div>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                                                    No ads found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* View All Ads Toggle */}
                        <div className={`px-3 mb-4 ${isSidebarCollapsed ? "flex justify-center" : ""}`}>
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setIsViewAllAdsOpen(true)
                                    setIsGuideOpen(false)
                                    setIsProfileOpen(false)
                                    setIsSettingsOpen(false)
                                    if (isMobile) setIsMobileMenuOpen(false)
                                }}
                                className={`w-full justify-start gap-3 h-10 px-2 rounded-lg transition-all ${isViewAllAdsOpen ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted"} ${isSidebarCollapsed ? "w-10 h-10 p-0 justify-center" : ""}`}
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                {!isSidebarCollapsed && <span className="text-[13px] font-bold">View All Ads</span>}
                            </Button>
                        </div>

                        {/* Recent History */}
                        <div className="px-3">
                            {!isSidebarCollapsed && <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">Recent Audits</h3>}
                            <div className="space-y-1">
                                {recentAds.map((ad) => (
                                    <button
                                        key={ad.id}
                                        onClick={() => handleSelectAd(ad.id)}
                                        className={`w-full text-left px-2 py-2 rounded-md transition-all border flex items-center gap-3 ${selectedAdId === ad.id
                                            ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                            : "border-transparent hover:bg-muted text-foreground"
                                            } ${isSidebarCollapsed ? "justify-center px-0" : ""}`}
                                        title={ad.adName}
                                    >
                                        {isSidebarCollapsed ? (
                                            <span className="font-mono text-xs font-bold">{ad.adId.substring(0, 2)}</span>
                                        ) : (
                                            <div className="overflow-hidden">
                                                <span className="text-xs font-medium leading-tight line-clamp-1 block">{ad.adName}</span>
                                                <span className="text-[9px] opacity-70 font-mono block truncate">{ad.adId}</span>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Bottom: Sidebar Toggle */}
                    <div className="p-3 border-t border-border mt-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={`w-full text-muted-foreground hover:text-foreground ${isSidebarCollapsed ? "justify-center" : "justify-start"}`}
                            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                        >
                            {isSidebarCollapsed ? <ChevronsRight className="h-4 w-4" /> : (
                                <>
                                    <ChevronsLeft className="h-4 w-4 mr-2" />
                                    <span className="text-xs">Collapse sidebar</span>
                                </>
                            )}
                        </Button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden bg-transparent scroll-smooth transition-all duration-300 relative z-10">
                    <div className="flex items-center justify-between px-4 md:px-8 h-16 md:h-20 py-2 border-b border-border bg-background/50 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-10 transition-all duration-300">
                        <div className="flex items-center gap-4 min-w-0 overflow-hidden">
                            {/* Mobile Sidebar Trigger */}
                            <div className="md:hidden flex-shrink-0">
                                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                                    <SheetTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <Menu className="h-4.5 w-4.5 text-zinc-700 dark:text-zinc-300" />
                                        </Button>
                                    </SheetTrigger>
                                    <SheetContent side="left" className="p-0 w-72">
                                        <SheetHeader className="sr-only">
                                            <SheetTitle>Navigation Menu</SheetTitle>
                                            <SheetDescription>Access your profile, settings, and ad accounts.</SheetDescription>
                                        </SheetHeader>
                                        {/* Mobile Sidebar Content */}
                                        <div className="flex flex-col h-full bg-card">
                                            {/* Profile Section */}
                                            <div className="p-4 border-b border-border">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="group w-full justify-start p-2 h-14 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                                            <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                                                                {session?.user?.name?.[0] || "U"}
                                                            </div>
                                                            <div className="ml-3 flex flex-col items-start overflow-hidden w-full">
                                                                <span className="text-sm font-semibold truncate w-full text-left text-zinc-900 dark:text-zinc-100">{session?.user?.name || "User"}</span>
                                                                <span className="text-xs text-muted-foreground truncate w-full text-left capitalize">{((session?.user as any)?.role || "Viewer")} Plan</span>
                                                            </div>
                                                            <ChevronDown className="h-4 w-4 ml-auto text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start" className="w-60">
                                                        <SheetClose asChild>
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={() => {
                                                                    setIsProfileOpen(true)
                                                                    setIsSettingsOpen(false)
                                                                    setIsViewAllAdsOpen(false)
                                                                    setIsGuideOpen(false)
                                                                    setIsMobileMenuOpen(false)
                                                                }}
                                                            >
                                                                <User className="mr-2 h-4 w-4" /> Profile
                                                            </DropdownMenuItem>
                                                        </SheetClose>
                                                        <SheetClose asChild>
                                                            <DropdownMenuItem
                                                                className="cursor-pointer"
                                                                onClick={() => {
                                                                    setIsSettingsOpen(true)
                                                                    setIsProfileOpen(false)
                                                                    setIsViewAllAdsOpen(false)
                                                                    setIsGuideOpen(false)
                                                                    setIsMobileMenuOpen(false)
                                                                }}
                                                            >
                                                                <Settings className="mr-2 h-4 w-4" /> Settings
                                                            </DropdownMenuItem>
                                                        </SheetClose>
                                                        {(session?.user as any)?.provider === "credentials" && (
                                                            <DropdownMenuItem onClick={() => setIsPasswordDialogOpen(true)}>
                                                                <Lock className="mr-2 h-4 w-4" /> Change Password
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => signOut({ callbackUrl: "/login" })}>
                                                            <LogOut className="mr-2 h-4 w-4" /> Log out
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>

                                            {/* Navigation / Accounts */}
                                            <div className="flex-1 overflow-auto py-4 px-3 space-y-4">
                                                <div className="space-y-1">
                                                    <label className="text-xs font-semibold text-muted-foreground ml-1">AD ACCOUNT</label>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" className="w-full justify-between bg-primary/5 text-foreground hover:bg-primary/10 border-primary/20 font-semibold h-10">
                                                                <span className="truncate">
                                                                    {selectedAccountId === "all" ? "All Accounts" : accounts.find(a => a.id === selectedAccountId)?.name || "Unknown Account"}
                                                                </span>
                                                                <ChevronDown className="h-4 w-4 opacity-50 ml-2 flex-shrink-0" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
                                                            <SheetClose asChild>
                                                                <DropdownMenuItem
                                                                    onClick={() => setSelectedAccountId("all")}
                                                                    className={selectedAccountId === "all" ? "bg-primary/10 font-bold" : ""}
                                                                >
                                                                    <BarChart3 className="h-4 w-4 mr-2" />
                                                                    <span>All Accounts</span>
                                                                </DropdownMenuItem>
                                                            </SheetClose>
                                                            {accounts.map((account) => (
                                                                <SheetClose key={account.id} asChild>
                                                                    <DropdownMenuItem
                                                                        onClick={() => {
                                                                            setSelectedAccountId(account.id)
                                                                            const firstAdInAccount = ads.find(ad => ad.adAccountId === account.id)
                                                                            if (firstAdInAccount) handleSelectAd(firstAdInAccount.id)
                                                                        }}
                                                                        className={selectedAccountId === account.id ? "bg-primary/10 font-bold" : ""}
                                                                    >
                                                                        <BarChart3 className="h-4 w-4 mr-2" />
                                                                        <div className="flex flex-col items-start leading-tight">
                                                                            <span>{account.name}</span>
                                                                            <span className="text-[9px] text-muted-foreground font-mono leading-none mt-1">{account.id}</span>
                                                                        </div>
                                                                    </DropdownMenuItem>
                                                                </SheetClose>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-xs font-semibold text-muted-foreground ml-1">MENU</label>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setIsViewAllAdsOpen(true)
                                                            setIsGuideOpen(false)
                                                            setIsMobileMenuOpen(false)
                                                        }}
                                                        className={`w-full justify-start gap-3 h-12 px-3 rounded-lg transition-all ${isViewAllAdsOpen ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                                                    >
                                                        <LayoutDashboard className="h-5 w-5" />
                                                        <span className="text-sm font-bold">View All Ads</span>
                                                    </Button>
                                                </div>

                                                <div className="space-y-1">
                                                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">Recent Audits</h3>
                                                    {recentAds.map((ad) => (
                                                        <SheetClose key={ad.id} asChild>
                                                            <button
                                                                onClick={() => handleSelectAd(ad.id)}
                                                                className={`w-full text-left px-3 py-3 rounded-md transition-all border flex items-center gap-3 ${selectedAdId === ad.id
                                                                    ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                                                    : "border-transparent hover:bg-muted text-foreground"
                                                                    }`}
                                                            >
                                                                <div className="overflow-hidden">
                                                                    <span className="text-sm font-medium leading-tight line-clamp-1 block">{ad.adName}</span>
                                                                    <span className="text-xs opacity-70 font-mono block truncate">{ad.adId}</span>
                                                                </div>
                                                            </button>
                                                        </SheetClose>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </SheetContent>
                                </Sheet>
                            </div>

                            {/* Mobile Title - Breadcrumbs Style */}
                            <div className="flex items-center md:hidden min-w-0 overflow-hidden ml-1 mr-auto">
                                <span className="text-sm text-muted-foreground/70 mr-1.5 flex-shrink-0">Dashboard</span>
                                <span className="text-sm text-muted-foreground/50 mr-1.5 flex-shrink-0">/</span>
                                <span className="font-semibold text-sm text-foreground truncate">
                                    {isProfileOpen ? "Profile" : isSettingsOpen ? "Settings" : isGuideOpen ? "Guide" : isViewAllAdsOpen ? "All Ads" : (selectedAccountId === "all" ? "All Accounts" : accounts.find(a => a.id === selectedAccountId)?.name || "Dashboard")}
                                </span>
                            </div>

                            {/* Desktop Breadcrumbs */}
                            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                                <LayoutDashboard className="h-4 w-4 text-muted-foreground/50" />
                                <span>/</span>
                                <span className="font-medium text-foreground">Dashboard</span>
                                <span>/</span>
                                <span className="truncate max-w-[150px] lg:max-w-none">{isProfileOpen ? "Profile" : isSettingsOpen ? "Settings" : isGuideOpen ? "Guide" : isViewAllAdsOpen ? "All Ads" : (selectedAccountId === "all" ? "All Accounts" : accounts.find(a => a.id === selectedAccountId)?.name)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-1">
                            {isGuideOpen ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setIsGuideOpen(false);
                                        const { dismiss } = toast({
                                            title: "Guide Closed",
                                            description: "We hope this documentation helped you.",
                                            duration: 5000
                                        });
                                        // Force dismissal after 5 seconds for both desktop and mobile
                                        setTimeout(() => {
                                            dismiss();
                                        }, 5000);
                                    }}
                                    className="rounded-full hover:bg-red-50 hover:text-red-500 h-9 w-9 border border-zinc-200 dark:border-zinc-800"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            ) : isViewAllAdsOpen ? (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        setIsViewAllAdsOpen(false)
                                        setEnlargedImage(null)
                                    }}
                                    className="rounded-full hover:bg-red-50 hover:text-red-500 h-9 w-9 border border-zinc-200 dark:border-zinc-800"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => loadData(true)}
                                        disabled={isSyncing}
                                        className={cn(
                                            "hidden md:flex group items-center transition-all duration-300 flex-shrink-0 relative h-10 border shadow-sm active:scale-[0.96]",
                                            "rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
                                            "hover:bg-zinc-50 dark:hover:bg-zinc-800/80",
                                            showRefreshText || isSyncing ? "px-4" : "w-10 justify-center",
                                            isSyncing && "opacity-70 pointer-events-none"
                                        )}
                                    >
                                        <RefreshCcw className={cn("h-4 w-4 transition-transform duration-1000 text-zinc-600 dark:text-zinc-400", isSyncing && "animate-spin")} />
                                        <div className={cn(
                                            "overflow-hidden transition-all duration-500 flex items-center",
                                            showRefreshText || isSyncing ? "max-w-[180px] opacity-100 ml-2.5" : "max-w-0 opacity-0 ml-0"
                                        )}>
                                            <span className="text-[12px] font-bold text-zinc-600 dark:text-zinc-400 whitespace-nowrap uppercase tracking-wider">
                                                {isSyncing ? "Syncing..." : "Updated"}
                                            </span>
                                        </div>
                                    </button>
                                    <div className="hidden md:block">
                                        <ModeToggle />
                                    </div>

                                    <div className="md:hidden">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-9 w-9 rounded-full bg-zinc-100 dark:bg-zinc-800 text-foreground"
                                                >
                                                    <Settings2 className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56 p-1.5 rounded-xl">
                                                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Actions</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => loadData(true)} className="rounded-lg cursor-pointer">
                                                    <RefreshCcw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                                                    <span>{isSyncing ? "Syncing..." : "Refresh Data"}</span>
                                                </DropdownMenuItem>

                                                <DropdownMenuSeparator />

                                                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Appearance</DropdownMenuLabel>
                                                <DropdownMenuItem onClick={() => setTheme("light")} className={cn("rounded-lg cursor-pointer", mounted && theme === "light" && "bg-accent")}>
                                                    <Sun className="mr-2 h-4 w-4 text-amber-500" />
                                                    <span>Light Mode</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setTheme("dark")} className={cn("rounded-lg cursor-pointer", mounted && theme === "dark" && "bg-accent")}>
                                                    <Moon className="mr-2 h-4 w-4 text-indigo-400" />
                                                    <span>Dark Mode</span>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setTheme("system")} className={cn("rounded-lg cursor-pointer", mounted && theme === "system" && "bg-accent")}>
                                                    <Activity className="mr-2 h-4 w-4 text-zinc-500" />
                                                    <span>System</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className={cn(
                        "p-4 md:p-8 space-y-6 md:space-y-12 transition-all duration-300 flex-1 flex flex-col",
                        !isReducedMotionEnabled && "animate-in fade-in slide-in-from-bottom-4 duration-700",
                        !isGuideOpen && activeAnalysis && !isMobile && searchQuery.trim() && "md:pr-[280px] xl:pr-[320px] 2xl:pr-[360px]"
                    )}>
                        {isGuideOpen ? (
                            <div className="flex-1 animate-in fade-in zoom-in-95 duration-500 pb-10 px-1.5 md:px-6">
                                <div className={cn(
                                    "max-w-7xl mx-auto mt-2 md:mt-4 rounded-[12px] border border-zinc-200/50 dark:border-white/10 p-4 md:p-10 shadow-2xl relative overflow-hidden group",
                                    isGlassmorphismEnabled ? "bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md" : "bg-white dark:bg-zinc-900"
                                )}>
                                    {/* Decorative Elements */}
                                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] group-hover:bg-blue-500/20 transition-all duration-1000" />
                                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-1000" />

                                    <div className="relative z-10">
                                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-blue-200/50 dark:border-blue-500/20">
                                                        Support Center
                                                    </span>
                                                </div>
                                                <h2 className="text-2xl md:text-5xl font-black tracking-tightest text-[#007AFF] mb-1 drop-shadow-sm flex items-center gap-2">
                                                    Hi, <span className="text-zinc-900 dark:text-white capitalize">{session?.user?.name || "User"}!</span>
                                                </h2>
                                                <h1 className="text-lg md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 leading-tight">Dashboard Guidance</h1>
                                                <p className="text-xs md:text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">Welcome to your Creative AI command center. Here's everything you need to know to master the analyzer.</p>
                                            </div>

                                            <div className="w-full md:w-72 lg:w-80 p-4 rounded-[12px] bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/10 backdrop-blur-sm relative overflow-hidden group/prime">
                                                <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/prime:scale-110 transition-transform duration-500">
                                                    <Sparkles className="w-8 h-8 text-blue-500" />
                                                </div>
                                                <div className="relative z-10">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                                        <span className="text-[10px] font-bold uppercase tracking-tighter text-blue-600 dark:text-blue-400">About Hola Prime</span>
                                                    </div>
                                                    <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                                                        <span className="text-foreground font-bold">Hola Prime</span> is your advanced AI-driven creative intelligence platform, designed to transform raw performance data into actionable visual insights and aesthetic excellence.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid gap-x-12 gap-y-6 md:gap-y-10 grid-cols-1 md:grid-cols-2">
                                            <section className="space-y-4 group/item">
                                                <div className="flex items-start gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-blue-100 dark:border-blue-500/20">
                                                        <LayoutDashboard className="w-4 h-4 md:w-5 md:h-5 text-[#007AFF]" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-[15px] md:text-lg font-bold">1. Creative Overview</h3>
                                                        <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">The main dashboard presents your ads in a searchable and filterable grid. Each ad card provides immediate high-level metrics and labeling.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-4 group/item">
                                                <div className="flex items-start gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-indigo-100 dark:border-indigo-500/20">
                                                        <Bot className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-[15px] md:text-lg font-bold">2. Analysis Modes (Lenses)</h3>
                                                        <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">Use the <span className="font-bold text-foreground">Analysis Mode</span> dropdown in the header to switch between different perspective: <span className="text-foreground">AI Recommendation</span>, <span className="text-foreground">Last Updated</span>, or <span className="text-foreground">Top Performer</span>.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-4 group/item">
                                                <div className="flex items-start gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-amber-100 dark:border-amber-500/20">
                                                        <Activity className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-[15px] md:text-lg font-bold">3. Metric Deep Dives</h3>
                                                        <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">Click on any metric in the <span className="font-bold text-foreground">Metrics Grid</span> (Spend, ROAS, Purchases) to open the side panel. There, you'll find detailed AI commentary on why a specific metric is moving.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-4 group/item">
                                                <div className="flex items-start gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-emerald-100 dark:border-emerald-500/20">
                                                        <Zap className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-[15px] md:text-lg font-bold">4. AI Scoring System</h3>
                                                        <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">The <span className="font-bold text-foreground">Radar Chart</span> compares your active creative against account benchmarks across Typography, Color Psychology, and CTA Quality to provide a Score from 1-10.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-4 group/item">
                                                <div className="flex items-start gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-pink-100 dark:border-pink-500/20">
                                                        <Trophy className="w-4 h-4 md:w-5 md:h-5 text-pink-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-[15px] md:text-lg font-bold">5. Performance Benchmarking</h3>
                                                        <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">See how your ads stack up against the best in your account. Identify top-tier creatives instantly even before Meta flags them as winners.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-4 group/item">
                                                <div className="flex items-start gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-cyan-100 dark:border-cyan-500/20">
                                                        <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-cyan-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-[15px] md:text-lg font-bold">6. Creative Evolution</h3>
                                                        <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">Monitor how design changes affect your AI scores over time. Perfect your creative strategy with iterative, data-driven refinement.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-4 group/item">
                                                <div className="flex items-start gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-purple-100 dark:border-purple-500/20">
                                                        <Globe className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-[15px] md:text-lg font-bold">7. Global Trends</h3>
                                                        <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">Gain insights into what’s performing in your industry globally. Stay ahead of the curve with our AI-powered creative trend analyzer.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-4 group/item">
                                                <div className="flex items-start gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-orange-100 dark:border-orange-500/20">
                                                        <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-[15px] md:text-lg font-bold">8. Automated Insights</h3>
                                                        <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">Receive real-time, actionable tips to boost performance. Our AI doesn't just score; it tells you exactly how to improve every pixel.</p>
                                                    </div>
                                                </div>
                                            </section>

                                            <section className="space-y-4 group/item">
                                                <div className="flex items-start gap-3 md:gap-4">
                                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-rose-100 dark:border-rose-500/20">
                                                        <LayoutGrid className="w-4 h-4 md:w-5 md:h-5 text-rose-500" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="text-[15px] md:text-lg font-bold">9. Layout View Switching</h3>
                                                        <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">Switch between <span className="font-bold text-foreground">Grid, List, Table,</span> and <span className="font-bold text-foreground">Compact</span> views to analyze your creatives in the density that suits your workflow.</p>
                                                    </div>
                                                </div>
                                            </section>
                                        </div>

                                        <section className="mt-12 p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10 relative overflow-hidden group/note">
                                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover/note:scale-110 transition-transform duration-700">
                                                <Shield className="w-24 h-24 text-amber-500" />
                                            </div>
                                            <div className="flex items-start gap-4 relative z-10">
                                                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 border border-amber-500/20 translate-y-1">
                                                    <Shield className="w-6 h-6 text-amber-600" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-lg font-black tracking-tight text-amber-600 dark:text-amber-500 uppercase text-[10px] tracking-widest">Important Security Note</h3>
                                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Profile Management & Authentication Providers</p>
                                                    <p className="text-xs md:text-sm leading-relaxed text-muted-foreground">
                                                        If you are logged in via <span className="font-bold text-foreground">Google OAuth</span>, your profile details (name and email) and security settings are managed directly by Google. For security reasons, you cannot update these identity details within this dashboard. Users on <span className="font-bold text-foreground">Credentials</span> accounts have full access to revise their identity and passwords through the Profile view.
                                                    </p>
                                                </div>
                                            </div>
                                        </section>

                                        <div className="mt-8 md:mt-12 p-4 md:p-6 bg-zinc-50 dark:bg-zinc-800/30 rounded-[12px] border border-dashed border-zinc-200 dark:border-zinc-700 text-center relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50" />
                                            <p className="text-[11px] md:text-sm font-medium italic text-muted-foreground leading-relaxed">"Empowering your creative strategy with data-driven intelligence.<br className="hidden md:block" /> Precision, performance, and excellence in every pixel."</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : isProfileOpen ? (
                            <div className="flex-1 animate-in fade-in zoom-in-95 duration-500 pb-10 px-4 md:px-8 max-w-7xl mx-auto w-full">
                                <ProfileView
                                    onOpenPasswordChange={() => setIsPasswordDialogOpen(true)}
                                    onBack={() => {
                                        setIsProfileOpen(false)
                                        setIsSettingsOpen(false)
                                    }}
                                />
                            </div>
                        ) : isSettingsOpen ? (
                            <div className="flex-1 animate-in fade-in zoom-in-95 duration-500 pb-10 px-4 md:px-8 max-w-7xl mx-auto w-full">
                                <SettingsView
                                    onBack={() => {
                                        setIsProfileOpen(false)
                                        setIsSettingsOpen(false)
                                    }}
                                />
                            </div>
                        ) : isViewAllAdsOpen ? (
                            <div className="flex-1 animate-in fade-in zoom-in-95 duration-500 pb-10 px-1.5 md:px-6">
                                <div className={cn(
                                    "max-w-7xl mx-auto mt-2 md:mt-4 rounded-[12px] border border-zinc-200/50 dark:border-white/10 shadow-2xl relative overflow-hidden group h-[calc(100vh-140px)] md:h-[calc(100vh-160px)] flex flex-col",
                                    isGlassmorphismEnabled ? "bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md" : "bg-white dark:bg-zinc-900"
                                )}>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 relative">
                                        <div className="relative z-10">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                                                <div>
                                                    <h1 className="text-2xl md:text-3xl font-black tracking-tightest text-[#007AFF]">Discovery Hub</h1>
                                                    <p className="text-sm text-muted-foreground mt-1">Exploring all creatives across your ecosystem</p>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap md:w-auto">
                                                    {/* Discovery View Switcher */}
                                                    <Select value={discoveryViewMode} onValueChange={(v: any) => setDiscoveryViewMode(v)}>
                                                        <SelectTrigger className="w-[130px] h-9 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-bold">
                                                            <SelectValue placeholder="View" />
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-zinc-200/50 dark:border-white/10 rounded-xl shadow-2xl">
                                                            <SelectItem value="grid" className="font-bold cursor-pointer rounded-lg">
                                                                <div className="flex items-center gap-2">
                                                                    <LayoutGrid className="h-3.5 w-3.5 text-[#007AFF]" />
                                                                    <span>Grid</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="list" className="font-bold cursor-pointer rounded-lg">
                                                                <div className="flex items-center gap-2">
                                                                    <List className="h-3.5 w-3.5 text-emerald-500" />
                                                                    <span>List</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="table" className="font-bold cursor-pointer rounded-lg">
                                                                <div className="flex items-center gap-2">
                                                                    <TableIcon className="h-3.5 w-3.5 text-amber-500" />
                                                                    <span>Table</span>
                                                                </div>
                                                            </SelectItem>
                                                            <SelectItem value="compact" className="font-bold cursor-pointer rounded-lg">
                                                                <div className="flex items-center gap-2">
                                                                    <Grid2X2 className="h-3.5 w-3.5 text-purple-500" />
                                                                    <span>Compact</span>
                                                                </div>
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="sm" className="px-3 sm:px-4 py-2 bg-primary/5 rounded-full border border-primary/10 hover:bg-primary/10 h-9 max-w-[200px] sm:max-w-none">
                                                                <span className="text-[11px] sm:text-xs font-bold text-primary flex items-center gap-1.5 sm:gap-2">
                                                                    <span className="truncate">
                                                                        {discoveryAccountFilter === "all"
                                                                            ? `Total: ${ads.length} Ads`
                                                                            : `${accounts.find(a => a.id === discoveryAccountFilter)?.name}: ${ads.filter(ad => ad.adAccountId === discoveryAccountFilter).length} Ads`
                                                                        }
                                                                    </span>
                                                                    <ChevronDown className="w-3 h-3 flex-shrink-0" />
                                                                </span>
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-64 p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-zinc-200/50 dark:border-white/10 rounded-xl shadow-2xl">
                                                            <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Filter by Account</DropdownMenuLabel>
                                                            <div className="space-y-1">
                                                                <DropdownMenuItem
                                                                    onClick={() => setDiscoveryAccountFilter("all")}
                                                                    className={cn(
                                                                        "flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer",
                                                                        discoveryAccountFilter === "all" ? "bg-primary/10 text-primary" : "hover:bg-zinc-100 dark:hover:bg-white/5"
                                                                    )}
                                                                >
                                                                    <span className="text-xs font-medium">Total Ads</span>
                                                                    <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">{ads.length}</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                                                                {accountStats.map((stat) => (
                                                                    <DropdownMenuItem
                                                                        key={stat.id}
                                                                        onClick={() => setDiscoveryAccountFilter(stat.id)}
                                                                        className={cn(
                                                                            "flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer",
                                                                            discoveryAccountFilter === stat.id ? "bg-primary/10 text-primary" : "hover:bg-zinc-100 dark:hover:bg-white/5"
                                                                        )}
                                                                    >
                                                                        <span className="text-xs font-medium truncate pr-4">{stat.name}</span>
                                                                        <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full">{stat.count}</span>
                                                                    </DropdownMenuItem>
                                                                ))}
                                                            </div>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>

                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                            setIsViewAllAdsOpen(false)
                                                            setDiscoveryAccountFilter("all")
                                                            setEnlargedImage(null)
                                                        }}
                                                        className="rounded-full text-[11px] font-bold uppercase tracking-wider h-9"
                                                    >
                                                        Close View
                                                    </Button>
                                                </div>
                                            </div>

                                            {discoveryViewMode === "grid" && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                                    {ads
                                                        .filter(ad => discoveryAccountFilter === "all" || ad.adAccountId === discoveryAccountFilter)
                                                        .map((ad) => {
                                                            const account = accounts.find(a => a.id === ad.adAccountId)
                                                            return (
                                                                <div
                                                                    key={ad.id}
                                                                    onClick={() => {
                                                                        const adAccount = accounts.find(acc => acc.id === ad.adAccountId)
                                                                        setEnlargedImage({
                                                                            url: ad.thumbnailUrl,
                                                                            title: ad.adName,
                                                                            accountName: adAccount?.name
                                                                        })
                                                                    }}
                                                                    className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-xl overflow-hidden hover:border-[#007AFF]/50 transition-all group cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300"
                                                                >
                                                                    <div className="aspect-[16/9] relative overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                                                                        <img src={ad.thumbnailUrl} alt={ad.adName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }} />
                                                                        <div className="absolute top-2 left-2">
                                                                            <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-black text-white uppercase tracking-wider border border-white/10 shadow-lg">
                                                                                {account?.name || "Unknown"}
                                                                            </span>
                                                                        </div>
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                    </div>
                                                                    <div className="p-4 space-y-3">
                                                                        <div className="space-y-1">
                                                                            <h4 className="text-[13px] font-black truncate text-foreground leading-tight">{ad.adName}</h4>
                                                                            <p className="text-[10px] font-mono opacity-50 truncate tracking-tight">{ad.adId}</p>
                                                                        </div>
                                                                        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">CTR</span>
                                                                                <span className="text-[14px] font-black text-[#007AFF] tracking-tighter">{Number(ad.ctr || 0).toFixed(2)}%</span>
                                                                            </div>
                                                                            <div className="flex flex-col items-end">
                                                                                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Spend</span>
                                                                                <span className="text-[14px] font-black text-foreground tracking-tighter">${Number(ad.spend || 0).toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                </div>
                                            )}

                                            {discoveryViewMode === "list" && (
                                                <div className="space-y-4">
                                                    {ads
                                                        .filter(ad => discoveryAccountFilter === "all" || ad.adAccountId === discoveryAccountFilter)
                                                        .map((ad) => {
                                                            const account = accounts.find(a => a.id === ad.adAccountId)
                                                            return (
                                                                <div
                                                                    key={ad.id}
                                                                    onClick={() => {
                                                                        setEnlargedImage({
                                                                            url: ad.thumbnailUrl,
                                                                            title: ad.adName,
                                                                            accountName: account?.name
                                                                        })
                                                                    }}
                                                                    className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-xl overflow-hidden hover:border-[#007AFF]/50 transition-all group cursor-pointer shadow-sm hover:shadow-xl flex flex-row h-32 md:h-40 duration-300"
                                                                >
                                                                    <div className="h-full aspect-[16/9] relative overflow-hidden bg-zinc-100 dark:bg-zinc-950 flex-shrink-0">
                                                                        <img src={ad.thumbnailUrl} alt={ad.adName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }} />
                                                                        <div className="absolute top-2 left-2">
                                                                            <span className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-md text-[8px] font-black text-white uppercase tracking-wider border border-white/10">
                                                                                {account?.name || "Unknown"}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                                                                        <div className="space-y-1">
                                                                            <h4 className="text-sm md:text-base font-black truncate text-foreground leading-tight">{ad.adName}</h4>
                                                                            <p className="text-[10px] font-mono opacity-50 truncate tracking-tight">{ad.adId}</p>
                                                                        </div>
                                                                        <div className="flex items-center gap-8 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">CTR</span>
                                                                                <span className="text-lg font-black text-[#007AFF] tracking-tighter">{Number(ad.ctr || 0).toFixed(2)}%</span>
                                                                            </div>
                                                                            <div className="flex flex-col">
                                                                                <span className="text-[9px] uppercase font-black text-muted-foreground tracking-widest">Spend</span>
                                                                                <span className="text-lg font-black text-foreground tracking-tighter">${Number(ad.spend || 0).toLocaleString()}</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                </div>
                                            )}

                                            {discoveryViewMode === "table" && (
                                                <div className="rounded-xl border border-border overflow-hidden bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                                                    <Table>
                                                        <TableHeader className="bg-zinc-50/50 dark:bg-zinc-800/50">
                                                            <TableRow>
                                                                <TableHead className="w-[100px] font-bold text-[10px] uppercase">Preview</TableHead>
                                                                <TableHead className="font-bold text-[10px] uppercase">Ad Info</TableHead>
                                                                <TableHead className="font-bold text-[10px] uppercase">Account</TableHead>
                                                                <TableHead className="text-right font-bold text-[10px] uppercase">Spend</TableHead>
                                                                <TableHead className="text-right font-bold text-[10px] uppercase">CTR</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {ads
                                                                .filter(ad => discoveryAccountFilter === "all" || ad.adAccountId === discoveryAccountFilter)
                                                                .map((ad) => {
                                                                    const account = accounts.find(a => a.id === ad.adAccountId)
                                                                    return (
                                                                        <TableRow
                                                                            key={ad.id}
                                                                            className="cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                                                                            onClick={() => {
                                                                                setEnlargedImage({
                                                                                    url: ad.thumbnailUrl,
                                                                                    title: ad.adName,
                                                                                    accountName: account?.name
                                                                                })
                                                                            }}
                                                                        >
                                                                            <TableCell>
                                                                                <div className="w-16 h-9 rounded overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-border">
                                                                                    <img src={ad.thumbnailUrl} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }} />
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell className="max-w-[200px]">
                                                                                <div className="space-y-0.5">
                                                                                    <p className="font-bold text-xs truncate">{ad.adName}</p>
                                                                                    <p className="text-[10px] font-mono opacity-50 truncate">{ad.adId}</p>
                                                                                </div>
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <span className="text-[10px] font-bold text-muted-foreground">{account?.name || "Unknown"}</span>
                                                                            </TableCell>
                                                                            <TableCell className="text-right font-bold text-xs">${Number(ad.spend || 0).toLocaleString()}</TableCell>
                                                                            <TableCell className="text-right font-black text-[#007AFF] text-sm">{Number(ad.ctr || 0).toFixed(2)}%</TableCell>
                                                                        </TableRow>
                                                                    )
                                                                })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}

                                            {discoveryViewMode === "compact" && (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                                                    {ads
                                                        .filter(ad => discoveryAccountFilter === "all" || ad.adAccountId === discoveryAccountFilter)
                                                        .map((ad) => {
                                                            const account = accounts.find(a => a.id === ad.adAccountId)
                                                            return (
                                                                <div
                                                                    key={ad.id}
                                                                    onClick={() => {
                                                                        setEnlargedImage({
                                                                            url: ad.thumbnailUrl,
                                                                            title: ad.adName,
                                                                            accountName: account?.name
                                                                        })
                                                                    }}
                                                                    className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-xl overflow-hidden hover:border-[#007AFF]/50 transition-all group cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300"
                                                                >
                                                                    <div className="aspect-square relative overflow-hidden bg-zinc-100 dark:bg-zinc-950">
                                                                        <img src={ad.thumbnailUrl} alt={ad.adName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }} />
                                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                                        <div className="absolute bottom-0 left-0 right-0 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                                                            <p className="text-[9px] font-black text-white truncate leading-none">{ad.adName}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50">
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-[10px] font-black text-[#007AFF]">{Number(ad.ctr || 0).toFixed(2)}%</span>
                                                                            <span className="text-[9px] font-bold text-muted-foreground">${Math.round(Number(ad.spend || 0) / 1000)}k</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#007AFF]/5 rounded-full blur-3xl pointer-events-none" />
                                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

                                    {/* Contained Popup for Discovery Hub */}
                                    {isViewAllAdsOpen && enlargedImage && (
                                        <EnlargedImageModal
                                            url={enlargedImage.url}
                                            title={enlargedImage.title}
                                            accountName={enlargedImage.accountName}
                                            onClose={() => setEnlargedImage(null)}
                                            containerClassName="absolute"
                                        />
                                    )}
                                </div>
                            </div>
                        ) : isLoading ? (
                            <div className="flex flex-1 items-center justify-center p-12">
                                <div className="flex flex-col items-center gap-4">
                                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                    <p className="text-lg font-medium">Analyzing Creative Data...</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="md:hidden space-y-4">
                                    <div className="relative group z-[60]">
                                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                                        <Input
                                            placeholder="Search ads by ID or Name..."
                                            value={searchQuery}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const val = e.target.value
                                                setSearchQuery(val)
                                                if (!val.trim()) {
                                                    setSelectedAccountId("all")
                                                }
                                                setIsSearchDropdownOpen(true)
                                            }}
                                            onFocus={() => setIsSearchDropdownOpen(true)}
                                            onBlur={() => {
                                                // Slight delay to allow click event on dropdown items to fire
                                                setTimeout(() => setIsSearchDropdownOpen(false), 200)
                                            }}
                                            className="pl-10 pr-10 h-12 bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800 focus-visible:ring-primary/20 rounded-xl md:text-sm text-base"
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => {
                                                    setSearchQuery("")
                                                    setSelectedAccountId("all")
                                                    setIsSearchDropdownOpen(false)
                                                }}
                                                className="absolute right-3 top-3 h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                                                title="Clear search"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}

                                        {/* Mobile Search Results Dropdown */}
                                        {searchQuery.trim().length > 0 && isSearchDropdownOpen && (
                                            <div className="absolute top-full left-0 right-0 mt-2 max-h-[60vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
                                                <div className="py-2">
                                                    {ads.filter(ad =>
                                                        String(ad.adId).toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        String(ad.adName).toLowerCase().includes(searchQuery.toLowerCase())
                                                    ).length > 0 ? (
                                                        ads.filter(ad =>
                                                            String(ad.adId).toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                            String(ad.adName).toLowerCase().includes(searchQuery.toLowerCase())
                                                        ).slice(0, 10).map((ad) => (
                                                            <button
                                                                key={ad.id}
                                                                onClick={() => {
                                                                    // Only switch account if the ad's account exists in our known list
                                                                    const accountExists = accounts.some(a => a.id === ad.adAccountId)
                                                                    if (accountExists) {
                                                                        setSelectedAccountId(ad.adAccountId)
                                                                    }
                                                                    setSelectedAdId(ad.id)
                                                                    setSearchQuery(ad.adId) // Auto-fill search with exact ID
                                                                    updateHistory(ad.id)
                                                                    setIsSearchDropdownOpen(false) // Close dropdown
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex flex-col gap-1 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                                                            >
                                                                <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">{ad.adName}</span>
                                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                                    <span className="font-mono truncate max-w-[150px]">{ad.adId}</span>
                                                                    <span className="opacity-70 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">{accounts.find(a => a.id === ad.adAccountId)?.name}</span>
                                                                </div>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                                                            No matching ads found
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <section className="space-y-4">
                                    <SampleAds
                                        ads={displayedAds}
                                        hasAdsInAccount={hasAdsInAccount}
                                        searchQuery={searchQuery}
                                        selectedAdId={selectedAdId}
                                        onSelect={handleSelectAd}
                                        onEnlargeImage={(url, title) => setEnlargedImage({ url, title })}
                                    />
                                </section>

                                {displayedAds.length > 0 && (
                                    <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                        {!searchQuery.trim() && hasAdsInAccount && (
                                            <div className="md:hidden flex flex-col items-center -mb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                                <div className="px-4 py-2 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl">
                                                    <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest text-center">
                                                        Search an Ad ID first to see results or metrics
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        <div className="pt-6 border-t border-border">
                                            <MetricsGrid
                                                adData={selectedAdData}
                                                selectedMetricLabel={activeAnalysis?.type === 'metric' ? activeAnalysis.name : null}
                                                onSelectMetric={(label) => setActiveAnalysis({ type: 'metric', name: label })}
                                                isClickable={!!searchQuery.trim()}
                                            />

                                            {!!searchQuery.trim() && (
                                                <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                                    <ScoreRadarChart adData={selectedAdData} benchmark={benchmarkScores} />
                                                </div>
                                            )}
                                        </div>

                                        {searchQuery.trim() && (
                                            <>
                                                <section className="pt-4 border-t border-border">
                                                    <ScoresSection
                                                        adData={selectedAdData}
                                                        selectedScoreName={activeAnalysis?.type === 'score' ? activeAnalysis.name : null}
                                                        onSelectScore={(name) => setActiveAnalysis({ type: 'score', name: name })}
                                                    />
                                                </section>

                                                <section className="pt-4 border-t border-border pb-12">
                                                    <InsightsSection adData={selectedAdData} />
                                                </section>
                                            </>
                                        )}

                                    </div>
                                )}
                            </>
                        )}
                    </div>
                    <div className={cn(
                        "mt-auto",
                        activeAnalysis && !isMobile && "md:pr-[280px] xl:pr-[320px] 2xl:pr-[360px]"
                    )}>
                        <Footer />
                    </div>
                </main>

                {/* Universal Analysis Sidebar - Positioned at root level to ensure fixed positioning works */}
                <AnalysisSidebar
                    activeDetail={activeAnalysis}
                    onClose={() => setActiveAnalysis(null)}
                    onNavigate={setActiveAnalysis}
                    adData={selectedAdData}
                    isMobile={isMobile}
                />

                {/* Global Image Popup for Home Page */}
                {!isViewAllAdsOpen && enlargedImage && (
                    <EnlargedImageModal
                        url={enlargedImage.url}
                        title={enlargedImage.title}
                        onClose={() => setEnlargedImage(null)}
                    />
                )}

                {
                    session?.user?.email && (
                        <ChangePasswordDialog
                            open={isPasswordDialogOpen}
                            onOpenChange={setIsPasswordDialogOpen}
                            email={session.user.email}
                        />
                    )
                }
            </div >
        </div >
    )
}

export default function Dashboard() {
    return (
        <Suspense fallback={null}>
            <DashboardContent />
        </Suspense>
    )
}
