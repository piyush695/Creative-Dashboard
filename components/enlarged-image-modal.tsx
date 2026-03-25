'use client'

import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { historyImageCache } from "@/lib/image-cache"

interface EnlargedImageModalProps {
    url: string
    title: string
    id?: string
    accountName?: string
    onClose: () => void
    containerClassName?: string
}

export function EnlargedImageModal({ url: initialUrl, title, id, accountName, onClose, containerClassName }: EnlargedImageModalProps) {
    const [url, setUrl] = useState(initialUrl)

    useEffect(() => {
        if (!initialUrl && id) {
            // Check cache first in case it was just populated
            const cached = historyImageCache[id];
            if (cached) {
                setUrl(cached);
                return;
            }
            
            fetch(`/api/history-image?id=${id}`)
                .then(res => res.json())
                .then(data => {
                    if (data.imageUrl) {
                        setUrl(data.imageUrl)
                    }
                })
                .catch(err => {
                    console.error("Failed to load large image", err)
                })
        }
    }, [initialUrl, id])

    return (
        <div
            className={cn(
                "fixed inset-0 z-[600] flex items-start justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200 p-4 sm:p-8 pt-10 sm:pt-20",
                containerClassName
            )}
            onClick={onClose}
        >
            <div
                className="relative w-[95vw] max-w-3xl h-[70vh] bg-white dark:bg-zinc-900 rounded-2xl shadow-[0_0_80px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col ring-1 ring-black/5 dark:ring-white/10 animate-in zoom-in-95 duration-300 mx-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-[700] h-10 w-10 flex items-center justify-center bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-md transition-all border border-white/20 shadow-2xl active:scale-90"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex-1 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 md:p-8 min-h-0 overflow-hidden relative">
                    {url && (
                        <img
                            src={url}
                            alt={title}
                            className="max-w-full max-h-full w-auto h-auto object-contain shadow-2xl rounded-sm"
                        />
                    )}
                </div>

                <div className="p-5 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-white/10 shrink-0">
                    <div className="flex flex-col min-w-0">
                        {accountName && (
                            <span className="text-[10px] font-black text-[#007AFF] uppercase tracking-[0.2em] mb-1.5">
                                {accountName}
                            </span>
                        )}
                        <h4 className="text-[11px] leading-tight font-bold text-zinc-900 dark:text-white break-words line-clamp-2 uppercase tracking-tight">{title}</h4>
                        {id && <span className="text-[9px] font-mono text-muted-foreground mt-1 opacity-50">ID: {id.slice(-8)}</span>}
                    </div>
                </div>
            </div>
        </div>
    )
}
