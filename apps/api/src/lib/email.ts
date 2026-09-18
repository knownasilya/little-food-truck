import nodemailer from "nodemailer";
import { env, isProduction } from "./env.js";

/**
 * Transport selection:
 *  - Production: Resend's SMTP relay, only when RESEND_API_KEY is set.
 *  - Everywhere else: local MailDev (see `pnpm --filter @little-food-truck/api
 *    run maildev`), so password-reset email works out of the box in dev
 *    without any real credentials — view caught mail at http://localhost:1080.
 * Both paths go through nodemailer so there's one send code path instead of
 * a separate SDK per environment.
 */
const transport = isProduction
  ? env.RESEND_API_KEY
    ? nodemailer.createTransport({
        host: "smtp.resend.com",
        port: 465,
        secure: true,
        auth: { user: "resend", pass: env.RESEND_API_KEY },
      })
    : null
  : nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: false,
    });

export const emailEnabled = transport !== null;

/**
 * Sends the password-reset email. Throws if no transport is configured, or
 * the send itself fails — routes/auth.ts is responsible for catching that
 * and responding the same way regardless (see the comment there on why: not
 * leaking whether an email exists, or whether sending happened to fail, to
 * the client).
 */
export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  if (!transport) throw new Error("No email transport is configured");

  await transport.sendMail({
    from: `Little Food Truck <${env.RESEND_FROM_EMAIL}>`,
    to,
    subject: "Reset your Little Food Truck password",
    text: `Someone requested a password reset for this email address.\n\nReset your password: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #292524;">
        <h1 style="font-size: 18px;">Reset your password</h1>
        <p>Someone requested a password reset for this email address on Little Food Truck.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background: #ea580c; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Reset password
          </a>
        </p>
        <p style="color: #78716c; font-size: 13px;">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
