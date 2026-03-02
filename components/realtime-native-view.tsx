"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Search, ArrowLeft, TrendingUp, MousePointerClick,
    DollarSign, Activity, Eye, BarChart3, ChevronRight,
    RefreshCw, Layers, Image as ImageIcon, Video, Type, Sparkles, Target,
    Check, Brain, Zap, LayoutGrid, ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast, toast } from '@/hooks/use-toast';

// Formatters
const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n || 0));
const formatPercent = (n: number) => (n || 0).toFixed(2) + '%';

interface RealtimeNativeViewProps {
    dateRange?: string;
    onDateRangeChange?: (value: string) => void;
    searchQuery?: string;
    onSearchChange?: (value: string) => void;
    onRefresh?: () => void;
    onCampaignsLoaded?: (campaigns: any[]) => void;
    selectedCampaignId?: string;
    platform?: string;
    onViewChange?: (view: 'campaigns' | 'ads' | 'assets') => void;
}

export function RealtimeNativeView({
    dateRange: propDateRange,
    searchQuery: propSearchQuery,
    onSearchChange,
    onCampaignsLoaded,
    selectedCampaignId,
    platform = "google",
    onViewChange,
}: RealtimeNativeViewProps = {}) {
    const [view, setView] = useState<'campaigns' | 'ads' | 'assets'>('campaigns');
    const [internalDateRange, setInternalDateRange] = useState('LAST_30_DAYS');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [ads, setAds] = useState<any[]>([]);
    const [assetsData, setAssetsData] = useState<any>(null);

    const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
    const [selectedAd, setSelectedAd] = useState<any>(null);
    const [internalSearchQuery, setInternalSearchQuery] = useState('');
    const [analyzingAd, setAnalyzingAd] = useState<any>(null);
    const [showAllItems, setShowAllItems] = useState(false);

    // Use props if provided, otherwise use internal state
    const dateRange = propDateRange ?? internalDateRange;
    const setDateRange = setInternalDateRange;
    const searchQuery = propSearchQuery ?? internalSearchQuery;
    // Unified setter: always update internal state AND notify parent if controlled externally
    const setSearchQuery = (val: string) => {
        setInternalSearchQuery(val);
        if (propSearchQuery !== undefined) {
            // controlled mode: propagate to parent
        }
    };
    const clearSearch = () => {
        setInternalSearchQuery('');
        if (onSearchChange) onSearchChange('');
    };

    useEffect(() => {
        loadCampaigns();
    }, [dateRange, platform]);

    // Notify parent when campaigns are loaded
    useEffect(() => {
        if (onCampaignsLoaded && campaigns.length > 0) {
            onCampaignsLoaded(campaigns);
        }
    }, [campaigns]);

    // Sync view change up
    useEffect(() => {
        if (onViewChange) onViewChange(view);
    }, [view, onViewChange]);

    async function loadCampaigns() {
        setView('campaigns');
        setSelectedCampaign(null);
        setSelectedAd(null);
        setLoading(true);
        setError(null);
        setShowAllItems(false);
        try {
            const res = await fetch(`/api/realtime/campaigns?dateRange=${dateRange}&platform=${platform}`);
            const data = await res.json();
            if (data.success) {
                setCampaigns(data.data || []);
            } else {
                setError(data.error || 'Failed to fetch campaigns');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadAds(campaign: any) {
        setSelectedCampaign(campaign);
        setView('ads');
        setLoading(true);
        setError(null);
        setSearchQuery('');
        setShowAllItems(false);
        try {
            const res = await fetch(`/api/realtime/ads?dateRange=${dateRange}&campaignId=${campaign.id}&platform=${platform}`);
            const data = await res.json();
            if (data.success) {
                setAds(data.data || []);
            } else {
                setError(data.error || 'Failed to fetch ads');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadAssets(ad: any) {
        setSelectedAd(ad);
        setView('assets');
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/realtime/ads/${ad.adId || ad.id}/assets?dateRange=${dateRange}&platform=${platform}`);
            const data = await res.json();
            if (data.success) {
                setAssetsData(data.data || null);
            } else {
                setError(data.error || 'Failed to fetch assets');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    const { activeList, topStats } = useMemo(() => {
        let list: any[] = [];
        let stats = { spend: 0, impr: 0, clicks: 0, conv: 0, roas: 0 };

        if (view === 'campaigns') {
            let filtered = campaigns.filter(c => (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
            // Apply external campaign id filter (ignored when on campaigns view)
            list = filtered;
            stats = campaigns.reduce((acc, c) => {
                acc.spend += (c.spend || 0);
                acc.impr += (c.impressions || 0);
                acc.clicks += (c.clicks || 0);
                acc.conv += (c.conversions || 0);
                return acc;
            }, { spend: 0, impr: 0, clicks: 0, conv: 0, roas: 0 });
            stats.roas = stats.spend > 0 ? (campaigns.reduce((a, c) => a + (c.conversionsValue || 0), 0) / stats.spend) : 0;
        } else if (view === 'ads') {
            list = ads.filter(a => (a.adName || a.adGroupName || '').toLowerCase().includes(searchQuery.toLowerCase()));
            // Apply external campaign filter on ads view
            if (selectedCampaignId && selectedCampaignId !== 'all') {
                list = list.filter(a => String(a.campaignId) === String(selectedCampaignId));
            }
            stats = ads.reduce((acc, a) => {
                acc.spend += (a.spend || 0);
                acc.impr += (a.impressions || 0);
                acc.clicks += (a.clicks || 0);
                acc.conv += (a.conversions || 0);
                return acc;
            }, { spend: 0, impr: 0, clicks: 0, conv: 0, roas: 0 });
            stats.roas = stats.spend > 0 ? (ads.reduce((a, c) => a + (c.revenue || c.conversionsValue || 0), 0) / stats.spend) : 0;
        }

        return { activeList: list, topStats: stats };
    }, [view, campaigns, ads, searchQuery]);

    const ctr = topStats.impr > 0 ? (topStats.clicks / topStats.impr) * 100 : 0;

    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/20 dark:from-black dark:via-blue-950/20 dark:to-indigo-950/10 text-zinc-900 dark:text-zinc-100 font-sans relative">

            {/* Breadcrumb Navigation only — controls moved to google-ads-view header */}
            {(view !== 'campaigns' || selectedCampaign) && (
                <div className="flex-none px-4 md:px-0 py-2.5 border-b border-zinc-200 dark:border-white/10 bg-white/50 backdrop-blur-md dark:bg-black/50 flex items-center gap-2 z-10">
                    {view !== 'campaigns' && (
                        <Button variant="ghost" size="icon" onClick={() => view === 'assets' ? setView('ads') : loadCampaigns()} className="h-7 w-7 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-full transition-all flex-shrink-0">
                            <ArrowLeft className="h-3.5 w-3.5" />
                        </Button>
                    )}
                    <div className="flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 min-w-0">
                        <span className={cn("cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors whitespace-nowrap", view === 'campaigns' && "text-zinc-900 dark:text-white")} onClick={loadCampaigns}>
                            Campaigns
                        </span>
                        {selectedCampaign && (
                            <>
                                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className={cn("cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate max-w-[200px]", view === 'ads' && "text-zinc-900 dark:text-white")} onClick={() => setView('ads')}>
                                    {selectedCampaign.name?.substring(0, 30)}
                                </span>
                            </>
                        )}
                        {selectedAd && view === 'assets' && (
                            <>
                                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="text-zinc-900 dark:text-white truncate max-w-[200px]">
                                    {(selectedAd.adName || selectedAd.adGroupName || '').substring(0, 30)}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Top Level Stats */}
            {(view === 'campaigns' || view === 'ads') && !loading && !error && (
                <div className="pt-6 pb-2 px-4 md:px-5 lg:px-6">
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
                        <StatBox index={0} label={view === 'campaigns' ? "Campaigns" : "Ads"} val={activeList.length.toString()} icon={<Layers />} />
                        <StatBox index={1} label="Total Spend" val={formatCurrency(topStats.spend)} icon={<DollarSign />} />
                        <StatBox index={2} label="Impressions" val={formatNumber(topStats.impr)} icon={<Eye />} />
                        <StatBox index={3} label="Overall CTR" val={formatPercent(ctr)} icon={<MousePointerClick />} />
                        <StatBox index={4} label="Conversions" val={formatNumber(topStats.conv)} icon={<TrendingUp />} />
                    </div>
                </div>
            )}

            {/* Main Area */}
            <div className="flex-1 overflow-y-auto px-4 md:px-5 lg:px-6 py-4 relative [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Ambient glow orbs — using inline style as Tailwind has no radial-gradient utility */}
                <div
                    className="pointer-events-none absolute top-0 right-0 w-[500px] h-[400px] blur-3xl opacity-60 dark:opacity-100"
                    style={{ background: 'radial-gradient(ellipse at top right, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.06) 50%, transparent 80%)' }}
                />
                <div
                    className="pointer-events-none absolute bottom-0 left-0 w-[400px] h-[300px] blur-3xl opacity-60 dark:opacity-100"
                    style={{ background: 'radial-gradient(ellipse at bottom left, rgba(139,92,246,0.10) 0%, rgba(168,85,247,0.05) 50%, transparent 80%)' }}
                />

                {/* Error State */}
                {error && (
                    <div className="flex flex-col items-center justify-center p-12 text-center h-64">
                        <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4">
                            <Activity className="h-6 w-6 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">Connection Error</h3>
                        <p className="text-sm text-zinc-500 max-w-sm mb-6">{error}</p>
                        <Button onClick={() => view === 'campaigns' ? loadCampaigns() : loadAds(selectedCampaign)}>Retry Connection</Button>
                    </div>
                )}

                {/* Loading State — premium centered spinner */}
                {loading && !error && (
                    <div className="flex flex-col items-center justify-center min-h-[50vh] py-16 select-none">
                        {/* Spinner rings */}
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                            {/* Outer ring */}
                            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-500 border-r-blue-400 animate-spin" style={{ animationDuration: '900ms' }} />
                            {/* Middle glow ring */}
                            <div className="absolute inset-0 rounded-full border-[3px] border-blue-500/10 dark:border-blue-500/20" />
                            {/* Inner ring — opposite direction */}
                            <div className="absolute inset-[6px] rounded-full border-[3px] border-transparent border-t-violet-500 border-l-indigo-400 animate-spin" style={{ animationDuration: '700ms', animationDirection: 'reverse' }} />
                            {/* Center pulsing dot */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 animate-pulse shadow-lg shadow-blue-500/40" />
                            </div>
                        </div>

                        {/* Animated bounce dots */}
                        <div className="flex items-center gap-1.5 mt-8">
                            {[0, 150, 300].map(delay => (
                                <div
                                    key={delay}
                                    className="w-1.5 h-1.5 rounded-full bg-blue-500/60 animate-bounce"
                                    style={{ animationDelay: `${delay}ms`, animationDuration: '900ms' }}
                                />
                            ))}
                        </div>

                        {/* Label */}
                        <p className="mt-4 text-[11px] font-bold tracking-[0.2em] uppercase text-zinc-400 dark:text-zinc-500">
                            Loading data…
                        </p>
                    </div>
                )}

                {/* Data Grid: Campaigns or Ads */}
                {!loading && !error && (view === 'campaigns' || view === 'ads') && (
                    <>
                        {activeList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-2xl scale-150 animate-pulse" />
                                    <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-500/20 flex items-center justify-center shadow-xl">
                                        <Search className="h-9 w-9 text-blue-400 dark:text-blue-500" />
                                    </div>
                                </div>
                                <h3 className="text-xl font-black tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent mb-2">
                                    No results found
                                </h3>
                                <p className="text-sm text-zinc-500 dark:text-zinc-500 max-w-xs leading-relaxed mb-6">
                                    No {view === 'campaigns' ? 'campaigns' : 'ads'} match your search. Try a different keyword or clear the search.
                                </p>
                                {searchQuery && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={clearSearch}
                                        className="h-9 px-4 text-xs font-bold rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-all gap-2"
                                    >
                                        <Search className="h-3.5 w-3.5" />
                                        Clear Search
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-4 md:gap-5 pb-8 md:pb-0 px-4 -mx-4 md:px-0 md:mx-0">
                                    {(showAllItems ? activeList : activeList.slice(0, 4)).map((item, idx) => (
                                        <div key={item.id || item.adId || idx} className="h-full">
                                            <DataCard
                                                item={item}
                                                type={view}
                                                platform={platform}
                                                onClick={() => {
                                                    if (view === 'campaigns') {
                                                        loadAds(item);
                                                    } else {
                                                        loadAssets(item);
                                                    }
                                                }}
                                                onAnalyze={() => {
                                                    if (view === 'ads') {
                                                        setAnalyzingAd(item);
                                                    } else {
                                                        loadAds(item);
                                                    }
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                                {activeList.length > 4 && (
                                    <div className="flex justify-center mt-6 pb-6">
                                        <Button
                                            onClick={() => setShowAllItems(!showAllItems)}
                                            variant="ghost"
                                            className="group text-[10px] font-black uppercase tracking-[0.2em] text-[#1a73e8] hover:bg-[#1a73e8]/10 rounded-2xl px-8 h-12"
                                        >
                                            {showAllItems ? 'Show Less' : `View All ${view === 'campaigns' ? 'Campaigns' : 'Ads'}`}
                                            <ChevronRight className={cn("ml-2 h-4 w-4 transition-transform", showAllItems ? "rotate-90" : "")} />
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}

                {/* Assets View (Level 3) */}
                {!loading && !error && view === 'assets' && assetsData && (
                    <AssetDetailView
                        ad={selectedAd}
                        assetsData={assetsData}
                        searchQuery={searchQuery}
                        onAnalyze={setAnalyzingAd}
                    />
                )}

                {/* Analysis Modal */}
                {analyzingAd && (
                    <AnalysisModal
                        ad={analyzingAd}
                        onClose={() => setAnalyzingAd(null)}
                    />
                )}

            </div>
        </div >
    );
}

// ─── Constants & Types ───
const formatAdType = (type: string) => {
    const map: any = { 'RESPONSIVE_SEARCH_AD': 'Search RSA', 'RESPONSIVE_DISPLAY_AD': 'Display', 'VIDEO_AD': 'Video', 'VIDEO_RESPONSIVE_AD': 'Video Responsive', 'DEMAND_GEN_MULTI_ASSET_AD': 'DemandGen', 'DEMAND_GEN_VIDEO_RESPONSIVE_AD': 'DemandGen Video', 'DEMAND_GEN_CAROUSEL_AD': 'DemandGen Carousel', 'PERFORMANCE_MAX': 'PMax', 'SMART_CAMPAIGN_AD': 'Smart', 'HTML5_UPLOAD_AD': 'HTML5', 'APP_AD': 'App' };
    return map[type] || type;
};

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────────────────────────

function StatBox({ label, val, icon, index = 0 }: { label: string, val: string, icon: React.ReactNode, index?: number }) {
    const gradients = [
        "from-blue-500/10 to-indigo-500/10",
        "from-emerald-500/10 to-teal-500/10",
        "from-purple-500/10 to-pink-500/10",
        "from-amber-500/10 to-orange-500/10",
        "from-rose-500/10 to-red-500/10"
    ];

    const bgGradient = gradients[index % gradients.length];

    return (
        <div className="relative group overflow-hidden rounded-2xl p-3.5 bg-white dark:bg-[#0b0c10] border border-zinc-200 dark:border-white/5 hover:border-zinc-300 dark:hover:border-white/10 transition-all duration-300">
            {/* Subtle Hover Glow */}
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500", bgGradient)} />

            <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-2">
                <div className={cn(
                    "h-8 w-8 rounded-lg shadow-sm flex items-center justify-center border transition-all duration-500 group-hover:scale-110",
                    index % 5 === 0 ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                        index % 5 === 1 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                            index % 5 === 2 ? "bg-purple-500/10 border-purple-500/20 text-purple-500" :
                                index % 5 === 3 ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                                    "bg-rose-500/10 border-rose-500/20 text-rose-500"
                )}>
                    {React.cloneElement(icon as React.ReactElement<any>, { className: "h-3.5 w-3.5" })}
                </div>
                <div>
                    <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-white block leading-none mb-1">{val}</span>
                    <div className="flex items-center justify-center gap-1.5">
                        <div className={cn(
                            "w-1 h-1 rounded-full",
                            index % 5 === 0 ? "bg-blue-500" :
                                index % 5 === 1 ? "bg-emerald-500" :
                                    index % 5 === 2 ? "bg-purple-500" :
                                        index % 5 === 3 ? "bg-amber-500" :
                                            "bg-rose-500"
                        )} />
                        <span className="text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                            {label}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DataCard({ item, type, platform = 'google', onClick, onAnalyze }: { item: any, type: string, platform?: string, onClick: () => void, onAnalyze?: () => void }) {
    const isCampaign = type === 'campaigns';
    const isAdroll = platform === 'adroll';

    const title = isCampaign ? item.name : (item.adName || item.adGroupName || item.name || "Untitled Creative");
    const subType = isCampaign ? item.channelType : item.adType;

    // Status logic
    const status = (item.status || "active").toLowerCase();
    const isActive = status === 'enabled' || status === 'active' || item.isActive === true;

    const spend = typeof item.spend === 'string' ? parseFloat(item.spend) : (item.spend || 0);
    const conv = parseFloat(item.conversions || 0).toFixed(0);
    const ctr = parseFloat(item.ctr || 0).toFixed(2);
    const impr = formatNumber(parseFloat(item.impressions || 0) || 0);

    // Dynamic gradient for missing images
    const getPlaceholderGradient = (seed: string) => {
        const gradients = [
            "from-blue-600/20 via-indigo-600/10 to-violet-600/5",
            "from-emerald-600/20 via-teal-600/10 to-cyan-600/5",
            "from-violet-600/20 via-purple-600/10 to-fuchsia-600/5",
            "from-orange-600/20 via-amber-600/10 to-yellow-600/5"
        ];
        const index = seed ? seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % gradients.length : 0;
        return gradients[index];
    }

    return (
        <div
            className={cn(
                "group relative rounded-[1.5rem] transition-all duration-500 cursor-pointer overflow-hidden flex flex-col h-full w-full",
                "bg-white dark:bg-[#0c0c0e] border border-zinc-200 dark:border-white/10",
                "hover:border-[#1a73e8]/40 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_30px_rgba(0,0,0,0.3)]",
                "hover:-translate-y-1"
            )}
            onClick={onClick}
        >
            {/* Media Section */}
            <div className="relative aspect-[2] w-full overflow-hidden bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-white/5">
                {(item.thumbnailUrl && !isCampaign) || (isCampaign && item.thumbnailUrl) ? (
                    <img
                        src={item.thumbnailUrl}
                        alt="Preview"
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
                    />
                ) : (
                    <div className={cn(
                        "w-full h-full flex flex-col items-center justify-center bg-gradient-to-br transition-all duration-700 group-hover:scale-105",
                        getPlaceholderGradient(item.id || item.name || "")
                    )}>
                        <div className="relative">
                            <div className="absolute inset-0 blur-2xl opacity-30 bg-[#1a73e8] rounded-full animate-pulse scale-150" />
                            {isCampaign ? (
                                <LayoutGrid className="w-8 h-8 text-[#1a73e8]/40 relative z-10" />
                            ) : (
                                <Brain className="w-8 h-8 text-[#1a73e8]/40 relative z-10" />
                            )}
                        </div>
                    </div>
                )}

                {/* Status Badge */}
                <div className="absolute top-3 left-3 z-10">
                    <div className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border",
                        isActive
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                            : "bg-zinc-500/10 border-zinc-500/20 text-zinc-500 shadow-sm"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-zinc-500")} />
                        <span className="text-[8px] font-black uppercase tracking-widest leading-none mt-[1px]">
                            {isActive ? "Live" : "Idle"}
                        </span>
                    </div>
                </div>

                {/* Platform Indicator */}
                <div className="absolute top-3 right-3 z-10">
                    <div className="w-6 h-6 rounded-lg bg-white/20 dark:bg-black/30 backdrop-blur-xl border border-white/20 dark:border-white/10 flex items-center justify-center shadow-lg">
                        {isAdroll ? (
                            <span className="text-white text-[9px] font-black italic">A</span>
                        ) : (
                            <img src="/google-ads.svg" className="w-3.5 h-3.5" alt="G" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as any).parentNode.innerHTML = '<span class="text-white text-[9px] font-black italic">G</span>' }} />
                        )}
                    </div>
                </div>
            </div>

            {/* Information area */}
            <div className="p-4 flex flex-col gap-4 flex-1">
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-[#1a73e8] opacity-80">
                            {formatAdType(subType)}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className="text-[11px] font-black text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/50 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-white/5">
                                ${formatNumber(spend)}
                            </span>
                        </div>
                    </div>
                    <h3 className="text-[15px] font-black text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-1 group-hover:text-[#1a73e8] transition-colors tracking-tight">
                        {title}
                    </h3>
                </div>

                {/* Performance Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                    <div className="relative bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-100 dark:border-white/5 flex flex-col justify-center gap-0.5 overflow-hidden group/m transition-all hover:bg-[#1a73e8]/5">
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#1a73e8] scale-y-0 group-hover/m:scale-y-100 transition-transform origin-center" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Efficiency</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-zinc-900 dark:text-white leading-none tracking-tight">{ctr}</span>
                            <span className="text-[10px] font-bold text-[#1a73e8]">%</span>
                        </div>
                    </div>
                    <div className="relative bg-zinc-50 dark:bg-zinc-900/50 rounded-xl p-3 border border-zinc-100 dark:border-white/5 flex flex-col justify-center gap-0.5 overflow-hidden group/m transition-all hover:bg-emerald-500/5">
                        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-500 scale-y-0 group-hover/m:scale-y-100 transition-transform origin-center" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Scale</p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-black text-zinc-900 dark:text-white leading-none tracking-tight">{isCampaign ? conv : impr}</span>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">{isCampaign ? "Conv" : "Impr"}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Link */}
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-zinc-100 dark:border-white/5">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest opacity-60">
                        ID: {(item.adId?.substring(0, 8) || item.id?.substring(0, 8))}
                    </span>

                    <Button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onAnalyze) onAnalyze();
                            else onClick();
                        }}
                        className="h-8 px-4 bg-zinc-900 dark:bg-white hover:bg-[#1a73e8] dark:hover:bg-[#1a73e8] text-white dark:text-zinc-900 hover:text-white dark:hover:text-white font-black text-[10px] uppercase tracking-[0.15em] rounded-lg transition-all duration-300 flex items-center justify-center gap-1.5 shadow-md hover:shadow-[#1a73e8]/20 group/btn relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-white/10 to-blue-600/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                        {isCampaign ? <Layers className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {isCampaign ? "View Ads" : "Analyze"}
                    </Button>
                </div>
            </div>
        </div>
    );
}


function MetricBox({ val, label, colorClass }: { val: string, label: string, colorClass?: string }) {
    return (
        <div className="flex flex-col gap-0.5 min-w-0">
            <span className={cn("font-mono text-[11px] font-black tracking-tight leading-none truncate", colorClass || "text-zinc-900 dark:text-white")} title={val}>
                {val}
            </span>
            <span className="text-[8px] uppercase tracking-[0.12em] text-zinc-400 dark:text-zinc-500 font-bold leading-none mt-0.5 truncate">{label}</span>
        </div>
    );
}

function AssetDetailView({ ad, assetsData, searchQuery, onAnalyze }: { ad: any, assetsData: any, searchQuery?: string, onAnalyze: (val: any) => void }) {
    const [activeTab, setActiveTab] = useState<'intelligence' | 'images' | 'videos' | 'texts'>('intelligence');
    const [showAllImages, setShowAllImages] = useState(false);
    const [showAllVideos, setShowAllVideos] = useState(false);
    const [showAllTexts, setShowAllTexts] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const [textFilter, setTextFilter] = useState<'HEADLINE' | 'DESCRIPTION' | 'LONG_HEADLINE' | 'ALL'>('ALL');

    if (!assetsData) return <div className="p-8 text-center text-zinc-500">No assets data available.</div>;

    const { assets = [], summary = {} } = assetsData;

    const filteredAssets = useMemo(() => {
        if (!searchQuery) return assets;
        const q = searchQuery.toLowerCase();
        return assets.filter((a: any) => {
            const text = (a.text || a.assetText || a.adName || a.campaignName || a.content || '').toLowerCase();
            const id = (a.assetId || a.id || '').toLowerCase();
            const field = (a.fieldType || '').toLowerCase();
            return text.includes(q) || id.includes(q) || field.includes(q);
        });
    }, [assets, searchQuery]);

    const headlines = filteredAssets.filter((a: any) => a.fieldType === 'HEADLINE');
    const descriptions = filteredAssets.filter((a: any) => a.fieldType === 'DESCRIPTION');
    const longHeadlines = filteredAssets.filter((a: any) => a.fieldType === 'LONG_HEADLINE');
    const images = filteredAssets.filter((a: any) => !!a.imageUrl);
    const videos = filteredAssets.filter((a: any) => !!a.videoId);

    const tabs = [
        { id: 'intelligence', label: 'Intelligence', icon: Sparkles, color: 'text-blue-500', bgColor: 'bg-blue-500/10' },
        { id: 'images', label: `Images (${images.length})`, icon: ImageIcon, color: 'text-emerald-500', bgColor: 'bg-emerald-500/10' },
        { id: 'videos', label: `Videos (${videos.length})`, icon: Video, color: 'text-rose-500', bgColor: 'bg-rose-500/10' },
        { id: 'texts', label: `Texts (${headlines.length + descriptions.length + longHeadlines.length})`, icon: Type, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-auto min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Side Tabs Navigation */}
            <div className="lg:w-48 lg:max-w-xs shrink-0">
                <div className="sticky top-6 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible pb-4 lg:pb-0 scrollbar-none snap-x snap-mandatory gap-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                setShowAllImages(false);
                                setShowAllVideos(false);
                                setShowAllTexts(false);
                                setTextFilter('ALL');
                            }}
                            className={cn(
                                "flex items-center gap-2.5 px-3 py-3 rounded-[1rem] transition-all duration-300 border font-black uppercase tracking-tight text-[10px] shrink-0 snap-start",
                                activeTab === tab.id
                                    ? "bg-white dark:bg-white/5 shadow-md border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-white"
                                    : "bg-transparent border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                            )}
                        >
                            <div className={cn(
                                "p-1.5 rounded-lg transition-all",
                                activeTab === tab.id ? `${tab.bgColor} ${tab.color}` : "bg-zinc-100 dark:bg-white/5 text-zinc-400"
                            )}>
                                <tab.icon className="h-3.5 w-3.5" />
                            </div>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    {activeTab === 'intelligence' && (
                        <SummarySection ad={ad} headlines={headlines} descriptions={descriptions} images={images} videos={videos} />
                    )}

                    {activeTab === 'images' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
                                        <ImageIcon className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-tightest">Integrated Images</h3>
                                </div>
                                <Button
                                    onClick={() => {
                                        toast({
                                            title: "Batch Analysis Started",
                                            description: "Analyzing all image assets.",
                                        });
                                        // This triggers the same cloud API for batch processing
                                        fetch(`/api/realtime/ads/${ad.adId}/analyze-assets`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ adData: ad, typeFilter: 'IMAGE' })
                                        });
                                    }}
                                    className="rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-black uppercase tracking-widest text-[10px] h-11 px-8 shadow-lg shadow-blue-500/20"
                                >
                                    Analyzer
                                </Button>
                            </div>
                            {images.length > 0 ? (
                                <ImageGrid
                                    images={images}
                                    showAll={showAllImages}
                                    onToggleShowAll={() => setShowAllImages(!showAllImages)}
                                    // Restoring analysis trigger for clicks
                                    onSelectAsset={(img: any) => onAnalyze({ ...ad, analysisAsset: img })}
                                />
                            ) : (
                                <EmptyState label="No images assets found" icon={ImageIcon} />
                            )}
                        </div>
                    )}

                    {activeTab === 'videos' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-500">
                                    <Video className="h-5 w-5" />
                                </div>
                                <h3 className="text-sm font-black uppercase tracking-tightest">Integrated Videos</h3>
                            </div>
                            {selectedVideo ? (
                                <VideoHalfScreenPlayer
                                    video={selectedVideo}
                                    onClose={() => setSelectedVideo(null)}
                                />
                            ) : videos.length > 0 ? (
                                <VideoGrid
                                    videos={videos}
                                    onSelectVideo={setSelectedVideo}
                                    showAll={showAllVideos}
                                    onToggleShowAll={() => setShowAllVideos(!showAllVideos)}
                                />
                            ) : (
                                <EmptyState label="No video assets found" icon={Video} />
                            )}
                        </div>
                    )}

                    {activeTab === 'texts' && (
                        <div className="space-y-8">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                                        <Type className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-sm font-black uppercase tracking-tightest">Copy Dynamics</h3>
                                </div>

                                <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-white/5 rounded-2xl">
                                    {(['ALL', 'HEADLINE', 'DESCRIPTION', 'LONG_HEADLINE'] as const).map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setTextFilter(type)}
                                            className={cn(
                                                "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                                                textFilter === type
                                                    ? "bg-white dark:bg-zinc-800 text-blue-500 shadow-sm"
                                                    : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                                            )}
                                        >
                                            {type.replace(/_/g, ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <TextGrid
                                assets={textFilter === 'ALL' ? [...headlines, ...descriptions, ...longHeadlines] :
                                    textFilter === 'HEADLINE' ? headlines :
                                        textFilter === 'DESCRIPTION' ? descriptions : longHeadlines}
                                title={textFilter === 'ALL' ? 'All Copy' : textFilter.replace(/_/g, ' ')}
                                showAll={showAllTexts}
                                onToggleShowAll={() => setShowAllTexts(!showAllTexts)}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SummarySection({ ad, headlines, descriptions, images, videos }: any) {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Ad Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-zinc-200 dark:border-white/10">
                <div>
                    <h2 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-white tracking-tightest leading-none mb-3">
                        {ad.adName || ad.adGroupName || "Unnamed Ad"}
                    </h2>
                    <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                        <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-blue-500" /> {headlines.length + descriptions.length + images.length + videos.length} Total Assets</span>
                        <span className="flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-emerald-500" /> {formatCurrency(ad.spend || 0)} Spend</span>
                        <span className="flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5 text-amber-500" /> {ad.ctr}% CTR</span>
                    </div>
                </div>
            </div>

            {/* AI Analysis Summary */}
            <Card className="p-6 xl:p-10 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-white/5 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32" />
                <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6 mb-10">
                        <div className="h-16 w-16 rounded-[2rem] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20 shrink-0">
                            <Sparkles className="h-8 w-8 text-white animate-pulse" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-black text-2xl text-zinc-900 dark:text-white leading-tight tracking-tightest">Hola Prime Intelligence</h3>
                            <p className="text-[10px] text-[#1a73e8] dark:text-blue-400 mt-1 uppercase tracking-[0.2em] font-black">AI-Powered Creative Diagnostics</p>
                        </div>
                        <Button
                            onClick={() => {
                                toast({
                                    title: "Batch Analysis Started",
                                    description: "Analyzing all assets in parallel.",
                                });
                                fetch(`/api/realtime/ads/${ad.adId}/analyze-assets`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ adData: ad })
                                }).then(res => res.json())
                                    .then(data => {
                                        if (data.success) {
                                            toast({ title: "Analysis Complete", description: "All assets have been analyzed." });
                                        }
                                    });
                            }}
                            className="rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-black uppercase tracking-widest text-[10px] h-12 px-6 shadow-lg shadow-blue-500/20 shrink-0"
                        >
                            Sync intelligence
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
                        <div className="p-4 lg:p-6 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 transition-all hover:scale-105">
                            <MetricBox val={headlines.length.toString()} label="Headlines" />
                        </div>
                        <div className="p-4 lg:p-6 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 transition-all hover:scale-105">
                            <MetricBox val={descriptions.length.toString()} label="Descriptions" />
                        </div>
                        <div className="p-4 lg:p-6 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 transition-all hover:scale-105">
                            <MetricBox val={images.length.toString()} label="Images" />
                        </div>
                        <div className="p-4 lg:p-6 rounded-3xl bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/5 transition-all hover:scale-105">
                            <MetricBox val={videos.length.toString()} label="Videos" />
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}

function ImageGrid({ images, onSelectAsset, showAll, onToggleShowAll }: any) {
    const displayImages = showAll ? images : images.slice(0, 4);

    return (
        <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-zinc-400">
                <div className="w-8 h-[1px] bg-zinc-200 dark:bg-white/10" />
                Integrated Images
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {displayImages.map((img: any, i: number) => (
                    <Card key={i} onClick={() => onSelectAsset?.(img)} className="overflow-hidden flex flex-col group border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 rounded-2xl cursor-pointer hover:ring-2 hover:ring-blue-500/40 transition-all shadow-sm hover:shadow-2xl">
                        <div className="aspect-square relative shrink-0 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            {img.imageUrl ? (
                                <img src={img.imageUrl} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Asset" />
                            ) : (
                                <div className="absolute inset-0 w-full h-full flex items-center justify-center text-zinc-400"><ImageIcon className="h-8 w-8 opacity-20" /></div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest h-9 px-6 hover:bg-white hover:text-black">
                                    Analyze
                                </Button>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/30 dark:bg-black/20 flex-1">
                            <MetricBox val={img.performanceLabel === 'UNSPECIFIED' ? 'UNSPEC' : (img.performanceLabel || 'PENDING')} label="Status" colorClass={img.performanceLabel === 'BEST' ? 'text-emerald-500' : 'text-zinc-500'} />
                            <div className="text-right">
                                <MetricBox val={formatPercent(img.ctr || 0)} label="CTR" colorClass="text-[#1a73e8]" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            {images.length > 4 && (
                <div className="flex justify-center mt-8">
                    <Button
                        onClick={onToggleShowAll}
                        variant="ghost"
                        className="group text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 hover:bg-blue-500/10 rounded-2xl px-8 h-12"
                    >
                        {showAll ? 'Show Less' : 'View All Images'}
                        <ChevronRight className={cn("ml-2 h-4 w-4 transition-transform", showAll ? "rotate-90" : "")} />
                    </Button>
                </div>
            )}
        </div>
    );
}

function VideoGrid({ videos, onSelectVideo, showAll, onToggleShowAll }: any) {
    const displayVideos = showAll ? videos : videos.slice(0, 3);

    return (
        <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-zinc-400">
                <div className="w-8 h-[1px] bg-zinc-200 dark:bg-white/10" />
                Integrated Videos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {displayVideos.map((vid: any, i: number) => (
                    <Card key={i} onClick={() => onSelectVideo(vid)} className="overflow-hidden flex flex-col group border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 rounded-3xl cursor-pointer hover:ring-2 hover:ring-rose-500/40 transition-all shadow-sm hover:shadow-2xl">
                        <div className="aspect-video relative shrink-0 bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <img
                                src={`https://img.youtube.com/vi/${vid.videoId}/hqdefault.jpg`}
                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                alt="Video Thumbnail"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-all">
                                <div className="h-12 w-12 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xl shadow-rose-500/40 transform group-hover:scale-110 transition-transform">
                                    <Video className="h-5 w-5 fill-current" />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/30 dark:bg-black/20 flex-1">
                            <MetricBox val={vid.performanceLabel === 'UNSPECIFIED' ? 'UNSPEC' : (vid.performanceLabel || 'PENDING')} label="Status" colorClass={vid.performanceLabel === 'BEST' ? 'text-emerald-500' : 'text-zinc-500'} />
                            <div className="text-right">
                                <MetricBox val={formatPercent(vid.ctr || 0)} label="CTR" colorClass="text-[#1a73e8]" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            {videos.length > 3 && (
                <div className="flex justify-center mt-8">
                    <Button
                        onClick={onToggleShowAll}
                        variant="ghost"
                        className="group text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 hover:bg-blue-500/10 rounded-2xl px-8 h-12"
                    >
                        {showAll ? 'Show Less' : 'View All Videos'}
                        <ChevronRight className={cn("ml-2 h-4 w-4 transition-transform", showAll ? "rotate-90" : "")} />
                    </Button>
                </div>
            )}
        </div>
    );
}

function VideoHalfScreenPlayer({ video, onClose }: any) {
    return (
        <div className="flex flex-col xl:flex-row gap-8 animate-in slide-in-from-bottom-8 duration-500 h-[600px]">
            <div className="xl:w-1/2 h-full rounded-3xl overflow-hidden bg-black shadow-2xl relative group">
                <iframe
                    className="w-full h-full border-none"
                    src={`https://www.youtube.com/embed/${video.videoId}?autoplay=1`}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                />
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
            </div>
            <div className="xl:w-1/2 flex flex-col gap-6 p-8 bg-zinc-50/50 dark:bg-white/2 rounded-3xl border border-zinc-200 dark:border-white/5 overflow-y-auto">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge className="bg-rose-500/10 text-rose-500 border-none mb-2">VIDEO ASSET</Badge>
                        <h3 className="text-xl font-black text-zinc-900 dark:text-white leading-tight">{video.assetName || "YouTube Video"}</h3>
                        <p className="text-zinc-500 text-sm mt-1">{video.videoId}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-white dark:bg-black/20 border border-zinc-100 dark:border-white/5">
                        <MetricBox val={formatNumber(video.impressions)} label="Impressions" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-black/20 border border-zinc-100 dark:border-white/5">
                        <MetricBox val={formatPercent(video.ctr)} label="CTR" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-black/20 border border-zinc-100 dark:border-white/5">
                        <MetricBox val={formatCurrency(video.spend || 0)} label="Spend" />
                    </div>
                    <div className="p-4 rounded-2xl bg-white dark:bg-black/20 border border-zinc-100 dark:border-white/5">
                        <MetricBox val={formatNumber(video.conversions)} label="Conversions" />
                    </div>
                </div>

                <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                    <div className="flex items-center gap-2 text-blue-500 mb-3">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Performance Signal</span>
                    </div>
                    <p className="text-sm font-medium leading-relaxed">
                        This video has {video.performanceLabel?.toLowerCase() || 'average'} performance alignment.
                        Strategic suggestion: Maintain usage {video.performanceLabel === 'BEST' ? 'and scale similar creatives' : 'or experiment with different hooks'}.
                    </p>
                </div>
            </div>
        </div>
    );
}

function TextGrid({ assets, title, showAll, onToggleShowAll }: any) {
    const displayAssets = showAll ? assets : assets.slice(0, 4);

    return (
        <div className="space-y-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-zinc-400">
                <div className="w-8 h-[1px] bg-zinc-200 dark:bg-white/10" />
                Copy Dynamics: {title}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                {displayAssets.map((txt: any, i: number) => (
                    <Card key={i} className="p-6 border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900/40 rounded-[2rem] flex flex-col gap-4 group hover:border-blue-500/50 hover:shadow-2xl transition-all relative overflow-hidden">
                        <div className="flex justify-between items-center relative z-10">
                            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest bg-blue-500/10 text-blue-600 dark:text-blue-400 border-none px-3 py-1">
                                {txt.fieldType?.replace(/_/g, ' ')}
                            </Badge>
                            <Sparkles className="h-4 w-4 text-zinc-200 dark:text-white/10 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <p className={cn("text-zinc-900 dark:text-zinc-100 font-bold leading-relaxed relative z-10", txt.fieldType === 'DESCRIPTION' ? "text-sm" : "text-lg")}>
                            "{txt.content || txt.text}"
                        </p>
                        <div className="mt-auto pt-5 flex items-center justify-between border-t border-zinc-100 dark:border-white/5 relative z-10">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Length</span>
                                <span className="text-xs font-mono text-zinc-900 dark:text-zinc-400 font-black">{(txt.content || txt.text)?.length || 0} Chars</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Yield</span>
                                <span className={cn("text-xs font-black", txt.performanceLabel === 'BEST' ? "text-emerald-500" : "text-zinc-500")}>
                                    {txt.performanceLabel === 'UNSPECIFIED' ? 'UNSPEC' : (txt.performanceLabel || 'PENDING')}
                                </span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            {assets.length > 4 && (
                <div className="flex justify-center mt-8">
                    <Button
                        onClick={onToggleShowAll}
                        variant="ghost"
                        className="group text-[10px] font-black uppercase tracking-[0.2em] text-[#1a73e8] hover:bg-[#1a73e8]/10 rounded-2xl px-8 h-12"
                    >
                        {showAll ? 'Show Less' : `View All Copy`}
                        <ChevronRight className={cn("ml-2 h-4 w-4 transition-transform", showAll ? "rotate-90" : "")} />
                    </Button>
                </div>
            )}
        </div>
    );
}

function EmptyState({ label, icon: Icon }: { label: string, icon: any }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-zinc-100/50 dark:bg-white/5 rounded-[3rem] border border-dashed border-zinc-200 dark:border-white/10">
            <div className="h-16 w-16 rounded-3xl bg-white dark:bg-zinc-900 flex items-center justify-center shadow-lg mb-6 border border-zinc-100 dark:border-white/5">
                <Icon className="h-8 w-8 text-zinc-300" />
            </div>
            <h4 className="text-sm font-black uppercase tracking-widest text-zinc-500">{label}</h4>
        </div>
    );
}


// ─── Analysis Modal Implementation ───

function AnalysisModal({ ad, onClose }: { ad: any, onClose: () => void }) {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const isAdroll = ad.platform === 'adroll';

    useEffect(() => {
        // If AdRoll ad already has analysis data in MongoDB, show it immediately
        if (ad.ad_analysis && typeof ad.ad_analysis === 'object') {
            setAnalysis(ad.ad_analysis);
            setLoading(false);
            return;
        }
        // If ad object itself has analysed fields (already merged), use them
        if (ad.aidaAttentionScore || ad.scoreOverall || ad.verdictRating) {
            setAnalysis(ad);
            setLoading(false);
            return;
        }
        // Otherwise trigger fresh AI analysis
        runAnalysis();
    }, [ad]);

    async function runAnalysis() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/realtime/ads/${ad.adId || ad.id}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adData: ad, asset: ad.analysisAsset })
            });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'AI analysis failed');
            setAnalysis(data.data.analysis);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#0c0e14] w-full max-w-5xl max-h-full rounded-[2rem] border border-zinc-200 dark:border-white/10 shadow-3xl overflow-hidden flex flex-col">
                <div className="flex-none p-6 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-white/2">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight truncate">
                            {ad.adName || ad.adGroupName || ad.adId || ad.id}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            <p className={cn("text-[10px] uppercase font-black tracking-widest", isAdroll ? "text-[#E0267D]" : "text-[#1a73e8]")}>
                                {isAdroll ? 'AdRoll Creative Analysis' : 'AI Performance Report'}
                            </p>
                            {ad.adId && (
                                <span className="text-[9px] font-mono text-zinc-400 truncate">ID: {ad.adId}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                        {analysis && !loading && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={runAnalysis}
                                className="text-[10px] font-black uppercase tracking-widest h-8 px-3 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white gap-1.5"
                            >
                                <Sparkles className="h-3 w-3" />
                                Re-Analyze
                            </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-zinc-200/50 dark:hover:bg-white/5 h-10 w-10">
                            <ArrowLeft className="h-5 w-5 rotate-90" />
                        </Button>
                    </div>
                </div>

                {/* Ad thumbnail preview for AdRoll */}
                {isAdroll && ad.thumbnailUrl && !loading && (
                    <div className="flex-none px-6 py-4 border-b border-zinc-100 dark:border-white/5 bg-zinc-50/30 dark:bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-16 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/10 flex-shrink-0 bg-zinc-100 dark:bg-zinc-800">
                                <img src={ad.thumbnailUrl} alt="Ad Creative" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            </div>
                            <div className="flex gap-4 text-center">
                                <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Type</p>
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white capitalize">{ad.adType || 'image'}</p>
                                </div>
                                {ad.spend > 0 && <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Spend</p>
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white">${Number(ad.spend).toFixed(2)}</p>
                                </div>}
                                {ad.impressions > 0 && <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Impressions</p>
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{Number(ad.impressions).toLocaleString()}</p>
                                </div>}
                                {ad.clicks > 0 && <div>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-zinc-400">Clicks</p>
                                    <p className="text-xs font-bold text-zinc-900 dark:text-white">{Number(ad.clicks).toLocaleString()}</p>
                                </div>}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-6">
                            <div className="relative">
                                <Activity className={cn("h-16 w-16 animate-pulse", isAdroll ? "text-[#E0267D]" : "text-blue-500")} />
                                <Sparkles className={cn("h-6 w-6 absolute -top-2 -right-2 animate-bounce", isAdroll ? "text-[#FF4B91]" : "text-blue-400")} />
                            </div>
                            <div className="text-center">
                                <h3 className="text-xl font-bold dark:text-white">Analyzing with Claude 3.5 Sonnet</h3>
                                <p className="text-zinc-500 text-sm mt-1">Running deep visual and conversion heuristics...</p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="py-20 text-center">
                            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center mb-4 mx-auto">
                                <Activity className="h-6 w-6 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">Analysis Failed</h3>
                            <p className="text-sm text-zinc-500 mt-2">{error}</p>
                            <div className="flex gap-3 justify-center mt-6">
                                <Button variant="outline" onClick={runAnalysis}>Retry</Button>
                                <Button variant="ghost" onClick={onClose}>Close</Button>
                            </div>
                        </div>
                    ) : (
                        <ReportContent data={analysis} platform={ad.platform} />
                    )}
                </div>
            </div>
        </div>
    );
}


function ReportContent({ data, platform }: { data: any, platform?: string }) {
    if (!data || typeof data !== 'object') return <pre className="p-4 bg-zinc-100 dark:bg-white/5 rounded-xl font-mono text-xs">{JSON.stringify(data, null, 2)}</pre>;

    const isAdroll = platform === 'adroll';

    // ── Detect schema type ──────────────────────────────────────────────────────
    const isAdrollNativeSchema = data.overall_score !== undefined || data.design_score !== undefined || data.retargeting_specific_analysis !== undefined;

    const sc = (s: number) => s >= 8 ? 'text-emerald-500' : s >= 5 ? 'text-amber-500' : 'text-rose-500';
    const scBg = (s: number) => s >= 8 ? 'bg-emerald-500' : s >= 5 ? 'bg-amber-500' : 'bg-rose-500';

    // ── ADROLL NATIVE SCHEMA ────────────────────────────────────────────────────
    if (isAdrollNativeSchema) {
        const overallScore = data.overall_score || 0;
        const designScore = data.design_score || 0;
        const clarityScore = data.clarity_score || 0;
        const hookScore = data.hook_score || 0;
        const ctaScore = data.cta_score || 0;
        const retentionScore = data.retention_score || 0;

        const recs: any[] = Array.isArray(data.improvement_recommendations) ? data.improvement_recommendations : [];
        const barriers: string[] = Array.isArray(data.conversion_barriers) ? data.conversion_barriers : [];
        const triggers: string[] = Array.isArray(data.psychological_triggers) ? data.psychological_triggers : [];
        const emotionalDrivers: string[] = Array.isArray(data.emotional_drivers) ? data.emotional_drivers : [];
        const persuasion: string[] = Array.isArray(data.persuasion_techniques) ? data.persuasion_techniques : [];
        const biases: string[] = Array.isArray(data.cognitive_biases_exploited) ? data.cognitive_biases_exploited : [];

        const retargeting = data.retargeting_specific_analysis || {};
        const effectiveness = data.estimated_effectiveness || {};
        const audience = data.target_audience || {};

        const scoreItems = [
            { label: 'Overall', val: overallScore },
            { label: 'Design', val: designScore },
            { label: 'Clarity', val: clarityScore },
            { label: 'Hook', val: hookScore },
            { label: 'CTA', val: ctaScore },
            { label: 'Retention', val: retentionScore },
        ];

        return (
            <div className="space-y-8 font-sans text-zinc-800 dark:text-zinc-300">

                {/* Score Strip */}
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
                    {scoreItems.map(s => (
                        <div key={s.label} className="p-4 rounded-2xl bg-white dark:bg-white/2 border border-zinc-100 dark:border-white/5 text-center flex flex-col items-center gap-1">
                            <span className={cn("text-2xl font-black font-mono", sc(s.val))}>{s.val}</span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{s.label}</span>
                            <div className="w-12 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                                <div className={cn("h-full rounded-full", scBg(s.val))} style={{ width: `${s.val * 10}%` }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Effectiveness Row */}
                {Object.keys(effectiveness).length > 0 && (
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                        {effectiveness.ctr_prediction && (
                            <div className="p-4 rounded-2xl bg-[#E0267D]/5 border border-[#E0267D]/10 text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-[#E0267D]">CTR Prediction</p>
                                <p className="text-lg font-black text-zinc-900 dark:text-white mt-1">{effectiveness.ctr_prediction}</p>
                            </div>
                        )}
                        {effectiveness.engagement_potential && (
                            <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-purple-500">Engagement</p>
                                <p className="text-sm font-black text-zinc-900 dark:text-white mt-1">{effectiveness.engagement_potential}</p>
                            </div>
                        )}
                        {effectiveness.memorability_score && (
                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-amber-500">Memorability</p>
                                <p className="text-lg font-black text-zinc-900 dark:text-white mt-1">{effectiveness.memorability_score}/10</p>
                            </div>
                        )}
                        {effectiveness.conversion_likelihood && (
                            <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                                <p className="text-[8px] font-black uppercase tracking-widest text-emerald-500">Conversion</p>
                                <p className="text-sm font-black text-zinc-900 dark:text-white mt-1">{effectiveness.conversion_likelihood}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Target Audience */}
                {audience.demographics && (
                    <div className="p-6 rounded-2xl bg-white dark:bg-white/2 border border-zinc-100 dark:border-white/10">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#E0267D] mb-4 flex items-center gap-2">
                            <Target className="h-3.5 w-3.5" /> Target Audience
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Demographics</p>
                                <p className="font-medium leading-relaxed">{audience.demographics}</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Psychographics</p>
                                <p className="font-medium leading-relaxed">{audience.psychographics}</p>
                            </div>
                        </div>
                        {Array.isArray(audience.pain_points) && audience.pain_points.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-white/5">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Pain Points Targeted</p>
                                <ul className="space-y-1">
                                    {audience.pain_points.map((pp: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#E0267D] mt-1.5 flex-shrink-0" />
                                            {pp}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Psychological Analysis 2-col */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {triggers.length > 0 && (
                        <div className="p-6 rounded-2xl bg-purple-500/5 border border-purple-500/10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-purple-500 mb-3 flex items-center gap-2">
                                <Brain className="h-3.5 w-3.5" /> Psychological Triggers
                            </h3>
                            <ul className="space-y-2">
                                {triggers.map((t: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {emotionalDrivers.length > 0 && (
                        <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-rose-500 mb-3 flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5" /> Emotional Drivers
                            </h3>
                            <ul className="space-y-2">
                                {emotionalDrivers.map((d: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 flex-shrink-0" />
                                        {d}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Persuasion + Cognitive Biases */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {persuasion.length > 0 && (
                        <div className="p-6 rounded-2xl bg-indigo-500/5 border border-indigo-500/10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-3 flex items-center gap-2">
                                <Activity className="h-3.5 w-3.5" /> Persuasion Techniques
                            </h3>
                            <ul className="space-y-2">
                                {persuasion.map((p: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                                        {p}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {biases.length > 0 && (
                        <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                            <h3 className="text-xs font-black uppercase tracking-widest text-amber-500 mb-3 flex items-center gap-2">
                                <BarChart3 className="h-3.5 w-3.5" /> Cognitive Biases
                            </h3>
                            <ul className="space-y-2">
                                {biases.map((b: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2 text-sm">
                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                                        {b}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Conversion Barriers */}
                {barriers.length > 0 && (
                    <div className="p-6 rounded-2xl bg-rose-500/5 border border-rose-500/10">
                        <h3 className="text-xs font-black uppercase tracking-widest text-rose-600 mb-3 flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5" /> Conversion Barriers
                        </h3>
                        <ul className="space-y-2">
                            {barriers.map((b: string, i: number) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <span className="text-rose-400 font-black text-xs mt-0.5">✗</span>
                                    {b}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Retargeting Analysis */}
                {Object.keys(retargeting).length > 0 && (
                    <div className="p-6 rounded-2xl bg-[#E0267D]/5 border border-[#E0267D]/10">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#E0267D] mb-4 flex items-center gap-2">
                            <Target className="h-3.5 w-3.5" /> Retargeting Intelligence
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            {retargeting.abandonment_stage_targeted && (
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Abandonment Stage</p>
                                    <p className="font-medium">{retargeting.abandonment_stage_targeted}</p>
                                </div>
                            )}
                            {retargeting.message_alignment && (
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Message Alignment</p>
                                    <p className="font-medium">{retargeting.message_alignment}</p>
                                </div>
                            )}
                            {retargeting.frequency_fatigue_risk && (
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-1">Fatigue Risk</p>
                                    <p className="font-medium">{retargeting.frequency_fatigue_risk}</p>
                                </div>
                            )}
                        </div>
                        {Array.isArray(retargeting.personalization_opportunities) && retargeting.personalization_opportunities.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-[#E0267D]/10">
                                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">Personalization Opportunities</p>
                                <ul className="space-y-1.5">
                                    {retargeting.personalization_opportunities.map((op: string, i: number) => (
                                        <li key={i} className="flex items-start gap-2 text-sm">
                                            <span className="text-[#E0267D] font-black text-xs mt-0.5">→</span>
                                            {op}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Improvement Recommendations */}
                {recs.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Optimization Roadmap</h3>
                        {recs.map((rec: any, i: number) => (
                            <div key={i} className="flex gap-4 p-5 rounded-2xl bg-white dark:bg-white/2 border border-zinc-100 dark:border-white/10 hover:border-[#E0267D]/30 transition-all">
                                <div className="flex-none h-8 w-8 rounded-full bg-[#E0267D] text-white flex items-center justify-center font-black text-xs">#{i + 1}</div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        {rec.category && <span className="text-[9px] font-black uppercase tracking-widest text-[#E0267D] bg-[#E0267D]/10 px-2 py-0.5 rounded-full">{rec.category}</span>}
                                        {rec.priority && <span className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", rec.priority === 'High' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400' : rec.priority === 'Medium' ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800')}>{rec.priority} Priority</span>}
                                        {rec.expected_impact && <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400">{rec.expected_impact}</span>}
                                    </div>
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 leading-snug">{rec.suggestion}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // ── CLAUDE SCHEMA (Google or re-analyzed AdRoll) ────────────────────────────
    const accentColor = isAdroll ? 'text-[#E0267D]' : 'text-[#1a73e8]';
    const accentBg = isAdroll ? 'bg-[#E0267D]/10 border-[#E0267D]/10' : 'bg-blue-500/10 border-blue-500/10';

    const whatWorks = data.whatWorks || data.keyStrengths || '';
    const whatDoesntWork = data.whatDoesntWork || data.keyWeaknesses || '';
    const keyInsight = data.keyInsight || data.topInsight || '';
    const compositeScore = data.compositeRating || data.scoreOverall || 0;

    const ratings = [
        { key: 'scoreVisualDesign', label: 'Visual Design' },
        { key: 'scoreTypography', label: 'Typography' },
        { key: 'scoreColorUsage', label: 'Color Usage' },
        { key: 'scoreComposition', label: 'Composition' },
        { key: 'scoreEmotionalAppeal', label: 'Emotional Appeal' },
        { key: 'scoreTrustSignals', label: 'Trust Signals' },
        { key: 'scoreUrgency', label: 'Urgency' }
    ];

    return (
        <div className="space-y-10 font-sans text-zinc-800 dark:text-zinc-300">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 pb-8 border-b border-zinc-100 dark:border-white/5">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                        <Badge className={cn("border-none font-black text-[10px] px-2 py-0.5", isAdroll ? "bg-[#E0267D]/20 text-[#E0267D]" : "bg-blue-500/20 text-blue-500")}>{data.adType || 'Creative'}</Badge>
                        <Badge variant="outline" className="border-zinc-200 dark:border-white/10 text-[10px] font-black">{data.performanceLabel?.replace(/_/g, ' ') || 'AVERAGE'}</Badge>
                    </div>
                    <div className="space-y-4">
                        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/2 border border-zinc-100 dark:border-white/5">
                            <h4 className={cn("text-lg font-bold mb-1", sc(compositeScore))}>{data.verdictRating} — {data.verdictDecision}</h4>
                            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{data.verdictSummary}</p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-[2.5rem] min-w-[160px] shadow-2xl">
                    <span className={cn("text-5xl font-black font-mono", sc(compositeScore))}>{compositeScore}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-2">Overall Score</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <BarChart3 className="h-3.5 w-3.5" /> Performance metrics
                    </h3>
                    <div className="p-5 rounded-2xl bg-white dark:bg-white/2 border border-zinc-100 dark:border-white/10 space-y-3">
                        <div className="flex justify-between text-sm"><span className="text-zinc-500">CTR Insights</span><span className="font-bold">{data.ctrAnalysis}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-zinc-500">CPC Evaluation</span><span className="font-bold">{data.cpcAnalysis}</span></div>
                        <div className="flex justify-between text-sm pt-2 border-t border-zinc-100 dark:border-white/5"><span className="text-rose-500 font-bold uppercase text-[10px] tracking-widest">Main Bottleneck</span><span className="font-bold text-rose-500">{data.primaryBottleneck}</span></div>
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5" /> Creative Signals
                    </h3>
                    <div className="p-5 rounded-2xl bg-white dark:bg-white/2 border border-zinc-100 dark:border-white/10 space-y-3">
                        <div className="flex justify-between text-sm"><span className="text-zinc-500">Dominant Palette</span><span className="font-bold">{data.dominantColors}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-zinc-500">Primary Message</span><span className="font-bold">{data.primaryMessage}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-zinc-500">CTA Effectiveness</span><span className="font-bold">{data.ctaText}</span></div>
                    </div>
                </div>
            </div>

            <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6">Asset Component Scores</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
                    {ratings.map(r => (
                        <div key={r.key} className="p-4 rounded-2xl bg-white dark:bg-white/2 border border-zinc-100 dark:border-white/5 text-center flex flex-col items-center">
                            <span className={cn("text-2xl font-black font-mono", sc(data[r.key] || 0))}>{data[r.key] || 0}</span>
                            <span className="text-[9px] font-black uppercase tracking-tighter text-zinc-500 mt-1">{r.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-widest text-[#1a73e8] dark:text-blue-400 flex items-center gap-2">
                    <Brain className="h-3.5 w-3.5" /> Deep Intelligence Analysis
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {data.psychology_analysis && (
                        <div className="p-6 rounded-3xl bg-blue-500/5 border border-blue-500/10 transition-all hover:bg-blue-500/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-3">Psychology Analysis</h4>
                            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{data.psychology_analysis}</p>
                        </div>
                    )}
                    {data.behavioral_economics_analysis && (
                        <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 transition-all hover:bg-indigo-500/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-3">Behavioral Economics</h4>
                            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{data.behavioral_economics_analysis}</p>
                        </div>
                    )}
                    {data.neuromarketing_analysis && (
                        <div className="p-6 rounded-3xl bg-purple-500/5 border border-purple-500/10 transition-all hover:bg-purple-500/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-3">Neuromarketing Triggers</h4>
                            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{data.neuromarketing_analysis}</p>
                        </div>
                    )}
                    {data.google_algorithm_analysis && (
                        <div className="p-6 rounded-3xl bg-amber-500/5 border border-amber-500/10 transition-all hover:bg-amber-500/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-3">Google Algorithm Alignment</h4>
                            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{data.google_algorithm_analysis}</p>
                        </div>
                    )}
                    {data.competitive_differentiation && (
                        <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10 transition-all hover:bg-rose-500/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-3">Competitive Differentiation</h4>
                            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{data.competitive_differentiation}</p>
                        </div>
                    )}
                    {data.predicted_performance_impact && (
                        <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 transition-all hover:bg-emerald-500/10">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-3">Predicted Impact</h4>
                            <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{data.predicted_performance_impact}</p>
                        </div>
                    )}
                </div>
            </div>

            {(data.recommended_scaling_strategy || data.creative_evolution_path) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {data.recommended_scaling_strategy && (
                        <div className="p-6 rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                <Zap className="h-3 w-3" /> Recommended Scaling Strategy
                            </h4>
                            <p className="text-sm leading-relaxed text-white font-medium">{data.recommended_scaling_strategy}</p>
                        </div>
                    )}
                    {data.creative_evolution_path && (
                        <div className="p-6 rounded-3xl bg-zinc-900 border border-white/10 shadow-2xl">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                                <Activity className="h-3 w-3" /> Creative Evolution Path
                            </h4>
                            <p className="text-sm leading-relaxed text-white font-medium">{data.creative_evolution_path}</p>
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
                    <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-4 flex items-center gap-2">
                        <Check className="h-4 w-4" /> Why this works
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{whatWorks}</p>
                </div>
                <div className="p-6 rounded-3xl bg-rose-500/5 border border-rose-500/10">
                    <h3 className="text-sm font-black uppercase tracking-widest text-rose-500 mb-4 flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Critical flaws
                    </h3>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{whatDoesntWork}</p>
                </div>
            </div>

            <div className={cn("p-8 rounded-[2.5rem] border relative overflow-hidden group", accentBg)}>
                <Sparkles className={cn("h-32 w-32 absolute -right-8 -top-8 rotate-12", isAdroll ? "text-[#E0267D]/10" : "text-blue-500/10")} />
                <h3 className={cn("text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2 relative z-10", accentColor)}>
                    <Brain className="h-4 w-4" /> AI Key Insight
                </h3>
                <p className="text-lg md:text-xl font-bold italic text-zinc-900 dark:text-zinc-100 leading-relaxed relative z-10">"{keyInsight}"</p>
            </div>

            <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Optimization Roadmap</h3>
                <div className="grid gap-4">
                    {[1, 2, 3].map(i => {
                        const rec = data[`recommendation${i}`];
                        if (!rec) return null;
                        return (
                            <div key={i} className={cn("flex gap-4 p-6 rounded-2xl bg-white dark:bg-white/2 border border-zinc-100 dark:border-white/10 group transition-all", isAdroll ? "hover:border-[#E0267D]/30" : "hover:border-blue-500/30")}>
                                <div className={cn("flex-none h-8 w-8 rounded-full text-white flex items-center justify-center font-black text-xs", isAdroll ? "bg-[#E0267D]" : "bg-blue-500")}>#{i}</div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Effort: {data[`recommendation${i}Effort`]}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Impact: {data[`recommendation${i}Impact`]}</span>
                                    </div>
                                    <p className="text-zinc-900 dark:text-white font-bold leading-snug">{rec}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

