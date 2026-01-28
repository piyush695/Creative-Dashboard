"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Shield, Loader2, ArrowLeft, Lock, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { updateProfile } from "@/actions/profile-actions"
import { verifyCurrentPassword, updatePassword } from "@/actions/auth-actions"
import Link from "next/link"




export default function ProfilePage() {
    const { data: session, update } = useSession()
    const router = useRouter()
    const { toast } = useToast()
    const [isLoading, setIsLoading] = useState(false)
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
                <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
            {/* Back Button */}
            <div className="max-w-2xl mx-auto mb-6">
                <Link href="/">
                    <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-900">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </Link>
            </div>

            <Card className="max-w-2xl mx-auto border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
                <CardHeader className="text-center space-y-4 pb-8">
                    <div className="mx-auto">
                        <Avatar className="h-24 w-24 border-4 border-zinc-800">
                            <AvatarImage src={session.user?.image || ""} alt={session.user?.name || "User"} />
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-3xl">
                                {session.user?.name?.[0] || <User className="h-12 w-12" />}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold tracking-tight text-white">User Profile</CardTitle>
                        <CardDescription className="text-zinc-400 mt-2">
                            Manage your account information
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Name Field */}
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                    className="pl-10 h-11 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-600 focus:border-blue-500 transition-colors"
                                    required
                                />
                            </div>
                        </div>

                        {/* Email Field (Read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-zinc-300">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                                <Input
                                    id="email"
                                    value={formData.email}
                                    className="pl-10 h-11 bg-zinc-800/30 border-zinc-700 text-zinc-500 cursor-not-allowed"
                                    disabled
                                />
                            </div>
                            <p className="text-xs text-zinc-500">Email cannot be changed</p>
                        </div>

                        {/* Role Field (Read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="role" className="text-zinc-300">Role</Label>
                            <div className="relative">
                                <Shield className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                                <Input
                                    id="role"
                                    value={(session.user as any).role || "Viewer"}
                                    className="pl-10 h-11 bg-zinc-800/30 border-zinc-700 text-zinc-500 cursor-not-allowed"
                                    disabled
                                />
                            </div>
                            <p className="text-xs text-zinc-500">Role is assigned by administrators</p>
                        </div>

                        {/* Submit Button */}
                        <div className="pt-4">
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium h-11 rounded-lg transition-all duration-300 shadow-lg shadow-blue-900/20"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    "Update Profile"
                                )}
                            </Button>
                        </div>
                    </form>

                    {/* Account Info */}
                    <div className="pt-6 border-t border-zinc-800">
                        <h3 className="text-sm font-semibold text-zinc-400 mb-3">Account Information</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Account Type</span>
                                <span className="text-white font-medium">
                                    {session.user?.image ? "Google OAuth" : "Credentials"}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-zinc-500">Access Level</span>
                                <span className="text-white font-medium">{(session.user as any).role || "Viewer"}</span>
                            </div>
                        </div>
                    </div>


                </CardContent>
            </Card>
        </div>
    )
}
