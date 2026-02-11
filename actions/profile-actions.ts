"use server"

import clientPromise from "@/lib/mongodb-client"
import { auth } from "@/lib/auth"

export async function updateProfile(data: { name: string; email: string }) {
    const session = await auth()

    if (!session?.user?.email) {
        return { error: "Not authenticated" }
    }

    const { name } = data

    if (!name || name.trim().length === 0) {
        return { error: "Name is required" }
    }

    try {
        const client = await clientPromise
        const db = client.db(process.env.MONGODB_DB || "reddit_data")

        await db.collection("users").updateOne(
            { email: session.user.email },
            {
                $set: {
                    name: name.trim(),
                    updatedAt: new Date()
                }
            }
        )

        return { success: true }
    } catch (error) {
        console.error("Profile update error:", error)
        return { error: "Failed to update profile" }
    }
}

export async function updateConnectedPlatforms(platforms: string[]) {
    const session = await auth()
    if (!session?.user?.email) return { error: "Not authenticated" }

    try {
        const client = await clientPromise
        const db = client.db(process.env.MONGODB_DB || "reddit_data")
        await db.collection("users").updateOne(
            { email: session.user.email },
            { $set: { connectedPlatforms: platforms, updatedAt: new Date() } }
        )
        return { success: true }
    } catch (error) {
        console.error("Update platforms error:", error)
        return { error: "Failed to update platforms" }
    }
}

export async function getConnectedPlatforms() {
    const session = await auth()
    if (!session?.user?.email) return { error: "Not authenticated" }

    try {
        const client = await clientPromise
        const db = client.db(process.env.MONGODB_DB || "reddit_data")
        const user = await db.collection("users").findOne({ email: session.user.email })
        return { success: true, platforms: user?.connectedPlatforms || [] }
    } catch (error) {
        console.error("Get platforms error:", error)
        return { error: "Failed to get platforms" }
    }
}
export async function updateEnabledPlatforms(platforms: string[]) {
    const session = await auth()
    if (!session?.user?.email) return { error: "Not authenticated" }

    try {
        const client = await clientPromise
        const db = client.db(process.env.MONGODB_DB || "reddit_data")
        await db.collection("users").updateOne(
            { email: session.user.email },
            { $set: { enabledPlatforms: platforms, updatedAt: new Date() } }
        )
        return { success: true }
    } catch (error) {
        console.error("Update enabled platforms error:", error)
        return { error: "Failed to update enabled platforms" }
    }
}

export async function getEnabledPlatforms() {
    const session = await auth()
    if (!session?.user?.email) return { error: "Not authenticated" }

    try {
        const client = await clientPromise
        const db = client.db(process.env.MONGODB_DB || "reddit_data")
        const user = await db.collection("users").findOne({ email: session.user.email })
        // Default to meta and youtube if nothing is set
        return { success: true, platforms: user?.enabledPlatforms || ["meta", "youtube"] }
    } catch (error) {
        console.error("Get enabled platforms error:", error)
        return { error: "Failed to get enabled platforms" }
    }
}
