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
        const db = client.db()

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
