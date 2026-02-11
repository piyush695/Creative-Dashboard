"use client"

import { cn } from "@/lib/utils"
import { Facebook, Play, Linkedin, Twitter, Smartphone, Disc as Pinterest, Globe, Plus, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"

import { PlatformType } from "@/lib/types"

interface PlatformFilterProps {
    selected: PlatformType
    onSelect: (platform: PlatformType) => void
    onAddAd?: () => void
}

const platforms = [
    { id: 'all', label: 'All Platforms', icon: Globe, color: 'text-zinc-500', activeBg: 'bg-zinc-100 dark:bg-zinc-800' },
    { id: 'meta', label: 'Meta', icon: Facebook, color: 'text-[#0668E1]', activeBg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'tiktok', label: 'TikTok', icon: Smartphone, color: 'text-[#000000] dark:text-zinc-100', activeBg: 'bg-zinc-100 dark:bg-zinc-800' },
    { id: 'google', label: 'Google Ads', icon: Play, color: 'text-[#4285F4]', activeBg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'youtube', label: 'YouTube', icon: Play, color: 'text-[#FF0000]', activeBg: 'bg-red-50 dark:bg-red-900/20' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-[#0A66C2]', activeBg: 'bg-blue-50 dark:bg-blue-900/20' },
    { id: 'x', label: 'X (Twitter)', icon: Twitter, color: 'text-[#000000] dark:text-zinc-100', activeBg: 'bg-zinc-100 dark:bg-zinc-800' },
    { id: 'pinterest', label: 'Pinterest', icon: Pinterest, color: 'text-[#E60023]', activeBg: 'bg-red-50 dark:bg-red-900/20' },
    { id: 'shopify', label: 'Shopify', icon: ShoppingBag, color: 'text-[#95BF47]', activeBg: 'bg-lime-50 dark:bg-lime-900/20' },
] as const

export default function PlatformFilter({ selected, onSelect, onAddAd }: PlatformFilterProps) {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
            <div className="flex items-center gap-1.5 p-1 bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-white/5 rounded-[14px] overflow-x-auto no-scrollbar max-w-full">
                {platforms.map((platform) => {
                    const isActive = selected === platform.id
                    return (
                        <button
                            key={platform.id}
                            onClick={() => onSelect(platform.id as PlatformType)}
                            className={cn(
                                "flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[11px] font-black uppercase tracking-wider transition-all duration-300 whitespace-nowrap group",
                                isActive
                                    ? cn("shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-white/20 dark:border-white/5", platform.activeBg, "text-zinc-900 dark:text-white scale-[0.98]")
                                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            )}
                        >
                            <platform.icon className={cn(
                                "w-3.5 h-3.5 transition-transform duration-300",
                                isActive ? platform.color + " scale-110" : "text-zinc-400 group-hover:scale-110"
                            )} />
                            <span>{platform.label}</span>
                        </button>
                    )
                })}
            </div>

            {onAddAd && (
                <Button
                    onClick={onAddAd}
                    className="h-10 px-5 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-black text-[11px] uppercase tracking-[0.1em] rounded-[14px] shadow-[0_8px_20px_rgba(0,122,255,0.25)] flex items-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 shrink-0"
                >
                    <Plus className="w-4 h-4" />
                    Add Creative
                </Button>
            )}
        </div>
    )
}
