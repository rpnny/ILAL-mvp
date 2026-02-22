/**
 * Email Service
 * Sends verification codes via Resend API
 */

import { logger } from '../config/logger.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.FROM_EMAIL || 'ILAL <noreply@ilal.tech>';

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Send an email via Resend API
 */
async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    logger.warn('RESEND_API_KEY not set, skipping email send', { to: options.to });
    // In development, log the email instead of sending
    logger.info('Email content (dev mode)', {
      to: options.to,
      subject: options.subject,
    });
    return true; // Return true in dev mode so registration can proceed
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      logger.error('Failed to send email', { to: options.to, error });
      return false;
    }

    logger.info('Email sent successfully', { to: options.to, subject: options.subject });
    return true;
  } catch (error: any) {
    logger.error('Email service error', { error: error.message, to: options.to });
    return false;
  }
}

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send email verification code
 */
export async function sendVerificationEmail(
  to: string,
  code: string,
  name?: string
): Promise<boolean> {
  const greeting = name ? `Hi ${name}` : 'Hi there';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#111;border-radius:16px;border:1px solid #222;overflow:hidden;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#1a1a2e 0%,#0A0A0A 100%);padding:32px 32px 24px;text-align:center;">
          <div style="display:inline-block;width:48px;height:48px;background:#2962FF;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">I</div>
          <h1 style="color:white;font-size:20px;margin:16px 0 0;font-weight:600;">Verify your email</h1>
        </div>
        
        <!-- Body -->
        <div style="padding:32px;">
          <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px;">
            ${greeting}, thanks for signing up for ILAL. Enter the code below to verify your email address:
          </p>
          
          <!-- Code -->
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:white;font-family:monospace;">${code}</span>
          </div>
          
          <p style="color:#666;font-size:13px;line-height:1.5;margin:0 0 8px;">
            This code expires in <strong style="color:#999;">15 minutes</strong>.
          </p>
          <p style="color:#666;font-size:13px;line-height:1.5;margin:0;">
            If you didn't create an account, you can safely ignore this email.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="padding:16px 32px 24px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="color:#444;font-size:12px;margin:0;">
            © 2026 ILAL — Institutional Liquidity Access Layer
          </p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `${code} is your ILAL verification code`,
    html,
  });
}

/**
 * Send password reset code
 */
export async function sendPasswordResetEmail(
  to: string,
  code: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#111;border-radius:16px;border:1px solid #222;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e 0%,#0A0A0A 100%);padding:32px 32px 24px;text-align:center;">
          <div style="display:inline-block;width:48px;height:48px;background:#2962FF;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">I</div>
          <h1 style="color:white;font-size:20px;margin:16px 0 0;font-weight:600;">Reset your password</h1>
        </div>
        <div style="padding:32px;">
          <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 24px;">
            Enter the code below to reset your password:
          </p>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;text-align:center;margin:0 0 24px;">
            <span style="font-size:32px;font-weight:700;letter-spacing:8px;color:white;font-family:monospace;">${code}</span>
          </div>
          <p style="color:#666;font-size:13px;line-height:1.5;margin:0;">
            This code expires in 15 minutes. If you didn't request a reset, ignore this email.
          </p>
        </div>
        <div style="padding:16px 32px 24px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="color:#444;font-size:12px;margin:0;">© 2026 ILAL</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `${code} is your ILAL password reset code`,
    html,
  });
}

/**
 * Send welcome email after email verification
 */
export async function sendWelcomeEmail(
  to: string,
  name?: string
): Promise<boolean> {
  const greeting = name ? `Welcome, ${name}!` : 'Welcome to ILAL!';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#111;border-radius:16px;border:1px solid #222;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e 0%,#0A0A0A 100%);padding:32px 32px 24px;text-align:center;">
          <div style="display:inline-block;width:48px;height:48px;background:#2962FF;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">I</div>
          <h1 style="color:white;font-size:20px;margin:16px 0 0;font-weight:600;">🎉 ${greeting}</h1>
        </div>
        <div style="padding:32px;">
          <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 20px;">
            Your email has been verified. You now have access to the ILAL API Portal.
          </p>
          <div style="background:#1a1a1a;border:1px solid #333;border-radius:12px;padding:20px;margin:0 0 24px;">
            <p style="color:#fff;font-size:13px;font-weight:600;margin:0 0 12px;">Your Free Plan includes:</p>
            <ul style="color:#999;font-size:13px;margin:0;padding-left:16px;line-height:2;">
              <li>100 API calls / month</li>
              <li>10 requests / minute</li>
              <li>ZK Proof verification</li>
              <li>Session management</li>
            </ul>
          </div>
          <a href="https://ilal.tech/dashboard" style="display:block;background:#2962FF;color:white;text-align:center;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">Go to Dashboard →</a>
        </div>
        <div style="padding:16px 32px 24px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="color:#444;font-size:12px;margin:0;">© 2026 ILAL — Institutional Liquidity Access Layer</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: 'Welcome to ILAL — Your account is ready',
    html,
  });
}

/**
 * Send plan upgrade notification email
 */
export async function sendPlanUpgradeEmail(
  to: string,
  plan: string,
  name?: string
): Promise<boolean> {
  const planNames: Record<string, string> = {
    PRO: 'Pro',
    ENTERPRISE: 'Enterprise',
  };
  const planName = planNames[plan] || plan;
  const greeting = name ? `Hi ${name}` : 'Hi there';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background-color:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:40px auto;background:#111;border-radius:16px;border:1px solid #222;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#1a1a2e 0%,#0A0A0A 100%);padding:32px 32px 24px;text-align:center;">
          <div style="display:inline-block;width:48px;height:48px;background:#2962FF;border-radius:12px;line-height:48px;font-size:20px;font-weight:bold;color:white;">I</div>
          <h1 style="color:white;font-size:20px;margin:16px 0 0;font-weight:600;">🚀 Plan Upgraded to ${planName}</h1>
        </div>
        <div style="padding:32px;">
          <p style="color:#999;font-size:14px;line-height:1.6;margin:0 0 20px;">
            ${greeting}, your ILAL account has been upgraded to the <strong style="color:#fff;">${planName} Plan</strong>.
            Your new limits are now active.
          </p>
          <a href="https://ilal.tech/dashboard" style="display:block;background:#2962FF;color:white;text-align:center;padding:14px 24px;border-radius:10px;text-decoration:none;font-weight:600;font-size:14px;">View Dashboard →</a>
        </div>
        <div style="padding:16px 32px 24px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="color:#444;font-size:12px;margin:0;">© 2026 ILAL — Institutional Liquidity Access Layer</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject: `Your ILAL account is now on the ${planName} Plan`,
    html,
  });
}
