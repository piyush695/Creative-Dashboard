"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  ChevronDown,
  BarChart3,
  Zap,
  TestTube,
  Loader2,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  Settings,
  LogOut,
  User,
  LayoutDashboard,
  Lock,
  Menu,
  RefreshCcw,
  X,
  Activity,
  Maximize2,
  Sparkles,
  HelpCircle,
  GripHorizontal,
  Grip,
  ListFilter,
  Bot,
  Calendar,
  Trophy,
  BookOpen,
  Check,
  TrendingUp,
  Globe,
  LayoutGrid,
  List,
  Table as TableIcon,
  Grid2X2,
  Shield,
  Plus,
  Facebook,
  Smartphone,
  Play,
  Linkedin,
  Twitter,
  ShoppingBag,
  Disc as Pinterest,
  Instagram,
  Send,
  Brain,
  Info,
  Target,
  Newspaper,
  Database,
  Wifi,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { ChangePasswordDialog } from "@/components/change-password-dialog";
import { signOut } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "next-themes";
import { Moon, Sun, Settings2 } from "lucide-react";
import { ModeToggle } from "@/components/mode-toggle";
import DashboardHeader from "@/components/dashboard-header";
import MetricsGrid from "@/components/metrics-grid";
import ScoresSection from "@/components/scores-section";
import InsightsSection from "@/components/insights-section";
import SampleAds from "@/components/sample-ads";
import AnalysisSidebar from "@/components/analysis-sidebar";
import Footer from "@/components/footer";
import { AdData, PlatformType } from "@/lib/types";
import { ConnectPlatformDialog } from "@/components/connect-platform-dialog";
import { AddAdDialog } from "@/components/add-ad-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchAdsFromMongo, fetchGoogleAdsFromMongo } from "@/actions/ads";
import ScoreRadarChart from "@/components/score-radar-chart";
import { EnlargedImageModal } from "@/components/enlarged-image-modal";
import GoogleAdsView from "@/components/google-ads-view";
import AdrollView from "@/components/adroll-view";
import { RealtimeNativeView } from "@/components/realtime-native-view";
import AdDetailTabs from "@/components/ad-detail-tabs";
import MetaAdDetailView from "@/components/meta-ad-detail-view";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ProfileView from "@/components/profile-view";
import SettingsView from "@/components/settings-view";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  updateProfile,
  updateEnabledPlatforms,
  getConnectedPlatforms,
  getEnabledPlatforms,
} from "@/actions/profile-actions";

const ACCOUNT_LIST = [
  // Meta accounts
  { id: "25613137998288459", name: "HP FOREX - EU", platform: "meta" },
  { id: "1333109771382157", name: "HP FOREX - LATAM", platform: "meta" },
  { id: "1002675181794911", name: "HP FOREX - UK", platform: "meta" },
  { id: "1507386856908357", name: "HP FOREX - USA + CA", platform: "meta" },
  { id: "1024147486590417", name: "HP FUTURES - USA + CA", platform: "meta" },
  // Google Ads accounts
  { id: "7791434558", name: "HP Google - Main", platform: "google" },
];

const PLATFORM_META: Record<string, { label: string; icon: any }> = {
  all: { label: "All Platforms", icon: Globe },
  meta: { label: "Meta", icon: Facebook },
  tiktok: { label: "TikTok", icon: Smartphone },
  google: { label: "Google Ads", icon: Play },
  youtube: { label: "YouTube", icon: Play },
  linkedin: { label: "LinkedIn", icon: Linkedin },
  shopify: { label: "Shopify", icon: ShoppingBag },
  pinterest: { label: "Pinterest", icon: Pinterest },
  x: { label: "X (Twitter)", icon: Twitter },
  taboola: { label: "Taboola", icon: Newspaper },
  bing: { label: "Bing", icon: Search },
  adroll: { label: "AdRoll", icon: Target },
};

