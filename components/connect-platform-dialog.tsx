"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Facebook, Play, Linkedin, Twitter, Smartphone, Disc as Pinterest, ShoppingBag, Loader2, Sparkles, Plus, Instagram, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface ConnectPlatformDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    connectedPlatforms: string[]
    enabledPlatforms?: string[] // Optional for backward compatibility
    onConnect?: (platformId: any) => void
    onDisconnect?: (platformId: any) => void
}

const platforms = [
    { id: 'meta', label: 'Meta', icon: Facebook, color: 'text-[#0668E1]', activeBg: 'bg-blue-50 dark:bg-blue-900/20', description: 'Facebook Ads Manager' },
    { id: 'tiktok', label: 'TikTok', icon: Smartphone, color: 'text-[#000000] dark:text-zinc-100', activeBg: 'bg-zinc-100 dark:bg-zinc-800', description: 'TikTok Ads Manager' },
    { id: 'google', label: 'Google Ads', icon: Play, color: 'text-[#4285F4]', activeBg: 'bg-blue-50 dark:bg-blue-900/20', description: 'Search, Display, Performance Max' },
    { id: 'youtube', label: 'YouTube', icon: Play, color: 'text-[#FF0000]', activeBg: 'bg-red-50 dark:bg-red-900/20', description: 'YouTube Video Ads' },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'text-[#0A66C2]', activeBg: 'bg-blue-50 dark:bg-blue-900/20', description: 'LinkedIn Campaign Manager' },
    { id: 'shopify', label: 'Shopify', icon: ShoppingBag, color: 'text-[#95BF47]', activeBg: 'bg-lime-50 dark:bg-lime-900/20', description: 'Shopify Store Products' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-500', activeBg: 'bg-pink-50 dark:bg-pink-900/20', description: 'Instagram Business Ads' },
    { id: 'pinterest', label: 'Pinterest', icon: Pinterest, color: 'text-[#E60023]', activeBg: 'bg-red-50 dark:bg-red-900/20', description: 'Pinterest Business' },
    { id: 'x', label: 'X (Twitter)', icon: Twitter, color: 'text-[#000000] dark:text-zinc-100', activeBg: 'bg-zinc-100 dark:bg-zinc-800', description: 'X Ads Center' },
    { id: 'telegram', label: 'Telegram', icon: Send, color: 'text-sky-500', activeBg: 'bg-sky-50 dark:bg-sky-900/20', description: 'Telegram Channel Ads' }
] as const

export function ConnectPlatformDialog({ open, onOpenChange, connectedPlatforms, enabledPlatforms, onConnect, onDisconnect }: ConnectPlatformDialogProps) {
    const { toast } = useToast()
    const [connectingId, setConnectingId] = useState<string | null>(null)

    // Filter platforms based on settings
    const filteredPlatforms = platforms.filter(p => !enabledPlatforms || enabledPlatforms.includes(p.id))

    const handleAction = (platformId: string, label: string, isConnected: boolean) => {
        setConnectingId(platformId)

        if (isConnected) {
            // Simulate Disconnect
            setTimeout(() => {
                setConnectingId(null)
                onDisconnect?.(platformId)
                toast({
                    title: "Platform Disconnected",
                    description: `Successfully removed ${label} integration.`,
                    variant: "default"
                })
            }, 1000)
            return
        }

        // Simulate OAuth flow redirect
        setTimeout(() => {
            toast({
                title: `Connecting to ${label}`,
                description: `Redirecting to ${label} secure login...`,
            })

            // In a real app, this would be: window.location.href = `/api/auth/${platformId}`
            setTimeout(() => {
                setConnectingId(null)
                onOpenChange(false)
                onConnect?.(platformId)
                toast({
                    title: "Platform Integrated",
                    description: `Successfully authenticated with ${label}.`,
                    variant: "success"
                })
            }, 2000)
        }, 1000)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden rounded-[28px] border-zinc-200 dark:border-white/10 shadow-3xl bg-white dark:bg-zinc-900">
                <div className="p-8 pb-4">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center">
                            <Plus className="w-5 h-5 text-[#007AFF]" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black tracking-tightest">Connect New Platform</DialogTitle>
                            <DialogDescription className="text-zinc-500 font-medium text-xs">
                                Choose a data source to integrate into your analyzer.
                            </DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="px-6 pb-6 max-h-[60vh] md:max-h-[500px] overflow-y-auto custom-scrollbar">
                    <div className="grid gap-3">
                        {filteredPlatforms.map((platform) => {
                            const isConnected = connectedPlatforms.includes(platform.id as any)
                            const isMeta = platform.id === 'meta'

                            return (
                                <div
                                    key={platform.id}
                                    onClick={() => !isMeta && handleAction(platform.id, platform.label, isConnected)}
                                    className={cn(
                                        "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 text-left group",
                                        isMeta ? "bg-zinc-50 dark:bg-zinc-800/20 border-zinc-100 dark:border-zinc-700/30 cursor-default" : "bg-zinc-50 dark:bg-zinc-800/40 border-zinc-100 dark:border-zinc-700/50 hover:border-[#007AFF]/30 hover:bg-white dark:hover:bg-zinc-800 hover:shadow-lg cursor-pointer",
                                        connectingId === platform.id && "bg-blue-50 dark:bg-blue-900/20 border-blue-200",
                                        isConnected && !isMeta && "border-green-100 dark:border-green-900/30"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-300",
                                        "bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 shadow-sm group-hover:shadow-md",
                                        platform.color
                                    )}>
                                        <platform.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">{platform.label}</h4>
                                            {(isConnected || isMeta) && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
                                        </div>
                                        <p className="text-[10px] text-zinc-500 font-medium line-clamp-1">{platform.description}</p>
                                    </div>

                                    {isMeta ? (
                                        <div className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-700/50 text-zinc-400">
                                            Core Platform
                                        </div>
                                    ) : connectingId === platform.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin text-[#007AFF]" />
                                    ) : (
                                        <div className={cn(
                                            "transition-opacity text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-sm cursor-pointer active:scale-95",
                                            "opacity-100 md:opacity-0 md:group-hover:opacity-100", // Always visible on mobile, hover on desktop
                                            isConnected
                                                ? "bg-red-50 text-red-500 border border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                                                : "bg-[#007AFF] text-white shadow-blue-500/20"
                                        )}>
                                            {isConnected ? "Disconnect" : "Connect"}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-[#007AFF] animate-pulse" />
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Enterprise Sync v2</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900"
                    >
                        Maybe Later
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
