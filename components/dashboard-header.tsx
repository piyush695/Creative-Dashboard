"use client"

import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut, User, Settings, Lock, Sparkles } from "lucide-react"
import Link from "next/link"
import { ChangePasswordDialog } from "@/components/change-password-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function DashboardHeader() {
  const { data: session } = useSession()


  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)

  // Use optional chaining to safely access email
  const userEmail = session?.user?.email

  return (
    <div className="border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-10 transition-all duration-300">
      <div className="px-8 py-6 flex justify-between items-center">
        <a href="/" className="hover:opacity-80 transition-opacity">
          <div className="flex flex-col items-start leading-none">
            <div className="flex items-center gap-1.5">
              <span className="text-2xl md:text-3xl font-black tracking-tightest text-zinc-900 dark:text-zinc-100">
                hola<span className="text-[#007AFF]">prime</span>
              </span>
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#007AFF] animate-pulse" />
            </div>
            <span className="text-[10px] md:text-[11px] font-bold uppercase tracking-[0.3em] text-[#007AFF] opacity-80 mt-1.5">Creative Analyzer</span>
          </div>
        </a>

        {session?.user && (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-auto py-2 px-3 rounded-xl bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 transition-all duration-200 group gap-3 shadow-sm"
                >
                  <div className="hidden md:flex flex-col items-end mr-1">
                    <span className="text-sm font-bold text-zinc-900 leading-none">
                      {session.user.name}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 mt-1 bg-white px-1.5 py-0.5 rounded-md border border-zinc-200 shadow-sm">
                      {(session.user as any).role || "Viewer"}
                    </span>
                  </div>

                  <Avatar className="h-10 w-10 border-2 border-white shadow-md transition-transform group-hover:scale-105">
                    <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold">
                      {session.user.name?.[0]?.toUpperCase() || <User className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>

                  {/* <Settings className="w-5 h-5 text-zinc-400 group-hover:text-zinc-600 transition-colors" /> */}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-white border-zinc-200 text-zinc-900 p-2 shadow-xl" align="end" forceMount>
                <DropdownMenuLabel className="font-normal p-3 bg-zinc-50 rounded-lg mb-2 border border-zinc-100">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-zinc-200">
                      <AvatarImage src={session.user.image || ""} />
                      <AvatarFallback className="bg-blue-600 text-white">
                        {session.user.name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-semibold leading-none text-zinc-900">{session.user.name}</p>
                      <p className="text-xs text-zinc-500">{session.user.email}</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-zinc-100 my-1" />
                <Link href="/profile">
                  <DropdownMenuItem className="cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100 text-zinc-700 focus:text-zinc-900 rounded-md py-2.5 px-3 transition-colors my-1">
                    <Settings className="mr-3 h-4 w-4 text-zinc-500 group-hover:text-zinc-900" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                </Link>

                {/* Change Password Item - Only for Credentials Users */}
                {!session.user?.image && (
                  <DropdownMenuItem
                    className="cursor-pointer hover:bg-zinc-100 focus:bg-zinc-100 text-zinc-700 focus:text-zinc-900 rounded-md py-2.5 px-3 transition-colors my-1"
                    onSelect={(e) => {
                      e.preventDefault()
                      setIsPasswordDialogOpen(true)
                    }}
                  >
                    <Lock className="mr-3 h-4 w-4 text-zinc-500 group-hover:text-zinc-900" />
                    <span>Change Password</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-zinc-100 my-1" />
                <DropdownMenuItem
                  className="text-red-500 hover:bg-red-50 focus:bg-red-50 focus:text-red-600 cursor-pointer rounded-md py-2.5 px-3 transition-colors my-1"
                  onClick={() => signOut()}
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {userEmail && (
              <ChangePasswordDialog
                open={isPasswordDialogOpen}
                onOpenChange={setIsPasswordDialogOpen}
                email={userEmail}
              />
            )}

          </>
        )}
      </div>
    </div>
  )
}
