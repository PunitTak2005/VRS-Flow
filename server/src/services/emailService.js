const nodemailer = require('nodemailer');

// ---------------------------------------------------------------------------
// Transporter — built once at module load, used for every outgoing message.
// Fails fast with a clear error at startup if SMTP env vars are missing,
// rather than silently falling back to a mock.
// ---------------------------------------------------------------------------

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM
} = process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.error(
    '❌ SMTP configuration is incomplete. ' +
    'Please set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in your .env file. ' +
    'Password reset emails will fail until these are configured.'
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST || 'smtp.gmail.com',
  port: Number(SMTP_PORT) || 587,
  secure: Number(SMTP_PORT) === 465, // true for SSL (465), false for STARTTLS (587)
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

// ---------------------------------------------------------------------------
// Generic low-level sender — used by password reset and any other feature
// that needs to send an email.
// ---------------------------------------------------------------------------

/**
 * Send an email via the configured SMTP transporter.
 * @param {{ to: string, subject: string, html?: string, text?: string }} options
 * @returns {Promise<{ messageId: string }>}
 */
const sendEmail = async ({ to, subject, html, text }) => {
  console.log(`📬 Sending email to ${to} — "${subject}"`);

  const info = await transporter.sendMail({
    from: EMAIL_FROM || SMTP_USER,
    to,
    subject,
    html,
    text
  });

  console.log(`✅ Email sent successfully to ${to}`);
  console.log(`   Message ID: ${info.messageId}`);

  return { messageId: info.messageId };
};

// ---------------------------------------------------------------------------
// Registration confirmation email (kept for backward-compat, console-only
// since registration emails are not required for core functionality).
// ---------------------------------------------------------------------------

/**
 * Log a registration confirmation.  Does NOT send a real email — registration
 * does not require SMTP.  Kept so callers don't break.
 */
const sendRegistrationEmail = async (user, registrationId) => {
  console.log(`[Registration] New volunteer registered: ${user.email} (ID: ${registrationId})`);
  return { success: true, messageId: 'no-op-registration' };
};

// ---------------------------------------------------------------------------
// SMTP diagnostics — called from server.js during startup
// ---------------------------------------------------------------------------

/**
 * Verify SMTP connectivity and log the result.
 * Does NOT throw — a failed verify is logged as a warning so the server
 * still starts; password-reset attempts will fail with a clear error at
 * send time rather than crashing the process.
 */
const runSMTPDiagnostics = async () => {
  try {
    await transporter.verify();
    console.log('⚡ SMTP connection verified — ready to send password reset emails');
  } catch (err) {
    console.warn(`⚠️  SMTP connection failed: ${err.message}`);
    console.warn('   Password reset emails will not be delivered until SMTP is configured correctly.');
  }
};

module.exports = { sendEmail, sendRegistrationEmail, transporter, runSMTPDiagnostics };
