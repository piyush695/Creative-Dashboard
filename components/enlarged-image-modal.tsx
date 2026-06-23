'use client'

import { X } from "lucide-react"
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
                "fixed inset-0 z-[600] flex items-start justify-center bg-background/70 backdrop-blur-md animate-fade-in p-4 sm:p-8 pt-10 sm:pt-20",
                containerClassName
            )}
            onClick={onClose}
        >
            <div
                className="relative w-[95vw] max-w-3xl h-[70vh] card-premium rounded-xl shadow-lg overflow-hidden flex flex-col animate-scale-in mx-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[700] h-10 w-10 flex items-center justify-center glass text-foreground rounded-full transition-all hover:bg-accent shadow-sm active:scale-90"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex-1 bg-gradient-subtle flex items-center justify-center p-6 md:p-10 min-h-0 overflow-hidden">
                    <img
                        src={url}
                        alt={title}
                        className="max-w-full max-h-full w-auto h-auto object-contain shadow-md rounded-lg"
                    />
                </div>

                <div className="px-5 py-4 bg-card border-t border-border flex items-center gap-4 shrink-0">
                    <div className="flex flex-col min-w-0 flex-1">
                        {accountName && (
                            <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mb-1">
                                {accountName}
                            </span>
                        )}
                        <h4 className="text-[10px] leading-tight font-semibold text-foreground break-words line-clamp-2">{title}</h4>
                    </div>
                </div>
            </div>
        </div>
    )
}
