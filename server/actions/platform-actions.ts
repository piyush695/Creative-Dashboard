"use server"

import clientPromise from "@/server/mongodb-client"
import { auth } from "@/server/auth"
import {
    DEFAULT_ENABLED_PLATFORMS,
    PLATFORM_CATALOG,
    isKnownPlatform,
} from "@/lib/platforms"

// Global (app-wide) platform configuration lives in a single document so that
// the chosen set applies to every user and persists across sessions.
const CONFIG_COLLECTION = "app_config"
const CONFIG_ID = "platforms"

const VALID_IDS = new Set(PLATFORM_CATALOG.map((p) => p.id))

async function getDb() {
    const client = await clientPromise
    return client.db(process.env.MONGODB_DB || "reddit_data")
}

/**
 * Read the globally-enabled platform ids. Public to any authenticated session
 * (the nav/filters need it). Falls back to the default set when unconfigured,
 * and always sanitises against the known catalog.
 */
export async function getEnabledPlatforms(): Promise<{ success: boolean; platforms: string[] }> {
    try {
        const db = await getDb()
        const doc = await db.collection(CONFIG_COLLECTION).findOne({ _id: CONFIG_ID as any })
        const stored: string[] | undefined = doc?.enabled
        const enabled = Array.isArray(stored) && stored.length > 0
            ? stored.filter(isKnownPlatform)
            : [...DEFAULT_ENABLED_PLATFORMS]
        return { success: true, platforms: enabled }
    } catch (error) {
        console.error("Get enabled platforms error:", error)
        // Degrade gracefully — the UI should still render the defaults.
        return { success: false, platforms: [...DEFAULT_ENABLED_PLATFORMS] }
    }
}

/** Persist the full enabled-platform set. Any signed-in user may update it. */
export async function setEnabledPlatforms(
    ids: string[]
): Promise<{ success: boolean; platforms?: string[]; error?: string }> {
    const session = await auth()
    if (!session?.user) return { error: "Not authenticated", success: false }

    // Sanitise: keep only known ids, dedupe, preserve catalog order.
    const cleaned = PLATFORM_CATALOG.map((p) => p.id).filter((id) => ids.includes(id))

    try {
        const db = await getDb()
        await db.collection(CONFIG_COLLECTION).updateOne(
            { _id: CONFIG_ID as any },
            { $set: { enabled: cleaned, updatedAt: new Date(), updatedBy: session.user.email } },
            { upsert: true }
        )
        return { success: true, platforms: cleaned }
    } catch (error) {
        console.error("Set enabled platforms error:", error)
        return { error: "Failed to update platforms", success: false }
    }
}

/** Enable a single platform (used by the Add Platform picker). */
export async function enablePlatform(
    id: string
): Promise<{ success: boolean; platforms?: string[]; error?: string }> {
    if (!VALID_IDS.has(id)) return { error: "Unknown platform", success: false }
    const current = await getEnabledPlatforms()
    if (current.platforms.includes(id)) return { success: true, platforms: current.platforms }
    return setEnabledPlatforms([...current.platforms, id])
}

/** Disable a single platform. */
export async function disablePlatform(
    id: string
): Promise<{ success: boolean; platforms?: string[]; error?: string }> {
    const current = await getEnabledPlatforms()
    return setEnabledPlatforms(current.platforms.filter((p) => p !== id))
}
