"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Loader2,
    ArrowLeft,
    Settings,
    Moon,
    Sun,
    Monitor,
    Bell,
    RefreshCw,
    LayoutDashboard,
    Search,
    Eye,
    Globe,
    Zap,
    Shield
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import Link from "next/link"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function SettingsPage() {
    const { data: session } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const { setTheme, theme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Default setting states (these could be saved in localStorage or DB)
    const [dashboardSettings, setDashboardSettings] = useState({
        refreshInterval: "manual",
        defaultView: "top-performer",
        showMetrics: true,
        reducedMotion: false,
        language: "en",
        compactMode: false
    })

    useEffect(() => {
        setMounted(true)
        // Force cleanup of body lock on mount
        document.body.style.pointerEvents = 'auto'
        document.body.style.overflow = ''
    }, [])

    const handleSaveSettings = () => {
        toast({
            title: "Settings Saved",
            description: "Your dashboard preferences have been updated.",
        })
    }

    if (!mounted) return null

    if (!session) {
        return (
            <div className="flex h-screen items-center justify-center bg-zinc-950">
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 p-4 md:p-8 selection:bg-blue-500/30">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-[0.1] blur-[120px] bg-blue-600" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-[0.05] blur-[100px] bg-indigo-600" />
            </div>

            {/* Back Button */}
            <div className="max-w-4xl mx-auto mb-8 relative z-10">
                <Link href="/">
                    <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 transition-all rounded-xl gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </Link>
            </div>

            <div className="max-w-4xl mx-auto space-y-8 relative z-10">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-8">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-blue-600/20 rounded-2xl border border-blue-500/20">
                                <Settings className="h-6 w-6 text-blue-400" />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight">System Settings</h1>
                        </div>
                        <p className="text-zinc-400 text-sm md:ml-14 uppercase tracking-widest font-bold opacity-60">Dashboard Configuration & Preferences</p>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter bg-zinc-900/50 border border-zinc-800 px-3 py-1.5 rounded-full text-zinc-500">
                        <Shield className="h-3 w-3 text-blue-500" />
                        Private Session
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    {/* Left Column: Core Settings */}
                    <div className="md:col-span-8 space-y-6">
                        {/* Appearance Card */}
                        <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    <Sun className="h-5 w-5 text-amber-500" />
                                    Appearance & Interface
                                </CardTitle>
                                <CardDescription className="text-zinc-500">
                                    Customize the visual experience of your workspace
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-2">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div className="space-y-1">
                                        <Label className="text-sm font-bold text-zinc-200">Theme Mode</Label>
                                        <p className="text-xs text-zinc-500">Switch between light, dark or system themes</p>
                                    </div>
                                    <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 shadow-inner">
                                        <Button
                                            variant={theme === 'light' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className={`h-9 px-3 gap-2 rounded-lg transition-all ${theme === 'light' ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
                                            onClick={() => setTheme('light')}
                                        >
                                            <Sun className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase">Light</span>
                                        </Button>
                                        <Button
                                            variant={theme === 'dark' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className={`h-9 px-3 gap-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-white'}`}
                                            onClick={() => setTheme('dark')}
                                        >
                                            <Moon className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase">Dark</span>
                                        </Button>
                                        <Button
                                            variant={theme === 'system' ? 'secondary' : 'ghost'}
                                            size="sm"
                                            className={`h-9 px-3 gap-2 rounded-lg transition-all ${theme === 'system' ? 'bg-zinc-800 text-white shadow-lg border border-zinc-700' : 'text-zinc-500 hover:text-white'}`}
                                            onClick={() => setTheme('system')}
                                        >
                                            <Monitor className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-black uppercase">System</span>
                                        </Button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 group/toggle">
                                        <div className="space-y-1">
                                            <Label className="text-sm font-bold text-zinc-200">Glassmorphism</Label>
                                            <p className="text-[10px] text-zinc-500 font-medium">Dynamic background blurs</p>
                                        </div>
                                        <Switch checked={true} className="data-[state=checked]:bg-blue-600" />
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 opacity-50 cursor-not-allowed">
                                        <div className="space-y-1">
                                            <Label className="text-sm font-bold text-zinc-200">High Contrast</Label>
                                            <p className="text-[10px] text-zinc-500 font-medium">For accessibility needs</p>
                                        </div>
                                        <Switch checked={false} disabled />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Behavior Card */}
                        <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    <Eye className="h-5 w-5 text-indigo-400" />
                                    Application Behavior
                                </CardTitle>
                                <CardDescription className="text-zinc-500">
                                    Control how the analyzer polls and processes data
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-8 pt-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                                            <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Sync Interval</Label>
                                        </div>
                                        <Select
                                            value={dashboardSettings.refreshInterval}
                                            onValueChange={(val) => setDashboardSettings({ ...dashboardSettings, refreshInterval: val })}
                                        >
                                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white h-11 rounded-xl focus:ring-blue-500/20">
                                                <SelectValue placeholder="Select interval" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                                                <SelectItem value="manual">Manual Refresh Only</SelectItem>
                                                <SelectItem value="30s">Every 30 Seconds</SelectItem>
                                                <SelectItem value="60s">Every 1 Minute</SelectItem>
                                                <SelectItem value="300s">Every 5 Minutes</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-zinc-500 font-medium bg-zinc-800/50 px-2 py-1 rounded w-fit italic">Default: Manual for performance</p>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2">
                                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                                            <Label className="text-xs font-black uppercase tracking-widest text-zinc-400">Language (i18n)</Label>
                                        </div>
                                        <Select
                                            value={dashboardSettings.language}
                                            onValueChange={(val) => setDashboardSettings({ ...dashboardSettings, language: val })}
                                        >
                                            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-white h-11 rounded-xl focus:ring-blue-500/20">
                                                <SelectValue placeholder="Select language" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white rounded-xl">
                                                <SelectItem value="en">English (Global)</SelectItem>
                                                <SelectItem value="es">Español</SelectItem>
                                                <SelectItem value="fr">Français</SelectItem>
                                                <SelectItem value="de">Deutsch</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[10px] text-zinc-500 font-medium bg-zinc-800/50 px-2 py-1 rounded w-fit italic">Translation support enabled</p>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-zinc-800">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-zinc-800 rounded-lg">
                                                <Bell className="h-4 w-4 text-zinc-400" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold text-zinc-200">System Notifications</Label>
                                                <p className="text-[10px] text-zinc-500">Alerts for new analysis results</p>
                                            </div>
                                        </div>
                                        <Switch checked={false} className="data-[state=checked]:bg-blue-600" />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-zinc-800 rounded-lg">
                                                <Search className="h-4 w-4 text-zinc-400" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-bold text-zinc-200">Real-time Search</Label>
                                                <p className="text-[10px] text-zinc-500">Search as you type across ad IDs</p>
                                            </div>
                                        </div>
                                        <Switch checked={true} className="data-[state=checked]:bg-blue-600" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Information & Actions */}
                    <div className="md:col-span-4 space-y-6">
                        <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl shadow-xl overflow-hidden">
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="h-4 w-4 text-emerald-400 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Insights</span>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-zinc-400">Optimal refresh speed detected.</p>
                                    <p className="text-xs text-zinc-400">Global DNS latency is minimal.</p>
                                </div>
                                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                    <div className="h-full w-[85%] bg-emerald-500 rounded-full" />
                                </div>
                                <p className="text-[10px] text-emerald-500/70 font-bold">System Health: 98%</p>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <Button
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest h-14 transition-all rounded-2xl shadow-xl shadow-blue-900/20 border-t border-white/20"
                                onClick={handleSaveSettings}
                            >
                                Apply Changes
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full text-zinc-500 hover:text-white hover:bg-red-500/10 h-12 transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest"
                                onClick={() => router.push('/')}
                            >
                                Discard Changes
                            </Button>
                        </div>

                        <div className="p-6 bg-zinc-900/50 border border-zinc-800 rounded-[2rem] space-y-4">
                            <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-blue-500" />
                                <span className="text-xs font-bold text-white">Browser Info</span>
                            </div>
                            <div className="space-y-2 text-[10px] font-medium text-zinc-500 font-mono">
                                <div className="flex justify-between border-b border-zinc-800/50 pb-2">
                                    <span>User Agent</span>
                                    <span className="text-zinc-300">Web Dashboard</span>
                                </div>
                                <div className="flex justify-between border-b border-zinc-800/50 pb-2">
                                    <span>Timezone</span>
                                    <span className="text-zinc-300 capitalize">{Intl.DateTimeFormat().resolvedOptions().timeZone.split('/')[1]}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Platform</span>
                                    <span className="text-zinc-300">Desktop</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer space */}
            <div className="h-20" />
        </div>
    )
}
