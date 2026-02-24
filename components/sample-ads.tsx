"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdData } from "@/lib/types"
import { Maximize2, ChevronDown, ChevronUp, LayoutGrid, List, Table as TableIcon, Grid2X2, Facebook, Play, Linkedin, Twitter, Smartphone, Disc as Pinterest, Globe, ShoppingBag, Copy, Check, MoreHorizontal, Target, Search, Newspaper } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SampleAdsProps {
  ads: AdData[]
  hasAdsInAccount?: boolean
  searchQuery: string
  selectedAdId: string | null
  onSelect: (id: string) => void
  onEnlargeImage?: (url: string, title: string) => void
}

const PlatformIcon = ({ platform, className }: { platform?: AdData['platform'], className?: string }) => {
  switch (platform) {
    case 'meta': return <Facebook className={cn("text-[#1877F2]", className)} />;
    case 'tiktok': return <Smartphone className={cn("text-foreground dark:text-white", className)} />;
    case 'google': return <Play className={cn("text-[#EA4335]", className)} />;
    case 'youtube': return <Play className={cn("text-[#FF0000]", className)} />;
    case 'linkedin': return <Linkedin className={cn("text-[#0A66C2]", className)} />;
    case 'x': return <Twitter className={cn("text-foreground dark:text-white", className)} />;
    case 'pinterest': return <Pinterest className={cn("text-[#BD081C]", className)} />;
    case 'shopify': return <ShoppingBag className={cn("text-[#95BF47]", className)} />;
    case 'tboola': return <Newspaper className={cn("text-[#285d9a]", className)} />;
    case 'bing': return <Search className={cn("text-[#00A4EF]", className)} />;
    case 'adroll': return <Target className={cn("text-[#E0267D]", className)} />;
    default: return <Globe className={cn("text-muted-foreground", className)} />;
  }
};

const AdGridCard = ({
  ad,
  isSelected,
  onSelect,
  onEnlargeImage,
  searchQuery
}: {
  ad: AdData,
  isSelected: boolean,
  onSelect: (id: string) => void,
  onEnlargeImage?: (url: string, title: string) => void,
  searchQuery: string
}) => {
  const [copied, setCopied] = useState(false)
  const isMatch = searchQuery.trim() !== "" && (
    ad.adId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ad.adName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format Ad Name
  const formatAdName = (name: string) => {
    const parts = name.split('_');
    if (parts.length <= 1) return name;

    let limitIndex = -1;
    for (let i = 0; i < parts.length - 1; i++) {
      const month = parts[i].toLowerCase();
      const day = parseInt(parts[i + 1]);
      if (["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].includes(month) && !isNaN(day)) {
        limitIndex = i + 2;
        break;
      }
    }

    if (limitIndex !== -1) {
      return parts.slice(0, limitIndex).join('_');
    }
    return parts.slice(0, 3).join('_');
  }

  const displayName = formatAdName(ad.adName);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(ad.adId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const hasHighlight = isSelected || isMatch;

  return (
    <div
      onClick={() => onSelect(ad.id)}
      className={cn(
        "group relative flex flex-col w-[300px] sm:w-auto snap-center rounded-2xl transition-all duration-300 cursor-default overflow-hidden p-3",
        "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
        "hover:shadow-2xl dark:hover:shadow-black/60 hover:border-zinc-300 dark:hover:border-zinc-700",
        "hover:-translate-y-1",
        hasHighlight && "ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-950 border-transparent"
      )}
    >
      {/* Framed Image Section */}
      <div
        className="aspect-[1.91/1] w-full relative overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-800 shadow-inner cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          if (onEnlargeImage) onEnlargeImage(ad.thumbnailUrl, ad.adName)
        }}
      >
        <img
          src={ad.thumbnailUrl || "/placeholder.svg"}
          alt={ad.adName}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
        />

        {/* Floating Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-start justify-between z-10">
          <div className="w-8 h-8 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-md flex items-center justify-center shadow-md border border-white/20">
            <PlatformIcon platform={ad.platform} className="w-4 h-4" />
          </div>

          <span
            className={cn(
              "text-[10px] px-2.5 py-1 rounded-full font-medium shadow-md backdrop-blur-md border border-white/20",
              ad.performanceLabel === "TOP_PERFORMER"
                ? "bg-emerald-500 text-white"
                : ad.performanceLabel === "AVERAGE"
                  ? "bg-amber-500 text-white"
                  : "bg-zinc-800 text-white"
            )}
          >
            {ad.performanceLabel === "TOP_PERFORMER" ? "Top performer" : (ad.performanceLabel ? ad.performanceLabel.charAt(0).toUpperCase() + ad.performanceLabel.slice(1).toLowerCase().replace(/_/g, " ") : "Active")}
          </span>
        </div>
      </div>

      {/* Content Body */}
      <div className="pt-4 px-1 pb-1 flex flex-col gap-4 flex-1">

        {/* Title & Read More - Single Line */}
        <div className="flex items-center gap-1.5 w-full">
          <h3
            className="font-medium text-[15px] leading-snug text-zinc-900 dark:text-zinc-100 hover:text-primary transition-colors truncate cursor-text"
          >
            <span className="select-text">
              {displayName}
            </span>
          </h3>

          <button
            className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              if (onEnlargeImage) onEnlargeImage(ad.thumbnailUrl, ad.adName)
            }}
          >
            ... Read more
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          {/* Spend */}
          <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-lg p-2 border border-zinc-100 dark:border-zinc-800/50 group-hover:border-zinc-200 dark:group-hover:border-zinc-700 transition-colors cursor-text select-text">
            <p className="text-[9px] font-medium text-muted-foreground mb-0.5">Spend</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
              ${Number(ad.spend || 0).toLocaleString()}
            </p>
          </div>

          {/* CTR */}
          <div className="bg-primary/5 dark:bg-primary/10 rounded-lg p-2 border border-primary/10 dark:border-primary/20 text-right group-hover:border-primary/20 transition-colors cursor-text select-text">
            <p className="text-[9px] font-medium text-muted-foreground mb-0.5">CTR</p>
            <p className="text-sm font-semibold text-primary tracking-tight tabular-nums">
              {Number(ad.ctr || 0).toFixed(2)}%
            </p>
          </div>
        </div>

        {/* ID Footer */}
        <div
          className="group/id flex items-center justify-between gap-2 pt-2.5 pb-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 w-[calc(100%+1.5rem)] -mx-3 px-3 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 active:bg-primary/10 transition-all duration-200 mt-2"
          onClick={handleCopyId}
        >
          <span className="text-[10px] font-mono text-muted-foreground/70 truncate transition-colors group-hover/id:text-primary font-medium">
            ID: {ad.adId}
          </span>
          <div className="shrink-0 text-muted-foreground/50 group-hover/id:text-primary transition-all duration-200 group-hover/id:scale-110">
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </div>
        </div>

      </div>
    </div>
  )
}

