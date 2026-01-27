"use server"

import { MongoDBAdapter } from "@auth/mongodb-adapter"
import clientPromise from "@/lib/mongodb-client"
import bcrypt from "bcryptjs"
import { signIn } from "@/auth"
import { sendVerificationEmail, sendResetPasswordEmail } from "@/lib/mail"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.AUTH_SECRET || "default_secret_for_dev_only"

export async function sendVerificationCode(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase()
    const name = formData.get("name") as string
    const password = formData.get("password") as string

    if (!email || !name || !password) return { error: "All fields are required" }

    // Regex for @holaprime.com or @holapime.com
    if (!email.match(/@holaprime\.com$/)) return { error: "Only @holaprime.com emails are allowed" }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "reddit_data")

    // Check if user already exists and is verified
    const existingUser = await db.collection("users").findOne({ email })
    if (existingUser && (existingUser as any).emailVerified) {
        return { error: "AccountAlreadyExists" }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const token = jwt.sign({ email, type: 'verify' }, JWT_SECRET, { expiresIn: '10m' })

    try {
        await db.collection("verification_tokens").updateOne(
            { email },
            { $set: { token, otp, createdAt: new Date() } },
            { upsert: true }
        )

        // Send Email to the RECIPIENT email
        await sendVerificationEmail(email, token, otp)

        return { success: true, message: "Verification code sent to your email." }
    } catch (error) {
        console.error("Email send error:", error)
        return { error: "Failed to send verification email." }
    }
}

export async function verifyAndRegister(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase()
    const otp = formData.get("otp") as string
    const name = formData.get("name") as string
    const password = formData.get("password") as string

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "reddit_data")

    const verification = await db.collection("verification_tokens").findOne({ email, otp })

    if (!verification) {
        return { error: "Invalid or expired verification code" }
    }

    // Check if expired (10 mins)
    const now = new Date()
    const diff = (now.getTime() - new Date(verification.createdAt).getTime()) / 1000 / 60
    if (diff > 10) {
        return { error: "Code expired. Please request a new one." }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    try {
        await db.collection("users").updateOne(
            { email },
            {
                $set: {
                    name,
                    email,
                    password: hashedPassword,
                    role: "Viewer",
                    emailVerified: new Date(),
                    updatedAt: new Date()
                },
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        )

        // Delete the token
        await db.collection("verification_tokens").deleteOne({ email })

        // Auto login
        await signIn("credentials", {
            email,
            password,
            redirect: false,
        })

        return { success: true }
    } catch (error) {
        console.error("Registration error:", error)
        return { error: "Registration failed" }
    }
}

export async function sendPasswordResetCode(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase()

    if (!email) return { error: "Email is required" }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "reddit_data")

    // STRICT CHECK: Does user exist?
    const user = await db.collection("users").findOne({ email })
    if (!user) return { error: "UserNotFound" }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const token = jwt.sign({ email, type: 'reset' }, JWT_SECRET, { expiresIn: '10m' })

    try {
        await db.collection("verification_tokens").updateOne(
            { email },
            { $set: { token, otp, createdAt: new Date() } },
            { upsert: true }
        )

        // Send OTP via email to the RECIPIENT
        await sendVerificationEmail(email, token, otp)
        return { success: true, message: "Verification code sent to your email." }
    } catch (error) {
        return { error: "Failed to send reset code" }
    }
}

export async function verifyResetOTP(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase()
    const otp = formData.get("otp") as string

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "reddit_data")

    const verification = await db.collection("verification_tokens").findOne({ email, otp })
    if (!verification) return { error: "Invalid or expired code" }

    return { success: true }
}

export async function resetPassword(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase()
    const newPassword = formData.get("newPassword") as string
    const otp = formData.get("otp") as string

    if (!email || !newPassword || !otp) return { error: "Missing required fields" }

    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "reddit_data")

    // Verify OTP again
    const verification = await db.collection("verification_tokens").findOne({ email, otp })
    if (!verification) return { error: "Invalid or expired session" }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    try {
        await db.collection("users").updateOne(
            { email },
            { $set: { password: hashedPassword, updatedAt: new Date() } }
        )

        // Delete token
        await db.collection("verification_tokens").deleteOne({ email })

        return { success: true }
    } catch (error) {
        return { error: "Failed to reset password" }
    }
}

export async function loginWithCredentials(formData: FormData) {
    const email = (formData.get("email") as string)?.trim().toLowerCase()
    const password = formData.get("password") as string

    try {
        await signIn("credentials", {
            email,
            password,
            redirectTo: "/",
        })
    } catch (error: any) {
        if (error.type === "CredentialsSignin") {
            return { error: "Invalid credentials" }
        }
        throw error
    }
}

export async function register(formData: FormData) {
    return { error: "Please use verification flow" }
}

export async function verifyCurrentPassword(email: string, password: string) {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "reddit_data")
    const user = await db.collection("users").findOne({ email })
    if (!user || !user.password) return { error: "User not found" }
    const isMatch = await bcrypt.compare(password, user.password)
    return { isMatch }
}

export async function updatePassword(email: string, newPassword: string) {
    const client = await clientPromise
    const db = client.db(process.env.MONGODB_DB || "reddit_data")
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    await db.collection("users").updateOne(
        { email },
        { $set: { password: hashedPassword, updatedAt: new Date() } }
    )
    return { success: true }
}
