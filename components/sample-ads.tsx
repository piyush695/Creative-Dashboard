"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdData } from "@/lib/types"
import { Maximize2, ChevronDown, ChevronUp, LayoutGrid, List, Table as TableIcon, Grid2X2 } from "lucide-react"
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

export default function SampleAds({
  ads = [],
  hasAdsInAccount = true,
  searchQuery,
  selectedAdId,
  onSelect,
  onEnlargeImage
}: SampleAdsProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list" | "table" | "compact">("grid")
  const adList = Array.isArray(ads) ? ads : []

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-foreground dark:text-zinc-50 font-black">Your Ads</h3>
          <Select value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
            <SelectTrigger className="w-[140px] h-9 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-bold transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
              <SelectValue placeholder="View Mode" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl">
              <SelectItem value="grid" className="font-bold cursor-pointer rounded-lg">
                <div className="flex items-center gap-2">
                  <LayoutGrid className="h-3.5 w-3.5 text-[#007AFF]" />
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
              <SelectItem value="compact" className="font-bold cursor-pointer rounded-lg">
                <div className="flex items-center gap-2">
                  <Grid2X2 className="h-3.5 w-3.5 text-purple-500" />
                  <span>Compact View</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!searchQuery.trim() && hasAdsInAccount && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#8B4513]/5 dark:bg-primary/5 border border-[#8B4513]/10 dark:border-primary/20 text-[#8B4513] dark:text-primary animate-in fade-in slide-in-from-right-4 duration-500">
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Search an Ad ID first to see results or metrics</span>
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
            <div className="flex overflow-x-auto sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-4 sm:pb-0 scrollbar-none snap-x snap-mandatory items-start">
              {adList.map((ad) => {
                const isMatch = searchQuery.trim() !== "" && (
                  ad.adId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ad.adName.toLowerCase().includes(searchQuery.toLowerCase())
                );
                const isSelected = selectedAdId === ad.id;
                const hasHighlight = isSelected || isMatch;

                return (
                  <Card
                    key={ad.id}
                    onClick={() => onSelect(ad.id)}
                    className={`transition-all cursor-pointer border-2 overflow-hidden flex flex-col flex-shrink-0 w-[260px] sm:w-auto snap-center bg-white dark:bg-zinc-900 py-0 gap-0 px-0 ${hasHighlight
                      ? "border-[#8B4513] dark:border-primary shadow-md"
                      : "border-transparent hover:border-[#8B4513]/30 dark:hover:border-primary/30 shadow-sm hover:shadow-md dark:hover:shadow-2xl"
                      } ${isSelected ? "bg-[#8B4513]/[0.03] dark:bg-primary/[0.03] ring-1 ring-[#8B4513]/10 dark:ring-primary/10" : ""}`}
                  >
                    <CardHeader className="px-3 pt-2 pb-1 space-y-1.5">
                      <div className="flex">
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
                      </div>
                      <div className="space-y-1 w-full relative">
                        <div className="group/title w-full">
                          <CardTitle className="text-[12px] font-extrabold leading-[1.3] text-foreground/90 dark:text-zinc-100 line-clamp-2 break-all">
                            {ad.adName}
                          </CardTitle>
                        </div>
                        {ad.adName.length > 50 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (onEnlargeImage) onEnlargeImage(ad.thumbnailUrl, ad.adName);
                            }}
                            className="mt-0.5 text-[10px] font-black text-[#8B4513] dark:text-primary hover:text-[#007AFF] flex items-center gap-0.5 transition-all"
                          >
                            Read More <ChevronDown className="h-3 w-3" />
                          </button>
                        )}
                        <CardDescription className="text-[9px] font-mono leading-none opacity-50 dark:opacity-70 break-all pt-0.5">
                          ID: {ad.adId}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="px-3 pb-2 pt-0 flex-1 flex flex-col relative">
                      <div
                        className="aspect-[3/2] w-full overflow-hidden rounded-md bg-zinc-900 shadow-xl relative group mb-2 cursor-zoom-in"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onEnlargeImage) onEnlargeImage(ad.thumbnailUrl, ad.adName);
                        }}
                      >
                        <img
                          src={ad.thumbnailUrl || "/placeholder.svg"}
                          alt={ad.adName}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-75"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.svg"
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <div className="bg-white/20 dark:bg-black/40 backdrop-blur-md p-2 rounded-full border border-white/30 dark:border-white/10 text-white transform translate-y-4 group-hover:translate-y-0 duration-500">
                            <Maximize2 className="h-4 w-4" />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-end mt-auto gap-2 border-t border-border/50 pt-2.5">
                        <div className="min-w-0">
                          <p className="text-[9px] text-muted-foreground dark:text-zinc-500 uppercase font-bold tracking-tighter leading-none mb-1">Spend</p>
                          <p className="text-[11px] font-bold truncate dark:text-zinc-100">${Number(ad.spend || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[9px] text-muted-foreground dark:text-zinc-500 uppercase font-bold tracking-tighter leading-none mb-1">CTR</p>
                          <p className="text-base font-black text-[#007AFF] leading-none">{Number(ad.ctr || 0).toFixed(2)}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {viewMode === "list" && (
            <div className="space-y-3">
              {adList.map((ad) => {
                const isMatch = searchQuery.trim() !== "" && (
                  ad.adId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ad.adName.toLowerCase().includes(searchQuery.toLowerCase())
                );
                const isSelected = selectedAdId === ad.id;
                const hasHighlight = isSelected || isMatch;

                return (
                  <Card
                    key={ad.id}
                    onClick={() => onSelect(ad.id)}
                    className={`transition-all cursor-pointer border-2 overflow-hidden flex flex-row h-32 sm:h-40 bg-white dark:bg-zinc-900 gap-0 px-0 ${hasHighlight
                      ? "border-[#8B4513] dark:border-primary shadow-md"
                      : "border-transparent hover:border-[#8B4513]/30 dark:hover:border-primary/30 shadow-sm hover:shadow-md"
                      } ${isSelected ? "bg-[#8B4513]/[0.03] dark:bg-primary/[0.03]" : ""}`}
                  >
                    <div
                      className="h-full aspect-square sm:aspect-[4/3] overflow-hidden bg-zinc-900 relative group cursor-zoom-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEnlargeImage) onEnlargeImage(ad.thumbnailUrl, ad.adName);
                      }}
                    >
                      <img
                        src={ad.thumbnailUrl || "/placeholder.svg"}
                        alt={ad.adName}
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg"
                        }}
                      />
                    </div>
                    <div className="flex-1 p-3 sm:p-4 flex flex-col justify-between min-w-0">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
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
                          <span className="text-[9px] font-mono opacity-50 dark:opacity-70 break-all pt-0.5 mt-0.5">
                            ID: {ad.adId}
                          </span>
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-foreground/90 dark:text-zinc-100 line-clamp-2">
                          {ad.adName}
                        </h4>
                      </div>
                      <div className="flex items-center gap-6 pt-2 border-t border-border/50">
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter mb-0.5">Spend</p>
                          <p className="text-sm font-bold dark:text-zinc-100">${Number(ad.spend || 0).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter mb-0.5">CTR</p>
                          <p className="text-lg font-black text-[#007AFF]">{Number(ad.ctr || 0).toFixed(2)}%</p>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
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
                  {adList.map((ad) => {
                    const isSelected = selectedAdId === ad.id;
                    return (
                      <TableRow
                        key={ad.id}
                        onClick={() => onSelect(ad.id)}
                        className={`cursor-pointer transition-colors ${isSelected ? "bg-primary/[0.03] dark:bg-primary/[0.05]" : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`}
                      >
                        <TableCell>
                          <div
                            className="w-12 h-12 rounded bg-zinc-100 dark:bg-zinc-800 overflow-hidden cursor-zoom-in border border-border"
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
                            <p className="font-bold text-xs truncate">{ad.adName}</p>
                            <p className="text-[10px] font-mono opacity-50 truncate">{ad.adId}</p>
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
                        <TableCell className="text-right font-bold text-xs">${Number(ad.spend || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right font-black text-[#007AFF] text-sm">{Number(ad.ctr || 0).toFixed(2)}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {viewMode === "compact" && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3">
              {adList.map((ad) => {
                const isMatch = searchQuery.trim() !== "" && (
                  ad.adId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  ad.adName.toLowerCase().includes(searchQuery.toLowerCase())
                );
                const isSelected = selectedAdId === ad.id;
                const hasHighlight = isSelected || isMatch;

                return (
                  <Card
                    key={ad.id}
                    onClick={() => onSelect(ad.id)}
                    className={`transition-all cursor-pointer border overflow-hidden flex flex-col bg-white dark:bg-zinc-900 group ${hasHighlight
                      ? "ring-2 ring-[#8B4513] dark:ring-primary shadow-lg scale-[1.02] z-10"
                      : "border-zinc-200 dark:border-zinc-800 hover:border-[#8B4513]/50 dark:hover:border-primary/50"
                      } ${isSelected ? "bg-primary/[0.02]" : ""}`}
                  >
                    <div
                      className="aspect-square w-full overflow-hidden bg-zinc-900 relative cursor-zoom-in"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onEnlargeImage) onEnlargeImage(ad.thumbnailUrl, ad.adName);
                      }}
                    >
                      <img
                        src={ad.thumbnailUrl || "/placeholder.svg"}
                        alt={ad.adName}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg"
                        }}
                      />
                      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-black/40 backdrop-blur-md p-1 rounded-full text-white">
                          <Maximize2 className="h-2.5 w-2.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-[10px] font-black text-white leading-none truncate">{ad.adName}</p>
                      </div>
                    </div>
                    <div className="p-1.5 flex flex-col gap-1 justify-between">
                      <div className="flex justify-between items-center gap-1">
                        <span className="text-[8px] font-bold text-zinc-500 truncate min-w-0">ID: {ad.adId.substring(0, 8)}...</span>
                        <span className="text-[10px] font-black text-[#007AFF]">{Number(ad.ctr || 0).toFixed(2)}%</span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
