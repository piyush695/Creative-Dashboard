'use client'

import { useCallback, useEffect, useRef, useState } from "react"
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnlargedImageModalProps {
    url: string
    title: string
    accountName?: string
    onClose: () => void
    containerClassName?: string
}

const MIN_SCALE = 1
const MAX_SCALE = 5
const STEP = 0.5

export function EnlargedImageModal({ url, title, accountName, onClose, containerClassName }: EnlargedImageModalProps) {
    const [scale, setScale] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null)
    const [dragging, setDragging] = useState(false)

    const reset = useCallback(() => {
        setScale(1)
        setOffset({ x: 0, y: 0 })
    }, [])

    // Clamp scale into range; snap pan back to centre whenever we return to 1×.
    const applyScale = useCallback((next: number) => {
        const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(next.toFixed(2))))
        setScale(clamped)
        if (clamped <= 1) setOffset({ x: 0, y: 0 })
    }, [])

    const zoomIn = useCallback(() => applyScale(scale + STEP), [scale, applyScale])
    const zoomOut = useCallback(() => applyScale(scale - STEP), [scale, applyScale])

    // Esc to close, +/- to zoom, 0 to reset — keyboard parity for inspection.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose()
            else if (e.key === "+" || e.key === "=") zoomIn()
            else if (e.key === "-" || e.key === "_") zoomOut()
            else if (e.key === "0") reset()
        }
        window.addEventListener("keydown", onKey)
        return () => window.removeEventListener("keydown", onKey)
    }, [onClose, zoomIn, zoomOut, reset])

    const onWheel = (e: React.WheelEvent) => {
        e.preventDefault()
        applyScale(scale + (e.deltaY < 0 ? STEP : -STEP))
    }

    const onPointerDown = (e: React.PointerEvent) => {
        if (scale <= 1) return
        e.preventDefault()
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        dragRef.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y }
        setDragging(true)
    }
    const onPointerMove = (e: React.PointerEvent) => {
        if (!dragRef.current) return
        setOffset({
            x: dragRef.current.originX + (e.clientX - dragRef.current.startX),
            y: dragRef.current.originY + (e.clientY - dragRef.current.startY),
        })
    }
    const endDrag = () => {
        dragRef.current = null
        setDragging(false)
    }

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
                {/* Zoom toolbar */}
                <div className="absolute top-4 left-4 z-[700] flex items-center gap-1 rounded-full glass p-1 shadow-sm">
                    <button
                        onClick={zoomOut}
                        disabled={scale <= MIN_SCALE}
                        aria-label="Zoom out"
                        className="grid h-8 w-8 place-items-center rounded-full text-foreground transition-all hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent active:scale-90"
                    >
                        <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className="min-w-[3rem] text-center text-xs font-semibold tabular-nums text-foreground">
                        {Math.round(scale * 100)}%
                    </span>
                    <button
                        onClick={zoomIn}
                        disabled={scale >= MAX_SCALE}
                        aria-label="Zoom in"
                        className="grid h-8 w-8 place-items-center rounded-full text-foreground transition-all hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent active:scale-90"
                    >
                        <ZoomIn className="h-4 w-4" />
                    </button>
                    <button
                        onClick={reset}
                        disabled={scale === 1 && offset.x === 0 && offset.y === 0}
                        aria-label="Reset zoom"
                        className="grid h-8 w-8 place-items-center rounded-full text-foreground transition-all hover:bg-accent disabled:opacity-40 disabled:hover:bg-transparent active:scale-90"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </button>
                </div>

                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-4 right-4 z-[700] h-10 w-10 flex items-center justify-center glass text-foreground rounded-full transition-all hover:bg-accent shadow-sm active:scale-90"
                >
                    <X className="h-5 w-5" />
                </button>

                <div
                    className={cn(
                        "flex-1 bg-gradient-subtle flex items-center justify-center p-6 md:p-10 min-h-0 overflow-hidden select-none",
                        scale > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-in"
                    )}
                    onWheel={onWheel}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endDrag}
                    onPointerLeave={endDrag}
                    onDoubleClick={() => (scale > 1 ? reset() : applyScale(2))}
                >
                    <img
                        src={url}
                        alt={title}
                        draggable={false}
                        className="max-w-full max-h-full w-auto h-auto object-contain shadow-md rounded-lg"
                        style={{
                            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                            transition: dragging ? "none" : "transform 0.15s ease-out",
                        }}
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
                    <span className="hidden sm:block shrink-0 text-[10px] text-muted-foreground">
                        Scroll or double-click to zoom · drag to pan
                    </span>
                </div>
            </div>
        </div>
    )
}
