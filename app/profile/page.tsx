"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
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
    ArrowLeft,
    Lock,
    Calendar,
    Fingerprint,
    BadgeCheck,
    Globe,
    Camera
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updateProfile } from "@/actions/profile-actions"
import Link from "next/link"
import { ChangePasswordDialog } from "@/components/change-password-dialog"

export default function ProfilePage() {
    const { data: session, update } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
    const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
    })

    useEffect(() => {
        // Force cleanup of body lock on mount
        document.body.style.pointerEvents = 'auto'
        document.body.style.overflow = ''

        if (session?.user) {
            setFormData({
                name: session.user.name || "",
                email: session.user.email || "",
            })
        }
    }, [session])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        const result = await updateProfile(formData)

        if (result?.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        } else {
            toast({ title: "Success", description: "Profile updated successfully!" })
            // Update the session with new data
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
            <div className="flex h-screen items-center justify-center bg-zinc-950">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                    <p className="text-zinc-500 font-medium animate-pulse">Synchronizing Identity...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 selection:bg-blue-500/30">
            {/* Ambient Background Glows */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-[0.1] blur-[120px] bg-blue-600" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-[0.05] blur-[100px] bg-purple-600" />
            </div>

            <div className="max-w-5xl mx-auto p-4 md:p-8 relative z-10">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <Link href="/">
                        <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 transition-all rounded-xl gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Button>
                    </Link>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full text-blue-400">
                        <BadgeCheck className="h-3 w-3" />
                        Verified Account
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Column: Avatar & Quick Info */}
                    <div className="lg:col-span-4 space-y-6">
                        <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl overflow-hidden border-t-0">
                            <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                                <div className="absolute inset-0 bg-black/20" />
                            </div>
                            <CardContent className="relative pt-0 text-center">
                                <div className="relative -top-12 inline-block">
                                    <Avatar className="h-24 w-24 border-4 border-zinc-900 shadow-2xl">
                                        <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
                                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl font-black">
                                            {session.user?.name?.[0] || <User className="h-12 w-12" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <button className="absolute bottom-0 right-0 p-1.5 bg-blue-600 rounded-full border-2 border-zinc-900 text-white hover:bg-blue-500 transition-colors shadow-lg">
                                        <Camera className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="-mt-10 mb-6">
                                    <h2 className="text-2xl font-black text-white tracking-tight">{session.user?.name}</h2>
                                    <p className="text-zinc-500 text-sm font-medium mt-1">{session.user?.email}</p>
                                    <div className="mt-4 flex items-center justify-center gap-2">
                                        <span className="px-2.5 py-1 bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-md border border-zinc-700">
                                            {(session.user as any).role || "Viewer"}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 py-6 border-t border-zinc-800/50">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-tighter text-zinc-500">Member Since</p>
                                        <p className="text-xs font-bold text-zinc-300">Feb 2026</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black uppercase tracking-tighter text-zinc-500">Status</p>
                                        <div className="flex items-center justify-center gap-1.5">
                                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                            <p className="text-xs font-bold text-emerald-500">Active</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-2xl">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                                    <Fingerprint className="h-4 w-4 text-blue-500" />
                                    Technical Signature
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                    <p className="text-[10px] font-mono text-zinc-600 mb-1">User Identification Hash</p>
                                    <p className="text-[11px] font-mono text-zinc-400 break-all leading-relaxed">
                                        {(session.user as any).id || "USR_829104BA2"}
                                    </p>
                                </div>
                                <div className="flex items-center justify-between px-1">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-3.5 w-3.5 text-zinc-500" />
                                        <span className="text-xs text-zinc-500 font-medium">Provider</span>
                                    </div>
                                    <span className="text-xs font-bold text-zinc-300 capitalize">
                                        {(session.user as any).provider || "Credentials"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Edit Profile & Security */}
                    <div className="lg:col-span-8 space-y-6">
                        <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl">
                            <CardHeader className="border-b border-zinc-800/50 pb-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-xl font-bold text-white tracking-tight">Identity Details</CardTitle>
                                        <CardDescription className="text-zinc-500">Manage your publicly displayed information</CardDescription>
                                    </div>
                                    <User className="h-8 w-8 text-blue-500 opacity-20" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-8">
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Name Field */}
                                        <div className="space-y-2">
                                            <Label htmlFor="name" className="text-xs font-bold text-zinc-400 ml-1">Full Legal Name</Label>
                                            <div className="relative group">
                                                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-500 group-focus-within:text-blue-500 transition-colors" />
                                                <Input
                                                    id="name"
                                                    value={formData.name}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                                    className="pl-11 h-12 bg-zinc-950/50 border-zinc-800 text-white placeholder:text-zinc-700 focus:border-blue-600 focus:ring-blue-600/20 transition-all rounded-xl"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Email Field (Read-only) */}
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-xs font-bold text-zinc-400 ml-1">Email Address</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-600" />
                                                <Input
                                                    id="email"
                                                    value={formData.email}
                                                    className="pl-11 h-12 bg-zinc-950/30 border-zinc-900 text-zinc-600 cursor-not-allowed rounded-xl"
                                                    disabled
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <Button
                                            type="submit"
                                            className="w-full md:w-auto px-8 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-widest h-12 rounded-xl transition-all duration-300 shadow-xl shadow-blue-900/20 border-t border-white/10"
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                                                    Processing...
                                                </>
                                            ) : (
                                                "Synchronize Profile"
                                            )}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>

                        {/* Security & Access Section */}
                        <Card className="border-zinc-800 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                                    <Lock className="h-5 w-5 text-zinc-400 group-hover:text-blue-500 transition-colors" />
                                    Security & Access
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white/5 rounded-2xl border border-white/5 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                            <Shield className="h-5 w-5 text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">Password Authentication</p>
                                            <p className="text-xs text-zinc-500">Last updated recently</p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-300 rounded-xl px-6 h-10 transition-all active:scale-95"
                                        onClick={() => setIsPasswordDialogOpen(true)}
                                    >
                                        Revise Password
                                    </Button>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-zinc-950/40 rounded-2xl border border-zinc-900/50 gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                                            <Calendar className="h-5 w-5 text-zinc-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-zinc-400">Account Lifecycle</p>
                                            <p className="text-xs text-zinc-600 italic">Continuous active monitoring enabled</p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Password Dialog */}
            <ChangePasswordDialog
                open={isPasswordDialogOpen}
                onOpenChange={setIsPasswordDialogOpen}
                email={formData.email}
            />

            <div className="h-20" />
        </div>
    )
}
