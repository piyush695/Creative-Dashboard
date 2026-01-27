"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Chrome, Lock, Eye, EyeOff, CheckCircle2 } from "lucide-react"
import { resetPassword } from "@/actions/auth-actions"
import { useToast } from "@/hooks/use-toast"

function ResetPasswordForm() {
    const { toast } = useToast()
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isLoading, setIsLoading] = useState(false)
    const [isSuccess, setIsSuccess] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    const email = searchParams.get("email")
    const token = searchParams.get("token")

    useEffect(() => {
        if (!email || !token) {
            toast({ title: "Invalid Link", description: "This reset link is invalid or expired.", variant: "destructive" })
            router.push("/login")
        }
    }, [email, token, router, toast])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            toast({ title: "Error", description: "Passwords do not match", variant: "destructive" })
            return
        }

        setIsLoading(true)
        const formData = new FormData()
        formData.append("email", email!)
        formData.append("token", token!)
        formData.append("newPassword", password)

        const result = await resetPassword(formData)
        setIsLoading(false)

        if (result.success) {
            setIsSuccess(true)
            toast({ title: "Success", description: "Password updated successfully!", variant: "success" })
            setTimeout(() => router.push("/login"), 3000)
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        }
    }

    if (isSuccess) {
        return (
            <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50 backdrop-blur-xl text-center p-6">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Password Reset!</h2>
                <p className="text-zinc-400 mb-6">Your password has been updated. Redirecting to login...</p>
                <Button className="w-full bg-blue-600" onClick={() => router.push("/login")}>Go to Login</Button>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
            <CardHeader className="text-center">
                <div className="mx-auto mb-4 p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 w-fit">
                    <Chrome className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-white">Set New Password</CardTitle>
                <CardDescription className="text-zinc-500">Enter a secure new password for your account</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-zinc-300">New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                            <Input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="pl-10 h-11 bg-zinc-800/50 border-zinc-700 text-white"
                                placeholder="••••••••"
                                required
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-zinc-500 hover:text-white">
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-zinc-300">Confirm Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3.5 h-4 w-4 text-zinc-500" />
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="pl-10 h-11 bg-zinc-800/50 border-zinc-700 text-white"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>
                    <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white h-11" disabled={isLoading}>
                        {isLoading ? "Updating..." : "Update Password"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <ResetPasswordForm />
            </Suspense>
        </div>
    )
}
