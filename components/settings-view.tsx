"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    ChevronDown,
    Settings,
    Moon,
    Sun,
    Monitor,
    Bell,
    RefreshCw,
    Search,
    Eye,
    Globe,
    Zap,
    Shield
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
    BarChart3,
    LayoutGrid,
    Check,
    AlertCircle,
    Activity as ActivityIcon
} from "lucide-react"

interface SettingsViewProps {
    onBack?: () => void
}

export default function SettingsView({ onBack }: SettingsViewProps) {
    const { data: session } = useSession()
    const { toast } = useToast()
    const { setTheme, theme } = useTheme()

    const [initialSettings, setInitialSettings] = useState(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem("dashboard_settings")
            return saved ? JSON.parse(saved) : {
                refreshInterval: "manual",
                defaultView: "top-performer",
                showMetrics: true,
                reducedMotion: false,
                language: "en",
                compactMode: false,
                glassmorphism: true,
                omniSearch: true,
                alertSystem: false
            }
        }
        return null
    })

    const [dashboardSettings, setDashboardSettings] = useState(() => {
        if (initialSettings) return initialSettings
        return {
            refreshInterval: "manual",
            defaultView: "top-performer",
            showMetrics: true,
            reducedMotion: false,
            language: "en",
            compactMode: false,
            glassmorphism: true,
            omniSearch: true,
            alertSystem: false
        }
    })

    const hasChanges = JSON.stringify(dashboardSettings) !== JSON.stringify(initialSettings)

    const handleSaveSettings = () => {
        if (!hasChanges) {
            const { dismiss } = toast({
                title: "Configuration Synchronized",
                description: "No modifications detected since last update. Please adjust your preferences before committing changes.",
                variant: "destructive",
                duration: 3000
            })
            setTimeout(() => dismiss(), 3000)
            return
        }

        localStorage.setItem("dashboard_settings", JSON.stringify(dashboardSettings))
        setInitialSettings(dashboardSettings)

        const { dismiss } = toast({
            title: "Settings Saved",
            description: "Your dashboard preferences have been successfully updated.",
            duration: 5000
        })
        setTimeout(() => dismiss(), 5000)
    }

    const resetToDefault = () => {
        const defaults = {
            refreshInterval: "manual",
            defaultView: "top-performer",
            showMetrics: true,
            reducedMotion: false,
            language: "en",
            compactMode: false,
            glassmorphism: true,
            omniSearch: true,
            alertSystem: false
        }
        setDashboardSettings(defaults)
        setTheme('system')

        // If defaults are different from initial, allow saving
        if (JSON.stringify(defaults) === JSON.stringify(initialSettings)) {
            const { dismiss } = toast({
                title: "Already at Default",
                description: "System is already using the baseline configuration.",
                duration: 3000
            })
            setTimeout(() => dismiss(), 3000)
            return
        }

        const { dismiss } = toast({
            title: "Settings Reset",
            description: "Default configuration has been restored.",
            duration: 5000
        })
        setTimeout(() => dismiss(), 5000)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div className="flex items-center gap-4">
                    {onBack && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="h-10 w-10 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm border border-zinc-200 dark:border-zinc-800 mb-1"
                        >
                            <ChevronDown className="h-5 w-5 rotate-90" />
                        </Button>
                    )}
                    <div className="space-y-1">
                        <h1 className="text-xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">System Configuration</h1>
                        <p className="text-zinc-500 text-[10px] md:text-sm uppercase tracking-widest font-bold opacity-60">Fine-tune your analysis environment</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-full text-emerald-600 dark:text-emerald-400">
                    <Shield className="h-3 w-3" />
                    Secure Preferences
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Core Preferences */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 backdrop-blur-2xl shadow-xl overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="p-6 md:p-8 pb-4">
                            <CardTitle className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                                <Sun className="h-5 w-5 text-amber-500" />
                                Interface & Style
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-500">
                                Personalize the visual appearance of your dashboard
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8 pt-2 space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/5 gap-4">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Visual Theme</Label>
                                    <p className="text-[11px] text-zinc-500 font-medium">Switch dashboard lighting environment</p>
                                </div>
                                <div className="grid grid-cols-3 bg-white/80 dark:bg-zinc-950 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-inner w-full sm:w-auto gap-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-8 px-2 sm:px-4 gap-1 sm:gap-2 rounded-lg transition-all ${theme === 'light' ? 'bg-[#007AFF] text-white shadow-md hover:bg-[#007AFF]' : 'text-zinc-500 hover:text-[#007AFF] hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
                                        onClick={() => setTheme('light')}
                                    >
                                        <Sun className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${theme === 'light' ? 'text-white' : ''}`} />
                                        <span className="text-[9px] sm:text-[10px] font-black uppercase">Light</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-8 px-2 sm:px-4 gap-1 sm:gap-2 rounded-lg transition-all ${theme === 'dark' ? 'bg-zinc-800 text-white shadow-md border border-zinc-700' : 'text-zinc-500 hover:text-[#007AFF] hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
                                        onClick={() => setTheme('dark')}
                                    >
                                        <Moon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        <span className="text-[9px] sm:text-[10px] font-black uppercase">Dark</span>
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={`h-8 px-2 sm:px-4 gap-1 sm:gap-2 rounded-lg transition-all ${theme === 'system' ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-md border border-zinc-300 dark:border-zinc-700' : 'text-zinc-500 hover:text-[#007AFF] hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
                                        onClick={() => setTheme('system')}
                                    >
                                        <Monitor className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-tighter">Auto</span>
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/5 transition-all hover:bg-zinc-100 dark:hover:bg-white/[0.08]">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Glassmorphism</Label>
                                        <p className="text-[10px] text-zinc-500 font-medium">Dynamic blurs</p>
                                    </div>
                                    <Switch
                                        checked={dashboardSettings.glassmorphism}
                                        onCheckedChange={(val) => setDashboardSettings({ ...dashboardSettings, glassmorphism: val })}
                                        className="data-[state=checked]:bg-[#007AFF]"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/5 transition-all hover:bg-zinc-100 dark:hover:bg-white/[0.08]">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Compact Density</Label>
                                        <p className="text-[10px] text-zinc-500 font-medium">Data-rich layout</p>
                                    </div>
                                    <Switch
                                        checked={dashboardSettings.compactMode}
                                        onCheckedChange={(val) => setDashboardSettings({ ...dashboardSettings, compactMode: val })}
                                        className="data-[state=checked]:bg-[#007AFF]"
                                    />
                                </div>
                                <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-white/5 rounded-2xl border border-zinc-100 dark:border-white/5 transition-all hover:bg-zinc-100 dark:hover:bg-white/[0.08]">
                                    <div className="space-y-0.5">
                                        <Label className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Reduced Motion</Label>
                                        <p className="text-[10px] text-zinc-500 font-medium">Simplify transitions</p>
                                    </div>
                                    <Switch
                                        checked={dashboardSettings.reducedMotion}
                                        onCheckedChange={(val) => setDashboardSettings({ ...dashboardSettings, reducedMotion: val })}
                                        className="data-[state=checked]:bg-[#007AFF]"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                                <Label className="text-xs font-black uppercase tracking-widest text-zinc-400 ml-1">Default Landing View</Label>
                                <RadioGroup
                                    value={dashboardSettings.defaultView}
                                    onValueChange={(val) => setDashboardSettings({ ...dashboardSettings, defaultView: val })}
                                    className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                                >
                                    {[
                                        { id: "top-performer", label: "Top Performer", icon: ActivityIcon, desc: "Focus on best ads" },
                                        { id: "discovery", label: "Discovery Hub", icon: LayoutGrid, desc: "Explore all creatives" }
                                    ].map((view) => (
                                        <Label
                                            key={view.id}
                                            htmlFor={view.id}
                                            className={cn(
                                                "relative flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                                                dashboardSettings.defaultView === view.id
                                                    ? "bg-blue-500/5 border-blue-500/30 ring-1 ring-blue-500/30"
                                                    : "bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-2 rounded-xl border",
                                                    dashboardSettings.defaultView === view.id ? "bg-blue-500 text-white border-blue-400" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border-zinc-200 dark:border-zinc-700"
                                                )}>
                                                    <view.icon className="h-4 w-4" />
                                                </div>
                                                <div className="space-y-0.5 text-left">
                                                    <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200">{view.label}</p>
                                                    <p className="text-[10px] text-zinc-500 font-medium">{view.desc}</p>
                                                </div>
                                            </div>
                                            <RadioGroupItem value={view.id} id={view.id} className="sr-only" />
                                            {dashboardSettings.defaultView === view.id && (
                                                <div className="bg-blue-500 rounded-full p-1 shadow-lg shadow-blue-500/40">
                                                    <Check className="h-2 w-2 text-white stroke-[4]" />
                                                </div>
                                            )}
                                        </Label>
                                    ))}
                                </RadioGroup>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 backdrop-blur-2xl shadow-xl overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <CardHeader className="p-6 md:p-8 pb-4">
                            <CardTitle className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                                <Eye className="h-5 w-5 text-indigo-400" />
                                Behavioral Logic
                            </CardTitle>
                            <CardDescription className="text-xs text-zinc-500">
                                Configure analyzer synchronization and processing
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8 pt-2 space-y-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <RefreshCw className="h-3.5 w-3.5 text-blue-500" />
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Sync Polling</Label>
                                    </div>
                                    <Select
                                        value={dashboardSettings.refreshInterval}
                                        onValueChange={(val) => setDashboardSettings({ ...dashboardSettings, refreshInterval: val })}
                                    >
                                        <SelectTrigger className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-10 rounded-xl focus:ring-[#007AFF]/20 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                            <SelectValue placeholder="Interval" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl">
                                            <SelectItem value="manual" className="font-medium text-xs">Manual Request</SelectItem>
                                            <SelectItem value="30s" className="font-medium text-xs">30s Interval</SelectItem>
                                            <SelectItem value="60s" className="font-medium text-xs">1m Dynamic</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-3.5 w-3.5 text-emerald-500" />
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Regionality</Label>
                                    </div>
                                    <Select
                                        value={dashboardSettings.language}
                                        onValueChange={(val) => setDashboardSettings({ ...dashboardSettings, language: val })}
                                    >
                                        <SelectTrigger className="bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 h-10 rounded-xl focus:ring-[#007AFF]/20 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                            <SelectValue placeholder="Language" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl">
                                            <SelectItem value="en" className="font-medium text-xs">English (US)</SelectItem>
                                            <SelectItem value="es" className="font-medium text-xs">Español</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between transition-all hover:bg-zinc-50 dark:hover:bg-white/[0.02] -mx-2 px-2 py-1 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                                            <Bell className="h-4 w-4 text-zinc-400" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Alert System</Label>
                                            <p className="text-[10px] text-zinc-500">Analyzer completion pings</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={dashboardSettings.alertSystem}
                                        onCheckedChange={(val) => setDashboardSettings({ ...dashboardSettings, alertSystem: val })}
                                        className="data-[state=checked]:bg-[#007AFF]"
                                    />
                                </div>
                                <div className="flex items-center justify-between transition-all hover:bg-zinc-50 dark:hover:bg-white/[0.02] -mx-2 px-2 py-1 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
                                            <Search className="h-4 w-4 text-zinc-400" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-bold text-zinc-900 dark:text-zinc-200">Omni Search</Label>
                                            <p className="text-[10px] text-zinc-500">Live search across indices</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={dashboardSettings.omniSearch}
                                        onCheckedChange={(val) => setDashboardSettings({ ...dashboardSettings, omniSearch: val })}
                                        className="data-[state=checked]:bg-[#007AFF]"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Actions & Metadata */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-emerald-500/20 bg-emerald-500/5 backdrop-blur-xl shadow-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="h-4 w-4 text-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Service Integrity</span>
                        </div>
                        <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
                            <div className="h-full w-[94%] bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                        <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 font-bold">Availability: 99.9% Latency: 24ms</p>
                    </Card>

                    <div className="space-y-3">
                        <Button
                            className="w-full bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-black text-[11px] uppercase tracking-widest h-12 transition-all rounded-2xl shadow-xl shadow-blue-500/20 border-t border-white/20"
                            onClick={handleSaveSettings}
                        >
                            Commit Preferences
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white h-10 transition-all rounded-2xl text-[10px] font-black uppercase tracking-widest"
                            onClick={resetToDefault}
                        >
                            Reset to Default
                        </Button>
                    </div>

                    <div className="p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-zinc-400" />
                            <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Env Signature</span>
                        </div>
                        <div className="space-y-2 text-[10px] font-mono text-zinc-500">
                            <div className="flex justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                                <span>Platform</span>
                                <span className="text-zinc-900 dark:text-zinc-300 font-bold">Vercel/Web</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Zone</span>
                                <span className="text-zinc-900 dark:text-zinc-300 font-bold">Global-1</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
