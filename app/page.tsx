"use client"

import { Suspense, useState, useEffect, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Search, ChevronDown, BarChart3, Zap, TestTube, Loader2, ChevronsLeft, ChevronsRight, Settings, LogOut, User, LayoutDashboard, Lock, Menu, RefreshCcw, X, Activity, Maximize2 } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import { signOut } from "next-auth/react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent } from "@/components/ui/dropdown-menu"
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
  const { setTheme, theme } = useTheme()
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
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null)
  const isMobile = useIsMobile()

  // Force cleanup of body lock on mount
  useEffect(() => {
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
          })
        }
      } else if (isManual) {
        toast({
          title: "Dashboard Up to Date",
          description: "No new entries found in the database.",
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
      if (isManual) setIsSyncing(false)
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
    let filteredAds = ads

    // First filter by account
    if (selectedAccountId !== "all") {
      filteredAds = ads.filter(ad => ad.adAccountId === selectedAccountId)
    }

    const accountHasAds = filteredAds.length > 0
    const query = searchQuery.trim().toLowerCase()

    let results = []
    if (!query) {
      // Fallback: If no top performers, show newest ads from this account
      const topPerformers = filteredAds.filter(ad => ad.performanceLabel === "TOP_PERFORMER")
      if (topPerformers.length > 0) {
        results = topPerformers.slice(0, 10)
      } else {
        results = filteredAds.slice(0, 10)
      }
    } else {
      results = filteredAds.filter(ad => {
        const idStr = String(ad.adId || "").toLowerCase()
        return idStr.includes(query)
      })
    }

    return { displayedAds: results, hasAdsInAccount: accountHasAds }
  }, [ads, searchQuery, selectedAccountId])

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

  return (
    <div className="flex flex-col h-screen bg-background dark:bg-[#000000] overflow-hidden relative">
      {/* Global Sticky Banner - True Full Width */}
      <div className="hidden md:flex items-center justify-center bg-zinc-50 dark:bg-zinc-900/50 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium h-10 w-full uppercase tracking-[0.25em] z-50 shrink-0 border-b border-border shadow-sm">
        Hola Prime creative ai analyzer
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
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="cursor-pointer">
                  <Link href="/profile">
                    <Settings className="mr-2 h-4 w-4" /> Settings
                  </Link>
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
              <div className="relative group">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Search ads by ID..."
                  value={searchQuery}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-8 h-8 text-xs bg-muted/40 dark:bg-zinc-800/40 border-muted dark:border-zinc-700/50 focus-visible:ring-primary/20 rounded-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-2 h-4 w-4 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-all"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
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
          <div className="flex items-center justify-between px-4 md:px-12 h-14 md:h-16 md:py-[5px] border-b border-border bg-background/50 dark:bg-black/40 backdrop-blur-xl sticky top-0 z-10 transition-all duration-300">
            <div className="flex items-center gap-1.5 md:gap-3 min-w-0 overflow-hidden">
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
                              <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                                  <User className="mr-2 h-4 w-4" /> Profile
                                </Link>
                              </DropdownMenuItem>
                            </SheetClose>
                            <SheetClose asChild>
                              <DropdownMenuItem asChild className="cursor-pointer">
                                <Link href="/profile" onClick={() => setIsMobileMenuOpen(false)}>
                                  <Settings className="mr-2 h-4 w-4" /> Settings
                                </Link>
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
                  {selectedAccountId === "all" ? "All Accounts" : accounts.find(a => a.id === selectedAccountId)?.name || "Dashboard"}
                </span>
              </div>

              {/* Desktop Breadcrumbs */}
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <LayoutDashboard className="h-4 w-4 text-muted-foreground/50" />
                <span>/</span>
                <span className="font-medium text-foreground">Dashboard</span>
                <span>/</span>
                <span className="truncate max-w-[150px] lg:max-w-none">{selectedAccountId === "all" ? "All Accounts" : accounts.find(a => a.id === selectedAccountId)?.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-1">
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
                    <DropdownMenuItem onClick={() => setTheme("light")} className={cn("rounded-lg cursor-pointer", theme === "light" && "bg-accent")}>
                      <Sun className="mr-2 h-4 w-4 text-amber-500" />
                      <span>Light Mode</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")} className={cn("rounded-lg cursor-pointer", theme === "dark" && "bg-accent")}>
                      <Moon className="mr-2 h-4 w-4 text-indigo-400" />
                      <span>Dark Mode</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")} className={cn("rounded-lg cursor-pointer", theme === "system" && "bg-accent")}>
                      <Activity className="mr-2 h-4 w-4 text-zinc-500" />
                      <span>System</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className={cn(
            "p-4 md:p-8 space-y-6 md:space-y-12 transition-all duration-300 flex-1 flex flex-col",
            activeAnalysis && !isMobile && searchQuery.trim() && "md:pr-[280px] xl:pr-[320px] 2xl:pr-[360px]"
          )}>
            {isLoading ? (
              <div className="flex flex-1 items-center justify-center p-12">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary" />
                  <p className="text-lg font-medium">Analyzing Creative Data...</p>
                </div>
              </div>
            ) : (
              <>
                <div className="md:hidden space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      className="pl-10 h-10 bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800"
                    />
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
          adData={selectedAdData}
          isMobile={isMobile}
        />

        {/* Global Image Popup - Professional & Clean */}
        {enlargedImage && (
          <div
            className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4"
            onClick={() => setEnlargedImage(null)}
          >
            <div
              className="relative w-[92%] sm:w-[85%] md:w-[80%] lg:w-[75%] max-w-6xl h-[75vh] sm:h-[80vh] md:h-[85vh] bg-zinc-900 rounded-xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10 animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setEnlargedImage(null)}
                className="absolute top-4 right-4 z-[610] h-8 w-8 flex items-center justify-center bg-black/50 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors border border-white/10"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex-1 w-full relative min-h-0 bg-zinc-950/30 flex items-center justify-center p-2 sm:p-6">
                <img
                  src={enlargedImage.url}
                  alt={enlargedImage.title}
                  className="w-full h-full object-contain drop-shadow-2xl"
                  loading="eager"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.svg"
                  }}
                />
              </div>

              <div className="h-16 flex-shrink-0 bg-zinc-900 border-t border-white/5 px-4 sm:px-6 flex items-center justify-between gap-4">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Creative Preview</span>
                  <h4 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">{enlargedImage.title}</h4>
                </div>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = enlargedImage.url;
                    link.download = `creative-${Date.now()}.jpg`;
                    link.click();
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-200 text-zinc-900 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {session?.user?.email && (
          <ChangePasswordDialog
            open={isPasswordDialogOpen}
            onOpenChange={setIsPasswordDialogOpen}
            email={session.user.email}
          />
        )}
      </div>
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
