"use client"

/**
 * Google platform page — thin wrapper over the shared PlatformView (approved
 * wireframe). Preserves every Google workflow:
 *  - Historical ⇄ Live (realtime) data-source toggle + RealtimeNativeView
 *  - click-to-analyze (onSelectAd → AdDetailTabs), image enlarge
 *  - the Keywords tab (aggregated from each ad's keywords / search terms)
 */

import { useState } from "react"
import { AdData } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Database, Wifi, ChevronDown, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import PlatformView, { compact, type PlatformKpis, type PlatformMetric } from "./platform-view"
import { RealtimeNativeView } from "./realtime-native-view"
import { type AccountStat } from "@/components/account-switcher"
import { fetchGoogleOverview, fetchGoogleAdsPage } from "@/server/actions/google-live"
import GoogleKeywordsView from "./google-keywords-view"

interface GoogleAdsViewProps {
    googleAds: AdData[]
    selectedAccountId: string
    accountStats?: AccountStat[]
    totalAds?: number
    onSelectAccount?: (id: string) => void
    onSelectAd: (ad: AdData) => void
    searchQuery: string
    onSearchChange: (query: string) => void
    onViewLibrary?: () => void
    onRealtimeCampaignsLoaded?: (campaigns: any[]) => void
    selectedRealtimeCampaignId?: string
    onEnlargeImage?: (url: string, title: string) => void
    onDataSourceChange?: (source: "database" | "realtime") => void
    onRefresh?: () => void
    isSyncing?: boolean
    selectedPlatform?: string
    onPlatformChange?: (platform: string) => void
    defaultTab?: string
}

const ACCENT = "#4285F4"

const buildMetrics = (k: PlatformKpis): PlatformMetric[] => [
    { label: "Interactions", value: k.clicks.toLocaleString() },
    { label: "Impressions", value: compact(k.impressions) },
    { label: "Avg. CPC", value: `$${k.cpc.toFixed(2)}` },
    { label: "Conversions", value: k.conversions.toLocaleString() },
    { label: "Conv. value", value: `$${compact(k.convValue)}` },
    { label: "Account ROAS", value: `${k.roas.toFixed(2)}x` },
]

export default function GoogleAdsView({
    googleAds,
    selectedAccountId,
    accountStats,
    totalAds,
    onSelectAccount,
    onSelectAd,
    searchQuery,
    onSearchChange,
    onRealtimeCampaignsLoaded,
    selectedRealtimeCampaignId,
    onEnlargeImage,
    onDataSourceChange,
    onRefresh,
    isSyncing,
    defaultTab = "overview",
}: GoogleAdsViewProps) {
    const [dataSource, setDataSource] = useState<"database" | "realtime">("database")
    const [realtimeDateRange, setRealtimeDateRange] = useState("LAST_30_DAYS")
    const [realtimeSearchQuery, setRealtimeSearchQuery] = useState("")
    const [realtimeRefreshKey] = useState(0)

    const setSource = (s: "database" | "realtime") => { setDataSource(s); onDataSourceChange?.(s) }

    const dataSourceToggle = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-9 px-3 bg-card border border-border rounded-lg flex items-center gap-2">
                    {dataSource === "database" ? <Database className="h-3.5 w-3.5" style={{ color: ACCENT }} /> : <Wifi className="h-3.5 w-3.5 animate-pulse" style={{ color: ACCENT }} />}
                    <span className="text-xs font-medium text-foreground hidden sm:inline">{dataSource === "database" ? "Historical" : "Live"}</span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-md p-2">
                <DropdownMenuItem onClick={() => setSource("database")} className={cn("rounded-lg py-2.5 cursor-pointer mb-1", dataSource === "database" && "bg-sky-50 dark:bg-sky-500/10")}>
                    <Database className="h-4 w-4 mr-2.5 shrink-0 text-muted-foreground" />
                    <div><p className="text-xs font-semibold text-foreground">Historical reports</p><p className="text-[10px] text-muted-foreground">Database analysis cards</p></div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSource("realtime")} className={cn("rounded-lg py-2.5 cursor-pointer", dataSource === "realtime" && "bg-sky-50 dark:bg-sky-500/10")}>
                    <Wifi className="h-4 w-4 mr-2.5 shrink-0 text-muted-foreground" />
                    <div><p className="text-xs font-semibold text-foreground">Live analytics</p><p className="text-[10px] text-muted-foreground">Real-time performance</p></div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )

    const realtimeBody = dataSource === "realtime" ? (
        <div className="flex flex-col w-full">
            <div className="bg-card border border-border rounded-md overflow-hidden shadow-sm" style={{ height: "calc(100vh - 160px)" }}>
                <RealtimeNativeView
                    key={realtimeRefreshKey}
                    dateRange={realtimeDateRange}
                    onDateRangeChange={setRealtimeDateRange}
                    searchQuery={realtimeSearchQuery}
                    onSearchChange={setRealtimeSearchQuery}
                    onCampaignsLoaded={onRealtimeCampaignsLoaded}
                    selectedCampaignId={selectedRealtimeCampaignId}
                />
            </div>
        </div>
    ) : undefined

    return (
        <PlatformView
            accent={ACCENT}
            title="Google overview"
            icon={Play}
            persistKey="google"
            ads={googleAds}
            selectedAccountId={selectedAccountId}
            accountStats={accountStats}
            totalAds={totalAds}
            onSelectAccount={onSelectAccount}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onSelectAd={onSelectAd}
            onEnlargeImage={onEnlargeImage}
            onRefresh={onRefresh}
            isSyncing={isSyncing}
            buildMetrics={buildMetrics}
            fetchOverview={fetchGoogleOverview}
            fetchAdsPage={fetchGoogleAdsPage}
            defaultTab={defaultTab}
            headerControls={dataSourceToggle}
            bodyOverride={realtimeBody}
            fourthTab={{
                id: "keywords",
                label: "Keywords",
                icon: Search,
                render: ({ accent, dateRange }) => <GoogleKeywordsView dateRange={dateRange} accent={accent} />,
            }}
        />
    )
}
