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

/**
 * Sends the initial "claim your truck" invite an admin triggers from
 * /admin when adding a listing with an owner email (see routes/admin.ts).
 * Links to the claim-request form, not straight to account access — see
 * the truckProfiles.claimToken comment in db/schema.ts for why. Same
 * throw-on-failure contract as sendPasswordResetEmail — the caller decides
 * what to do (fall back to returning the link directly) if this rejects.
 */
export async function sendClaimTruckEmail(
  to: string,
  truckName: string,
  claimUrl: string,
): Promise<void> {
  if (!transport) throw new Error("No email transport is configured");

  await transport.sendMail({
    from: `Little Food Truck <${env.RESEND_FROM_EMAIL}>`,
    to,
    subject: `Claim "${truckName}" on Little Food Truck`,
    text: `An admin added "${truckName}" to Little Food Truck and is inviting you to claim it, if it's yours.\n\nRequest your claim: ${claimUrl}\n\nYou'll need to show proof it's your truck (e.g. a seller's permit or business license) — an admin reviews every request before it's approved. This link expires in 14 days. If you weren't expecting this, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #292524;">
        <h1 style="font-size: 18px;">Claim "${truckName}"</h1>
        <p>An admin added <strong>${truckName}</strong> to Little Food Truck and is inviting you to claim it, if it's yours.</p>
        <p style="margin: 24px 0;">
          <a href="${claimUrl}" style="background: #ea580c; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Request your claim
          </a>
        </p>
        <p style="color: #78716c; font-size: 13px;">You'll need to show proof it's your truck (e.g. a seller's permit or business license) — an admin reviews every request before it's approved. This link expires in 14 days. If you weren't expecting this, you can safely ignore this email.</p>
      </div>
    `,
  });
}

/**
 * Sends the "your claim was approved" email once an admin approves a claim
 * request (see routes/admin.ts) — the one time a password-setting link
 * actually goes out, since only now has someone verified the requester is
 * who they say they are.
 */
export async function sendClaimApprovedEmail(
  to: string,
  truckName: string,
  finishUrl: string,
): Promise<void> {
  if (!transport) throw new Error("No email transport is configured");

  await transport.sendMail({
    from: `Little Food Truck <${env.RESEND_FROM_EMAIL}>`,
    to,
    subject: `You're approved to claim "${truckName}"`,
    text: `An admin reviewed and approved your request to claim "${truckName}" on Little Food Truck.\n\nSet your password to finish: ${finishUrl}\n\nThis link expires in 7 days. If you weren't expecting this, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; color: #292524;">
        <h1 style="font-size: 18px;">You're approved</h1>
        <p>An admin reviewed and approved your request to claim <strong>${truckName}</strong> on Little Food Truck.</p>
        <p style="margin: 24px 0;">
          <a href="${finishUrl}" style="background: #ea580c; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Set your password
          </a>
        </p>
        <p style="color: #78716c; font-size: 13px;">This link expires in 7 days. If you weren't expecting this, you can safely ignore this email.</p>
      </div>
    `,
  });
}
