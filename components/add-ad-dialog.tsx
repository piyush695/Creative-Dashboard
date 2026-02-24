"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AdData, PlatformType } from "@/lib/types"
import { saveAdToMongo } from "@/actions/ads"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Plus, Sparkles, Image as ImageIcon, BarChart3, Globe, ShoppingBag, Facebook, Smartphone, Play, Linkedin, Twitter, Instagram, Send, Disc as Pinterest } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddAdDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    defaultPlatform?: PlatformType
    onSuccess?: () => void
}

export function AddAdDialog({ open, onOpenChange, defaultPlatform, onSuccess }: AddAdDialogProps) {
    const { toast } = useToast()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState<Partial<AdData>>({
        adName: "",
        adId: "",
        platform: defaultPlatform === 'all' ? 'meta' : (defaultPlatform || 'meta'),
        thumbnailUrl: "",
        spend: 0,
        ctr: 0,
        roas: 0,
        performanceLabel: "NEW"
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.adName || !formData.adId) {
            toast({
                title: "Missing Fields",
                description: "Please fill in the Ad Name and Ad ID.",
                variant: "destructive"
            })
            return
        }

        setIsSubmitting(true)
        try {
            const result = await saveAdToMongo(formData)
            if (result.success) {
                toast({
                    title: "Ad Saved Successfully",
                    description: "Your creative has been added to the library.",
                    variant: "success"
                })
                onSuccess?.()
                onOpenChange(false)
                setFormData({
                    adName: "",
                    adId: "",
                    platform: defaultPlatform === 'all' ? 'meta' : (defaultPlatform || 'meta'),
                    thumbnailUrl: "",
                    spend: 0,
                    ctr: 0,
                    roas: 0,
                    performanceLabel: "NEW"
                })
            } else {
                throw new Error(result.error)
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to save the ad. Please try again.",
                variant: "destructive"
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden rounded-[24px] border-zinc-200 dark:border-white/10 shadow-2xl bg-white dark:bg-zinc-900">
                <div className="bg-gradient-to-br from-primary via-indigo-600 to-primary/80 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Sparkles className="w-24 h-24" />
                    </div>
                    <DialogHeader className="relative z-10">
                        <DialogTitle className="text-2xl font-black uppercase tracking-tightest">Synthesize Creative</DialogTitle>
                        <DialogDescription className="text-white/70 font-black uppercase tracking-widest text-[10px] mt-1">
                            Omni-Channel Intelligent Repository Entry
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Creative Name</Label>
                            <div className="relative group">
                                <Sparkles className="absolute left-3 top-3 w-4 h-4 text-zinc-400 group-hover:text-primary transition-colors" />
                                <Input
                                    className="pl-10 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-sm"
                                    placeholder="e.g. Summer Sale Video - V2"
                                    value={formData.adName}
                                    onChange={(e) => setFormData({ ...formData, adName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Ad Identifier (ID)</Label>
                            <Input
                                className="h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 font-mono text-xs uppercase"
                                placeholder="12020827..."
                                value={formData.adId}
                                onChange={(e) => setFormData({ ...formData, adId: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Target Platform</Label>
                            <Select
                                value={formData.platform}
                                onValueChange={(v: any) => setFormData({ ...formData, platform: v })}
                            >
                                <SelectTrigger className="h-12 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 font-bold text-xs">
                                    <SelectValue placeholder="Select Platform" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-zinc-200 dark:border-white/10 dark:bg-zinc-900">
                                    <SelectItem value="meta" className="font-bold">Meta</SelectItem>
                                    <SelectItem value="tiktok" className="font-bold">TikTok</SelectItem>
                                    <SelectItem value="google" className="font-bold">Google Ads</SelectItem>
                                    <SelectItem value="youtube" className="font-bold">YouTube</SelectItem>
                                    <SelectItem value="linkedin" className="font-bold">LinkedIn</SelectItem>
                                    <SelectItem value="instagram" className="font-bold">Instagram</SelectItem>
                                    <SelectItem value="pinterest" className="font-bold">Pinterest</SelectItem>
                                    <SelectItem value="shopify" className="font-bold">Shopify</SelectItem>
                                    <SelectItem value="x" className="font-bold">X (Twitter)</SelectItem>
                                    <SelectItem value="telegram" className="font-bold">Telegram</SelectItem>
                                    <SelectItem value="tboola" className="font-bold">Tboola</SelectItem>
                                    <SelectItem value="bing" className="font-bold">Bing</SelectItem>
                                    <SelectItem value="adroll" className="font-bold">AdRoll</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 col-span-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Thumbnail URL</Label>
                            <div className="relative group">
                                <ImageIcon className="absolute left-3 top-3 w-4 h-4 text-zinc-400 group-hover:text-[#007AFF] transition-colors" />
                                <Input
                                    className="pl-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 text-xs text-muted-foreground"
                                    placeholder="https://example.com/ad-image.jpg"
                                    value={formData.thumbnailUrl}
                                    onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Spend ($)</Label>
                            <div className="relative group">
                                <span className="absolute left-3 top-2.5 text-zinc-400 font-bold">$</span>
                                <Input
                                    type="number"
                                    className="pl-7 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 font-bold"
                                    value={formData.spend}
                                    onChange={(e) => setFormData({ ...formData, spend: Number(e.target.value) })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">ROAS</Label>
                            <Input
                                type="number"
                                step="0.01"
                                className="h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/50 font-bold"
                                value={formData.roas}
                                onChange={(e) => setFormData({ ...formData, roas: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-4 gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            className="font-bold text-[11px] uppercase tracking-widest text-zinc-500 hover:bg-zinc-100 rounded-xl h-12"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 bg-primary hover:bg-primary/90 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl h-12 shadow-xl shadow-primary/30 active:scale-95 transition-all border-t border-white/20"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Deploy to Index"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
