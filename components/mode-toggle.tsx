"use client"
import * as React from "react"
import { Moon, Sun, Activity } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ModeToggle() {
    const { setTheme } = useTheme()

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-xl h-10 w-10 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm transition-all hover:bg-zinc-50 dark:hover:bg-zinc-800/80 active:scale-95 flex-shrink-0"
                >
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-amber-500" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-indigo-400" />
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="rounded-2xl border-zinc-200/50 dark:border-zinc-800/50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl p-1.5 shadow-2xl"
            >
                <DropdownMenuItem onClick={() => setTheme("light")} className="rounded-xl cursor-pointer gap-2.5 px-3 py-2 text-xs font-semibold transition-colors focus:bg-indigo-50 dark:focus:bg-indigo-900/20">
                    <Sun className="h-4 w-4 text-amber-500" /> Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="rounded-xl cursor-pointer gap-2.5 px-3 py-2 text-xs font-semibold transition-colors focus:bg-indigo-50 dark:focus:bg-indigo-900/20">
                    <Moon className="h-4 w-4 text-indigo-400" /> Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="rounded-xl cursor-pointer gap-2.5 px-3 py-2 text-xs font-semibold transition-colors focus:bg-indigo-50 dark:focus:bg-indigo-900/20">
                    <Activity className="h-4 w-4 text-zinc-500" /> System
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
