import NextAuth from "next-auth"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/server/mongodb-client"
import { authConfig } from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { ObjectId } from "mongodb"
import fs from "fs"
import path from "path"

// TEMP DIAGNOSTIC: capture the exact Auth.js server-side error to a file so we
// can see *why* the first Google sign-in throws `Configuration`. Remove once the
// root cause is fixed.
function logAuthError(code: string, ...rest: any[]) {
    try {
        const line =
            `[${new Date().toISOString()}] ${code}\n` +
            rest
                .map((r) =>
                    r instanceof Error
                        ? `${r.name}: ${r.message}\n${r.stack}\n${(r as any).cause ? "cause: " + JSON.stringify((r as any).cause, Object.getOwnPropertyNames((r as any).cause)) : ""}`
                        : JSON.stringify(r, Object.getOwnPropertyNames(r ?? {}))
                )
                .join("\n") +
            "\n---\n"
        fs.appendFileSync(path.join(process.cwd(), "auth-error.log"), line)
    } catch {
        /* best effort */
    }
}

// Per-instance cache for the session-callback's user-exists check (see the
// session callback below for why). Keyed by userId.
const _userCheckCache = new Map<string, { hasPassword: boolean; at: number }>()
const USER_CHECK_TTL_MS = 60_000

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
    debug: true,
    logger: {
        error: (...args: any[]) => {
            logAuthError("ERROR", ...args)
            console.error("[auth]", ...args)
        },
        warn: (code: string) => logAuthError("WARN", code),
        debug: () => {},
    },
    adapter: MongoDBAdapter(clientPromise, { databaseName: process.env.MONGODB_DB || "reddit_data" }),
    providers: [
        ...authConfig.providers.filter((p: any) => p.id !== "credentials"),
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const client = await clientPromise
                const db = client.db(process.env.MONGODB_DB || "reddit_data")
                const user = await db.collection("users").findOne({ email: credentials.email })

                if (user && user.password) {
                    if (!user.emailVerified) {
                        throw new Error("EmailNotVerified")
                    }
                    const isMatch = await bcrypt.compare(credentials.password as string, user.password)
                    if (isMatch) {
                        return {
                            id: user._id.toString(),
                            name: user.name,
                            email: user.email,
                        }
                    }
                }
                return null
            }
        })
    ],
    session: {
        strategy: "jwt",
        maxAge: 12 * 60, // 12 minutes
        updateAge: 0, // Always update session to keep it alive during activity
    },
    callbacks: {
        ...authConfig.callbacks,
        async session({ session, token }) {
            if (session.user && token) {
                // Validate the user still exists in the DB — but CACHED per instance.
                // The uncached findOne on EVERY session check was the dominant
                // per-click latency in production (GET /api/auth/session ran
                // 1.7–3.1s and fires on each interaction). 60s TTL: a deleted
                // user's session dies within a minute (session maxAge is 12 min).
                const userId = (token.id as string) || (token.sub as string)

                if (!userId) {
                    return session
                }

                try {
                    const cached = _userCheckCache.get(userId)
                    let hasPassword: boolean

                    if (cached && Date.now() - cached.at < USER_CHECK_TTL_MS) {
                        hasPassword = cached.hasPassword
                    } else {
                        if (!ObjectId.isValid(userId)) {
                            return null as any
                        }
                        const client = await clientPromise
                        const db = client.db(process.env.MONGODB_DB || "reddit_data")
                        const user = await db.collection("users").findOne(
                            { _id: new ObjectId(userId) },
                            { projection: { password: 1 } },
                        )
                        if (!user) {
                            _userCheckCache.delete(userId)
                            return null as any // Force invalid session if user is deleted
                        }
                        hasPassword = Boolean(user.password)
                        _userCheckCache.set(userId, { hasPassword, at: Date.now() })
                    }

                    // Derive the auth provider reliably from the DB record rather
                    // than trusting token.provider, which is only populated at
                    // sign-in (when `account` exists) and is undefined on JWT
                    // refreshes or pre-existing sessions. A local password means a
                    // credentials account; its absence means an OAuth/Google account
                    // whose profile + password are managed by the provider.
                    (session.user as any).id = userId;
                    (session.user as any).hasPassword = hasPassword;
                    (session.user as any).provider =
                        (token.provider as string) || (hasPassword ? "credentials" : "google");
                } catch (e) {
                    console.error("Session validation error:", e)
                    return null as any
                }
            }
            return session
        }
    }
})
