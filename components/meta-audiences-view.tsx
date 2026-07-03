"use client"

/**
 * Meta Audiences tab — live age/gender/placement/country breakdowns pulled from
 * the Meta Insights API (server action fetchMetaAudience) for the selected
 * account + date window. The stored creative docs carry no demographic data, so
 * this is fetched live (and cached server-side for 5 min).
 */

import { useEffect, useState } from "react"
import { Loader2, AlertCircle } from "lucide-react"
import { fetchMetaAudience, type MetaAudience, type MetaAudienceSeg } from "@/server/actions/ads"

const fmt = (n: number) =>
    n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${(n / 1e3).toFixed(1)}K` : `$${Math.round(n)}`

function BarList({ title, rows, accent }: { title: string; rows: MetaAudienceSeg[]; accent: string }) {
    const max = Math.max(1, ...rows.map((r) => r.spend))
    return (
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">{title}</h3>
            {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data in range.</p>
            ) : (
                <div className="space-y-3">
                    {rows.map((r) => (
                        <div key={r.label} className="space-y-1">
                            <div className="flex items-center justify-between text-[12px] gap-3">
                                <span className="text-foreground truncate">{r.label}</span>
                                <span className="text-muted-foreground tabular-nums whitespace-nowrap">{fmt(r.spend)}</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(2, (r.spend / max) * 100)}%`, backgroundColor: accent }} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default function MetaAudiencesView({
    accountId,
    dateRange,
    accent,
}: {
    accountId: string
    dateRange?: { from?: string; to?: string }
    accent: string
}) {
    const [data, setData] = useState<MetaAudience | null>(null)
    const [loading, setLoading] = useState(true)
    const [campaignId, setCampaignId] = useState("")
    const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([])

    // Reset the campaign filter when the account changes (campaigns are per-account).
    useEffect(() => { setCampaignId(""); setCampaigns([]) }, [accountId])

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        fetchMetaAudience({ accountId, dateRange, campaignId })
            .then((d) => { if (!cancelled) { setData(d); if (d.campaigns && d.campaigns.length) setCampaigns(d.campaigns); setLoading(false) } })
            .catch(() => { if (!cancelled) setLoading(false) })
        return () => { cancelled = true }
    }, [accountId, dateRange?.from, dateRange?.to, campaignId])

    return (
        <div className="animate-in fade-in space-y-4 pb-20 duration-300">
            {/* Campaign selector — filters the audience breakdown to one campaign */}
            {campaigns.length > 0 && (
                <div className="flex items-center justify-end gap-2">
                    <span className="text-[11px] text-muted-foreground">Campaign</span>
                    <select
                        value={campaignId}
                        onChange={(e) => setCampaignId(e.target.value)}
                        className="max-w-[300px] truncate rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-primary/30"
                    >
                        <option value="">All campaigns</option>
                        {campaigns.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading audience insights from Meta…
                </div>
            ) : data?.error ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center">
                    <AlertCircle className="mx-auto mb-3 h-7 w-7" style={{ color: accent }} />
                    <p className="text-sm font-medium text-foreground">Could not load audience data</p>
                    <p className="mt-1 text-xs text-muted-foreground">{data.error}</p>
                </div>
            ) : (!data || data.totalSpend === 0) ? (
                <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
                    No audience data{campaignId ? " for this campaign" : ""} in this date range.
                </div>
            ) : (
                <>
                    <div className="grid gap-4 md:grid-cols-2">
                        <BarList title="Spend by age" rows={data.byAge} accent={accent} />
                        <BarList title="Spend by gender" rows={data.byGender} accent={accent} />
                        <BarList title="Top placements" rows={data.placement} accent={accent} />
                        <BarList title="Top countries" rows={data.byCountry} accent={accent} />
                    </div>
                    <p className="text-center text-[11px] text-muted-foreground">
                        Live from Meta Insights · {accountId === "all" ? `${data.accounts} account${data.accounts === 1 ? "" : "s"} aggregated` : "this account"}{campaignId ? " · 1 campaign" : ""} · broken down by ad delivery.
                    </p>
                </>
            )}
        </div>
    )
}
