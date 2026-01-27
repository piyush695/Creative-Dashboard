"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Lock, Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { verifyCurrentPassword, updatePassword } from "@/actions/auth-actions"
import { signOut } from "next-auth/react"

interface ChangePasswordDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    email: string
}

export function ChangePasswordDialog({ open, onOpenChange, email }: ChangePasswordDialogProps) {
    const { toast } = useToast()
    const [step, setStep] = useState<"verify" | "update">("verify")
    const [loading, setLoading] = useState(false)

    // State for Verification
    const [currentPassword, setCurrentPassword] = useState("")
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            const timer = setTimeout(() => {
                setStep("verify")
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
                setShowCurrentPassword(false)
                setShowNewPassword(false)
                setShowConfirmPassword(false)
            }, 300)
            return () => clearTimeout(timer)
        }
    }, [open])

    // State for New Password
    const [newPassword, setNewPassword] = useState("")
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleVerify = async () => {
        if (!currentPassword) return
        setLoading(true)
        try {
            const res = await verifyCurrentPassword(email, currentPassword)
            if (res.error) {
                toast({ title: "Error", description: res.error, variant: "destructive" })
            } else if (res.isMatch) {
                setStep("update")
                toast({ title: "Success", description: "Password verified", variant: "success" })
            } else {
                toast({ title: "Error", description: "Incorrect password. Please try again.", variant: "destructive" })
            }
        } catch (error) {
            toast({ title: "Error", description: "Verification failed", variant: "destructive" })
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async () => {
        if (!newPassword || !confirmPassword) {
            toast({ title: "Error", description: "Please fill all fields", variant: "destructive" })
            return
        }
        if (newPassword !== confirmPassword) {
            toast({ title: "Error", description: "Passwords do not match", variant: "destructive" })
            return
        }

        setLoading(true)
        try {
            const res = await updatePassword(email, newPassword)
            if (res.success) {
                toast({ title: "Success", description: "Password updated successfully. Logging out...", variant: "success" })
                // Log out the user and redirect to login
                await signOut({ callbackUrl: "/login?passwordChanged=true" })
            } else {
                toast({ title: "Error", description: res.error || "Update failed", variant: "destructive" })
                setLoading(false)
            }
        } catch (error) {
            toast({ title: "Error", description: "Something went wrong", variant: "destructive" })
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                    <DialogDescription>
                        {step === "verify"
                            ? "Enter your current password to continue."
                            : "Enter your new password below."}
                    </DialogDescription>
                </DialogHeader>

                {step === "verify" ? (
                    <div className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="current-password"
                                    type={showCurrentPassword ? "text" : "password"}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="pl-9 pr-9"
                                    placeholder="********"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-9 w-9 px-2 hover:bg-transparent"
                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                >
                                    {showCurrentPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="sr-only">Toggle password visibility</span>
                                </Button>
                            </div>
                        </div>
                        <div className="flex justify-end pt-2">
                            <Button
                                onClick={handleVerify}
                                disabled={loading || !currentPassword}
                                className="w-full"
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Verify Password
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 pt-4 animate-in fade-in slide-in-from-right-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="new-password"
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="pl-9 pr-9"
                                    placeholder="New password"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-9 w-9 px-2 hover:bg-transparent"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                >
                                    {showNewPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="sr-only">Toggle password visibility</span>
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="confirm-password"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="pl-9 pr-9"
                                    placeholder="Confirm new password"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-0 top-0 h-9 w-9 px-2 hover:bg-transparent"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="sr-only">Toggle password visibility</span>
                                </Button>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button
                                onClick={handleUpdate}
                                disabled={loading}
                            >
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Password
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
