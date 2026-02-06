"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Lock, User as UserIcon, Eye, EyeOff, ShieldCheck, Zap, Sun, Moon, Sparkles, KeyRound } from "lucide-react"
import {
    sendVerificationCode,
    verifyAndRegister,
    loginWithCredentials,
    sendPasswordResetCode,
    verifyResetOTP,
    resetPassword
} from "@/actions/auth-actions"
import { useToast } from "@/hooks/use-toast"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
    const { toast } = useToast()
    const searchParams = useSearchParams()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [view, setView] = useState<"login" | "register" | "forgot">("login")
    const [showLoginPassword, setShowLoginPassword] = useState(false)
    const [showRegisterPassword, setShowRegisterPassword] = useState(false)
    const [showResetPassword, setShowResetPassword] = useState(false)
    const [showConfirmResetPassword, setShowConfirmResetPassword] = useState(false)

    // Theme state with persistence
    const [theme, setTheme] = useState<"light" | "dark">("light")
    const [mounted, setMounted] = useState(false)

    // Registration State
    const [regStep, setRegStep] = useState<"details" | "otp">("details")
    const [regData, setRegData] = useState({ name: "", email: "", password: "" })
    const [regOtp, setRegOtp] = useState("")

    // Forgot Password State
    const [forgotStep, setForgotStep] = useState<"email" | "otp" | "reset">("email")
    const [forgotEmail, setForgotEmail] = useState("")
    const [forgotOtp, setForgotOtp] = useState("")
    const [newResetPassword, setNewResetPassword] = useState("")
    const [confirmResetPassword, setConfirmResetPassword] = useState("")

    // Load theme from localStorage on mount
    useEffect(() => {
        const savedTheme = localStorage.getItem("holaprime-theme") as "light" | "dark" | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
            setTheme("dark");
        }
        setMounted(true);
    }, []);

    // Save theme to localStorage when it changes
    useEffect(() => {
        if (mounted) {
            localStorage.setItem("holaprime-theme", theme);
            if (theme === "dark") {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        }
    }, [theme, mounted]);

    useEffect(() => {
        const error = searchParams.get("error")
        if (error) {
            let title = "Login Failed"
            let description = "An unexpected error occurred. Please try again."

            if (error === "CredentialsSignin") {
                description = "Invalid email or password"
            } else if (error === "AccessDenied" || error === "Configuration") {
                title = "Access Restricted"
                description = "This dashboard is exclusively for @holaprime.com team members."
            }

            toast({ title, description, variant: "destructive", duration: 5000 })

            const timer = setTimeout(() => {
                router.replace("/login")
            }, 5000)

            return () => clearTimeout(timer)
        }
    }, [searchParams, toast, router])

    const handleRegisterStep1 = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsLoading(true)
        const formData = new FormData(e.currentTarget)

        const result = await sendVerificationCode(formData)
        setIsLoading(false)

        if (result.error) {
            if (result.error === "AccountAlreadyExists") {
                setView("login")
                toast({ title: "Account Exists", description: "This email is already registered. Please login.", variant: "default" })
            } else {
                toast({ title: "Error", description: result.error, variant: "destructive" })
            }
        } else {
            setRegData({
                name: formData.get("name") as string,
                email: formData.get("email") as string,
                password: formData.get("password") as string
            })
            setRegStep("otp")
            toast({ title: "Code Sent", description: "Verification code sent to your inbox.", variant: "success" })
        }
    }

    const handleRegisterStep2 = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!regOtp) return
        setIsLoading(true)

        const formData = new FormData()
        formData.append("name", regData.name)
        formData.append("email", regData.email)
        formData.append("password", regData.password)
        formData.append("otp", regOtp)

        const result = await verifyAndRegister(formData)
        setIsLoading(false)

        if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        } else {
            toast({ title: "Success", description: "Account verified! Welcome aboard.", variant: "success" })
            window.location.href = "/?loggedIn=true&welcome=true"
        }
    }

    const handleForgotEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!forgotEmail) return
        setIsLoading(true)
        const formData = new FormData()
        formData.append("email", forgotEmail)

        const result = await sendPasswordResetCode(formData)
        setIsLoading(false)

        if (result.error === "UserNotFound") {
            toast({ title: "Account Not Found", description: "Account not found. Please create an account.", variant: "default" })
            setView("register")
        } else if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        } else {
            setForgotStep("otp")
            toast({ title: "OTP Sent", description: "Recovery code sent to your email.", variant: "success" })
        }
    }

    const handleForgotOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!forgotOtp) return
        setIsLoading(true)
        const formData = new FormData()
        formData.append("email", forgotEmail)
        formData.append("otp", forgotOtp)

        const result = await verifyResetOTP(formData)
        setIsLoading(false)

        if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        } else {
            setForgotStep("reset")
            toast({ title: "Verified", description: "Set your new password below.", variant: "success" })
        }
    }

    const handleResetPasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newResetPassword || !confirmResetPassword) return

        if (newResetPassword !== confirmResetPassword) {
            toast({ title: "Mismatch", description: "Passwords do not match", variant: "destructive" })
            return
        }

        setIsLoading(true)
        const formData = new FormData()
        formData.append("email", forgotEmail)
        formData.append("otp", forgotOtp)
        formData.append("newPassword", newResetPassword)

        const result = await resetPassword(formData)
        setIsLoading(false)

        if (result.error) {
            toast({ title: "Error", description: result.error, variant: "destructive" })
        } else {
            toast({ title: "Success", description: "Password reset completed. Please login.", variant: "success" })
            setView("login")
            setForgotStep("email")
            setForgotEmail("")
            setForgotOtp("")
            setNewResetPassword("")
            setConfirmResetPassword("")
        }
    }

    const handleGoogleLogin = () => {
        signIn("google", { callbackUrl: "/?loggedIn=true" })
    }

    const toggleTheme = () => {
        setTheme(theme === "light" ? "dark" : "light");
    };

    if (!mounted) return <div className="min-h-screen bg-[#F8F9FB] dark:bg-[#0A0C10]" />;

    return (
        <div className={`min-h-[100svh] w-full flex flex-col items-center transition-all duration-700 relative font-sans ${theme === "dark" ? "bg-[#000000] text-white" : "bg-[#F8F9FB] text-[#081329]"}`}>
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className={`absolute top-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-20 blur-[120px] transition-colors duration-1000 ${theme === "dark" ? "bg-[#007AFF]" : "bg-blue-300"}`} />
                <div className={`absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-10 blur-[100px] transition-colors duration-1000 ${theme === "dark" ? "bg-[#2DA6E3]" : "bg-indigo-300"}`} />
            </div>

            {/* Header: Exact Logo and Theme Toggle */}
            <header className="w-full flex justify-between items-center z-20 p-4 md:p-8 flex-shrink-0 sticky top-0 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <div className="flex flex-col items-start leading-none cursor-pointer hover:opacity-80 transition-opacity">
                            <div className="flex items-center gap-1.5">
                                <span className={`text-xl md:text-2xl font-black tracking-tightest ${theme === "dark" ? "text-white" : "text-[#000]"}`}>
                                    hola<span className="text-[#007AFF]">prime</span>
                                </span>
                                <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-[#007AFF] animate-pulse" />
                            </div>
                            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.3em] text-[#007AFF] opacity-80 mt-1">Creative Analyzer</span>
                        </div>
                    </Link>
                </div>
                <button
                    onClick={toggleTheme}
                    className={`p-2.5 md:p-3 rounded-full border transition-all duration-500 hover:scale-110 active:scale-95 ${theme === "dark" ? "bg-white/5 border-white/10 text-yellow-400 hover:bg-white/10" : "bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50 shadow-sm"}`}
                >
                    {theme === "light" ? <Moon className="w-4 h-4 md:w-5 md:h-5" /> : <Sun className="w-4 h-4 md:w-5 md:h-5" />}
                </button>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center w-full px-4 py-[5vh] relative z-10">
                <div className="w-full max-w-[440px] flex flex-col justify-center gap-6 md:gap-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
                    <div className="text-center space-y-1.5 md:space-y-3 flex-shrink-0">
                        <div className="inline-flex items-center px-2 py-0.5 md:px-3 md:py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#007AFF] text-[9px] md:text-[10px] font-bold uppercase tracking-widest mb-1">
                            System Online
                        </div>
                        <h1 className={`text-xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight ${theme === "dark" ? "text-white" : "text-[#081329]"}`}>
                            {view === "login" ? "Sign In" : view === "register" ? "Join HolaPrime" : "Recover Key"}
                        </h1>
                        <p className={`text-[11px] md:text-xs lg:text-sm font-medium leading-relaxed max-w-[320px] mx-auto ${theme === "dark" ? "text-zinc-500" : "text-[#6B7280]"}`}>
                            {view === "login" ? "Secure access to the industry's most advanced creative analysis engine" : view === "register" ? "Deploy your professional profile to the HolaPrime network" : "Validate your identity to reset your secure credentials"}
                        </p>
                    </div>

                    <div className={`p-[1px] rounded-[1.5rem] md:rounded-[2.5rem] transition-all duration-500 overflow-hidden flex-shrink-0 ${theme === "dark" ? "bg-gradient-to-b from-white/10 to-transparent shadow-[0_40px_100px_rgba(0,0,0,1)]" : "bg-gradient-to-b from-transparent to-zinc-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.03)]"}`}>
                        <div className={`p-5 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] space-y-4 md:space-y-6 backdrop-blur-3xl transition-colors duration-500 ${theme === "dark" ? "bg-[#0A0C10]/95" : "bg-white/95"}`}>
                            {view === "login" && (
                                <>
                                    <Button
                                        className={`w-full h-12 md:h-14 rounded-full flex items-center justify-center gap-3 transition-all duration-300 border group ${theme === "dark" ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-white border-zinc-200 hover:bg-zinc-50 text-[#081329]"}`}
                                        onClick={handleGoogleLogin}
                                        type="button"
                                    >
                                        <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <span className="text-sm font-bold tracking-tight">Enterprise Login</span>
                                    </Button>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className={`w-full border-t ${theme === "dark" ? "border-white/5" : "border-zinc-100"}`}></span>
                                        </div>
                                        <div className={`relative flex justify-center text-[8px] md:text-[9px] uppercase font-black tracking-[0.4em] ${theme === "dark" ? "text-zinc-700" : "text-[#9CA3AF]"}`}>
                                            <span className={`${theme === "dark" ? "bg-[#0A0C10]" : "bg-white"} px-4`}>Core Protocol</span>
                                        </div>
                                    </div>

                                    <form
                                        onSubmit={async (e) => {
                                            e.preventDefault()
                                            setIsLoading(true)
                                            const formData = new FormData(e.currentTarget)
                                            const email = (formData.get("email") as string)?.trim().toLowerCase()
                                            const password = formData.get("password") as string

                                            try {
                                                const result = await signIn("credentials", {
                                                    email,
                                                    password,
                                                    redirect: false,
                                                })

                                                if (result?.error) {
                                                    const msg = result.error === "EmailNotVerified"
                                                        ? "Please verify your email first!"
                                                        : "Invalid email or password";
                                                    toast({ title: "Login Failed", description: msg, variant: "destructive" })
                                                } else {
                                                    window.location.href = "/?loggedIn=true"
                                                }
                                            } finally {
                                                setIsLoading(false)
                                            }
                                        }}
                                        className="space-y-5"
                                    >
                                        <div className="space-y-1.5 md:space-y-2">
                                            <Label htmlFor="email" className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1 ${theme === "dark" ? "text-zinc-500" : "text-[#081329]"}`}>Registry Email</Label>
                                            <div className="relative group">
                                                <Mail className={`absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 transition-colors ${theme === "dark" ? "text-zinc-600 group-focus-within:text-[#007AFF]" : "text-zinc-400 group-focus-within:text-[#007AFF]"}`} />
                                                <Input
                                                    id="email"
                                                    name="email"
                                                    type="email"
                                                    placeholder="email@example.com"
                                                    className={`h-11 md:h-14 pl-11 rounded-2xl text-sm transition-all duration-300 border-2 ${theme === "dark" ? "bg-[#000] border-white/5 focus:border-[#007AFF]/50 text-white" : "bg-zinc-50 border-transparent focus:bg-white focus:border-[#007AFF]/20 text-[#081329]"}`}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5 md:space-y-2">
                                            <div className="flex justify-between items-center ml-1">
                                                <Label htmlFor="password" title="Password" className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ${theme === "dark" ? "text-zinc-500" : "text-[#081329]"}`}>Personal Key</Label>
                                            </div>
                                            <div className="relative group">
                                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 md:w-4 md:h-4 transition-colors ${theme === "dark" ? "text-zinc-600 group-focus-within:text-[#007AFF]" : "text-zinc-400 group-focus-within:text-[#007AFF]"}`} />
                                                <Input
                                                    id="password"
                                                    name="password"
                                                    type={showLoginPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    className={`h-11 md:h-14 pl-11 pr-12 rounded-2xl text-sm transition-all duration-300 border-2 ${theme === "dark" ? "bg-[#000] border-white/5 focus:border-[#007AFF]/50 text-white" : "bg-zinc-50 border-transparent focus:bg-white focus:border-[#007AFF]/20 text-[#081329]"}`}
                                                    required
                                                />
                                                <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-[#007AFF] transition-all">
                                                    {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                </button>
                                            </div>
                                            <div className="flex justify-end">
                                                <button type="button" onClick={() => setView("forgot")} className={`text-[10px] md:text-xs font-bold hover:text-[#007AFF] transition-all ${theme === "dark" ? "text-zinc-600" : "text-[#081329]"}`}>
                                                    Recovery Assist
                                                </button>
                                            </div>
                                        </div>
                                        <Button type="submit" className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white h-12 md:h-14 rounded-full font-black text-sm shadow-[0_10px_30px_rgba(0,122,255,0.3)] transition-all active:scale-[0.98] group" disabled={isLoading}>
                                            <span className="flex items-center gap-2">
                                                {isLoading ? "Validating Protocol..." : "Access Dashboard"}
                                                <Zap className="w-4 h-4 fill-white" />
                                            </span>
                                        </Button>
                                    </form>
                                </>
                            )}

                            {view === "register" && (
                                regStep === "details" ? (
                                    <form onSubmit={handleRegisterStep1} className="space-y-5 animate-in fade-in slide-in-from-right-8 duration-500">
                                        <div className="space-y-2">
                                            <Label htmlFor="reg-name" className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1 ${theme === "dark" ? "text-zinc-500" : "text-[#081329]"}`}>Identity Name</Label>
                                            <Input id="reg-name" name="name" placeholder="John Doe" className={`h-11 md:h-14 rounded-2xl text-sm transition-all duration-300 border-2 ${theme === "dark" ? "bg-[#000] border-white/5 focus:border-[#007AFF]/50 text-white" : "bg-zinc-50 border-transparent focus:bg-white focus:border-[#007AFF]/20 text-[#081329]"}`} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="reg-email" className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1 ${theme === "dark" ? "text-zinc-500" : "text-[#081329]"}`}>Corporate Email</Label>
                                            <Input id="reg-email" name="email" type="email" placeholder="name@holaprime.com" className={`h-11 md:h-14 rounded-2xl text-sm transition-all duration-300 border-2 ${theme === "dark" ? "bg-[#000] border-white/5 focus:border-[#007AFF]/50 text-white" : "bg-zinc-50 border-transparent focus:bg-white focus:border-[#007AFF]/20 text-[#081329]"}`} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="reg-password" title="Password" className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1 ${theme === "dark" ? "text-zinc-500" : "text-[#081329]"}`}>Security Key</Label>
                                            <input id="reg-password" name="password" type={showRegisterPassword ? "text" : "password"} placeholder="••••••••" className={`w-full h-11 md:h-14 px-4 rounded-2xl text-sm transition-all duration-300 border-2 outline-none ${theme === "dark" ? "bg-[#000] border-white/5 focus:border-[#007AFF]/50 text-white" : "bg-zinc-50 border-transparent focus:bg-white focus:border-[#007AFF]/20 text-[#081329]"}`} required />
                                        </div>
                                        <Button type="submit" className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white h-12 md:h-14 rounded-full font-black text-sm shadow-[0_10px_30px_rgba(0,122,255,0.3)]" disabled={isLoading}>
                                            {isLoading ? "Deploying Code..." : "Initialize Registry"}
                                        </Button>
                                    </form>
                                ) : (
                                    <form onSubmit={handleRegisterStep2} className="space-y-8 animate-in zoom-in-95 duration-500">
                                        <div className={`text-center py-8 rounded-[2rem] border-2 flex flex-col items-center ${theme === "dark" ? "bg-white/5 border-white/5 shadow-inner" : "bg-blue-50/50 border-blue-100"}`}>
                                            <ShieldCheck className="w-16 h-16 text-[#007AFF] mb-4 drop-shadow-[0_0_15px_rgba(0,122,255,0.4)] animate-pulse" />
                                            <h4 className="font-black text-lg">Verification Pending</h4>
                                            <p className="text-[11px] text-zinc-500 mt-2 font-bold tracking-tight px-6 text-center">Security packet transmitted to: <span className="text-[#007AFF] block mt-1">{regData.email}</span></p>
                                        </div>
                                        <div className="space-y-4">
                                            <Input
                                                value={regOtp}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRegOtp(e.target.value)}
                                                placeholder="• • • • • •"
                                                maxLength={6}
                                                className={`h-14 md:h-20 text-center text-3xl md:text-5xl font-black tracking-[0.3em] rounded-[1.5rem] transition-all duration-300 border-2 ${theme === "dark" ? "bg-black border-white/10 focus:border-[#007AFF] text-white" : "bg-white border-zinc-200 focus:border-[#007AFF] text-[#007AFF]"}`}
                                                required
                                            />
                                        </div>
                                        <Button type="submit" className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white h-12 md:h-16 rounded-full font-black text-lg shadow-[0_15px_40px_rgba(0,122,255,0.4)]" disabled={isLoading || regOtp.length < 6}>
                                            {isLoading ? "Authorizing Identity..." : "Finalize Deployment"}
                                        </Button>
                                        <button type="button" onClick={() => setRegStep("details")} className="w-full text-xs font-bold text-zinc-500 hover:text-[#007AFF] transition-all">
                                            Return to Identity Details
                                        </button>
                                    </form>
                                )
                            )}

                            {view === "forgot" && (
                                <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
                                    {forgotStep === "email" && (
                                        <form onSubmit={handleForgotEmailSubmit} className="space-y-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="f-email" className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1 ${theme === "dark" ? "text-zinc-500" : "text-[#081329]"}`}>Registered Email</Label>
                                                <Input id="f-email" type="email" value={forgotEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForgotEmail(e.target.value)} placeholder="your@email.com" className={`h-11 md:h-14 rounded-2xl text-sm transition-all duration-300 border-2 ${theme === "dark" ? "bg-[#000] border-white/5 focus:border-[#007AFF]/50 text-white" : "bg-zinc-50 border-transparent focus:bg-white focus:border-[#007AFF]/20 text-[#081329]"}`} required />
                                            </div>
                                            <Button type="submit" className="w-full bg-[#007AFF] hover:bg-[#0062CC] text-white h-14 rounded-full font-black text-sm shadow-[0_10px_30px_rgba(0,122,255,0.3)]" disabled={isLoading}>
                                                {isLoading ? "Tracing Account..." : "Initiate Recovery Sequence"}
                                            </Button>
                                        </form>
                                    )}

                                    {forgotStep === "otp" && (
                                        <form onSubmit={handleForgotOtpSubmit} className="space-y-8 text-center">
                                            <KeyRound className="w-16 h-16 text-[#007AFF] mx-auto mb-4 drop-shadow-[0_0_15px_rgba(0,122,255,0.3)]" />
                                            <Input
                                                value={forgotOtp}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForgotOtp(e.target.value)}
                                                placeholder="• • • • • •"
                                                maxLength={6}
                                                className={`h-20 text-center text-5xl font-black tracking-[0.3em] rounded-[1.5rem] border-2 ${theme === "dark" ? "bg-black border-white/10 text-white focus:border-[#007AFF]" : "bg-white border-zinc-200 text-[#007AFF] focus:border-[#007AFF]"}`}
                                                required
                                            />
                                            <Button type="submit" className="w-full bg-[#007AFF] text-white h-14 rounded-full font-black text-sm" disabled={isLoading || forgotOtp.length < 6}>
                                                {isLoading ? "Checking Key..." : "Validate Recovery Code"}
                                            </Button>
                                        </form>
                                    )}

                                    {forgotStep === "reset" && (
                                        <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
                                            <div className="space-y-2">
                                                <Label htmlFor="new-pass" className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1 ${theme === "dark" ? "text-zinc-500" : "text-[#081329]"}`}>New Security Key</Label>
                                                <Input id="new-pass" type={showResetPassword ? "text" : "password"} value={newResetPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewResetPassword(e.target.value)} placeholder="••••••••" className={`h-11 md:h-14 rounded-2xl text-sm border-2 ${theme === "dark" ? "bg-black border-white/5 text-white" : "bg-zinc-50 border-zinc-100"}`} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="confirm-pass" className={`text-[9px] md:text-[10px] font-black uppercase tracking-widest ml-1 ${theme === "dark" ? "text-zinc-500" : "text-[#081329]"}`}>Confirm Key</Label>
                                                <Input id="confirm-pass" type={showConfirmResetPassword ? "text" : "password"} value={confirmResetPassword} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmResetPassword(e.target.value)} placeholder="••••••••" className={`h-11 md:h-14 rounded-2xl text-sm border-2 ${theme === "dark" ? "bg-black border-white/5 text-white" : "bg-zinc-50 border-zinc-100"}`} required />
                                            </div>
                                            <Button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white h-14 rounded-full font-black text-sm shadow-[0_10px_30px_rgba(34,197,94,0.3)]" disabled={isLoading}>
                                                Commit Key Update
                                            </Button>
                                        </form>
                                    )}
                                    <button className="w-full text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-[#007AFF] transition-all" onClick={() => { setView("login"); setForgotStep("email"); }}>
                                        Abort & Return to Core
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center pt-1 md:pt-2 flex-shrink-0">
                        <p className={`text-xs md:text-sm font-medium tracking-tight ${theme === "dark" ? "text-zinc-500" : "text-[#4B5563]"}`}>
                            {view === "login" ? (
                                <>
                                    Identity not registered?{" "}
                                    <button onClick={() => setView("register")} className={`font-black hover:text-[#007AFF] underline underline-offset-4 transition-all ${theme === "dark" ? "text-white" : "text-[#081329]"}`}>
                                        Join Network
                                    </button>
                                </>
                            ) : (
                                <>
                                    Access level already granted?{" "}
                                    <button onClick={() => setView("login")} className={`font-black hover:text-[#007AFF] underline underline-offset-4 transition-all ${theme === "dark" ? "text-white" : "text-[#081329]"}`}>
                                        Return to Sign In
                                    </button>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}
