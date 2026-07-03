"use client"

/**
 * Google Keywords tab — live search terms from the Google Ads API
 * (search_term_view), date-windowed. Only Search campaigns produce terms
 * (PMAX/Display/Video don't), so this can legitimately be empty for some ranges.
 */

import { useEffect, useState } from "react"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { fetchGoogleKeywords, type GoogleKeyword } from "@/server/actions/google-live"

const PER_PAGE = 10

export default function GoogleKeywordsView({ dateRange, accent }: { dateRange?: { from?: string; to?: string }; accent: string }) {
    const [terms, setTerms] = useState<GoogleKeyword[] | null>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        fetchGoogleKeywords({ dateRange })
            .then((r) => { if (!cancelled) { setTerms(r.terms); setPage(1); setLoading(false) } })
            .catch(() => { if (!cancelled) { setTerms([]); setPage(1); setLoading(false) } })
        return () => { cancelled = true }
    }, [dateRange?.from, dateRange?.to])

    const total = terms?.length || 0
    const pageCount = Math.max(1, Math.ceil(total / PER_PAGE))
    const safePage = Math.min(page, pageCount)
    const pageTerms = (terms || []).slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

    return (
        <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden animate-in fade-in duration-300">
            <div className="p-5 border-b border-border">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">Search keywords</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                    {loading ? "loading…" : `${(terms || []).length} terms · ranked by cost · live`}
                </p>
            </div>
            {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading search terms from Google…
                </div>
            ) : (terms && terms.length > 0) ? (
                <>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[440px]">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="py-3 px-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Term</th>
                                <th className="py-3 px-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Cost</th>
                                <th className="py-3 px-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">Clicks</th>
                                <th className="py-3 px-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right">CTR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageTerms.map((kw, i) => (
                                <tr key={`${kw.term}-${(safePage - 1) * PER_PAGE + i}`} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                                    <td className="py-3.5 px-5 max-w-[320px]"><span className="text-[13px] text-foreground break-words">{kw.term}</span></td>
                                    <td className="py-3.5 px-5 text-right text-[13px] font-semibold text-foreground whitespace-nowrap">${kw.spend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    <td className="py-3.5 px-5 text-right text-[13px] text-muted-foreground whitespace-nowrap">{kw.clicks.toLocaleString()}</td>
                                    <td className="py-3.5 px-5 text-right text-[13px] font-semibold whitespace-nowrap" style={{ color: accent }}>{kw.ctr.toFixed(2)}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Pagination — 10 per page */}
                <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                        {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, total)} of {total}
                    </span>
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none">
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <span className="px-2 text-[11px] text-muted-foreground tabular-nums">{safePage} / {pageCount}</span>
                        <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={safePage >= pageCount}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none">
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
                </>
            ) : (
                <div className="py-16 text-center text-muted-foreground text-sm">No search-term data in this range (Search campaigns only — PMAX/Display have no keywords).</div>
            )}
        </Card>
    )
}
