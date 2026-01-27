"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AdData } from "@/lib/types"
import { Maximize2, X } from "lucide-react"

interface SampleAdsProps {
  ads: AdData[]
  searchQuery: string
  selectedAdId: string | null
  onSelect: (id: string) => void
}

export default function SampleAds({ ads = [], searchQuery, selectedAdId, onSelect }: SampleAdsProps) {
  const adList = Array.isArray(ads) ? ads : []
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; title: string } | null>(null)

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground dark:text-zinc-50 mb-4">Your Ads</h3>
      {adList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg bg-card/50 text-muted-foreground">
          <p className="text-xs text-center opacity-80">No ads found matching your search.</p>
        </div>
      ) : (
        <div className="flex overflow-x-auto sm:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 pb-4 sm:pb-0 scrollbar-none snap-x snap-mandatory">
          {adList.map((ad) => (
            <Card
              key={ad.id}
              onClick={() => onSelect(ad.id)}
              className={`transition-all cursor-pointer border-2 overflow-hidden flex flex-col flex-shrink-0 w-[260px] sm:w-auto snap-center bg-white dark:bg-zinc-900 ${selectedAdId === ad.id
                ? "border-[#8B4513] dark:border-primary bg-[#8B4513]/[0.03] dark:bg-primary/[0.03] ring-1 ring-[#8B4513]/10 dark:ring-primary/10 shadow-md"
                : "border-transparent hover:border-[#8B4513]/30 dark:hover:border-primary/30 shadow-sm hover:shadow-md dark:hover:shadow-2xl"
                }`}
            >
              <CardHeader className="p-3.5 pb-2.5 space-y-2.5">
                {/* Row 1: Badge Only (Zero Overlap) */}
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

                {/* Row 2: Title & ID */}
                <div className="space-y-1.5">
                  <CardTitle className="text-[12px] font-extrabold leading-[1.3] text-foreground/90 dark:text-zinc-100 break-all">
                    {ad.adName}
                  </CardTitle>
                  <CardDescription className="text-[9px] font-mono leading-none opacity-50 dark:opacity-70 break-all">
                    ID: {ad.adId}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 flex-1 flex flex-col">
                <div
                  className="aspect-[3/2] w-full overflow-hidden rounded-md bg-zinc-900 shadow-xl relative group mb-3 cursor-zoom-in"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEnlargedImage({ url: ad.thumbnailUrl, title: ad.adName });
                  }}
                >
                  <img
                    src={ad.thumbnailUrl || "/placeholder.svg"}
                    alt={ad.adName}
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-75"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
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
                    <p className="text-[11px] font-bold truncate dark:text-zinc-100">${Number(ad.spend).toLocaleString()}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-muted-foreground dark:text-zinc-500 uppercase font-bold tracking-tighter leading-none mb-1">ROAS</p>
                    <p className="text-base font-black text-primary dark:text-primary leading-none">{ad.roas}x</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Standard HD Popup - Professional & Clean */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4"
          onClick={() => setEnlargedImage(null)}
        >
          {/* Main Popup Container - Standard Fixed Size */}
          <div
            className="relative w-full max-w-6xl h-[85vh] bg-zinc-900 rounded-xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10 animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setEnlargedImage(null)}
              className="absolute top-4 right-4 z-[120] h-8 w-8 flex items-center justify-center bg-black/50 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors border border-white/10"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Image Area - Fills remaining space automatically */}
            <div className="flex-1 w-full relative min-h-0 bg-zinc-950/30 flex items-center justify-center p-2 sm:p-6">
              <img
                src={enlargedImage.url}
                alt={enlargedImage.title}
                className="w-full h-full object-contain drop-shadow-2xl"
                loading="eager"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg"
                }}
              />


            </div>

            {/* Footer - Fixed Height */}
            <div className="h-16 flex-shrink-0 bg-zinc-900 border-t border-white/5 px-4 sm:px-6 flex items-center justify-between gap-4">
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Creative Preview</span>
                <h4 className="text-sm font-semibold text-white truncate max-w-[200px] sm:max-w-md">{enlargedImage.title}</h4>
              </div>

              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = enlargedImage.url;
                  link.download = `creative-${Date.now()}.jpg`;
                  link.click();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-200 text-zinc-900 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
