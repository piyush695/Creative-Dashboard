"use client"

import { useEffect, useRef, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"

const INACTIVITY_TIMEOUT = 12 * 60 * 1000 // 12 minutes in milliseconds
const REFRESH_INTERVAL = 1 * 60 * 1000 // Refresh session every 1 minute if active

export function SessionTimeout() {
    const { data: session, update } = useSession()
    const lastActivityRef = useRef<number>(Date.now())
    const timerRef = useRef<NodeJS.Timeout | null>(null)
    const refreshTimerRef = useRef<NodeJS.Timeout | null>(null)

    const handleActivity = useCallback(() => {
        lastActivityRef.current = Date.now()
    }, [])

    const handleLogout = useCallback(async () => {
        if (session) {
            await signOut({ redirectTo: "/login" })
        }
    }, [session])

    useEffect(() => {
        if (!session) return

        const checkInactivity = () => {
            const now = Date.now()
            if (now - lastActivityRef.current >= INACTIVITY_TIMEOUT) {
                handleLogout()
            }
        }

        const refreshSession = async () => {
            const now = Date.now()
            // If active within the last refresh interval, update the session
            if (now - lastActivityRef.current < REFRESH_INTERVAL) {
                await update()
            }
        }

        // Set up events to track activity
        const events = ["mousemove", "mousedown", "keypress", "scroll", "touchstart"]
        events.forEach(event => {
            window.addEventListener(event, handleActivity)
        })

        // Check for inactivity every minute
        timerRef.current = setInterval(checkInactivity, 60 * 1000)

        // Periodically refresh session token if active
        refreshTimerRef.current = setInterval(refreshSession, REFRESH_INTERVAL)

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity)
            })
            if (timerRef.current) clearInterval(timerRef.current)
            if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
        }
    }, [session, handleActivity, handleLogout, update])

    return null
}
