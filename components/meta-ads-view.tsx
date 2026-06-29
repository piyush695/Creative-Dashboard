"use client"

/**
 * Meta platform page — thin wrapper over the shared PlatformView (approved
 * wireframe). All Meta data flows in via `metaAds`; the click-to-analyze
 * workflow (onSelectAd → MetaAdDetailView) and image enlarge are preserved.
 */

import { AdData } from "@/lib/types"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Facebook } from "lucide-react"
import PlatformView, { compact, type PlatformKpis, type PlatformMetric } from "./platform-view"
import { type AccountStat } from "@/components/account-switcher"

interface MetaAdsViewProps {
    metaAds: AdData[]
    selectedAccountId: string
    accountStats?: AccountStat[]
    totalAds?: number
    onSelectAccount?: (id: string) => void
    onSelectAd: (ad: AdData) => void
    searchQuery: string
    onSearchChange: (query: string) => void
    onEnlargeImage?: (url: string, title: string) => void
    onDataSourceChange?: (source: "database" | "realtime") => void
    onRefresh?: () => void
    isSyncing?: boolean
    selectedPlatform?: string
    onPlatformChange?: (platform: string) => void
    onViewLibrary?: () => void
    defaultShowOverview?: boolean
}

const ACCENT = "#0668E1"

const buildMetrics = (k: PlatformKpis): PlatformMetric[] => [
    { label: "Reach", value: compact(k.reach) },
    { label: "Impressions", value: compact(k.impressions) },
    { label: "CPM", value: `$${k.cpm.toFixed(2)}` },
    { label: "Results", value: k.conversions.toLocaleString() },
    { label: "Purchase value", value: `$${compact(k.convValue)}` },
    { label: "ROAS", value: `${k.roas.toFixed(2)}x` },
]

export default function MetaAdsView({
    metaAds,
    selectedAccountId,
    accountStats,
    totalAds,
    onSelectAccount,
    onSelectAd,
    searchQuery,
    onSearchChange,
    onEnlargeImage,
    onRefresh,
    isSyncing,
}: MetaAdsViewProps) {
    return (
        <PlatformView
            accent={ACCENT}
            title="Meta overview"
            icon={Facebook}
            persistKey="meta"
            ads={metaAds}
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
            fourthTab={{
                id: "audiences",
                label: "Audiences",
                icon: Users,
                render: () => (
                    <Card className="border border-border bg-card shadow-sm rounded-xl p-10 md:p-16">
                        <div className="flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto">
                            <div className="h-16 w-16 rounded-2xl flex items-center justify-center border" style={{ backgroundColor: `${ACCENT}12`, borderColor: `${ACCENT}33` }}>
                                <Users className="h-7 w-7" style={{ color: ACCENT }} />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-lg font-semibold tracking-tight text-foreground">Audience insights</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Audience-level breakdowns for Meta will appear here once audience data is connected. The layout matches the other platforms so it slots in without any change to your workflow.
                                </p>
                            </div>
                            <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-border">Coming soon</Badge>
                        </div>
                    </Card>
                ),
            }}
        />
    )
}
