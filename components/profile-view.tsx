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
import { updateProfile } from "@/server/actions/profile-actions"

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
                    <p className="text-muted-foreground font-medium animate-pulse">Accessing Secure Vault...</p>
                </div>
            </div>
        )
    }

    const isGoogleUser = (session.user as any).provider === "google"

    return (
        <div className="mx-auto max-w-6xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border pb-5">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="h-10 w-10 cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-muted-foreground hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm border border-border mb-1"
                        >
                            <ChevronDown className="h-5 w-5 rotate-90" />
                        </Button>
                    )}
                    <div className="space-y-1">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Identity & Security</h1>
                        <p className="text-muted-foreground text-xs md:text-sm">Manage your centralized analyzer profile</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full text-blue-500 dark:text-blue-400">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {isGoogleUser ? "Account Synced via Google" : "Verified Analyst Account"}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Quick Bio & Identity */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border border-border bg-white/50 dark:bg-card/40 backdrop-blur-2xl shadow-sm overflow-hidden p-0 rounded-xl">
                        <div className="h-20 bg-gradient-to-r from-blue-600 to-sky-700 relative" />
                        <CardContent className="relative pt-0 text-center px-6 pb-8">
                            <div className="relative -top-10 inline-block">
                                <Avatar className="h-20 w-20 border-4 border-white dark:border-zinc-900 shadow-sm">
                                    <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
                                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold uppercase">
                                        {session.user?.name?.[0] || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <button className="absolute bottom-0 right-0 cursor-pointer p-1.5 bg-blue-600 rounded-full border-2 border-white dark:border-zinc-900 text-white hover:bg-blue-500 transition-colors shadow-lg">
                                    <Camera className="h-3.5 w-3.5" />
                                </button>
                            </div>
                            <div className="-mt-8 mb-6">
                                <h2 className="text-xl font-semibold text-foreground tracking-tight">{session.user?.name}</h2>
                                <p className="text-muted-foreground text-xs font-medium mt-1 truncate">{session.user?.email}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 py-4 border-t border-zinc-100 dark:border-border/50">
                                <div className="space-y-1">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</h4>
                                    <div className="flex items-center justify-center gap-1.5">
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        <p className="text-xs font-semibold text-emerald-500">Online</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Access</h4>
                                    <p className="text-xs font-semibold text-foreground/80 dark:text-zinc-300">Level 1</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="p-5 bg-card/50 border border-border rounded-xl space-y-4">
                        <div className="flex items-center gap-2">
                            <Fingerprint className="h-4 w-4 text-blue-500" />
                            <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground">Security ID</h3>
                        </div>
                        <div className="bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-border">
                            <h4 className="text-[11px] font-mono text-muted-foreground mb-1.5">Authorization Token</h4>
                            <p className="text-[11px] font-mono text-muted-foreground break-all leading-relaxed bg-zinc-100 dark:bg-background p-2 rounded border border-border">
                                {(session.user as any).id || "SYSTEM_UID_82910"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Detailed Fields */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border border-border bg-white/50 dark:bg-card/40 backdrop-blur-2xl shadow-sm p-0 overflow-hidden rounded-xl">
                        <CardHeader className="border-b border-zinc-100 dark:border-border/50 p-6">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="text-lg font-semibold text-foreground tracking-tight">Identity Details</CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">Essential information for your analyst profile</CardDescription>
                                </div>
                                <User className="h-8 w-8 text-primary opacity-20" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {isGoogleUser && (
                                    <div className="flex items-start gap-3 p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                                        <Globe className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                                        <p className="text-xs leading-relaxed text-muted-foreground font-medium">
                                            These details are managed through your Google account and cannot be changed within the application. Please update your name and email from your Google Account settings.
                                        </p>
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Full Name</Label>
                                        <div className="relative group">
                                            <User className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            <Input
                                                id="name"
                                                value={formData.name}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                                className="pl-11 h-11 bg-white/50 dark:bg-background/50 border-border text-foreground focus:border-primary focus:ring-primary/20 transition-all rounded-lg text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60"
                                                required
                                                disabled={isGoogleUser}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1">Primary Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                value={formData.email}
                                                className="pl-11 h-11 bg-zinc-50/50 dark:bg-background/20 border-border text-muted-foreground cursor-not-allowed rounded-lg text-sm"
                                                disabled
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <Button
                                        type="submit"
                                        className="bg-primary hover:bg-primary/90 cursor-pointer text-white font-semibold text-sm h-11 rounded-lg px-8 transition-all shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                                        disabled={isLoading || isGoogleUser}
                                    >
                                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Synchronize Profile"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Security Actions Card */}
                    <Card className="border border-border bg-white/50 dark:bg-card/40 backdrop-blur-2xl shadow-sm p-0 overflow-hidden rounded-xl">
                        <CardHeader className="p-6 pb-4">
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                                <Shield className="h-5 w-5 text-blue-500" />
                                Security Infrastructure
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-0 space-y-4">
                            {!isGoogleUser ? (
                                <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-blue-500/5 rounded-lg border border-blue-500/20 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                            <Lock className="h-5 w-5" />
                                        </div>
                                        <div className="space-y-0.5">
                                            <h4 className="text-sm font-semibold text-foreground">Revision Controls</h4>
                                            <p className="text-xs text-muted-foreground font-medium">Full write access enabled for credentials</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="h-10 px-6 cursor-pointer border-border hover:bg-white dark:hover:bg-zinc-800 text-sm font-medium rounded-lg transition-all"
                                        onClick={onOpenPasswordChange}
                                    >
                                        Revise Password
                                    </Button>
                                </div>
                            ) : (
                                <div className="p-5 bg-amber-500/5 rounded-lg border border-amber-500/20 flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                        <Globe className="h-5 w-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <h4 className="text-sm font-semibold text-foreground">Authored via Google</h4>
                                        <p className="text-xs text-muted-foreground font-medium">Security is managed by your Google Identity Provider. Password change is handled through your Google Account settings.</p>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-background/40 rounded-lg border border-border transition-all hover:bg-zinc-100 dark:hover:bg-card hover:border-blue-500/30">
                                    <Calendar className="h-5 w-5 shrink-0 text-blue-500" />
                                    <div className="flex-1">
                                        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Account Created</h4>
                                        <p className="text-sm font-semibold text-foreground/90 dark:text-zinc-200">Feb 05, 2026</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-background/40 rounded-lg border border-border transition-all hover:bg-zinc-100 dark:hover:bg-card hover:border-emerald-500/30">
                                    <Shield className="h-5 w-5 shrink-0 text-emerald-500" />
                                    <div className="flex-1">
                                        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Account Status</h4>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-sm font-semibold text-foreground/90 dark:text-zinc-200">Active / Verified</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-background/40 rounded-lg border border-border transition-all hover:bg-zinc-100 dark:hover:bg-card hover:border-amber-500/30">
                                    <RefreshCw className="h-5 w-5 shrink-0 text-amber-500" />
                                    <div className="flex-1">
                                        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Last Updated</h4>
                                        <p className="text-sm font-semibold text-foreground/90 dark:text-zinc-200">{lastUpdated || "Never"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-background/40 rounded-lg border border-border transition-all hover:bg-zinc-100 dark:hover:bg-card hover:border-rose-500/30">
                                    <Fingerprint className="h-5 w-5 shrink-0 text-rose-500" />
                                    <div className="flex-1">
                                        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Login Method</h4>
                                        <p className="text-sm font-semibold text-foreground/90 dark:text-zinc-200">{isGoogleUser ? "Google Cloud Auth" : "Internal Credentials"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-background/40 rounded-lg border border-border transition-all hover:bg-zinc-100 dark:hover:bg-card hover:border-sky-500/30">
                                    <Activity className="h-5 w-5 shrink-0 text-sky-500" />
                                    <div className="flex-1">
                                        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Last Session</h4>
                                        <p className="text-sm font-semibold text-foreground/90 dark:text-zinc-200">{new Date().toLocaleDateString()} @ {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-background/40 rounded-lg border border-border transition-all hover:bg-zinc-100 dark:hover:bg-card hover:border-cyan-500/30">
                                    <Monitor className="h-5 w-5 shrink-0 text-cyan-500" />
                                    <div className="flex-1">
                                        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Current Device</h4>
                                        <p className="text-sm font-semibold text-foreground/90 dark:text-zinc-200">{deviceType}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-background/40 rounded-lg border border-border transition-all hover:bg-zinc-100 dark:hover:bg-card hover:border-purple-500/30">
                                    <Globe className="h-5 w-5 shrink-0 text-purple-500" />
                                    <div className="flex-1">
                                        <h4 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">Primary Region</h4>
                                        <p className="text-sm font-semibold text-foreground/90 dark:text-zinc-200">Global Index 1</p>
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
