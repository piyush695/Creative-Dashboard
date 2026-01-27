import type { NextAuthConfig } from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"

export const authConfig = {
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user
            const isAuthPage = nextUrl.pathname.startsWith("/login") || nextUrl.pathname.startsWith("/register")

            if (isAuthPage) {
                if (isLoggedIn) return Response.redirect(new URL("/", nextUrl))
                return true
            }

            return isLoggedIn
        },
        async signIn({ user, account, profile }) {
            if (user.email && !user.email.match(/@holaprime\.com$/)) {
                return false // Reject sign-in for invalid domains
            }
            return true
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id
                token.role = (user as any).role || "Viewer"
                if (account) {
                    token.provider = account.provider
                }
            }
            return token
        },
        async session({ session, token }) {
            if (token && session.user) {
                (session.user as any).id = token.id as string
                (session.user as any).role = token.role as string
                (session.user as any).provider = token.provider as string
            }
            return session
        },
    },
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            allowDangerousEmailAccountLinking: true,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
        Credentials({
            // We'll define the credentials logic in auth.ts because of bcrypt
        }),
    ],
} satisfies NextAuthConfig
