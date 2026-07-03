"use client"

/**
 * AdRoll platform page — thin wrapper over the shared PlatformView (approved
 * wireframe). Preserves AdRoll's workflows:
 *  - Historical ⇄ Live (realtime) data-source toggle + RealtimeNativeView
 *  - click-to-analyze (onSelectAd → MetaAdDetailView), image enlarge
 *  - the Audiences tab (derived from each ad's tags)
 */

import { useState } from "react"
import { AdData } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Users, Database, Wifi, ChevronDown, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import PlatformView, { compact, type PlatformKpis, type PlatformMetric } from "./platform-view"
import { RealtimeNativeView } from "./realtime-native-view"
import { fetchAdrollOverview, fetchAdrollAdsPage } from "@/server/actions/adroll-live"

interface AdrollViewProps {
    adrollAds: AdData[]
    selectedAccountId: string
    onSelectAd: (ad: AdData) => void
    searchQuery: string
    onSearchChange: (query: string) => void
    onViewLibrary?: () => void
    onRealtimeCampaignsLoaded?: (campaigns: any[]) => void
    selectedRealtimeCampaignId?: string
    onEnlargeImage?: (url: string, title: string) => void
}

const ACCENT = "#0DBDFF"

const buildMetrics = (k: PlatformKpis): PlatformMetric[] => [
    { label: "Clicks", value: k.clicks.toLocaleString() },
    { label: "Impressions", value: compact(k.impressions) },
    { label: "eCPC", value: `$${k.cpc.toFixed(2)}` },
    { label: "Conversions", value: k.conversions.toLocaleString() },
    { label: "Attributed rev", value: `$${compact(k.convValue)}` },
    { label: "ROAS", value: `${k.roas.toFixed(2)}x` },
]

function AudiencesTab({ ads, accent }: { ads: AdData[]; accent: string }) {
    const [campaignId, setCampaignId] = useState("")
    // Distinct campaigns from the ads for the selector.
    const campaigns = Array.from(new Set((ads as any[]).map((ad) => ad.campaignName || ad.campaignId).filter(Boolean).map(String))).sort()
    // Scope the audience derivation to the selected campaign.
    const scoped = campaignId ? (ads as any[]).filter((ad) => String(ad.campaignName || ad.campaignId) === campaignId) : ads
    const audiences = Array.from(new Set(scoped.flatMap((ad: any) => ad.tags || [])))
        .filter((tag: any) => typeof tag === "string" && tag.length > 5 && !tag.includes(" "))
        .slice(0, 12)
        .map((tag: any) => {
            const seed = tag.split("").reduce((acc: number, ch: string) => acc + ch.charCodeAt(0), 0)
            return { name: tag, reach: (seed * 123) % 40000 + 10000, score: (seed * 7) % 20 + 80 }
        })

    const selector = campaigns.length > 0 ? (
        <div className="flex items-center justify-end gap-2">
            <span className="text-[11px] text-muted-foreground">Campaign</span>
            <select value={campaignId} onChange={(e) => setCampaignId(e.target.value)} className="max-w-[300px] truncate rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30">
                <option value="">All campaigns</option>
                {campaigns.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
    ) : null

    if (audiences.length === 0) {
        return (
            <div className="space-y-4">
                {selector}
                <Card className="border border-border bg-card shadow-sm rounded-xl p-10 md:p-16">
                    <div className="flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto">
                        <div className="h-16 w-16 rounded-2xl flex items-center justify-center border" style={{ backgroundColor: `${accent}12`, borderColor: `${accent}33` }}>
                            <Users className="h-7 w-7" style={{ color: accent }} />
                        </div>
                        <div className="space-y-1.5">
                            <h3 className="text-lg font-semibold tracking-tight text-foreground">Audience insights</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed">No audience segments detected{campaignId ? " for this campaign" : ""} yet. They appear here once tag data is available for the current selection.</p>
                        </div>
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {selector}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {audiences.map((aud) => (
                <Card key={aud.name} className="p-6 border border-border bg-card rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accent}1a`, color: accent }}><Users className="h-5 w-5" /></div>
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-none font-semibold text-[10px] uppercase tracking-wider">{aud.score}% affinity</Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2 truncate">{aud.name}</h3>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Potential reach</p>
                            <p className="text-[14px] font-bold text-foreground">{aud.reach.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Affinity</p>
                            <p className="text-[14px] font-bold text-foreground">{aud.score}%</p>
                        </div>
                    </div>
                </Card>
            ))}
            </div>
        </div>
    )
}

export default function AdrollView({
    adrollAds,
    selectedAccountId,
    onSelectAd,
    searchQuery,
    onSearchChange,
    onRealtimeCampaignsLoaded,
    selectedRealtimeCampaignId,
    onEnlargeImage,
}: AdrollViewProps) {
    const [dataSource, setDataSource] = useState<"database" | "realtime">("database")
    const [realtimeDateRange, setRealtimeDateRange] = useState("LAST_30_DAYS")
    const [realtimeSearchQuery, setRealtimeSearchQuery] = useState("")
    const [realtimeRefreshKey] = useState(0)

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
                <DropdownMenuItem onClick={() => setDataSource("database")} className={cn("rounded-lg py-2.5 cursor-pointer mb-1", dataSource === "database" && "bg-sky-50 dark:bg-sky-500/10")}>
                    <Database className="h-4 w-4 mr-2.5 shrink-0 text-muted-foreground" />
                    <div><p className="text-xs font-semibold text-foreground">Historical reports</p><p className="text-[10px] text-muted-foreground">Database analysis cards</p></div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDataSource("realtime")} className={cn("rounded-lg py-2.5 cursor-pointer", dataSource === "realtime" && "bg-sky-50 dark:bg-sky-500/10")}>
                    <Wifi className="h-4 w-4 mr-2.5 shrink-0 text-muted-foreground" />
                    <div><p className="text-xs font-semibold text-foreground">Live analytics</p><p className="text-[10px] text-muted-foreground">Campaigns → Ads → Analysis</p></div>
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
                    platform="adroll"
                />
            </div>
        </div>
    ) : undefined

    return (
        <PlatformView
            accent={ACCENT}
            title="AdRoll overview"
            icon={Target}
            persistKey="adroll"
            ads={adrollAds}
            selectedAccountId={selectedAccountId}
            searchQuery={searchQuery}
            onSearchChange={onSearchChange}
            onSelectAd={onSelectAd}
            onEnlargeImage={onEnlargeImage}
            buildMetrics={buildMetrics}
            fetchOverview={fetchAdrollOverview}
            fetchAdsPage={fetchAdrollAdsPage}
            headerControls={dataSourceToggle}
            bodyOverride={realtimeBody}
            fourthTab={{
                id: "audiences",
                label: "Audiences",
                icon: Users,
                render: ({ ads, accent }) => <AudiencesTab ads={ads} accent={accent} />,
            }}
        />
    )
}
