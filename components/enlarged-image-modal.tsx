'use client'

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EnlargedImageModalProps {
    url: string
    title: string
    accountName?: string
    onClose: () => void
    containerClassName?: string
}

export function EnlargedImageModal({ url, title, accountName, onClose, containerClassName }: EnlargedImageModalProps) {
    return (
        <div
            className={cn(
                "fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-6 sm:p-8",
                containerClassName
            )}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-6xl h-full max-h-[85vh] bg-zinc-900 dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10 animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 z-[700] h-10 w-10 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all border border-white/20 shadow-2xl active:scale-90"
                >
                    <X className="h-5 w-5" />
                </button>
                <div className="flex-1 overflow-auto bg-zinc-950 flex items-center justify-center">
                    <img
                        src={url}
                        alt={title}
                        className="max-w-full max-h-full object-contain"
                    />
                </div>
                <div className="p-4 bg-zinc-900 border-t border-white/10 flex items-center justify-between gap-4">
                    <div className="flex flex-col min-w-0">
                        {accountName && (
                            <span className="text-[10px] font-black text-[#007AFF] uppercase tracking-[0.2em] mb-0.5">
                                {accountName}
                            </span>
                        )}
                        <h4 className="text-sm font-bold text-white break-all">{title}</h4>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClose}
                        className="text-xs h-8 text-white border-white/20 hover:bg-white/10 hover:text-white shrink-0 bg-transparent"
                    >
                        Close
                    </Button>
                </div>
            </div>
        </div>
    )
}
