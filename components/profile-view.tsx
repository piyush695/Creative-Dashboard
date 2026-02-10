"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    User,
    Mail,
    Shield,
    Loader2,
    Lock,
    Calendar,
    Fingerprint,
    BadgeCheck,
    Globe,
    Camera,
    ChevronDown,
    RefreshCw,
    Activity,
    Monitor
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updateProfile } from "@/actions/profile-actions"

interface ProfileViewProps {
    onOpenPasswordChange?: () => void
    onBack?: () => void
}

export default function ProfileView({ onOpenPasswordChange, onBack }: ProfileViewProps) {
    const { data: session, update } = useSession()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
    })
    const [lastUpdated, setLastUpdated] = useState<string | null>(null)
    const [deviceType, setDeviceType] = useState<string>("Detecting...")

    useEffect(() => {
        const detectDevice = () => {
            const width = window.innerWidth
            if (width < 768) setDeviceType("Mobile System")
            else if (width < 1024) setDeviceType("Tablet Device")
            else setDeviceType("Desktop Workstation")
        }
        detectDevice()
        window.addEventListener('resize', detectDevice)
        return () => window.removeEventListener('resize', detectDevice)
    }, [])

    useEffect(() => {
        const saved = localStorage.getItem("profile_last_updated")
        if (saved) setLastUpdated(saved)
    }, [])

    useEffect(() => {
        if (session?.user) {
            setFormData({
                name: session.user.name || "",
                email: session.user.email || "",
            })
        }
    }, [session])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        const isGoogleUser = (session?.user as any).provider === "google"

        if (isGoogleUser) {
            const { dismiss } = toast({
                title: "Action Restricted",
                description: "You are not able to update your profile because your provider is Google. Please manage your details through your Google Account.",
                variant: "destructive",
                duration: 5000
            })
            setTimeout(() => {
                dismiss()
            }, 5000)
            return
        }

        setIsLoading(true)

        const result = await updateProfile(formData)

        if (result?.error) {
            const { dismiss } = toast({ title: "Error", description: result.error, variant: "destructive", duration: 5000 })
            setTimeout(() => dismiss(), 5000)
        } else {
            const { dismiss } = toast({ title: "Success", description: "Profile updated successfully!", duration: 5000 })
            setTimeout(() => dismiss(), 5000)
            const now = new Date().toLocaleString()
            setLastUpdated(now)
            localStorage.setItem("profile_last_updated", now)
            if (session?.user) {
                await update({
                    ...session,
                    user: {
                        ...session.user,
                        name: formData.name,
                    }
                })
            }
        }

        setIsLoading(false)
    }

    if (!session) {
        return (
            <div className="flex h-full items-center justify-center p-12">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                    <p className="text-zinc-500 font-medium animate-pulse">Accessing Secure Vault...</p>
                </div>
            </div>
        )
    }

    const isGoogleUser = (session.user as any).provider === "google"

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
                        <h1 className="text-xl md:text-3xl font-black text-zinc-900 dark:text-white tracking-tight">Identity & Security</h1>
                        <p className="text-zinc-500 text-[10px] md:text-sm uppercase tracking-widest font-bold opacity-60">Manage your centralized analyzer profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full text-blue-400">
                    <BadgeCheck className="h-3 w-3" />
                    {isGoogleUser ? "Account Synced via Google" : "Verified Analyst Account"}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Quick Bio & Identity */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl shadow-xl overflow-hidden border-t-0 p-0">
                        <div className="h-20 bg-gradient-to-r from-blue-600 to-indigo-700 relative" />
                        <CardContent className="relative pt-0 text-center px-6 pb-8">
                            <div className="relative -top-10 inline-block">
                                <Avatar className="h-20 w-20 border-4 border-white dark:border-zinc-900 shadow-2xl">
                                    <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-black uppercase">
                                        {session.user?.name?.[0] || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <button className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full border-2 border-white dark:border-zinc-900 text-white hover:bg-blue-500 transition-colors shadow-lg">
                                    <Camera className="h-3 w-3" />
                                </button>
                            </div>
                            <div className="-mt-8 mb-6">
                                <h2 className="text-xl font-black text-zinc-900 dark:text-white tracking-tight">{session.user?.name}</h2>
                                <p className="text-zinc-500 text-xs font-medium mt-1 truncate">{session.user?.email}</p>
                                <div className="mt-4">
                                    <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[9px] font-black uppercase tracking-widest rounded-md border border-zinc-200 dark:border-zinc-700">
                                        {(session.user as any).role || "Viewer"}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 py-4 border-t border-zinc-100 dark:border-zinc-800/50">
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-tighter text-zinc-400 dark:text-zinc-500">Status</p>
                                    <div className="flex items-center justify-center gap-1">
                                        <div className="h-1 w-1 rounded-full bg-emerald-500" />
                                        <p className="text-[11px] font-bold text-emerald-500">Online</p>
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[9px] font-black uppercase tracking-tighter text-zinc-400 dark:text-zinc-500">Access</p>
                                    <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">Level 1</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="p-5 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl space-y-4">
                        <div className="flex items-center gap-2">
                            <Fingerprint className="h-4 w-4 text-blue-500" />
                            <span className="text-xs font-black uppercase tracking-widest text-zinc-900 dark:text-white">Security ID</span>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl border border-zinc-200 dark:border-white/5">
                            <p className="text-[9px] font-mono text-zinc-400 mb-1">Authorization Token</p>
                            <p className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 break-all leading-relaxed bg-zinc-100 dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800">
                                {(session.user as any).id || "SYSTEM_UID_82910"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Detailed Fields */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl shadow-xl p-0 overflow-hidden">
                        <CardHeader className="border-b border-zinc-100 dark:border-zinc-800/50 p-6 md:p-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Identity Details</CardTitle>
                                    <CardDescription className="text-xs text-zinc-500">Essential information for your analyst profile</CardDescription>
                                </div>
                                <User className="h-8 w-8 text-[#007AFF] opacity-20" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Full Name</Label>
                                        <div className="relative group">
                                            <User className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400 group-focus-within:text-[#007AFF] transition-colors" />
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                                className="pl-11 h-12 bg-white/50 dark:bg-zinc-950/50 border-zinc-200 dark:border-zinc-800 text-foreground focus:border-[#007AFF] focus:ring-[#007AFF]/20 transition-all rounded-xl text-sm font-medium"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Primary Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-300 dark:text-zinc-600" />
                                            <Input
                                                id="email"
                                                value={formData.email}
                                                className="pl-11 h-12 bg-zinc-50/50 dark:bg-zinc-950/20 border-zinc-200 dark:border-zinc-900 text-zinc-400 dark:text-zinc-600 cursor-not-allowed rounded-xl text-sm italic"
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        className="bg-[#007AFF] hover:bg-[#007AFF]/90 text-white font-black text-[10px] uppercase tracking-[0.2em] h-12 rounded-xl px-8 transition-all shadow-lg shadow-[#007AFF]/20 border-t border-white/20"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Synchronize Profile"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Security Actions Card */}
                    <Card className="border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl shadow-xl p-0 overflow-hidden">
                        <CardHeader className="p-6 md:p-8 pb-4">
                            <CardTitle className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                                <Shield className="h-5 w-5 text-blue-500" />
                                Security Infrastructure
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 md:p-8 pt-0 space-y-4">
                            {!isGoogleUser ? (
                                <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-blue-500/5 rounded-2xl border border-blue-500/10 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-900 dark:text-white">Revision Controls</p>
                                            <p className="text-[11px] text-zinc-500 font-medium italic">Full write access enabled for credentials</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="h-10 px-6 border-zinc-200 dark:border-zinc-800 hover:bg-white dark:hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                                        onClick={onOpenPasswordChange}
                                    >
                                        Revise Password
                                    </Button>
                                </div>
                            ) : (
                                <div className="p-5 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600">
                                        <Globe className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-zinc-900 dark:text-white">Authored via Google</p>
                                        <p className="text-[11px] text-zinc-500 font-medium">Security is managed by your Google Identity Provider. Password change is handled through your Google Account settings.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-4 p-5 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-100 dark:border-zinc-900/50 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                    <Calendar className="h-5 w-5 text-blue-400" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Account Created</p>
                                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Feb 05, 2026</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-5 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-100 dark:border-zinc-900/50 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                    <Shield className="h-5 w-5 text-emerald-400" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Account Status</p>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Active / Verified</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-5 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-100 dark:border-zinc-900/50 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                    <RefreshCw className="h-5 w-5 text-amber-400" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Last Updated</p>
                                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{lastUpdated || "Never"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-5 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-100 dark:border-zinc-900/50 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                    <Fingerprint className="h-5 w-5 text-rose-400" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Login Method</p>
                                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{isGoogleUser ? "Google Cloud Auth" : "Internal Credentials"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-5 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-100 dark:border-zinc-900/50 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                    <Activity className="h-5 w-5 text-indigo-400" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Last Session</p>
                                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{new Date().toLocaleDateString()} @ {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-5 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-100 dark:border-zinc-900/50 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                    <Monitor className="h-5 w-5 text-cyan-400" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Current Device</p>
                                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{deviceType}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-5 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-100 dark:border-zinc-900/50 transition-all hover:bg-zinc-100 dark:hover:bg-zinc-900">
                                    <Globe className="h-5 w-5 text-purple-400" />
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Primary Region</p>
                                        <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Global Index 1</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