const AdListCard = ({
  ad,
  isSelected,
  onSelect,
  onEnlargeImage,
  searchQuery
}: {
  ad: AdData,
  isSelected: boolean,
  onSelect: (id: string) => void,
  onEnlargeImage?: (url: string, title: string) => void,
  searchQuery: string
}) => {
  const [copied, setCopied] = useState(false)
  const isMatch = searchQuery.trim() !== "" && (
    ad.adId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ad.adName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(ad.adId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Reuse same formatter logic
  const formatAdName = (name: string) => {
    const parts = name.split('_');
    if (parts.length <= 1) return name;

    let limitIndex = -1;
    for (let i = 0; i < parts.length - 1; i++) {
      const month = parts[i].toLowerCase();
      const day = parseInt(parts[i + 1]);
      if (["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].includes(month) && !isNaN(day)) {
        limitIndex = i + 2;
        break;
      }
    }

    if (limitIndex !== -1) {
      return parts.slice(0, limitIndex).join('_');
    }
    return parts.slice(0, 3).join('_');
  }

  const displayName = formatAdName(ad.adName);

  const hasHighlight = isSelected || isMatch;

  return (
    <div
      onClick={() => onSelect(ad.id)}
      className={cn(
        "group relative flex flex-col sm:flex-row h-auto sm:h-40 w-full rounded-2xl transition-all duration-300 cursor-default overflow-hidden",
        "bg-white dark:bg-zinc-900",
        "border border-zinc-200/60 dark:border-white/5",
        "hover:border-primary/50 hover:shadow-lg dark:hover:shadow-black/20",
        "hover:-translate-y-0.5",
        hasHighlight && "ring-2 ring-primary ring-offset-2 dark:ring-offset-zinc-950 border-transparent shadow-lg"
      )}
    >
      {/* Image Section - Stacked on Mobile, Left on Desktop */}
      <div
        className="w-full sm:w-48 aspect-[1.91/1] sm:aspect-auto relative overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 sm:m-3 rounded-t-2xl sm:rounded-xl cursor-pointer"
        onClick={(e) => {
          e.stopPropagation()
          if (onEnlargeImage) onEnlargeImage(ad.thumbnailUrl, ad.adName)
        }}
      >
        <img
          src={ad.thumbnailUrl || "/placeholder.svg"}
          alt={ad.adName}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg" }}
        />

        {/* Hover Action Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center z-10">
          <Maximize2 className="w-6 h-6 text-white drop-shadow-md" />
        </div>
      </div>

      {/* Content Section - Bottom on Mobile, Right on Desktop */}
      <div className="flex-1 p-4 flex flex-col justify-between min-w-0 bg-gradient-to-r from-transparent to-zinc-50/50 dark:to-zinc-900/50">

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-[10px] px-2.5 py-1 rounded-full font-medium border",
                  ad.performanceLabel === "TOP_PERFORMER"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20"
                    : ad.performanceLabel === "AVERAGE"
                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20"
                      : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                )}
              >
                {ad.performanceLabel === "TOP_PERFORMER" ? "Top performer" : (ad.performanceLabel ? ad.performanceLabel.charAt(0).toUpperCase() + ad.performanceLabel.slice(1).toLowerCase().replace(/_/g, " ") : "Active")}
              </span>

              <div
                className="group/id flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all duration-200 cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10 hover:shadow-sm border border-transparent hover:border-primary/10 active:scale-95"
                onClick={handleCopyId}
                title="Click to copy ID"
              >
                <span className="text-[10px] font-mono text-muted-foreground/70 font-medium group-hover/id:text-primary transition-colors">{ad.adId}</span>
                <div className="text-muted-foreground/50 group-hover/id:text-primary transition-all duration-200 group-hover/id:scale-110">
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </div>
              </div>
            </div>

            <PlatformIcon platform={ad.platform} className="w-4 h-4 opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all" />
          </div>

          <div className="flex items-center gap-1.5 w-full mt-1">
            <h3 className="font-medium text-sm sm:text-[15px] leading-snug text-zinc-900 dark:text-zinc-100 truncate hover:text-primary transition-colors min-w-0 cursor-text select-text">
              {displayName}
            </h3>
            <button
              className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation()
                if (onEnlargeImage) onEnlargeImage(ad.thumbnailUrl, ad.adName)
              }}
            >
              ... Read more
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6 sm:gap-8 pt-3 border-t border-zinc-100 dark:border-white/5 mt-auto">
          <div>
            <p className="text-[10px] text-muted-foreground font-medium mb-0.5 cursor-text">Spend</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 cursor-text">
              ${Number(ad.spend || 0).toLocaleString()}
            </p>
          </div>

          <div>
            <p className="text-[10px] text-muted-foreground font-medium mb-0.5 cursor-text">CTR</p>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-primary leading-none tabular-nums cursor-text">
                {Number(ad.ctr || 0).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

const AdTableRow = ({
  ad,
  isSelected,
  onSelect,
  onEnlargeImage
}: {
  ad: AdData,
  isSelected: boolean,
  onSelect: (id: string) => void,
  onEnlargeImage?: (url: string, title: string) => void
}) => {
  const [copied, setCopied] = useState(false)

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(ad.adId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <TableRow
      onClick={() => onSelect(ad.id)}
      className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/[0.03] dark:bg-primary/[0.05]" : "hover:bg-secondary dark:hover:bg-zinc-800/50"}`}
    >
      <TableCell>
        <div
          className="w-12 h-12 rounded bg-secondary dark:bg-zinc-800 overflow-hidden cursor-zoom-in border border-border"
          onClick={(e) => {
            e.stopPropagation();
            if (onEnlargeImage) onEnlargeImage(ad.thumbnailUrl, ad.adName);
          }}
        >
          <img src={ad.thumbnailUrl || "/placeholder.svg"} className="w-full h-full object-cover" onError={(e) => {
            (e.target as HTMLImageElement).src = "/placeholder.svg"
          }} />
        </div>
      </TableCell>
      <TableCell className="max-w-[200px] sm:max-w-[400px]">
        <div className="space-y-1">
          <p className="font-bold text-xs truncate dark:text-white cursor-text">{ad.adName}....</p>

          <div
            className="group/id flex items-center gap-1.5 w-fit hover:bg-zinc-100 dark:hover:bg-white/5 pr-2 rounded-md transition-colors cursor-copy -ml-1 pl-1 py-0.5"
            onClick={handleCopyId}
            title="Click to copy ID"
          >
            <span className="text-[10px] font-mono opacity-50">{ad.adId}</span>
            <div className="opacity-0 group-hover/id:opacity-100 transition-opacity">
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-zinc-400" />}
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter whitespace-nowrap shadow-sm ${ad.performanceLabel === "TOP_PERFORMER"
            ? "bg-green-100 text-green-700 border border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900/50"
            : ad.performanceLabel === "AVERAGE"
              ? "bg-yellow-100 text-yellow-700 border border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-900/50"
              : "bg-red-100 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900/50"
            }`}
        >
          {ad.performanceLabel || "Active"}
        </span>
      </TableCell>
      <TableCell className="text-right font-bold text-xs cursor-text">${Number(ad.spend || 0).toLocaleString()}</TableCell>
      <TableCell className="text-right font-black text-primary text-sm cursor-text">{Number(ad.ctr || 0).toFixed(2)}%</TableCell>
    </TableRow>
  );
}

export default function SampleAds({
  ads = [],
  hasAdsInAccount = true,
  searchQuery,
  selectedAdId,
  onSelect,
  onEnlargeImage
}: SampleAdsProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table">("grid")
  const adList = Array.isArray(ads) ? ads : []

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-foreground dark:text-zinc-50">Your Ads</h3>
          <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <SelectTrigger className="w-[150px] h-11 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-border/40 rounded-2xl text-xs font-medium transition-all hover:bg-white hover:shadow-md group">
              <SelectValue placeholder="Display" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl">
              <SelectItem value="grid" className="font-bold cursor-pointer rounded-lg">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-3.5 w-3.5 text-primary" />
                  <span>Grid View</span>
                </div>
              </SelectItem>
              <SelectItem value="list" className="font-bold cursor-pointer rounded-lg">
                <div className="flex items-center gap-2">
                  <List className="h-3.5 w-3.5 text-emerald-500" />
                  <span>List View</span>
                </div>
              </SelectItem>
              <SelectItem value="table" className="font-bold cursor-pointer rounded-lg">
                <div className="flex items-center gap-2">
                  <TableIcon className="h-3.5 w-3.5 text-amber-500" />
                  <span>Table View</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!searchQuery.trim() && hasAdsInAccount && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 dark:bg-primary/5 border border-primary/10 dark:border-primary/20 text-primary animate-in fade-in slide-in-from-right-4 duration-500">
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Search an ad ID first to see results or metrics</span>
          </div>
        )}
      </div>

      {adList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-card/50 text-muted-foreground animate-in fade-in duration-500">
          <div className="max-w-xs text-center space-y-2">
            <p className="text-sm font-bold text-foreground/80">
              {!hasAdsInAccount ? "No Ad Data Available" : "No Results Found"}
            </p>
            <p className="text-xs opacity-70 leading-relaxed">
              {!hasAdsInAccount
                ? "This account doesn't have any ads indexed in the dashboard yet."
                : `We couldn't find any ads matching your search "${searchQuery}". Please check the ID and try again.`}
            </p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === "grid" && (
            <div className="grid grid-flow-col sm:grid-flow-row overflow-x-auto sm:overflow-visible sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4 sm:p-0 sm:pb-0 scrollbar-none snap-x snap-mandatory items-stretch">
              {adList.map((ad) => (
                <AdGridCard
                  key={ad.id}
                  ad={ad}
                  isSelected={selectedAdId === ad.id}
                  onSelect={onSelect}
                  onEnlargeImage={onEnlargeImage}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}

          {viewMode === "list" && (
            <div className="space-y-3">
              {adList.map((ad) => (
                <AdListCard
                  key={ad.id}
                  ad={ad}
                  isSelected={selectedAdId === ad.id}
                  onSelect={onSelect}
                  onEnlargeImage={onEnlargeImage}
                  searchQuery={searchQuery}
                />
              ))}
            </div>
          )}

          {viewMode === "table" && (
            <div className="rounded-xl border border-border overflow-hidden bg-white dark:bg-zinc-900">
              <Table>
                <TableHeader className="bg-zinc-50 dark:bg-zinc-800/50">
                  <TableRow>
                    <TableHead className="w-[80px] font-bold text-[10px] uppercase">Preview</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">Ad Name</TableHead>
                    <TableHead className="font-bold text-[10px] uppercase">Status</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase">Spend</TableHead>
                    <TableHead className="text-right font-bold text-[10px] uppercase">CTR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adList.map((ad) => (
                    <AdTableRow
                      key={ad.id}
                      ad={ad}
                      isSelected={selectedAdId === ad.id}
                      onSelect={onSelect}
                      onEnlargeImage={onEnlargeImage}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}


        </>
      )}
    </div>
  )
}
