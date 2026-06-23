"use client"

import { cn } from "@/lib/utils"
import { Facebook, Play, Linkedin, Twitter, Smartphone, Disc as Pinterest, Globe, Plus, ShoppingBag, Target, Search, Newspaper } from "lucide-react"
import { Button } from "@/components/ui/button"

import { PlatformType } from "@/lib/types"
import { usePlatforms } from "@/components/providers/platforms-provider"

interface PlatformFilterProps {
    selected: PlatformType
    onSelect: (platform: PlatformType) => void
    onAddAd?: () => void
}

const platforms = [
    { id: 'all', label: 'All Platforms', icon: Globe, color: 'text-muted-foreground', activeBg: 'bg-muted' },
    { id: 'meta', label: 'Meta', icon: Facebook, color: 'text-[#0668E1]', activeBg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'tiktok', label: 'TikTok', icon: Smartphone, color: 'text-[#000000] dark:text-zinc-100', activeBg: 'bg-muted' },
    { id: 'google', label: 'Google Ads', icon: Play, color: 'text-[#4285F4]', activeBg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'youtube', label: 'YouTube', icon: Play, color: 'text-[#FF0000]', activeBg: 'bg-red-50 dark:bg-red-900/20' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-[#0A66C2]', activeBg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'x', label: 'X (Twitter)', icon: Twitter, color: 'text-[#000000] dark:text-zinc-100', activeBg: 'bg-muted' },
    { id: 'pinterest', label: 'Pinterest', icon: Pinterest, color: 'text-[#E60023]', activeBg: 'bg-red-50 dark:bg-red-900/20' },
    { id: 'shopify', label: 'Shopify', icon: ShoppingBag, color: 'text-[#95BF47]', activeBg: 'bg-lime-50 dark:bg-lime-900/20' },
    { id: 'taboola', label: 'Taboola', icon: Newspaper, color: 'text-[#285d9a]', activeBg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'bing', label: 'Bing', icon: Search, color: 'text-[#00A4EF]', activeBg: 'bg-teal-50 dark:bg-teal-900/20' },
    { id: 'adroll', label: 'AdRoll', icon: Target, color: 'text-[#E0267D]', activeBg: 'bg-pink-50 dark:bg-pink-900/20' },
] as const

export default function PlatformFilter({ selected, onSelect, onAddAd }: PlatformFilterProps) {
    const { enabledIds } = usePlatforms()
    // Only show "All" plus platforms an admin has enabled globally. Disabled
    // platforms must not be selectable here.
    const visiblePlatforms = platforms.filter((p) => p.id === "all" || enabledIds.includes(p.id))

    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-1.5 p-1 bg-muted/50 border border-border rounded-xl overflow-x-auto no-scrollbar max-w-full">
                {visiblePlatforms.map((platform) => {
                    const isActive = selected === platform.id
                    return (
                        <button
                            key={platform.id}
                            onClick={() => onSelect(platform.id as PlatformType)}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap group cursor-pointer",
                                isActive
                                    ? "bg-gradient-primary text-white shadow-md"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                            )}
                        >
                            <platform.icon className={cn(
                                "w-4 h-4 transition-transform duration-200",
                                isActive ? "text-white scale-110" : cn(platform.color, "group-hover:scale-110")
                            )} />
                            <span>{platform.label}</span>
                        </button>
                    )
                })}
            </div>

            {onAddAd && (
                <Button
                    onClick={onAddAd}
                    className="btn-gradient h-10 px-5 text-white font-black text-[11px] uppercase tracking-[0.1em] rounded-lg flex items-center gap-2 shrink-0 cursor-pointer"
                >
                    <Plus className="w-4 h-4" />
                    Add Creative
                </Button>
            )}
        </div>
    )
}
