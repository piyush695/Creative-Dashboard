"use client"

/**
 * Meta platform page — thin wrapper over the shared PlatformView (approved
 * wireframe). All Meta data flows in via `metaAds`; the click-to-analyze
 * workflow (onSelectAd → MetaAdDetailView) and image enlarge are preserved.
 */

import { AdData } from "@/lib/types"
import { Users, Facebook } from "lucide-react"
import MetaAudiencesView from "./meta-audiences-view"
import PlatformView, { compact, type PlatformKpis, type PlatformMetric } from "./platform-view"
import { type AccountStat } from "@/components/account-switcher"
import { fetchMetaOverview, fetchMetaAdsPage, fetchMetaLatestDate } from "@/server/actions/ads"

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
            fetchOverview={fetchMetaOverview}
            fetchAdsPage={fetchMetaAdsPage}
            fetchLatestDate={fetchMetaLatestDate}
            buildMetrics={buildMetrics}
            fourthTab={{
                id: "audiences",
                label: "Audiences",
                icon: Users,
                render: (ctx) => (
                    <MetaAudiencesView accountId={ctx.accountId} dateRange={ctx.dateRange} accent={ACCENT} />
                ),
            }}
        />
    )
}
