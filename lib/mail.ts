import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

export async function sendVerificationEmail(email: string, token: string, otp: string) {
    const verifyUrl = `${process.env.AUTH_URL}/verify?token=${token}&email=${email}`;

    // LOGGING FOR TROUBLESHOOTING
    console.log("-----------------------------------------");
    console.log(`📡 [MAIL SERVICE] ATTEMPTING TO SEND TO: ${email}`);
    console.log(`📡 [MAIL SERVICE] SENDER (FROM): ${process.env.GMAIL_USER}`);

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        console.log("🔥 [DEV MODE] EMAIL NOT SENT (MISSING CREDENTIALS)");
        console.log(`OTP CODE: ${otp}`);
        console.log(`MAGIC LINK: ${verifyUrl}`);
        console.log("-----------------------------------------");
        return;
    }

    const mailOptions = {
        from: `"Creative Dashboard" <${process.env.GMAIL_USER}>`,
        to: email.trim().toLowerCase(), // Double check trimming here
        subject: "Verification Code - Creative Dashboard",
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #333; text-align: center;">Creative Dashboard</h2>
        <p>Your requested verification code is:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <h1 style="font-size: 32px; letter-spacing: 5px; color: #3b82f6; margin: 0;">${otp}</h1>
        </div>

        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">
          This code will expire in 10 minutes. 
          <br>Recipent: ${email}
        </p>
      </div>
    `,
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ [MAIL SERVICE] SUCCESS: Email sent to ${email}`);
        console.log(`✅ [MAIL SERVICE] MESSAGE ID: ${info.messageId}`);
    } catch (err) {
        console.error(`❌ [MAIL SERVICE] ERROR: Failed to send to ${email}`);
        console.error(err);
    }
    console.log("-----------------------------------------");
}

export async function sendResetPasswordEmail(email: string, token: string) {
    // This function is currently bypassed by the OTP-only flow in auth-actions.ts
    // but kept for compatibility.
    const resetUrl = `${process.env.AUTH_URL}/reset-password?token=${token}&email=${email}`;
    await sendVerificationEmail(email, token, "RESET_REQ");
}