function DashboardContent() {
  const { toast } = useToast();
  const { data: session, status } = useSession();
  const { setTheme, theme, resolvedTheme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [adrollDataSource, setAdrollDataSource] = useState<
    "database" | "realtime"
  >("database");
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [ads, setAds] = useState<AdData[]>([]);
  const [googleAds, setGoogleAds] = useState<AdData[]>([]);
  const [recentHistory, setRecentHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [activeAnalysis, setActiveAnalysis] = useState<{
    type: "score" | "metric";
    name: string;
  } | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [relativeTime, setRelativeTime] = useState("just now");
  const [newEntriesCount, setNewEntriesCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showRefreshText, setShowRefreshText] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<{
    url: string;
    title: string;
    accountName?: string;
  } | null>(null);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [enabledPlatforms, setEnabledPlatforms] = useState<string[]>([
    "google",
    "youtube",
  ]);
  const isMobile = useIsMobile();
  const [viewFilter, setViewFilter] = useState("Top Perf.");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isViewAllAdsOpen, setIsViewAllAdsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [discoveryAccountFilter, setDiscoveryAccountFilter] = useState("all");
  const [discoverySearchQuery, setDiscoverySearchQuery] = useState("");
  const [discoveryViewMode, setDiscoveryViewMode] = useState<
    "grid" | "list" | "table"
  >("grid");
  const [isGlassmorphismEnabled, setIsGlassmorphismEnabled] = useState(true);
  const [isCompactModeEnabled, setIsCompactModeEnabled] = useState(false);
  const [isReducedMotionEnabled, setIsReducedMotionEnabled] = useState(false);
  const [isAlertSystemEnabled, setIsAlertSystemEnabled] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType>("all");
  const [isAddAdDialogOpen, setIsAddAdDialogOpen] = useState(false);
  const [isAddingPlatform, setIsAddingPlatform] = useState(false);
  const [platformSearchQuery, setPlatformSearchQuery] = useState("");
  const [isPlatformModalReady, setIsPlatformModalReady] = useState(false);
  const [realtimeCampaigns, setRealtimeCampaigns] = useState<any[]>([]);
  const [selectedRealtimeCampaign, setSelectedRealtimeCampaign] =
    useState("all");
  const [googleAdsDataSource, setGoogleAdsDataSource] = useState<
    "database" | "realtime"
  >("database");

  useEffect(() => {
    if (isAddingPlatform) {
      const timer = setTimeout(() => setIsPlatformModalReady(true), 400);
      return () => clearTimeout(timer);
    } else {
      setIsPlatformModalReady(false);
    }
  }, [isAddingPlatform]);

  const handleAddPlatform = async (platformId: string) => {
    if (enabledPlatforms.length >= 10) {
      toast({
        title: "Limit Reached",
        description: "You can add up to 10 platforms only.",
        variant: "destructive",
      });
      return;
    }

    if (!enabledPlatforms.includes(platformId)) {
      const nextEnabled = [...enabledPlatforms, platformId];
      const nextConnected = [
        ...new Set([...connectedPlatforms, platformId as PlatformType]),
      ];

      setEnabledPlatforms(nextEnabled);
      setConnectedPlatforms(nextConnected);
      localStorage.setItem(
        "connected_platforms",
        JSON.stringify(nextConnected),
      );

      const res = await updateEnabledPlatforms(nextEnabled);
      if (res.success) {
        toast({
          title: "Platform Added",
          description: `${PLATFORM_META[platformId]?.label || platformId} has been added successfully.`,
        });
        // Switch to new platform and close ALL overlay views immediately
        setSelectedPlatform(platformId as PlatformType);
        setIsViewAllAdsOpen(false);
        setIsSettingsOpen(false);
        setIsProfileOpen(false);
        setIsGuideOpen(false);
      }

      setIsAddingPlatform(false);
      setPlatformSearchQuery("");
    }
  };

  const [connectedPlatforms, setConnectedPlatforms] = useState<PlatformType[]>([
    "google",
  ]);

  // On mount, initialize client-only states and clean up body styles
  useEffect(() => {
    setMounted(true);
    setLastRefreshTime(new Date());
    document.body.style.pointerEvents = "auto";
    document.body.style.overflow = "";
  }, []);

  // Synchronize settings and platform state from localStorage (only once on mount/settings close)
  useEffect(() => {
    if (!mounted) return;

    const loadMetaPlatforms = async () => {
      const res = await getEnabledPlatforms();
      if (res.success && res.platforms) {
        setEnabledPlatforms(res.platforms);
      }
    };
    loadMetaPlatforms();

    const savedPlatforms = localStorage.getItem("connected_platforms");
    if (savedPlatforms) {
      try {
        const parsed = JSON.parse(savedPlatforms);
        if (Array.isArray(parsed)) {
          // Ensure uniqueness immediately to avoid 'length > 1' false positives
          const unique = [...new Set(parsed)];
          if (!unique.includes("google")) unique.push("google");
          setConnectedPlatforms(unique);
        }
      } catch (e) {
        console.error("Error parsing saved platforms:", e);
      }
    }

    const saved = localStorage.getItem("dashboard_settings");
    if (saved) {
      const settings = JSON.parse(saved);
      setIsGlassmorphismEnabled(settings.glassmorphism ?? true);
      setIsCompactModeEnabled(settings.compactMode ?? false);
      setIsReducedMotionEnabled(settings.reducedMotion ?? false);
      setIsAlertSystemEnabled(settings.alertSystem ?? false);
    }

    // Restore selected platform
    const savedPlatform = localStorage.getItem("selected_platform");
    if (savedPlatform) {
      setSelectedPlatform(savedPlatform as PlatformType);
    }
  }, [mounted, isSettingsOpen]); // Refresh when settings view is closed

  // Update relative time text every minute
  useEffect(() => {
    if (!lastRefreshTime) return;
    const timer = setInterval(() => {
      setRelativeTime(
        formatDistanceToNow(lastRefreshTime, { addSuffix: true }),
      );
    }, 60000); // update every 1m
    setRelativeTime(formatDistanceToNow(lastRefreshTime, { addSuffix: true }));

    return () => clearInterval(timer);
  }, [lastRefreshTime]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    } else if (status === "authenticated") {
      // Load connected platforms from DB
      getConnectedPlatforms().then((res) => {
        if (res.success && res.platforms) {
          const dbPlatforms = res.platforms as PlatformType[];
          setConnectedPlatforms((prev) => {
            const merged = [...new Set([...prev, ...dbPlatforms])];
            if (!merged.includes("google")) merged.push("google");
            localStorage.setItem("connected_platforms", JSON.stringify(merged));
            return merged;
          });
        }
      });
      // Load enabled platforms from DB
      getEnabledPlatforms().then((res) => {
        if (res.success && res.platforms) {
          setEnabledPlatforms(res.platforms);
        }
      });
    }
  }, [status, router]);

  // Enforce default platform selection: if only Meta is connected AND no saved preference, default to 'meta'
  useEffect(() => {
    const uniqueCount = new Set(connectedPlatforms).size;
    const savedPlatform =
      typeof window !== "undefined"
        ? localStorage.getItem("selected_platform")
        : null;
    if (uniqueCount <= 1 && !savedPlatform) {
      setSelectedPlatform("google");
    }
  }, [connectedPlatforms.length, JSON.stringify(connectedPlatforms)]);

  // Persist selectedPlatform to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && selectedPlatform) {
      localStorage.setItem("selected_platform", selectedPlatform);
    }
  }, [selectedPlatform]);

  // Reset ALL view state on every platform switch
  // This ensures no stale search, selection, or account bleeds across platforms
  useEffect(() => {
    setSearchQuery("");
    setSelectedAdId(null);
    setActiveAnalysis(null);
    setSelectedAccountId("all");
    setIsViewAllAdsOpen(false);
    setIsSearchDropdownOpen(false);
  }, [selectedPlatform]);

  // 1. Extract unique accounts from ad data — filtered by selected platform
  const accounts = useMemo(() => {
    const filtered =
      selectedPlatform === "all"
        ? ACCOUNT_LIST
        : ACCOUNT_LIST.filter((a) => a.platform === selectedPlatform);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedPlatform]);

  // Calculate ad counts per account (platform-aware)
  const accountStats = useMemo(() => {
    const platformAds =
      selectedPlatform === "all"
        ? ads
        : ads.filter(
          (ad) =>
            ad.platform === selectedPlatform ||
            (!ad.platform && selectedPlatform === "meta")
        );
    return accounts
      .map((account) => ({
        ...account,
        count: platformAds.filter((ad) => ad.adAccountId === account.id).length,
      }))
      .filter((acc) => acc.count > 0);
  }, [ads, accounts, selectedPlatform]);

  // 2. Load data from MongoDB with real-time polling
  const loadData = async (isManual = false) => {
    if (isSyncing) return;
    if (isManual) setIsSyncing(true);

    try {
      const [metaData, gData] = await Promise.all([
        fetchAdsFromMongo(),
        fetchGoogleAdsFromMongo(),
      ]);

      const data = [...metaData, ...gData];

      const oldCount = ads.length;
      const newCount = data.length;

      if (oldCount > 0 && newCount > oldCount) {
        setNewEntriesCount(newCount - oldCount);
        if (isManual) {
          toast({
            title: "Scan Complete",
            description: `Found ${newCount - oldCount} new entries since last check.`,
            duration: 5000,
          });
        }
      } else if (isManual) {
        toast({
          title: "Dashboard Up to Date",
          description: "No new entries found in the database.",
          duration: 5000,
        });
      }

      setAds(data);
      setGoogleAds(gData);
      setLastRefreshTime(new Date());

      // Show refresh text for 5 seconds only on manual refresh
      if (isManual) {
        setShowRefreshText(true);
        setTimeout(() => setShowRefreshText(false), 5000);
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      if (isManual) {
        setIsSyncing(false);
        if (isAlertSystemEnabled) {
          const { dismiss } = toast({
            title: "Sync Synchronized",
            description:
              "System has successfully finalized current database polling.",
            duration: 3000,
          });
          setTimeout(() => dismiss(), 3000);
        }
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [isLoading]); // Removed interval for manual-only refresh

  // handle login success toast
  useEffect(() => {
    const loggedIn = searchParams.get("loggedIn") === "true";
    const welcome = searchParams.get("welcome") === "true";
    const nameParam = searchParams.get("name");

    if (loggedIn && status === "authenticated") {
      const userName = nameParam || session?.user?.name || "User";

      if (welcome) {
        toast({
          title: "Account Created Successfully!",
          description: `You are now logged in as ${userName}`,
          variant: "success",
        });
      } else {
        toast({
          title: `Welcome, ${userName}!`,
          description: "You have successfully logged in.",
          variant: "success",
        });
      }

      // Remove the query param without refreshing
      router.replace("/");
    }
  }, [searchParams, router, toast, session, status]);

  // 3. Memoized displayed ads (Isolated filtering)
  const { displayedAds, hasAdsInAccount } = useMemo(() => {
    let filteredAds = [...ads];

    if (selectedPlatform === "meta") {
      filteredAds = filteredAds.filter(
        (ad) => !ad.platform || ad.platform === "meta",
      );
    } else if (selectedPlatform === "google") {
      filteredAds = filteredAds.filter((ad) => ad.platform === "google");
    } else if (selectedPlatform === "adroll") {
      filteredAds = filteredAds.filter((ad) => ad.platform === "adroll");
    } else if (selectedPlatform !== "all") {
      // Other platforms not yet integrated — return empty
      return { displayedAds: [], hasAdsInAccount: false };
    }

    // 2. Filter by account
    if (selectedAccountId !== "all") {
      filteredAds = filteredAds.filter(
        (ad) => ad.adAccountId === selectedAccountId,
      );
    }

    // 2b. Filter by Campaign
    if (selectedRealtimeCampaign && selectedRealtimeCampaign !== "all") {
      filteredAds = filteredAds.filter(
        (ad) =>
          ad.campaignId === selectedRealtimeCampaign ||
          ad.campaignName === selectedRealtimeCampaign,
      );
    }

    const accountHasAds = filteredAds.length > 0;
    const query = searchQuery.trim().toLowerCase();

    // 3. Sort/Filter based on Analysis Mode (viewFilter)
    if (viewFilter === "AI Rec.") {
      filteredAds.sort((a, b) => (b.scoreOverall || 0) - (a.scoreOverall || 0));
    } else if (viewFilter === "Updated") {
      filteredAds.sort(
        (a, b) =>
          new Date(b.analysisDate).getTime() -
          new Date(a.analysisDate).getTime(),
      );
    } else if (viewFilter === "Top Perf.") {
      const top = filteredAds.filter(
        (ad) => ad.performanceLabel === "TOP_PERFORMER",
      );
      const others = filteredAds.filter(
        (ad) => ad.performanceLabel !== "TOP_PERFORMER",
      );
      filteredAds = [...top, ...others];
    }

    // 4. Deduplicate Ads
    filteredAds = Array.from(
      new Map(filteredAds.map((item) => [item.adId || item.id, item])).values(),
    );

    // 5. Search and Final Result Logic
    let results = [];
    if (!query) {
      results = filteredAds.slice(0, 10);
    } else {
      results = filteredAds.filter((ad) => {
        const idStr = String(ad.adId || "").toLowerCase();
        const nameStr = String(ad.adName || "").toLowerCase();
        return idStr.includes(query) || nameStr.includes(query);
      });
    }

    return { displayedAds: results, hasAdsInAccount: accountHasAds };
  }, [
    ads,
    searchQuery,
    selectedAccountId,
    viewFilter,
    selectedPlatform,
    selectedRealtimeCampaign,
  ]);

  // Memoized Discovery Hub Ads
  const filteredDiscoveryAds = useMemo(() => {
    return ads.filter((ad) => {
      // Platform filter
      if (selectedPlatform === "meta" && ad.platform && ad.platform !== "meta") return false;
      if (selectedPlatform === "adroll" && ad.platform !== "adroll") return false;
      if (selectedPlatform === "google" && ad.platform !== "google") return false;
      if (
        selectedPlatform !== "all" &&
        selectedPlatform !== "meta" &&
        selectedPlatform !== "adroll" &&
        selectedPlatform !== "google" &&
        ad.platform !== selectedPlatform
      )
        return false;

      if (discoverySearchQuery.trim()) {
        const q = discoverySearchQuery.toLowerCase();
        return (
          ad.adName?.toLowerCase().includes(q) ||
          ad.adId?.toLowerCase().includes(q)
        );
      }
      return (
        discoveryAccountFilter === "all" ||
        ad.adAccountId === discoveryAccountFilter
      );
    });
  }, [ads, selectedPlatform, discoverySearchQuery, discoveryAccountFilter]);

  // Memoized Global Sidebar Search Results
  const searchDropdownResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return ads
      .filter(
        (ad) =>
          (selectedPlatform === "all" || ad.platform === selectedPlatform) &&
          (String(ad.adId)
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
            String(ad.adName)
              .toLowerCase()
              .includes(searchQuery.toLowerCase())),
      )
      .slice(0, 10);
  }, [ads, searchQuery, selectedPlatform]);

  // Memoized Discovery Label for the filter button
  const discoveryLabel = useMemo(() => {
    const platformAds =
      selectedPlatform === "all"
        ? ads
        : ads.filter(
          (ad) =>
            ad.platform ===
            selectedPlatform ||
            (!ad.platform && selectedPlatform === "meta")
        );
    if (discoveryAccountFilter === "all")
      return `Total: ${platformAds.length} Ads`;
    const name = accounts.find(
      (a) =>
        a.id === discoveryAccountFilter,
    )?.name;
    const count = platformAds.filter(
      (ad) =>
        ad.adAccountId ===
        discoveryAccountFilter,
    ).length;
    return `${name}: ${count} Ads`;
  }, [ads, selectedPlatform, discoveryAccountFilter, accounts]);

  // 4. Selection Sync
  useEffect(() => {
    const query = searchQuery.trim().toLowerCase();

    if (query && displayedAds.length > 0) {
      const firstResultId = displayedAds[0].id;
      // Disable auto-select for Google and AdRoll platforms to prevent jumping to Analysis while typing
      if (selectedAdId !== firstResultId && selectedPlatform !== "google" && selectedPlatform !== "adroll") {
        setSelectedAdId(firstResultId);
        updateHistory(firstResultId);
        setActiveAnalysis(null); // Reset on change
      }
    } else if (query && displayedAds.length === 0) {
      setSelectedAdId(null);
      setActiveAnalysis(null);
    } else if (!query) {
      // When search is cleared or empty, we generally want to hide the analysis
      // unless the user implicitly selected something (which we can't easily distinguish here without more state)
      // For now, we just ensure the sidebar is closed.
      setActiveAnalysis(null);
    }
  }, [searchQuery, displayedAds, selectedAdId]);

  const updateHistory = (id: string) => {
    if (!id) return;
    setRecentHistory((prev) => {
      const filtered = prev.filter((item) => item !== id);
      return [id, ...filtered].slice(0, 10);
    });
  };

  const handleSelectAd = (id: string) => {
    setSelectedAdId(id);
    updateHistory(id);
  };

  const selectedAdData = ads.find((ad) => ad.id === selectedAdId) || null;

  const recentAds = recentHistory
    .map((id) => ads.find((ad) => ad.id === id))
    .filter((ad): ad is AdData => !!ad)
    .filter((ad) => {
      const platform = ad.platform || "meta";
      return selectedPlatform === "all" || platform === selectedPlatform;
    });

  const handleAction = (action: string) => {
    // Action handled here
  };

  // 5. Calculate Dynamic Benchmarks
  const benchmarkScores = useMemo(() => {
    if (displayedAds.length === 0) return null;

    const total = displayedAds.length;
    const sums = displayedAds.reduce(
      (acc, ad) => ({
        scoreComposition: acc.scoreComposition + (ad.scoreComposition || 0),
        scoreColorUsage: acc.scoreColorUsage + (ad.scoreColorUsage || 0),
        scoreTypography: acc.scoreTypography + (ad.scoreTypography || 0),
        // Mapping "Hook" to Visual Design for now (or Emotional Appeal)
        scoreVisualDesign: acc.scoreVisualDesign + (ad.scoreVisualDesign || 0),
        // Mapping "Prop" to Trust Signals?
        scoreTrustSignals: acc.scoreTrustSignals + (ad.scoreTrustSignals || 0),
        scoreCTA: acc.scoreCTA + (ad.scoreCTA || 0),
      }),
      {
        scoreComposition: 0,
        scoreColorUsage: 0,
        scoreTypography: 0,
        scoreVisualDesign: 0,
        scoreTrustSignals: 0,
        scoreCTA: 0,
      },
    );

    return {
      scoreComposition: Math.round((sums.scoreComposition / total) * 10) / 10,
      scoreColorUsage: Math.round((sums.scoreColorUsage / total) * 10) / 10,
      scoreTypography: Math.round((sums.scoreTypography / total) * 10) / 10,
      scoreVisualDesign: Math.round((sums.scoreVisualDesign / total) * 10) / 10,
      scoreTrustSignals: Math.round((sums.scoreTrustSignals / total) * 10) / 10,
      scoreCTA: Math.round((sums.scoreCTA / total) * 10) / 10,
    };
  }, [displayedAds]);

  return (
    <div
      suppressHydrationWarning
      className="flex flex-col h-[100dvh] bg-background dark:bg-[#000000] overflow-hidden relative"
    >
      {/* Global Sticky Banner - High-End Premium Header */}
      <div
        suppressHydrationWarning
        className="flex items-center justify-between px-6 md:px-8 border-b border-border shadow-[0_2px_4px_rgba(0,0,0,0.02)] h-12 md:h-14 z-[70] shrink-0 sticky top-0 bg-white dark:bg-zinc-950 transition-all duration-300 relative"
      >
        <button
          suppressHydrationWarning
          onClick={() => {
            // Close all overlay views
            setIsProfileOpen(false);
            setIsSettingsOpen(false);
            setIsGuideOpen(false);
            setIsViewAllAdsOpen(false);
            // Reset search & selection — stay on current platform
            setSearchQuery("");
            setSelectedAdId(null);
            setActiveAnalysis(null);
            setSelectedAccountId("all");
            setIsSearchDropdownOpen(false);
          }}
          className="hover:opacity-80 transition-opacity relative z-10"
        >
          <div
            suppressHydrationWarning
            className="flex flex-col items-start leading-none cursor-pointer"
          >
            <div suppressHydrationWarning className="flex items-center gap-1.5">
              <span className="text-xl md:text-2xl font-black tracking-tightest text-foreground dark:text-white">
                hola
                <span className="text-[#007AFF] dark:text-primary">prime</span>
              </span>
              <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-[#007AFF] dark:text-primary animate-pulse" />
            </div>
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-[#007AFF] dark:text-primary opacity-80 mt-1">
              Creative Analyzer
            </span>
          </div>
        </button>
        <div
          suppressHydrationWarning
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:flex items-center gap-2.5 px-5 py-2 rounded-full bg-white/80 dark:bg-white/10 border border-zinc-200 dark:border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.05)] group hover:scale-105 transition-all duration-500 cursor-default"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)]"></span>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 via-primary to-zinc-900 dark:from-zinc-400 dark:via-white dark:to-zinc-400 bg-[length:200%_auto] animate-gradient">
            Hola Prime Creative AI Analyzer
          </span>
        </div>

        {/* Right Side: Options & Help */}
        <div
          suppressHydrationWarning
          className="flex items-center gap-3 md:gap-4 relative z-20"
        >
          {/* Desktop Controls */}
          <div suppressHydrationWarning className="hidden md:flex items-center gap-3">
            {mounted && (selectedPlatform === "all" ||
              selectedPlatform === "meta") && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 px-5 text-[10px] font-black uppercase tracking-[0.15em] bg-white/80 dark:bg-zinc-900/50 backdrop-blur-xl border-border hover:border-primary/40 hover:bg-secondary/80 transition-all duration-300 rounded-2xl gap-2.5 group relative shadow-sm hover:shadow-md"
                    >
                      <span className="relative flex items-center gap-2">
                        <ListFilter className="w-4 h-4 text-primary transition-transform group-hover:rotate-12" />
                        <span className="text-foreground/80 dark:text-zinc-300">
                          {viewFilter === "Top Perf."
                            ? "Top Performer"
                            : viewFilter === "AI Rec."
                              ? "AI Recommendation"
                              : viewFilter === "Updated"
                                ? "Last Updated"
                                : viewFilter}
                        </span>
                        <ChevronDown className="w-3 h-3 opacity-30 group-hover:translate-y-0.5 transition-transform text-primary" />
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuContent
                      align="end"
                      className="w-52 z-[1000] p-1.5 rounded-[1.5rem] border-border dark:border-white/10 bg-card/98 dark:bg-zinc-900/98 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.08)] animate-in fade-in zoom-in-95 duration-300"
                    >
                      <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.2em] text-primary/60 border-b border-border/50 dark:border-white/5 mb-1.5">
                        Analysis Lens
                      </div>

                      {[
                        {
                          id: "AI Rec.",
                          label: "AI Recommendation",
                          icon: Bot,
                          color: "text-indigo-500",
                          bg: "bg-indigo-50/50 dark:bg-indigo-500/10",
                        },
                        {
                          id: "Updated",
                          label: "Last Updated Date",
                          icon: Calendar,
                          color: "text-blue-500",
                          bg: "bg-blue-50/50 dark:bg-blue-500/10",
                        },
                        {
                          id: "Top Perf.",
                          label: "Top Performer",
                          icon: Trophy,
                          color: "text-amber-500",
                          bg: "bg-amber-50/50 dark:bg-amber-500/10",
                        },
                      ].map((item) => (
                        <DropdownMenuItem
                          key={item.id}
                          className={cn(
                            "flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 mb-0.5",
                            viewFilter === item.id
                              ? `${item.bg} border border-primary/10 text-primary`
                              : "hover:bg-secondary dark:hover:bg-white/5 text-muted-foreground dark:text-zinc-400 border border-transparent",
                          )}
                          onClick={() => setViewFilter(item.id)}
                        >
                          <div className="flex items-center gap-2.5">
                            <item.icon
                              className={cn(
                                "w-4 h-4 transition-transform group-hover:scale-110",
                                viewFilter === item.id
                                  ? "text-primary"
                                  : item.color,
                              )}
                            />
                            <span className="text-xs font-bold">
                              {item.label}
                            </span>
                          </div>
                          {viewFilter === item.id && (
                            <Check className="w-3.5 h-3.5 text-primary animate-in zoom-in-50" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenuPortal>
                </DropdownMenu>
              )}
            {mounted && (selectedPlatform === "all" ||
              selectedPlatform === "meta" ||
              selectedPlatform === "adroll") && (
                <div suppressHydrationWarning className="h-4 w-px bg-border dark:bg-zinc-700 mx-1"></div>
              )}

            <div className="relative group/help flex items-center">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full h-8 w-8 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/80 active:scale-95 flex-shrink-0 group"
                onClick={() => {
                  setIsGuideOpen(true);
                  setIsProfileOpen(false);
                  setIsSettingsOpen(false);
                  setIsViewAllAdsOpen(false);
                }}
              >
                <HelpCircle className="h-[1rem] w-[1rem] text-muted-foreground group-hover:text-primary transition-transform" />
              </Button>
              <div className="absolute right-[100%] top-1/2 -translate-y-1/2 pointer-events-none opacity-0 group-hover/help:opacity-100 group-hover/help:pointer-events-auto transition-all duration-300 translate-x-1 group-hover/help:translate-x-0 z-30 pr-3">
                <button
                  className="flex"
                  onClick={() => {
                    setIsGuideOpen(true);
                    setIsProfileOpen(false);
                    setIsSettingsOpen(false);
                    setIsViewAllAdsOpen(false);
                  }}
                >
                  <div className="px-3 py-1.5 bg-zinc-950 dark:bg-white text-zinc-50 dark:text-zinc-900 text-[10px] font-black rounded-lg shadow-2xl whitespace-nowrap flex items-center gap-1.5 cursor-pointer hover:scale-105 transition-all border border-black/10 dark:border-white/10">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    Help & Guide
                  </div>
                </button>
              </div>
              {/* Invisible Bridge to maintain hover state */}
              <div className="absolute right-full top-0 bottom-0 w-12 hidden group-hover/help:block" />
            </div>

            <div className="h-4 w-px bg-border dark:bg-zinc-700 mx-1"></div>
            <ModeToggle />
          </div>

          {/* Mobile Controls (9-dots Menu) */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-primary hover:bg-primary/10 rounded-xl transition-all active:scale-95 group"
                >
                  <Grip className="w-5 h-5 transition-transform group-active:rotate-45 animate-pulse" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuPortal>
                <DropdownMenuContent
                  align="end"
                  className="w-56 z-[1000] p-1.5 rounded-[1.8rem] border-border/60 dark:border-white/10 bg-card/98 dark:bg-zinc-900/98 backdrop-blur-xl shadow-[0_20px_50px_rgba(0,0,0,0.12)] animate-in fade-in slide-in-from-top-4 duration-300"
                >
                  {(selectedPlatform === "all" ||
                    selectedPlatform === "meta" ||
                    selectedPlatform === "adroll") && (
                      <div className="px-3 py-2 flex items-center justify-between border-b border-border/50 dark:border-white/5 mb-1.5">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                          Insights
                        </span>
                      </div>
                    )}

                  {(selectedPlatform === "all" ||
                    selectedPlatform === "meta" ||
                    selectedPlatform === "adroll") && (
                      <>
                        {[
                          {
                            id: "AI Rec.",
                            label: "AI Recommendation",
                            icon: Bot,
                            color: "text-indigo-500",
                            bg: "bg-indigo-500/10",
                          },
                          {
                            id: "Updated",
                            label: "Last Updated Date",
                            icon: Calendar,
                            color: "text-blue-500",
                            bg: "bg-blue-500/10",
                          },
                          {
                            id: "Top Perf.",
                            label: "Top Performer",
                            icon: Trophy,
                            color: "text-amber-500",
                            bg: "bg-amber-500/10",
                          },
                        ].map((item) => (
                          <DropdownMenuItem
                            key={item.id}
                            className={cn(
                              "flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition-all mb-0.5 active:scale-[0.98]",
                              viewFilter === item.id
                                ? "bg-primary/10 text-primary border border-primary/20 shadow-sm"
                                : "hover:bg-secondary dark:hover:bg-white/5 text-muted-foreground dark:text-zinc-400 border border-transparent",
                            )}
                            onClick={() => setViewFilter(item.id)}
                          >
                            <div className="flex items-center gap-3">
                              <item.icon
                                className={cn(
                                  "w-4 h-4 transition-transform",
                                  viewFilter === item.id
                                    ? "text-primary scale-110"
                                    : item.color,
                                )}
                              />
                              <span className="text-xs font-black tracking-tight">
                                {item.label}
                              </span>
                            </div>
                            {viewFilter === item.id && (
                              <Check className="w-3.5 h-3.5 text-primary animate-in zoom-in-50" />
                            )}
                          </DropdownMenuItem>
                        ))}

                        <DropdownMenuSeparator className="bg-border/50 dark:bg-white/5 mx-2 my-1" />
                      </>
                    )}

                  <DropdownMenuItem
                    className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/5 group"
                    onClick={() => {
                      setIsGuideOpen(true);
                      setIsProfileOpen(false);
                      setIsSettingsOpen(false);
                      setIsViewAllAdsOpen(false);
                    }}
                  >
                    <BookOpen className="w-4 h-4 text-[#007AFF]" />
                    <span className="text-xs font-black text-zinc-700 dark:text-zinc-300">
                      Help & Guide
                    </span>
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
          {/* Visual Accents - Softened for performance */}
          <div className="absolute bottom-[-5%] left-[-10%] w-[40%] h-[40%] rounded-full opacity-[0.02] dark:opacity-[0.05] blur-[40px] md:blur-[80px] bg-indigo-600 pointer-events-none" />
          <div className="absolute top-[30%] left-[10%] w-[30%] h-[30%] rounded-full opacity-[0.01] dark:opacity-[0.03] blur-[30px] md:blur-[60px] bg-purple-600 pointer-events-none" />
        </div>

        {/* Sidebar - Desktop */}
        <aside
          className={`${isSidebarCollapsed ? "w-[70px]" : "w-60"} transition-all duration-300 border-r border-border bg-white dark:bg-zinc-950 hidden md:flex flex-col flex-shrink-0 relative z-20`}
        >
          {/* Top: User Profile / Workspace Switcher */}
          <div className="px-2 flex items-center border-b border-border h-16 py-[5px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`group w-full justify-start p-1.5 h-12 hover:bg-secondary dark:hover:bg-zinc-800 transition-all duration-300 rounded-xl ${isSidebarCollapsed ? "px-0 justify-center" : ""}`}
                >
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-white font-black text-[11px] flex-shrink-0 shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                    {session?.user?.name?.[0] || "U"}
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="ml-3 flex flex-col items-start overflow-hidden w-full text-left">
                      <span className="text-[12px] font-semibold truncate w-full text-foreground/90 dark:text-zinc-100">
                        {session?.user?.name || "User"}
                      </span>
                      <span className="text-[9px] text-muted-foreground truncate w-full capitalize opacity-60 font-bold">
                        {(session?.user as any)?.role || "Viewer"} Plan
                      </span>
                    </div>
                  )}
                  {!isSidebarCollapsed && (
                    <ChevronDown className="h-4 w-4 ml-auto text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-64"
                side="right"
                sideOffset={10}
              >
                <div className="px-2 py-1.5 text-sm font-semibold border-b mb-1">
                  My Account
                </div>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setIsProfileOpen(true);
                    setIsSettingsOpen(false);
                    setIsViewAllAdsOpen(false);
                    setIsGuideOpen(false);
                  }}
                >
                  <User className="mr-2 h-4 w-4" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setIsProfileOpen(false);
                    setIsViewAllAdsOpen(false);
                    setIsGuideOpen(false);
                  }}
                >
                  <Settings className="mr-2 h-4 w-4" /> Settings
                </DropdownMenuItem>
                {(session?.user as any)?.provider === "credentials" && (
                  <DropdownMenuItem
                    onClick={() => setIsPasswordDialogOpen(true)}
                  >
                    <Lock className="mr-2 h-4 w-4" /> Change Password
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-500 cursor-pointer"
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-2 h-4 w-4" /> Log Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Middle: Navigation & Selection Hubs */}
          <div className="flex-1 overflow-auto py-4 space-y-4">
            {/* Desktop Selection Hubs */}
            <div
              className={cn(
                "px-3 space-y-4",
                isSidebarCollapsed ? "hidden" : "",
              )}
            >
              {/* Platform Section */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black tracking-widest text-primary/60 ml-1 uppercase">
                  Platform
                </label>
                <Select
                  value={selectedPlatform}
                  onValueChange={(v: any) => setSelectedPlatform(v)}
                  onOpenChange={(open) => {
                    if (!open) {
                      setIsAddingPlatform(false);
                      setPlatformSearchQuery("");
                    }
                  }}
                >
                  <SelectTrigger className="w-full h-10 px-3 border border-border/40 bg-white/40 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-md focus:ring-0 rounded-xl transition-all duration-300 group/hub text-left">
                    <div className="flex items-center gap-3 truncate py-1 w-full text-left">
                      {(() => {
                        const currentPlatform =
                          PLATFORM_META[selectedPlatform] || PLATFORM_META.all;
                        return (
                          <>
                            <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center transition-all group-hover/hub:scale-110 shadow-sm border border-border">
                              <currentPlatform.icon className="w-4 h-4 text-primary" />
                            </div>
                            <span className="truncate text-muted-foreground group-hover/hub:text-foreground dark:group-hover/hub:text-zinc-100 font-bold text-xs uppercase tracking-tight">
                              {currentPlatform.label}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-zinc-200 dark:border-white/10 dark:bg-zinc-900 shadow-3xl animate-in fade-in zoom-in-95 duration-200">
                    <SelectItem
                      value="all"
                      className="font-bold text-xs py-3 rounded-xl mx-1 my-1 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="w-4 h-4 text-zinc-400" />
                        <span>All Platforms</span>
                      </div>
                    </SelectItem>
                    {Object.entries(PLATFORM_META)
                      .filter(
                        ([id]) => id !== "all" && enabledPlatforms.includes(id),
                      )
                      .map(([id, meta]) => (
                        <SelectItem
                          key={id}
                          value={id}
                          className="font-bold text-xs py-3 rounded-xl mx-1 my-0.5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <meta.icon className="w-4 h-4" />
                            <span className="font-bold">{meta.label}</span>
                          </div>
                        </SelectItem>
                      ))}

                    <div className="p-2 mt-1 border-t border-zinc-100 dark:border-white/5">
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 h-9 px-2 text-[10px] font-black uppercase tracking-widest text-[#007AFF] hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl"
                        onClick={() => {
                          setIsAddingPlatform(true);
                        }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Platform
                      </Button>
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* Account Section — shown for all platforms that have accounts */}
              {accounts.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black tracking-widest text-primary/60 ml-1 uppercase">
                    Account
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between bg-white/40 dark:bg-zinc-800/40 border border-border/40 shadow-sm hover:shadow-md font-black h-10 text-[11px] rounded-xl hover:bg-white dark:hover:bg-zinc-800 transition-all px-3 group/hub"
                      >
                        <div className="flex items-center gap-3 truncate">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center group-hover/hub:scale-110 transition-transform">
                            <BarChart3 className="w-4 h-4 text-primary" />
                          </div>
                          <span className="truncate text-muted-foreground group-hover/hub:text-foreground dark:group-hover/hub:text-zinc-100 font-bold text-xs">
                            {selectedAccountId === "all"
                              ? "All Accounts"
                              : accounts.find((a) => a.id === selectedAccountId)
                                ?.name || "Select Account"}
                          </span>
                        </div>
                        <ChevronDown className="h-3 w-3 opacity-30 ml-2 flex-shrink-0 group-hover/hub:opacity-100 transition-opacity" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-64 max-h-[400px] overflow-y-auto rounded-2xl shadow-3xl border-zinc-200 dark:border-white/10 dark:bg-zinc-900 border animate-in slide-in-from-top-2 duration-300"
                    >
                      <DropdownMenuItem
                        onClick={() => setSelectedAccountId("all")}
                        className={cn(
                          "py-3 px-4 rounded-xl mx-1 my-1 transition-all",
                          selectedAccountId === "all"
                            ? "bg-primary/10 font-black text-primary"
                            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold",
                        )}
                      >
                        <Globe className="h-4 w-4 mr-3 opacity-70" />
                        <span className="text-xs uppercase tracking-widest font-black">
                          All Accounts
                        </span>
                      </DropdownMenuItem>
                      <div className="h-[1px] bg-zinc-100 dark:bg-white/5 mx-2 my-1" />
                      {accounts.map((account) => (
                        <DropdownMenuItem
                          key={account.id}
                          onClick={() => {
                            setSelectedAccountId(account.id || "");
                            setIsViewAllAdsOpen(false);
                          }}
                          className={cn(
                            "py-3 px-4 rounded-xl mx-1 my-0.5 transition-all group/item",
                            selectedAccountId === account.id
                              ? "bg-primary/10 font-black text-primary shadow-sm"
                              : "hover:bg-zinc-100 dark:hover:bg-zinc-800 font-bold",
                          )}
                        >
                          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mr-3 group-hover/item:scale-110 transition-transform">
                            <BarChart3 className="h-4 w-4 text-zinc-500" />
                          </div>
                          <div className="flex flex-col items-start leading-tight overflow-hidden">
                            <span className="font-bold text-xs truncate w-full">
                              {account.name}
                            </span>
                            <span className="text-[9px] text-muted-foreground font-mono leading-none mt-1 opacity-50 uppercase tracking-tighter">
                              {account.id}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>

            {/* Campaign filter — visible when Google Ads OR AdRoll is selected */}
            {!isSidebarCollapsed &&
              (selectedPlatform === "google" ||
                selectedPlatform === "adroll") &&
              realtimeCampaigns.length > 0 && (
                <div className="px-3 pb-2">
                  <label
                    className={`text-[10px] font-black tracking-widest ml-1 uppercase block mb-1.5 flex items-center gap-1.5 ${selectedPlatform === "adroll" ? "text-[#E0267D]/60" : "text-primary/60"}`}
                  >
                    <Target className="w-3 h-3" />
                    Campaign
                  </label>
                  <Select
                    value={selectedRealtimeCampaign}
                    onValueChange={setSelectedRealtimeCampaign}
                  >
                    <SelectTrigger className="w-full h-10 px-3 border border-border/40 bg-white/40 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800 shadow-sm hover:shadow-md focus:ring-0 rounded-xl transition-all duration-300 text-left text-[11px]">
                      <div className="flex items-center gap-2 truncate w-full">
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedPlatform === "adroll" ? "bg-[#E0267D]/10" : "bg-blue-500/10"}`}
                        >
                          <Target
                            className={`w-3 h-3 ${selectedPlatform === "adroll" ? "text-[#E0267D]" : "text-blue-600 dark:text-blue-400"}`}
                          />
                        </div>
                        <SelectValue placeholder="All Campaigns" />
                      </div>
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/40 max-h-72">
                      <SelectItem
                        value="all"
                        className="rounded-xl py-2.5 font-bold text-xs"
                      >
                        All Campaigns
                      </SelectItem>
                      {realtimeCampaigns.map((c: any) => (
                        <SelectItem
                          key={c.id}
                          value={String(c.id)}
                          className="rounded-xl py-2.5 font-medium text-xs"
                        >
                          {(c.name || "Unknown").substring(0, 38)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

            <div
              className={`px-3 ${isSidebarCollapsed ? "flex flex-col items-center gap-4" : "hidden"}`}
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-sm">
                <Globe className="w-5 h-5 text-primary" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform shadow-sm">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
            </div>

            <div
              className={`px-4 mt-2 ${isSidebarCollapsed || selectedPlatform === "google" || selectedPlatform === "adroll" ? "hidden" : ""}`}
            >
              {/* Search bar — shown for all platforms */}
              {true && (
                <div className="relative group/search z-50">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-muted-foreground transition-colors group-focus-within/search:text-primary" />
                  </div>
                  <Input
                    placeholder="Search ads by ID..."
                    className="bg-white/40 dark:bg-zinc-800/40 border-border/40 focus:border-primary/50 focus:bg-white transition-all rounded-2xl h-11 pl-10 text-xs font-bold"
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value;
                      setSearchQuery(val);
                      if (!val.trim()) {
                        setSelectedAccountId("all");
                        setSelectedAdId(null);
                        setSelectedPlatform("meta");
                        setIsViewAllAdsOpen(false);
                      }
                      setIsSearchDropdownOpen(true);
                    }}
                    onFocus={() => setIsSearchDropdownOpen(true)}
                    onBlur={() =>
                      setTimeout(() => setIsSearchDropdownOpen(false), 200)
                    }
                  />
                  {searchQuery && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedAccountId("all");
                        setSelectedAdId(null);
                        setSelectedPlatform("meta");
                        setIsViewAllAdsOpen(false);
                        setIsSearchDropdownOpen(false);
                      }}
                      className="absolute right-3 top-3 h-4 w-4 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}

                  {/* Search Results Animate-in */}
                  {searchQuery.trim().length > 0 && isSearchDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-64 overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 rounded-2xl shadow-3xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="py-2 p-1">
                        {searchDropdownResults.length > 0 ? (
                          searchDropdownResults.map((ad) => (
                            <button
                              key={ad.id}
                              onClick={() => {
                                const accountExists = accounts.some(
                                  (a) => a.id === ad.adAccountId,
                                );
                                if (accountExists)
                                  setSelectedAccountId(ad.adAccountId);
                                setSelectedAdId(ad.id);
                                setSearchQuery(ad.adId);
                                updateHistory(ad.id);
                                setIsSearchDropdownOpen(false);
                                setIsViewAllAdsOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors border-none mb-0.5 last:mb-0"
                            >
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate mb-0.5">
                                {ad.adName}
                              </span>
                              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono tracking-tighter">
                                <span>{ad.adId}</span>
                                <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded uppercase font-black">
                                  {PLATFORM_META[ad.platform as any]?.label ||
                                    "AD"}
                                </span>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-6 text-center">
                            <Search className="w-8 h-8 text-zinc-200 dark:text-zinc-800 mx-auto mb-2" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                              No matches found
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation — shown for all platforms */}
            {true && (
              <div
                className={`px-3 mt-4 space-y-2 ${isSidebarCollapsed ? "flex flex-col items-center" : ""}`}
              >
                <label
                  className={`text-[10px] font-black tracking-widest text-zinc-400 uppercase ml-1 ${isSidebarCollapsed ? "hidden" : "block"}`}
                >
                  Navigation
                </label>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsViewAllAdsOpen(true);
                    setIsGuideOpen(false);
                    setIsProfileOpen(false);
                    setIsSettingsOpen(false);
                    if (isMobile) setIsMobileMenuOpen(false);
                  }}
                  className={cn(
                    "w-full justify-start gap-3 h-10 px-3 rounded-xl transition-all relative group/nav overflow-hidden",
                    isViewAllAdsOpen
                      ? "bg-[#020617] text-white border border-[#007AFF] active:scale-95"
                      : "text-muted-foreground hover:text-foreground dark:hover:text-zinc-100 hover:bg-secondary dark:hover:bg-zinc-800 shadow-none",
                    isSidebarCollapsed ? "w-12 h-12 p-0 justify-center" : "",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500",
                      isViewAllAdsOpen
                        ? "bg-white/20"
                        : "bg-background/80 dark:bg-zinc-800/50 group-hover/nav:bg-card dark:group-hover/nav:bg-zinc-700 shadow-sm border border-border/10",
                    )}
                  >
                    <LayoutDashboard className="h-4 w-4" />
                  </div>
                  {!isSidebarCollapsed && (
                    <span className="text-[11px] font-black uppercase tracking-widest">
                      Library
                    </span>
                  )}
                  {isViewAllAdsOpen && !isSidebarCollapsed && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  )}
                </Button>
              </div>
            )}

            {/* Recent History — shown for all platforms */}
            {recentAds.length > 0 && (
              <div
                className={`px-3 mt-4 ${isSidebarCollapsed ? "hidden" : "block"}`}
              >
                <div className="flex items-center justify-between px-1 mb-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Recent Audits
                  </h3>
                  <div className="h-[1px] flex-1 bg-zinc-100 dark:bg-white/5 ml-4" />
                </div>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                  {recentAds.map((ad) => (
                    <button
                      key={ad.id}
                      onClick={() => {
                        const accountExists = accounts.some(
                          (a) => a.id === ad.adAccountId,
                        );
                        if (accountExists) setSelectedAccountId(ad.adAccountId);
                        setSelectedAdId(ad.id);
                        if (ad.platform === "google") {
                          setSearchQuery(ad.adId);
                        }
                        setIsViewAllAdsOpen(false);
                      }}
                      className="w-full text-left px-3 py-3 rounded-xl transition-all border group/audit relative overflow-hidden border-transparent hover:bg-secondary/50 dark:hover:bg-zinc-800/40 text-muted-foreground hover:text-foreground dark:hover:text-zinc-100 font-bold"
                    >
                      <div className="flex items-center gap-3 relative z-10">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black uppercase tracking-tighter transition-colors bg-secondary dark:bg-zinc-800 text-muted-foreground group-hover/audit:bg-card dark:group-hover/audit:bg-zinc-700 shadow-sm">
                          {ad.platform === "meta"
                            ? "M"
                            : ad.platform === "google"
                              ? "G"
                              : ad.platform === "tiktok"
                                ? "T"
                                : ad.platform === "youtube"
                                  ? "Y"
                                  : ad.platform === "linkedin"
                                    ? "L"
                                    : ad.platform === "taboola"
                                      ? "TB"
                                      : ad.platform === "bing"
                                        ? "B"
                                        : ad.platform === "adroll"
                                          ? "AR"
                                          : "A"}
                        </div>
                        <div className="flex-1 overflow-hidden text-left">
                          <span className="text-[11px] font-black leading-tight truncate block group-hover/audit:tracking-tight transition-all uppercase tracking-widest">
                            {ad.adName}
                          </span>
                          <span className="text-[9px] opacity-40 font-mono block truncate mt-0.5">
                            {ad.adId}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Account Audit Section — to match user screenshot */}
            {!isSidebarCollapsed && (
              <div className="px-3 mt-4">
                <div className="flex items-center justify-between px-1 mb-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    Account Audit
                  </h3>
                  <div className="h-[1px] flex-1 bg-zinc-100 dark:bg-white/5 ml-4" />
                </div>
                <div className="space-y-1">
                  <button
                    onClick={() => setSelectedPlatform("meta")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-bold text-[11px] uppercase tracking-widest",
                      selectedPlatform === "meta" ||
                        selectedPlatform === "adroll"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary/50",
                    )}
                  >
                    <Facebook className="w-4 h-4" />
                    <span>Meta Ads</span>
                  </button>
                  <button
                    onClick={() => setSelectedPlatform("google")}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-bold text-[11px] uppercase tracking-widest",
                      selectedPlatform === "google"
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-secondary/50",
                    )}
                  >
                    <Play className="w-4 h-4" />
                    <span>Google Ads</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bottom: Sidebar Toggle */}
          <div className="p-3 border-t border-border mt-auto">
            <Button
              variant="ghost"
              size="sm"
              className={`w-full text-muted-foreground hover:text-foreground ${isSidebarCollapsed ? "justify-center" : "justify-start"}`}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            >
              {isSidebarCollapsed ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
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
          <div
            className={cn(
              "flex items-center justify-between h-10 md:h-11 py-1 border-b border-border bg-background/50 dark:bg-black/40 backdrop-blur-xl z-10 transition-all duration-300",
              "px-4 md:px-6",
              (!isProfileOpen && !isSettingsOpen && !isGuideOpen && !isViewAllAdsOpen && selectedPlatform === "google") ? "hidden md:hidden" : ""
            )}
          >
            <div className="flex items-center gap-2 md:gap-4 min-w-0 overflow-hidden">
              {/* Mobile Sidebar Trigger */}
              <div className="md:hidden flex-shrink-0">
                <Sheet
                  open={isMobileMenuOpen}
                  onOpenChange={setIsMobileMenuOpen}
                >
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Menu className="h-4.5 w-4.5 text-zinc-700 dark:text-zinc-300" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-72">
                    <SheetHeader className="sr-only">
                      <SheetTitle>Navigation Menu</SheetTitle>
                      <SheetDescription>
                        Access your profile, settings, and ad accounts.
                      </SheetDescription>
                    </SheetHeader>
                    {/* Mobile Sidebar Content */}
                    <div className="flex flex-col h-full bg-card">
                      {/* Profile Section */}
                      <div className="p-4 border-b border-border">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="group w-full justify-start p-2 h-14 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                              <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
                                {session?.user?.name?.[0] || "U"}
                              </div>
                              <div className="ml-3 flex flex-col items-start overflow-hidden w-full">
                                <span className="text-sm font-semibold truncate w-full text-left text-zinc-900 dark:text-zinc-100">
                                  {session?.user?.name || "User"}
                                </span>
                                <span className="text-xs text-muted-foreground truncate w-full text-left capitalize">
                                  {(session?.user as any)?.role || "Viewer"}{" "}
                                  Plan
                                </span>
                              </div>
                              <ChevronDown className="h-4 w-4 ml-auto text-zinc-400 transition-transform duration-200 group-data-[state=open]:rotate-180 group-hover:text-zinc-600 dark:group-hover:text-zinc-300" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-60">
                            <SheetClose asChild>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setIsProfileOpen(true);
                                  setIsSettingsOpen(false);
                                  setIsViewAllAdsOpen(false);
                                  setIsGuideOpen(false);
                                  setIsMobileMenuOpen(false);
                                }}
                              >
                                <User className="mr-2 h-4 w-4" /> Profile
                              </DropdownMenuItem>
                            </SheetClose>
                            <SheetClose asChild>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setIsSettingsOpen(true);
                                  setIsProfileOpen(false);
                                  setIsViewAllAdsOpen(false);
                                  setIsGuideOpen(false);
                                  setIsMobileMenuOpen(false);
                                }}
                              >
                                <Settings className="mr-2 h-4 w-4" /> Settings
                              </DropdownMenuItem>
                            </SheetClose>
                            {(session?.user as any)?.provider ===
                              "credentials" && (
                                <DropdownMenuItem
                                  onClick={() => setIsPasswordDialogOpen(true)}
                                >
                                  <Lock className="mr-2 h-4 w-4" /> Change
                                  Password
                                </DropdownMenuItem>
                              )}
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => signOut({ callbackUrl: "/login" })}
                            >
                              <LogOut className="mr-2 h-4 w-4" /> Log out
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Navigation / Accounts */}
                      <div className="flex-1 overflow-auto py-4 px-3 space-y-4">
                        {/* Mobile Platform Switcher */}
                        <div className="space-y-1.5 pt-2">
                          <label className="text-[10px] font-black tracking-widest text-muted-foreground ml-1 uppercase">
                            Select Platform
                          </label>
                          <Select
                            value={selectedPlatform}
                            onValueChange={(v: any) => {
                              setSelectedPlatform(v);
                              setIsMobileMenuOpen(false);
                            }}
                            onOpenChange={(open) => {
                              if (!open) {
                                setIsAddingPlatform(false);
                                setPlatformSearchQuery("");
                              }
                            }}
                          >
                            <SelectTrigger className="w-full h-12 bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 rounded-xl font-bold text-sm">
                              <div className="flex items-center gap-3">
                                <Globe className="w-4 h-4 text-[#007AFF]" />
                                <SelectValue placeholder="Platform" />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-zinc-200 dark:border-white/10 dark:bg-zinc-900 shadow-2xl z-[2000]">
                              <SelectItem
                                value="all"
                                className="font-bold py-3 text-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <Globe className="w-4 h-4" />
                                  <span>All Platforms</span>
                                </div>
                              </SelectItem>
                              {Object.entries(PLATFORM_META)
                                .filter(
                                  ([id]) =>
                                    id !== "all" &&
                                    enabledPlatforms.includes(id),
                                )
                                .map(([id, meta]) => (
                                  <SelectItem
                                    key={id}
                                    value={id}
                                    className="font-bold py-3 text-sm"
                                  >
                                    <div className="flex items-center gap-3">
                                      <meta.icon className="w-4 h-4" />
                                      <span>{meta.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}

                              <div className="p-2 mt-1 border-t border-zinc-100 dark:border-white/5">
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start gap-2 h-10 px-2 text-xs font-bold text-[#007AFF] hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-xl"
                                  onClick={() => {
                                    setIsAddingPlatform(true);
                                    setIsMobileMenuOpen(false);
                                  }}
                                >
                                  <Plus className="w-4 h-4" />
                                  Add Platform
                                </Button>
                              </div>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Navigation — visible for all platforms */}
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black tracking-widest text-muted-foreground ml-1 uppercase">
                              Navigation
                            </label>
                            <Button
                              variant="ghost"
                              onClick={() => {
                                setIsViewAllAdsOpen(true);
                                setIsGuideOpen(false);
                                setIsProfileOpen(false);
                                setIsSettingsOpen(false);
                                setIsMobileMenuOpen(false);
                              }}
                              className={cn(
                                "w-full justify-start gap-3 h-12 px-3 rounded-2xl transition-all relative group/nav overflow-hidden",
                                isViewAllAdsOpen
                                  ? "bg-[#020617] text-white border border-[#007AFF]"
                                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                              )}
                            >
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300",
                                  isViewAllAdsOpen
                                    ? "bg-white/20"
                                    : "bg-zinc-100 dark:bg-zinc-800",
                                )}
                              >
                                <LayoutDashboard className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-black uppercase tracking-widest">
                                Library
                              </span>
                            </Button>
                          </div>

                          {recentAds.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between px-1">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                                  Recent History
                                </h3>
                                <div className="h-[1px] flex-1 bg-zinc-100 dark:bg-white/5 ml-4" />
                              </div>
                              <div className="space-y-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                                {recentAds.map((ad) => (
                                  <button
                                    key={ad.id}
                                    onClick={() => {
                                      const accountExists = accounts.some(
                                        (a) => a.id === ad.adAccountId,
                                      );
                                      if (accountExists)
                                        setSelectedAccountId(ad.adAccountId);
                                      setSelectedAdId(ad.id);
                                      if (ad.platform === "google") {
                                        setSearchQuery(ad.adId);
                                      }
                                      setIsViewAllAdsOpen(false);
                                      setIsMobileMenuOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-3 rounded-xl transition-all border group/audit border-transparent hover:bg-secondary/50 dark:hover:bg-zinc-800/40 text-muted-foreground hover:text-foreground font-bold"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black uppercase bg-secondary dark:bg-zinc-800 shrink-0">
                                        {ad.platform === "meta"
                                          ? "M"
                                          : ad.platform === "google"
                                            ? "G"
                                            : "A"}
                                      </div>
                                      <div className="flex-1 min-w-0 text-left">
                                        <span className="text-[11px] font-black leading-tight truncate block uppercase tracking-widest">
                                          {ad.adName}
                                        </span>
                                        <span className="text-[9px] opacity-40 font-mono block truncate mt-0.5">
                                          {ad.adId}
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>

              {/* Mobile Title - Breadcrumbs Style */}
              <div className="flex items-center md:hidden min-w-0 flex-1 gap-0.5 h-full">
                <span className="text-[11px] font-medium text-muted-foreground flex-shrink-0 leading-none">
                  Dashboard
                </span>
                {(selectedPlatform !== "all" ||
                  connectedPlatforms.length <= 1) && (
                    <>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/30 flex-shrink-0 mx-px" />
                      <span className="text-[11px] font-medium text-muted-foreground flex-shrink-0 leading-none whitespace-nowrap">
                        {selectedPlatform === "all"
                          ? "Meta"
                          : PLATFORM_META[selectedPlatform]?.label ||
                          selectedPlatform}
                      </span>
                    </>
                  )}
                {(isProfileOpen ||
                  isSettingsOpen ||
                  isGuideOpen ||
                  isViewAllAdsOpen ||
                  selectedPlatform === "meta" ||
                  selectedPlatform === "google" ||
                  selectedPlatform === "adroll" ||
                  selectedPlatform === "all") && (
                    <>
                      <ChevronRight className="w-3 h-3 text-muted-foreground/30 flex-shrink-0 mx-px" />
                      <span className="text-[12px] font-semibold text-foreground whitespace-nowrap leading-none truncate min-w-0">
                        {isProfileOpen
                          ? "Profile"
                          : isSettingsOpen
                            ? "Settings"
                            : isGuideOpen
                              ? "Guide"
                              : isViewAllAdsOpen
                                ? "All Ads"
                                : (selectedPlatform === "meta" || selectedPlatform === "all")
                                  ? selectedAccountId === "all"
                                    ? "All Accounts"
                                    : accounts.find(
                                      (a) => a.id === selectedAccountId,
                                    )?.name || "All Accounts"
                                  : (selectedPlatform === "google" || selectedPlatform === "adroll")
                                    ? selectedRealtimeCampaign === "all"
                                      ? "All Campaigns"
                                      : realtimeCampaigns.find(c => c.id === selectedRealtimeCampaign)?.name ||
                                      realtimeCampaigns.find(c => c.id === selectedRealtimeCampaign)?.campaignName ||
                                      "Campaign"
                                    : ""}
                      </span>
                    </>
                  )}
              </div>

              <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground">
                <LayoutDashboard className="h-3.5 w-3.5 text-muted-foreground/50" />
                <span>/</span>
                <span className="font-medium text-foreground">Dashboard</span>

                {(selectedPlatform !== "all" ||
                  connectedPlatforms.length <= 1) && (
                    <>
                      <span>/</span>
                      <span className="font-medium text-muted-foreground uppercase tracking-widest text-[11px] opacity-70">
                        {selectedPlatform === "all"
                          ? "Meta"
                          : PLATFORM_META[selectedPlatform]?.label ||
                          selectedPlatform}
                      </span>
                    </>
                  )}

                {(isProfileOpen ||
                  isSettingsOpen ||
                  isGuideOpen ||
                  isViewAllAdsOpen ||
                  selectedPlatform === "meta" ||
                  selectedPlatform === "google" ||
                  selectedPlatform === "adroll" ||
                  selectedPlatform === "all") && (
                    <>
                      <span>/</span>
                      <span className="truncate max-w-[150px] lg:max-w-none font-semibold text-foreground">
                        {isProfileOpen
                          ? "Profile"
                          : isSettingsOpen
                            ? "Settings"
                            : isGuideOpen
                              ? "Guide"
                              : isViewAllAdsOpen
                                ? "All Ads"
                                : selectedAdId
                                  ? "Analysis"
                                  : (selectedPlatform === "meta" || selectedPlatform === "all")
                                    ? selectedAccountId === "all"
                                      ? "All Accounts"
                                      : accounts.find(
                                        (a) => a.id === selectedAccountId,
                                      )?.name || "All Accounts"
                                    : (selectedPlatform === "google" || selectedPlatform === "adroll")
                                      ? selectedRealtimeCampaign === "all"
                                        ? "All Campaigns"
                                        : realtimeCampaigns.find(c => c.id === selectedRealtimeCampaign)?.name ||
                                        realtimeCampaigns.find(c => c.id === selectedRealtimeCampaign)?.campaignName ||
                                        "Campaign"
                                      : ""}
                      </span>
                    </>
                  )}
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
                      duration: 5000,
                    });
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
                    setIsViewAllAdsOpen(false);
                    setEnlargedImage(null);
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
                      "hidden md:flex group items-center transition-all duration-300 flex-shrink-0 relative h-10 active:scale-[0.96]",
                      "rounded-2xl bg-white dark:bg-zinc-900 border border-border hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm",
                      showRefreshText || isSyncing
                        ? "px-4"
                        : "w-10 justify-center",
                      isSyncing && "opacity-70 pointer-events-none",
                      (selectedPlatform === "google" && googleAdsDataSource === "realtime") && "hidden"
                    )}
                  >
                    <RefreshCcw
                      className={cn(
                        "h-4 w-4 transition-transform duration-1000 text-zinc-600 dark:text-zinc-400",
                        isSyncing && "animate-spin",
                      )}
                    />
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-500 flex items-center",
                        showRefreshText || isSyncing
                          ? "max-w-[180px] opacity-100 ml-2.5"
                          : "max-w-0 opacity-0 ml-0",
                      )}
                    >
                      <span className="text-[12px] font-bold text-zinc-500 whitespace-nowrap uppercase tracking-wider">
                        {isSyncing ? "Syncing..." : "Updated"}
                      </span>
                    </div>
                  </button>

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
                      <DropdownMenuContent
                        align="end"
                        className="w-56 p-1.5 rounded-xl"
                      >
                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Actions
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => loadData(true)}
                          className="rounded-lg cursor-pointer"
                        >
                          <RefreshCcw
                            className={cn(
                              "mr-2 h-4 w-4",
                              isSyncing && "animate-spin",
                            )}
                          />
                          <span>
                            {isSyncing ? "Syncing..." : "Refresh Data"}
                          </span>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          Appearance
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => setTheme("light")}
                          className={cn(
                            "rounded-lg cursor-pointer",
                            mounted && theme === "light" && "bg-accent",
                          )}
                        >
                          <Sun className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>Light Mode</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTheme("dark")}
                          className={cn(
                            "rounded-lg cursor-pointer",
                            mounted && theme === "dark" && "bg-accent",
                          )}
                        >
                          <Moon className="mr-2 h-4 w-4 text-muted-foreground" />
                          <span>Dark Mode</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setTheme("system")}
                          className={cn(
                            "rounded-lg cursor-pointer",
                            mounted && theme === "system" && "bg-accent",
                          )}
                        >
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

          <div
            className={cn(
              "pb-8 space-y-6 md:space-y-8 transition-all duration-300 flex-1 flex flex-col",
              "px-4 md:px-6",
              (selectedPlatform === "google" || selectedPlatform === "adroll") &&
                !isProfileOpen &&
                !isSettingsOpen &&
                !isGuideOpen &&
                !isViewAllAdsOpen
                ? "pt-0"
                : "pt-6",
              !isReducedMotionEnabled &&
              "animate-in fade-in slide-in-from-bottom-4 duration-700",
              // Only add right padding for the analysis sidebar if we're actually looking at an ad analysis/details view
              !isGuideOpen &&
              activeAnalysis &&
              !isMobile &&
              selectedAdId &&
              "md:pr-[300px] xl:pr-[340px] 2xl:pr-[380px]",
            )}
          >
            {isGuideOpen ? (
              <div className="flex-1 animate-in fade-in zoom-in-95 duration-500 pb-10 px-1.5 md:px-6">
                <div
                  className={cn(
                    "max-w-7xl mx-auto mt-2 md:mt-4 rounded-[12px] border border-zinc-200/50 dark:border-white/10 p-4 md:p-10 shadow-2xl relative overflow-hidden group",
                    isGlassmorphismEnabled
                      ? "bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md"
                      : "bg-white dark:bg-zinc-900",
                  )}
                >
                  {/* Decorative Elements */}
                  {/* Decorative Elements - Reduced for Mobile */}
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/10 rounded-full blur-[40px] md:blur-[80px] group-hover:bg-blue-500/20 transition-all duration-1000 pointer-events-none" />
                  <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-[40px] md:blur-[80px] group-hover:bg-indigo-500/20 transition-all duration-1000 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 md:mb-12">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest border border-blue-200/50 dark:border-blue-500/20">
                            Support Center
                          </span>
                        </div>
                        <h2 className="text-2xl md:text-5xl font-black tracking-tightest text-[#007AFF] mb-1 drop-shadow-sm flex items-center gap-2">
                          Hi,{" "}
                          <span className="text-zinc-900 dark:text-white capitalize">
                            {session?.user?.name || "User"}!
                          </span>
                        </h2>
                        <h1 className="text-lg md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 leading-tight">
                          Dashboard Guidance
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1.5 max-w-2xl leading-relaxed">
                          Welcome to your Creative AI command center. Here's
                          everything you need to know to master the analyzer.
                        </p>
                      </div>

                      <div className="w-full md:w-72 lg:w-80 p-4 rounded-[12px] bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/10 backdrop-blur-sm relative overflow-hidden group/prime">
                        <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/prime:scale-110 transition-transform duration-500">
                          <Sparkles className="w-8 h-8 text-blue-500" />
                        </div>
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-bold uppercase tracking-tighter text-blue-600 dark:text-blue-400">
                              About Hola Prime
                            </span>
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground font-medium">
                            <span className="text-foreground font-bold">
                              Hola Prime
                            </span>{" "}
                            is your advanced AI-driven creative intelligence
                            platform, designed to transform raw performance data
                            into actionable visual insights and aesthetic
                            excellence.
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
                            <h3 className="text-[15px] md:text-lg font-bold">
                              1. Unified Asset Command
                            </h3>
                            <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">
                              Your central hub for Google Ads. Navigate
                              seamlessly between{" "}
                              <span className="font-bold text-foreground">
                                Overview, Campaigns, Ads & Assets,
                              </span>{" "}
                              and{" "}
                              <span className="font-bold text-foreground">
                                Keywords
                              </span>{" "}
                              tabs to master your account structure.
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4 group/item">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-indigo-100 dark:border-indigo-500/20">
                            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-indigo-500" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-[15px] md:text-lg font-bold">
                              2. Performance Trends
                            </h3>
                            <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">
                              Real-time visualization of your spend distribution
                              and efficiency. The{" "}
                              <span className="font-bold text-foreground">
                                Performance Snapshot
                              </span>{" "}
                              chart provides an immediate pulse on active
                              scaling assets.
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4 group/item">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-amber-100 dark:border-amber-500/20">
                            <LayoutGrid className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-[15px] md:text-lg font-bold">
                              3. Format Intelligence
                            </h3>
                            <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">
                              Understand how your creative mix performs. The{" "}
                              <span className="font-bold text-foreground">
                                Format Performance
                              </span>{" "}
                              breakdown isolates efficiency across Search,
                              Display, Video, and Shopping placements.
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4 group/item">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-emerald-100 dark:border-emerald-500/20">
                            <Search className="w-4 h-4 md:w-5 md:h-5 text-emerald-500" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-[15px] md:text-lg font-bold">
                              4. Keyword Signals
                            </h3>
                            <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">
                              Deep dive into intent. The{" "}
                              <span className="font-bold text-foreground">
                                Search Keywords
                              </span>{" "}
                              analysis reveals not just what users search, but
                              which terms drive actual conversion value.
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4 group/item">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-pink-100 dark:border-pink-500/20">
                            <Brain className="w-4 h-4 md:w-5 md:h-5 text-pink-500" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-[15px] md:text-lg font-bold">
                              5. Optimization Engine
                            </h3>
                            <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">
                              AI-driven strategy. The{" "}
                              <span className="font-bold text-foreground">
                                Optimization Hub
                              </span>{" "}
                              detects neutral engines and suggests strategic
                              shifts to unlock growth potential.
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4 group/item">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-cyan-100 dark:border-cyan-500/20">
                            <Trophy className="w-4 h-4 md:w-5 md:h-5 text-cyan-500" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-[15px] md:text-lg font-bold">
                              6. Creative Benchmarking
                            </h3>
                            <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">
                              Compare asset efficiency instantly. Identify
                              top-tier creatives with{" "}
                              <span className="font-bold text-foreground">
                                Power Creatives
                              </span>{" "}
                              benchmarking before Google's learning phase
                              completes.
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4 group/item">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-purple-100 dark:border-purple-500/20">
                            <Info className="w-4 h-4 md:w-5 md:h-5 text-purple-500" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-[15px] md:text-lg font-bold">
                              7. Audience Resonance
                            </h3>
                            <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">
                              Know your viewer.{" "}
                              <span className="font-bold text-foreground">
                                Audience Insights
                              </span>{" "}
                              track affinity scores and potential reach to
                              ensure your message lands with the right segments.
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4 group/item">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-orange-100 dark:border-orange-500/20">
                            <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-[15px] md:text-lg font-bold">
                              8. Metric Deep Dives
                            </h3>
                            <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">
                              Granular control. Hover over account-level metrics
                              like{" "}
                              <span className="font-bold text-foreground">
                                ROAS, Conversions,
                              </span>{" "}
                              and{" "}
                              <span className="font-bold text-foreground">
                                Avg. CPC
                              </span>{" "}
                              for detailed definitions and performance context.
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4 group/item">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-rose-100 dark:border-rose-500/20">
                            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-rose-500" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-[15px] md:text-lg font-bold">
                              9. Creative Analysis
                            </h3>
                            <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">
                              Go deeper. Click{" "}
                              <span className="font-bold text-foreground">
                                Analyze
                              </span>{" "}
                              on any asset to open the{" "}
                              <span className="font-bold text-foreground">
                                Ad Detail View
                              </span>
                              , revealing AI scores for Attention, Interest,
                              Desire, and Action (AIDA).
                            </p>
                          </div>
                        </div>
                      </section>

                      <section className="space-y-4 group/item">
                        <div className="flex items-start gap-3 md:gap-4">
                          <div className="w-8 h-8 md:w-10 md:h-10 rounded-[10px] md:rounded-[12px] bg-slate-50 dark:bg-slate-500/10 flex items-center justify-center flex-shrink-0 group-hover/item:scale-105 transition-transform duration-300 border border-slate-100 dark:border-slate-500/20">
                            <Globe className="w-4 h-4 md:w-5 md:h-5 text-slate-500" />
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-[15px] md:text-lg font-bold">
                              10. Multi-Platform Context
                            </h3>
                            <p className="text-[13px] md:text-sm leading-relaxed text-muted-foreground">
                              Holistic view. While focused on Google, easily
                              switch contexts to compare performance against
                              other channels using the{" "}
                              <span className="font-bold text-foreground">
                                Global Platform Switcher
                              </span>
                              .
                            </p>
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
                          <h3 className="text-lg font-black tracking-tight text-amber-600 dark:text-amber-500 uppercase text-[10px] tracking-widest">
                            Important Security Note
                          </h3>
                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            Profile Management & Authentication Providers
                          </p>
                          <p className="text-xs md:text-sm leading-relaxed text-muted-foreground">
                            If you are logged in via{" "}
                            <span className="font-bold text-foreground">
                              Google OAuth
                            </span>
                            , your profile details (name and email) and security
                            settings are managed directly by Google. For
                            security reasons, you cannot update these identity
                            details within this dashboard. Users on{" "}
                            <span className="font-bold text-foreground">
                              Credentials
                            </span>{" "}
                            accounts have full access to revise their identity
                            and passwords through the Profile view.
                          </p>
                        </div>
                      </div>
                    </section>

                    <div className="mt-8 md:mt-12 p-4 md:p-6 bg-zinc-50 dark:bg-zinc-800/30 rounded-[12px] border border-dashed border-zinc-200 dark:border-zinc-700 text-center relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-50" />
                      <p className="text-[11px] md:text-sm font-medium italic text-muted-foreground leading-relaxed">
                        "Empowering your creative strategy with data-driven
                        intelligence.
                        <br className="hidden md:block" /> Precision,
                        performance, and excellence in every pixel."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : isProfileOpen ? (
              <div className="flex-1 animate-in fade-in zoom-in-95 duration-500 pb-10 px-4 md:px-8 max-w-7xl mx-auto w-full">
                <ProfileView
                  onOpenPasswordChange={() => setIsPasswordDialogOpen(true)}
                  onBack={() => {
                    setIsProfileOpen(false);
                    setIsSettingsOpen(false);
                  }}
                />
              </div>
            ) : isSettingsOpen ? (
              <div className="flex-1 animate-in fade-in zoom-in-95 duration-500 pb-10 px-4 md:px-8 max-w-7xl mx-auto w-full">
                <SettingsView
                  onBack={() => {
                    setIsProfileOpen(false);
                    setIsSettingsOpen(false);
                  }}
                  onEnabledPlatformsChange={(platforms) => {
                    // Detect newly added platform (one that wasn't in enabledPlatforms before)
                    const newlyAdded = platforms.find(
                      (p) => !enabledPlatforms.includes(p),
                    );
                    setEnabledPlatforms(platforms);
                    if (newlyAdded) {
                      // Switch to the new platform and close all overlay views
                      setSelectedPlatform(newlyAdded as PlatformType);
                      setIsSettingsOpen(false);
                      setIsProfileOpen(false);
                      setIsGuideOpen(false);
                      setIsViewAllAdsOpen(false);
                    } else if (
                      selectedPlatform !== "all" &&
                      selectedPlatform !== "meta" &&
                      selectedPlatform !== "adroll" &&
                      !platforms.includes(selectedPlatform)
                    ) {
                      // If currently selected platform was removed, switch to Meta
                      setSelectedPlatform("google");
                    }
                  }}
                  currentEnabledPlatforms={enabledPlatforms}
                />
              </div>
            ) : isViewAllAdsOpen ? (
              <div className="flex-1 animate-in fade-in zoom-in-95 duration-500 pb-10 px-1.5 md:px-6">
                <div
                  className={cn(
                    "max-w-7xl mx-auto mt-2 md:mt-4 rounded-[12px] border border-zinc-200/50 dark:border-white/10 shadow-2xl relative overflow-hidden group h-[calc(100vh-140px)] md:h-[calc(100vh-160px)] flex flex-col",
                    "bg-white dark:bg-[#020617]",
                  )}
                >
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-10 relative">
                    {/* Corner Close Button */}
                    <button
                      onClick={() => {
                        setIsViewAllAdsOpen(false);
                        setDiscoveryAccountFilter("all");
                        setEnlargedImage(null);
                      }}
                      className="absolute top-3 right-3 p-2 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 transition-all z-50 shadow-sm border border-zinc-200 dark:border-zinc-700 active:scale-95 group focus:outline-none"
                    >
                      <X className="w-5 h-5 text-zinc-600 dark:text-zinc-400 group-hover:text-red-500 transition-colors" />
                    </button>

                    <div className="relative z-10 pt-2">
                      {/* Header Section - STRICTLY STACKED to prevent ANY overlap */}
                      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                        <div className="flex-shrink-0 md:w-auto">
                          <h1 className="text-2xl md:text-3xl font-black tracking-tightest text-[#007AFF]">
                            Discovery Hub
                          </h1>
                          <p className="text-[11px] md:text-xs text-muted-foreground mt-1">
                            Exploring all creatives across your ecosystem
                          </p>
                        </div>

                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto md:flex-1">
                          {/* Search Box */}
                          <div className="relative flex-1 w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                            <Input
                              placeholder="Search ads by name or ID..."
                              value={discoverySearchQuery}
                              onChange={(e) =>
                                setDiscoverySearchQuery(e.target.value)
                              }
                              className="pl-10 pr-10 h-11 w-full bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 rounded-xl text-xs md:text-sm focus-visible:ring-[#007AFF]/20 shadow-sm transition-all"
                            />
                            {discoverySearchQuery && (
                              <button
                                onClick={() => setDiscoverySearchQuery("")}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 w-full md:w-auto">
                            {/* Discovery View Switcher */}
                            <Select
                              value={discoveryViewMode}
                              onValueChange={(v: any) =>
                                setDiscoveryViewMode(v)
                              }
                            >
                              <SelectTrigger className="flex-1 md:w-[120px] md:flex-none h-11 bg-white/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-xl text-[10px] md:text-xs font-bold shadow-sm min-w-0">
                                <SelectValue placeholder="View" />
                              </SelectTrigger>
                              <SelectContent className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-zinc-200/50 dark:border-white/10 rounded-xl shadow-2xl">
                                <SelectItem
                                  value="grid"
                                  className="font-bold cursor-pointer rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <LayoutGrid className="h-4 w-4 text-zinc-900 dark:text-white" />
                                    <span className="text-xs">Grid</span>
                                  </div>
                                </SelectItem>
                                <SelectItem
                                  value="list"
                                  className="font-bold cursor-pointer rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <List className="h-4 w-4 text-emerald-500" />
                                    <span className="text-xs">List</span>
                                  </div>
                                </SelectItem>
                                <SelectItem
                                  value="table"
                                  className="font-bold cursor-pointer rounded-lg"
                                >
                                  <div className="flex items-center gap-2">
                                    <TableIcon className="h-4 w-4 text-amber-500" />
                                    <span className="text-xs">Table</span>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="flex-1 md:flex-none px-4 py-2 bg-[#007AFF]/10 rounded-xl border border-[#007AFF]/20 hover:bg-[#007AFF]/20 h-11 whitespace-nowrap shadow-sm min-w-0"
                                >
                                  <span className="text-[10px] md:text-xs font-bold text-[#007AFF] flex items-center gap-2 w-full justify-between">
                                    <span className="truncate">
                                      {discoveryLabel}
                                    </span>
                                    <ChevronDown className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 opacity-50" />
                                  </span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                className="w-[220px] md:w-72 p-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-zinc-200/50 dark:border-white/10 rounded-xl shadow-2xl"
                              >
                                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                                  Filter by Account
                                </DropdownMenuLabel>
                                <div className="space-y-1">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setDiscoveryAccountFilter("all")
                                    }
                                    className={cn(
                                      "flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer",
                                      discoveryAccountFilter === "all"
                                        ? "bg-primary/10 text-primary"
                                        : "hover:bg-zinc-100 dark:hover:bg-white/5",
                                    )}
                                  >
                                    <span className="text-sm font-semibold">
                                      Total Ads
                                    </span>
                                    <span className="text-xs font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                                      {selectedPlatform === "all"
                                        ? ads.length
                                        : ads.filter(
                                          (ad) =>
                                            ad.platform ===
                                            selectedPlatform ||
                                            (!ad.platform && selectedPlatform === "meta")
                                        ).length}
                                    </span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator className="bg-zinc-100 dark:bg-zinc-800" />
                                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-1">
                                    {accountStats.map((stat) => (
                                      <DropdownMenuItem
                                        key={stat.id}
                                        onClick={() =>
                                          setDiscoveryAccountFilter(
                                            stat.id || "",
                                          )
                                        }
                                        className={cn(
                                          "flex items-center justify-between p-2.5 rounded-lg transition-colors cursor-pointer",
                                          discoveryAccountFilter === stat.id
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-zinc-100 dark:hover:bg-white/5",
                                        )}
                                      >
                                        <span className="text-sm font-medium truncate pr-4">
                                          {stat.name}
                                        </span>
                                        <span className="text-xs font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                                          {stat.count}
                                        </span>
                                      </DropdownMenuItem>
                                    ))}
                                  </div>
                                </div>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>

                      {(() => {
                        if (filteredDiscoveryAds.length === 0) {
                          return (
                            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in zoom-in-95 duration-300">
                              <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                                <Search className="h-8 w-8 text-zinc-400" />
                              </div>
                              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                                No results found
                              </h3>
                              <p className="text-sm text-zinc-500 max-w-xs mx-auto mb-6">
                                We couldn't find any ads matching "
                                {discoverySearchQuery}". Try a different search
                                term.
                              </p>
                              <Button
                                variant="outline"
                                onClick={() => setDiscoverySearchQuery("")}
                                className="rounded-full"
                              >
                                Clear Search
                              </Button>
                            </div>
                          );
                        }

                        return (
                          <>
                            {discoveryViewMode === "grid" && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredDiscoveryAds.map((ad: AdData) => {
                                  const account = accounts.find(
                                    (a) => a.id === ad.adAccountId,
                                  );
                                  return (
                                    <div
                                      key={ad.id}
                                      onClick={() => {
                                        const adAccount = accounts.find(
                                          (acc) => acc.id === ad.adAccountId,
                                        );
                                        if (
                                          ad.adAccountId &&
                                          discoveryAccountFilter !==
                                          ad.adAccountId
                                        ) {
                                          setDiscoveryAccountFilter(
                                            ad.adAccountId,
                                          );
                                        }
                                        setDiscoverySearchQuery("");
                                        setEnlargedImage({
                                          url: ad.thumbnailUrl,
                                          title: ad.adName,
                                          accountName: adAccount?.name,
                                        });
                                      }}
                                      className="bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/60 dark:border-white/5 rounded-2xl overflow-hidden hover:border-[#007AFF]/50 transition-all group cursor-pointer shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300"
                                    >
                                      <div className="aspect-[16/9] w-full relative overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                                        <img
                                          src={ad.thumbnailUrl}
                                          alt={ad.adName}
                                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                              "/placeholder.svg";
                                          }}
                                        />
                                        <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[9px] font-black text-white uppercase tracking-wider border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                          {account?.name}
                                        </div>
                                      </div>
                                      <div className="p-4 space-y-3">
                                        <div className="flex justify-between items-start gap-2">
                                          <h3 className="font-bold text-sm line-clamp-1 group-hover:text-[#007AFF] transition-colors">
                                            {ad.adName}
                                          </h3>
                                          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                                            {ad.adId}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-white/5">
                                          <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                              Spend
                                            </span>
                                            <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                                              $
                                              {Number(
                                                ad.spend || 0,
                                              ).toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="flex flex-col items-end">
                                            <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                                              CTR
                                            </span>
                                            <span className="text-xs font-black text-[#007AFF]">
                                              {Number(ad.ctr || 0).toFixed(2)}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {discoveryViewMode === "list" && (
                              <div className="space-y-4">
                                {filteredDiscoveryAds.map((ad: AdData) => {
                                  const account = accounts.find(
                                    (a) => a.id === ad.adAccountId,
                                  );
                                  return (
                                    <div
                                      key={ad.id}
                                      onClick={() => {
                                        const adAccount = accounts.find(
                                          (acc) => acc.id === ad.adAccountId,
                                        );
                                        if (
                                          ad.adAccountId &&
                                          discoveryAccountFilter !==
                                          ad.adAccountId
                                        ) {
                                          setDiscoveryAccountFilter(
                                            ad.adAccountId,
                                          );
                                        }
                                        setDiscoverySearchQuery("");
                                        setEnlargedImage({
                                          url: ad.thumbnailUrl,
                                          title: ad.adName,
                                          accountName: adAccount?.name,
                                        });
                                      }}
                                      className="flex items-start md:items-center gap-3 md:gap-6 p-3 md:p-4 bg-white/60 dark:bg-zinc-900/60 border border-zinc-100 dark:border-white/5 rounded-2xl hover:border-[#007AFF]/40 hover:bg-white dark:hover:bg-zinc-900 transition-all group cursor-pointer shadow-sm hover:shadow-md"
                                    >
                                      <div className="w-20 h-20 md:w-32 md:h-20 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 border border-border/50">
                                        <img
                                          src={ad.thumbnailUrl}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).src =
                                              "/placeholder.svg";
                                          }}
                                        />
                                      </div>
                                      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-y-2">
                                        <div className="space-y-1 flex-1 min-w-0 mr-0 md:mr-4">
                                          <h3 className="font-bold text-sm md:text-base truncate group-hover:text-[#007AFF] transition-colors">
                                            {ad.adName}
                                          </h3>
                                          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                                            <span className="text-[10px] font-mono text-zinc-400 truncate max-w-[200px]">
                                              {ad.adId}
                                            </span>
                                            <span className="hidden md:block w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#007AFF]/70 truncate max-w-[120px]">
                                              {account?.name}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center justify-start md:justify-end gap-6 md:gap-8 text-left md:text-right pr-0 md:pr-4 shrink-0 w-full md:w-auto border-t md:border-t-0 border-zinc-100 dark:border-white/5 pt-2 md:pt-0">
                                          <div className="flex flex-col items-start md:items-end gap-0.5 md:gap-0">
                                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                                              Spend
                                            </p>
                                            <p className="text-sm font-bold leading-tight">
                                              $
                                              {Number(
                                                ad.spend || 0,
                                              ).toLocaleString()}
                                            </p>
                                          </div>
                                          <div className="flex flex-col items-start md:items-end gap-0.5 md:gap-0">
                                            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">
                                              CTR
                                            </p>
                                            <p className="text-sm font-black text-[#007AFF] leading-tight">
                                              {Number(ad.ctr || 0).toFixed(2)}%
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {discoveryViewMode === "table" && (
                              <div className="bg-white/40 dark:bg-zinc-900/40 border border-zinc-100 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm">
                                <Table>
                                  <TableHeader className="bg-zinc-50/50 dark:bg-white/5">
                                    <TableRow>
                                      <TableHead className="w-[100px] font-bold text-[10px] uppercase">
                                        Preview
                                      </TableHead>
                                      <TableHead className="font-bold text-[10px] uppercase">
                                        Ad Info
                                      </TableHead>
                                      <TableHead className="font-bold text-[10px] uppercase">
                                        Account
                                      </TableHead>
                                      <TableHead className="text-right font-bold text-[10px] uppercase">
                                        Spend
                                      </TableHead>
                                      <TableHead className="text-right font-bold text-[10px] uppercase">
                                        CTR
                                      </TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {filteredDiscoveryAds.map((ad: AdData) => {
                                      const account = accounts.find(
                                        (a) => a.id === ad.adAccountId,
                                      );
                                      return (
                                        <TableRow
                                          key={ad.id}
                                          className="cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors"
                                          onClick={() => {
                                            const adAccount = accounts.find(
                                              (acc) =>
                                                acc.id === ad.adAccountId,
                                            );
                                            if (
                                              ad.adAccountId &&
                                              discoveryAccountFilter !==
                                              ad.adAccountId
                                            ) {
                                              setDiscoveryAccountFilter(
                                                ad.adAccountId,
                                              );
                                            }
                                            setDiscoverySearchQuery("");
                                            setEnlargedImage({
                                              url: ad.thumbnailUrl,
                                              title: ad.adName,
                                              accountName: adAccount?.name,
                                            });
                                          }}
                                        >
                                          <TableCell>
                                            <div className="w-16 h-9 rounded overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-border">
                                              <img
                                                src={ad.thumbnailUrl}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                  (
                                                    e.target as HTMLImageElement
                                                  ).src = "/placeholder.svg";
                                                }}
                                              />
                                            </div>
                                          </TableCell>
                                          <TableCell className="max-w-[200px]">
                                            <div className="space-y-0.5">
                                              <p className="font-bold text-xs truncate">
                                                {ad.adName}
                                              </p>
                                              <p className="text-[10px] font-mono opacity-50 truncate">
                                                {ad.adId}
                                              </p>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <span className="text-[10px] font-bold text-muted-foreground">
                                              {account?.name || "Unknown"}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right font-bold text-xs">
                                            $
                                            {Number(
                                              ad.spend || 0,
                                            ).toLocaleString()}
                                          </TableCell>
                                          <TableCell className="text-right font-black text-[#007AFF] text-sm">
                                            {Number(ad.ctr || 0).toFixed(2)}%
                                          </TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="hidden md:block absolute -top-24 -right-24 w-64 h-64 bg-[#007AFF]/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="hidden md:block absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

                  {/* Contained Popup for Discovery Hub */}
                  {enlargedImage && (
                    <EnlargedImageModal
                      url={enlargedImage.url}
                      title={enlargedImage.title || "Ad Preview"}
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
                  <p className="text-lg font-medium">
                    Analyzing Creative Data...
                  </p>
                </div>
              </div>
            ) : (
              <>
                {(selectedPlatform === "all" ||
                  selectedPlatform === "meta") && (
                    <div className="md:hidden space-y-4">
                      <div className="relative group z-[60]">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          placeholder="Search ads by ID or Name..."
                          value={searchQuery}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const val = e.target.value;
                            setSearchQuery(val);
                            if (!val.trim()) {
                              setSelectedAccountId("all");
                            }
                            setIsSearchDropdownOpen(true);
                          }}
                          onFocus={() => setIsSearchDropdownOpen(true)}
                          onBlur={() => {
                            // Slight delay to allow click event on dropdown items to fire
                            setTimeout(() => setIsSearchDropdownOpen(false), 200);
                          }}
                          className="pl-10 pr-10 h-12 bg-white dark:bg-zinc-900 shadow-sm border-gray-200 dark:border-zinc-800 focus-visible:ring-primary/20 rounded-xl md:text-sm text-base"
                        />
                        {searchQuery && (
                          <button
                            onClick={() => {
                              setSearchQuery("");
                              setSelectedAccountId("all");
                              setSelectedAdId(null);
                              setIsSearchDropdownOpen(false);
                            }}
                            className="absolute right-3 top-3 h-6 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-all"
                            title="Clear search"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}

                        {/* Mobile Search Results Dropdown */}
                        {searchQuery.trim().length > 0 &&
                          isSearchDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 max-h-[60vh] overflow-y-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl z-[70] animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="py-2">
                                {ads.filter(
                                  (ad) =>
                                    (selectedPlatform === "all" ||
                                      ad.platform === selectedPlatform) &&
                                    (String(ad.adId)
                                      .toLowerCase()
                                      .includes(searchQuery.toLowerCase()) ||
                                      String(ad.adName)
                                        .toLowerCase()
                                        .includes(searchQuery.toLowerCase())),
                                ).length > 0 ? (
                                  ads
                                    .filter(
                                      (ad) =>
                                        (selectedPlatform === "all" ||
                                          ad.platform === selectedPlatform) &&
                                        (String(ad.adId)
                                          .toLowerCase()
                                          .includes(searchQuery.toLowerCase()) ||
                                          String(ad.adName)
                                            .toLowerCase()
                                            .includes(searchQuery.toLowerCase())),
                                    )
                                    .slice(0, 10)
                                    .map((ad) => (
                                      <button
                                        key={ad.id}
                                        onClick={() => {
                                          const accountExists = accounts.some(
                                            (a) => a.id === ad.adAccountId,
                                          );
                                          if (accountExists) {
                                            setSelectedAccountId(ad.adAccountId);
                                          }
                                          setSelectedAdId(ad.id);
                                          setSearchQuery(ad.adId);
                                          updateHistory(ad.id);
                                          setIsSearchDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 flex flex-col gap-1 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0"
                                      >
                                        <span className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                          {ad.adName}
                                        </span>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                          <span className="font-mono truncate max-w-[150px]">
                                            {ad.adId}
                                          </span>
                                          <span className="opacity-70 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">
                                            {
                                              accounts.find(
                                                (a) => a.id === ad.adAccountId,
                                              )?.name
                                            }
                                          </span>
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
                  )}

                {(selectedPlatform === "all" ||
                  selectedPlatform === "meta") && (
                    <section
                      className={cn(
                        "flex-1 flex flex-col min-h-0",
                        !selectedAdId
                          ? "overflow-y-auto custom-scrollbar space-y-6"
                          : "space-y-0",
                      )}
                    >
                      {selectedAdData &&
                        (selectedPlatform === "meta" ||
                          (selectedPlatform === "all" &&
                            (selectedAdData.platform === "meta" ||
                              !selectedAdData.platform))) ? (
                        <MetaAdDetailView
                          ad={selectedAdData}
                          benchmark={benchmarkScores}
                          onClose={() => {
                            setSelectedAdId(null);
                            setSearchQuery("");
                          }}
                          onEnlargeImage={(url, title) =>
                            setEnlargedImage({ url, title })
                          }
                          onSelectMetric={(label) =>
                            setActiveAnalysis({ type: "metric", name: label })
                          }
                          onSelectScore={(name) =>
                            setActiveAnalysis({ type: "score", name: name })
                          }
                          activeAnalysis={activeAnalysis}
                        />
                      ) : (
                        <>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between whitespace-nowrap overflow-x-auto no-scrollbar">
                              <div className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse flex-shrink-0" />
                                <h3 className="text-[10px] md:text-[11px] font-black uppercase tracking-tight md:tracking-[0.2em] text-[#007AFF]">
                                  HolaPrime Source Library
                                </h3>
                              </div>
                              <span className="text-[10px] font-black text-muted-foreground uppercase opacity-60 tracking-wider ml-2">
                                {displayedAds.length} Creatives
                              </span>
                            </div>
                          </div>
                          {displayedAds.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-[32px] border-2 border-dashed border-zinc-200 dark:border-white/5 animate-in fade-in zoom-in-95 duration-500">
                              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-2">
                                <Globe className="w-8 h-8 text-zinc-300" />
                              </div>
                              <div className="space-y-1">
                                <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                                  No ads for this account
                                </h4>
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                  Connect more accounts or try a different filter
                                </p>
                              </div>
                              <Button
                                onClick={() => setSelectedAccountId("all")}
                                variant="outline"
                                className="mt-4 rounded-xl border-zinc-200 dark:border-zinc-800 font-black text-[10px] uppercase tracking-widest h-9 px-6 hover:bg-zinc-100"
                              >
                                Switch Account
                              </Button>
                            </div>
                          ) : (
                            <SampleAds
                              ads={displayedAds}
                              hasAdsInAccount={hasAdsInAccount}
                              searchQuery={searchQuery}
                              selectedAdId={selectedAdId}
                              onSelect={handleSelectAd}
                              onEnlargeImage={(url, title) =>
                                setEnlargedImage({ url, title })
                              }
                            />
                          )}
                        </>
                      )}
                    </section>
                  )}

                {selectedPlatform === "adroll" ? (
                  <div className="flex-1 w-full min-h-0 flex flex-col">
                    {selectedAdData ? (
                      <MetaAdDetailView
                        ad={selectedAdData}
                        benchmark={benchmarkScores}
                        onClose={() => {
                          setSelectedAdId(null);
                          setSearchQuery("");
                        }}
                        onEnlargeImage={(url, title) =>
                          setEnlargedImage({ url, title })
                        }
                        onSelectMetric={(label) =>
                          setActiveAnalysis({ type: "metric", name: label })
                        }
                        onSelectScore={(name) =>
                          setActiveAnalysis({ type: "score", name: name })
                        }
                        activeAnalysis={activeAnalysis}
                      />
                    ) : (
                      <AdrollView
                        adrollAds={ads.filter(a => a.platform === 'adroll')}
                        selectedAccountId={selectedAccountId}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onViewLibrary={() => setIsViewAllAdsOpen(true)}
                        onRealtimeCampaignsLoaded={setRealtimeCampaigns}
                        selectedRealtimeCampaignId={selectedRealtimeCampaign}
                        onSelectAd={(ad: any) => {
                          setSelectedAdId(ad.id)
                          updateHistory(ad.id)
                        }}
                        onEnlargeImage={(url, title) => setEnlargedImage({ url, title })}
                      />
                    )}
                  </div>
                ) : selectedPlatform === "google" ? (
                  <div className="flex-1 w-full min-h-0 flex flex-col">
                    {selectedAdData ? (
                      <AdDetailTabs
                        adData={selectedAdData}
                        benchmark={benchmarkScores}
                        onClose={() => {
                          setSelectedAdId(null);
                          setSearchQuery("");
                        }}
                        onEnlargeImage={(url, title) =>
                          setEnlargedImage({ url, title })
                        }
                        onSelectMetric={(name) =>
                          setActiveAnalysis({ type: "metric", name })
                        }
                        onSelectScore={(name) =>
                          setActiveAnalysis({ type: "score", name })
                        }
                        activeAnalysis={activeAnalysis}
                        onTabChange={() => setActiveAnalysis(null)}
                      />
                    ) : (
                      <GoogleAdsView
                        googleAds={googleAds}
                        selectedAccountId={selectedAccountId}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        onViewLibrary={() => setIsViewAllAdsOpen(true)}
                        onRealtimeCampaignsLoaded={setRealtimeCampaigns}
                        selectedRealtimeCampaignId={selectedRealtimeCampaign}
                        onDataSourceChange={setGoogleAdsDataSource}
                        onRefresh={() => loadData(true)}
                        isSyncing={isSyncing}
                        onSelectAd={(ad) => {
                          setSelectedAdId(ad.id);
                          setSearchQuery(ad.adId);
                          updateHistory(ad.id);
                        }}
                        onEnlargeImage={(url, title) =>
                          setEnlargedImage({ url, title })
                        }
                      />
                    )}
                  </div>
                ) : (
                  !["all", "meta", "google", "adroll"].includes(
                    selectedPlatform,
                  ) && (
                    <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden rounded-[20px] md:rounded-[48px] border border-slate-200/80 dark:border-white/5 bg-gradient-to-br from-white via-white to-slate-50/80 dark:from-zinc-950/50 dark:via-zinc-950/50 dark:to-zinc-950/50 backdrop-blur-3xl shadow-[0_40px_80px_-15px_rgba(0,0,0,0.08)] dark:shadow-2xl transition-all duration-1000 group p-4 md:p-8">
                      {/* Dynamic Background Glows - Desktop Only */}
                      <div className="hidden md:block absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-primary/15 dark:bg-primary/20 rounded-full blur-[90px] animate-pulse" />
                      <div className="hidden md:block absolute -bottom-[10%] -left-[5%] w-[40%] h-[40%] bg-indigo-500/10 dark:bg-indigo-500/10 rounded-full blur-[90px] animate-pulse delay-700" />

                      {/* Animated Content Grid */}
                      <div className="relative z-10 flex flex-col items-center text-center px-4 md:px-6 w-full max-w-xl">
                        {/* Floating Icon Container */}
                        <div className="relative mb-6 md:mb-8">
                          <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 blur-2xl rounded-full animate-pulse scale-150" />
                          <div className="w-16 h-16 md:w-24 md:h-24 rounded-xl md:rounded-[32px] bg-white dark:bg-zinc-900 flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] dark:shadow-2xl border border-slate-200/50 dark:border-white/10 group-hover:scale-105 group-hover:rotate-2 transition-all duration-700 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 dark:from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            {(() => {
                              const PlatformIcon =
                                PLATFORM_META[selectedPlatform]?.icon || Globe;
                              return (
                                <PlatformIcon className="w-8 h-8 md:w-12 md:h-12 text-primary drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.3)]" />
                              );
                            })()}
                          </div>

                          {/* Orbiting Elements */}
                          <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center animate-bounce">
                            <Sparkles className="w-4 h-4 text-blue-500" />
                          </div>
                        </div>

                        {/* Typography Stack */}
                        <div className="space-y-4 md:space-y-6">
                          <div className="space-y-2 md:space-y-3">
                            <div className="flex items-center justify-center gap-3 mb-1">
                              <div className="h-px w-6 md:w-8 bg-primary/30" />
                              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-primary animate-in slide-in-from-bottom duration-500 leading-none">
                                Scheduled Release
                              </span>
                              <div className="h-px w-6 md:w-8 bg-primary/30" />
                            </div>
                            <h2 className="text-2xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tightest leading-tight">
                              Integration{" "}
                              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-600 to-primary dark:from-primary dark:via-indigo-500 dark:to-primary animate-gradient bg-[length:200%_auto]">
                                Pending.
                              </span>
                            </h2>
                          </div>

                          <p className="text-[11px] md:text-base font-medium text-slate-700 dark:text-zinc-400 leading-relaxed max-w-[280px] md:max-w-md mx-auto opacity-90">
                            We are currently synchronizing our AI models with
                            the{" "}
                            <span className="text-slate-900 dark:text-white font-black">
                              {PLATFORM_META[selectedPlatform]?.label ||
                                selectedPlatform}
                            </span>{" "}
                            ecosystem. Your advertising accounts will
                            automatically bridge as soon as the deployment
                            stabilizes.
                          </p>
                        </div>

                        {/* Progress Status */}
                        <div className="mt-8 md:mt-12 flex flex-col items-center gap-3 w-full">
                          <div className="flex items-center justify-center gap-3 md:gap-6 px-4 md:px-8 py-2 md:py-3 rounded-full bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 backdrop-blur-sm group/progress shadow-[inset_0_1px_2px_rgba(0,0,0,0.02)] w-fit">
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-primary animate-pulse" />
                              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors group-hover/progress:text-primary">
                                Core Syncing
                              </span>
                            </div>
                            <div className="h-3 md:h-4 w-px bg-slate-200 dark:bg-zinc-800" />
                            <div className="flex items-center gap-2">
                              <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
                              <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-400">
                                Analysis Live
                              </span>
                            </div>
                          </div>

                          <p className="text-[8px] md:text-[9px] font-bold text-muted-foreground/60 uppercase tracking-[0.3em]">
                            Estimated deployment: Q1 2026
                          </p>
                        </div>
                      </div>

                      {/* Corner Accents */}
                      <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent border-t border-l border-primary/20 rounded-tl-[32px] md:rounded-tl-[48px] pointer-events-none" />
                    </div>
                  )
                )}

                {displayedAds.length > 0 &&
                  selectedPlatform === "all" &&
                  !selectedAdId && (
                    <div className="space-y-6 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {/* Old sections only for generic library view if no ad is selected */}
                    </div>
                  )}
              </>
            )}
          </div>
          <div
            className={cn(
              "mt-auto",
              activeAnalysis &&
              mounted &&
              !isMobile &&
              searchQuery.trim() &&
              "md:pr-[280px] xl:pr-[320px] 2xl:pr-[360px]",
            )}
          >
            <Footer />
          </div>
        </main>

        <AnalysisSidebar
          activeDetail={activeAnalysis}
          onClose={() => setActiveAnalysis(null)}
          onNavigate={setActiveAnalysis}
          adData={selectedAdData}
          isMobile={mounted ? isMobile : false}
        />

        {/* Global Image Popup for Home Page */}
        {!isViewAllAdsOpen && enlargedImage && (
          <EnlargedImageModal
            url={enlargedImage.url}
            title={enlargedImage.title || "Ad Preview"}
            onClose={() => setEnlargedImage(null)}
          />
        )}

        {session?.user?.email && (
          <ChangePasswordDialog
            open={isPasswordDialogOpen}
            onOpenChange={setIsPasswordDialogOpen}
            email={session.user.email}
          />
        )}

        <Dialog open={isAddingPlatform} onOpenChange={setIsAddingPlatform}>
          <DialogContent className="w-[calc(100%-2rem)] sm:max-w-[460px] p-0 overflow-hidden rounded-[28px] border-border bg-white dark:bg-zinc-950 flex flex-col outline-none z-[130] shadow-3xl fixed top-[calc(50%+20px)] sm:top-[calc(50%+40px)] -translate-y-1/2 left-1/2 -translate-x-1/2 max-h-[75vh] sm:max-h-[85vh] border-opacity-50">
            <div className="p-5 md:p-7 pb-4 shrink-0 border-b border-border/50 bg-zinc-50/50 dark:bg-white/[0.02] relative">
              <div className="flex flex-col">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3 shadow-sm border border-primary/10">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <DialogTitle className="text-lg md:text-2xl font-black tracking-tightest text-foreground">
                  Add Platform
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-medium text-[11px] md:text-sm mt-1 leading-relaxed max-w-[300px]">
                  Connect a network to sync your creative assets and unlock AI
                  insights.
                </DialogDescription>
              </div>
            </div>

            <div className="px-3 md:px-6 py-4 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid gap-2">
                {Object.entries(PLATFORM_META)
                  .filter(([id]) => id !== "all")
                  .map(([id, meta]) => {
                    const isEnabled = enabledPlatforms.includes(id);
                    const isMeta = id === "meta";
                    return (
                      <div
                        key={id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border transition-all duration-300 group",
                          isMeta
                            ? "bg-zinc-50 dark:bg-white/[0.02] border-zinc-200 dark:border-white/10 opacity-80 cursor-default"
                            : isEnabled
                              ? "bg-primary/[0.03] border-primary/20 dark:border-primary/30 shadow-sm cursor-pointer"
                              : "bg-white dark:bg-zinc-900/30 border-border/50 hover:border-primary/40 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer",
                        )}
                        onClick={() => {
                          if (!isPlatformModalReady || isMeta) return;
                          if (!isEnabled) {
                            handleAddPlatform(id);
                          } else {
                            setSelectedPlatform(id as PlatformType);
                            setIsAddingPlatform(false);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm",
                              isEnabled
                                ? "bg-white dark:bg-zinc-800 border border-primary/10"
                                : "bg-zinc-100 dark:bg-zinc-800/50 border border-border group-hover:scale-105",
                            )}
                          >
                            <meta.icon
                              className={cn(
                                "w-5 h-5 transition-colors",
                                isEnabled
                                  ? "text-primary"
                                  : "text-muted-foreground group-hover:text-primary",
                              )}
                            />
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-foreground leading-tight">
                                {meta.label}
                              </h4>
                              {isMeta && (
                                <span className="text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                                  Core
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 opacity-70">
                              {isMeta
                                ? "Always Active"
                                : isEnabled
                                  ? "Connected"
                                  : "Not connected"}
                            </p>
                          </div>
                        </div>

                        {!isMeta && (
                          <div
                            className={cn(
                              "text-[10px] font-black uppercase tracking-widest px-3.5 py-1.5 rounded-xl shadow-sm transition-all",
                              isEnabled
                                ? "bg-secondary text-muted-foreground group-hover:text-primary"
                                : "bg-primary text-white shadow-primary/20 md:opacity-0 md:group-hover:opacity-100 active:scale-95 translate-x-1 group-hover:translate-x-0",
                            )}
                          >
                            {isEnabled ? "Select" : "Add"}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AddAdDialog
          open={isAddAdDialogOpen}
          onOpenChange={setIsAddAdDialogOpen}
          defaultPlatform={selectedPlatform}
          onSuccess={() => loadData(true)}
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}
