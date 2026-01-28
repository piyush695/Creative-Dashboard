import NextAuth from "next-auth"
import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb-client"
import { authConfig } from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { ObjectId } from "mongodb"

export const { handlers, signIn, signOut, auth } = NextAuth({
    ...authConfig,
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
                            role: user.role || "Viewer",
                        }
                    }
                }
                return null
            }
        })
    ],
    session: { strategy: "jwt" },
    callbacks: {
        ...authConfig.callbacks,
        async session({ session, token }) {
            if (session.user) {
                // Critical: Validate user exists in DB every time session is checked
                const userId = (token.id as string) || (token.sub as string)

                if (!userId) {
                    return null as any
                }

                try {
                    const client = await clientPromise
                    const db = client.db(process.env.MONGODB_DB || "reddit_data")

                    if (!ObjectId.isValid(userId)) {
                        return null as any
                    }

                    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) })
                    if (!user) {
                        return null as any // Force invalid session if user is deleted
                    }

                    (session.user as any).id = userId;
                    (session.user as any).role = user.role || "Viewer";
                    (session.user as any).provider = token.provider as string;
                } catch (e) {
                    console.error("Session validation error:", e)
                    return null as any
                }
            }
            return session
        }
    }
})
