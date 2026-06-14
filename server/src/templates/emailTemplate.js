/**
 * Generates a professional, responsive HTML email template for volunteer registration.
 * All user-supplied values are injected via template literals — no raw HTML from
 * untrusted input is ever passed in, so XSS risk through this channel is minimal.
 *
 * @param {Object} data
 * @param {string} data.userName        - Full name of the registrant
 * @param {string} data.userEmail       - Email address of the registrant
 * @param {string} data.registrationId  - DB-generated registration / user ID
 * @param {string} data.submissionDate  - Human-readable submission date string
 * @param {string} data.supportEmail    - Support contact address shown in the footer
 * @returns {string} Complete HTML email string
 */
const getRegistrationTemplate = (data) => {
  const { userName, userEmail, registrationId, submissionDate, supportEmail, verificationOTP } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Registration Submitted</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7f6;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f4f7f6;
      padding-bottom: 40px;
    }
    .main {
      background-color: #ffffff;
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: #1e3a8a;
      padding: 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px;
      color: #333333;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
    }
    .details-box {
      background-color: #f8fafc;
      border-left: 4px solid #1e3a8a;
      padding: 20px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    .details-row {
      margin-bottom: 8px;
      font-size: 14px;
    }
    .details-row strong {
      color: #475569;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .footer a {
      color: #1e3a8a;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <center class="wrapper">
    <table class="main" width="100%">
      <!-- Header -->
      <tr>
        <td class="header">
          <h1>Volunteer Network</h1>
        </td>
      </tr>
 
      <!-- Body -->
      <tr>
        <td class="content">
          <div class="greeting">Hello ${userName},</div>
          <p>
            Thank you for registering to volunteer with us! Your application has been
            successfully received and is currently under review by our administration team.
          </p>
          <p>
            You will receive an automated follow-up email as soon as your status has been
            updated (approved or rejected).
          </p>
 
          <div class="details-box">
            <div class="details-row">
              <strong>Registration ID:</strong> ${registrationId || 'Pending'}
            </div>
            <div class="details-row">
              <strong>Name:</strong> ${userName}
            </div>
            <div class="details-row">
              <strong>Email:</strong> ${userEmail}
            </div>
            <div class="details-row">
              <strong>Submission Date:</strong> ${submissionDate}
            </div>
            ${verificationOTP ? `
            <div class="details-row" style="margin-top: 12px; padding-top: 12px; border-t: 1px dashed #e2e8f0;">
              <strong>Verification OTP Code:</strong> <span style="font-size: 16px; font-weight: bold; color: #1e3a8a; letter-spacing: 2px;">${verificationOTP}</span>
            </div>
            ` : ''}
          </div>

          <p>
            If you have any urgent questions regarding your submission, please don't
            hesitate to reach out to our support team.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td class="footer">
          <p>This is an automated operational email. Please do not reply directly to this message.</p>
          <p>Need help? Contact <a href="mailto:${supportEmail}">${supportEmail}</a></p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

// ---------------------------------------------------------------------------
// Password Reset OTP Email Template
// ---------------------------------------------------------------------------

/**
 * Generates a professional HTML email containing a 6-digit OTP for password reset.
 * No reset link or button is included — only the OTP code.
 *
 * @param {Object} data
 * @param {string} data.userName     - Full name of the recipient
 * @param {string} data.otp          - The plain-text 6-digit OTP (never hashed)
 * @param {string} data.supportEmail - Support contact shown in the footer
 * @returns {string} Complete HTML email string
 */
const getPasswordResetOTPTemplate = (data) => {
  const { userName, otp, supportEmail } = data;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset OTP</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f4f7f6;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper { width: 100%; table-layout: fixed; background-color: #f4f7f6; padding-bottom: 40px; }
    .main {
      background-color: #ffffff;
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0,0,0,0.05);
    }
    .header { background-color: #1e3a8a; padding: 30px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 30px; color: #333333; line-height: 1.6; }
    .greeting { font-size: 18px; font-weight: bold; margin-bottom: 15px; }
    .otp-box {
      text-align: center;
      margin: 28px 0;
      padding: 24px;
      background-color: #f8fafc;
      border: 2px dashed #1e3a8a;
      border-radius: 8px;
    }
    .otp-label {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .otp-code {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: 10px;
      color: #1e3a8a;
      font-family: 'Courier New', Courier, monospace;
    }
    .otp-expiry {
      margin-top: 10px;
      font-size: 13px;
      color: #64748b;
    }
    .notice {
      margin-top: 24px;
      padding: 14px 16px;
      background-color: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 6px;
      font-size: 13px;
      color: #92400e;
    }
    .footer {
      background-color: #f1f5f9;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
    .footer a { color: #1e3a8a; text-decoration: none; }
  </style>
</head>
<body>
  <center class="wrapper">
    <table class="main" width="100%">
      <tr>
        <td class="header">
          <h1>Volunteer Network</h1>
        </td>
      </tr>
      <tr>
        <td class="content">
          <div class="greeting">Hello ${userName},</div>
          <p>
            We received a request to reset the password for your account.
            Use the One-Time Password (OTP) below to complete the reset.
          </p>

          <div class="otp-box">
            <div class="otp-label">Your One-Time Password</div>
            <div class="otp-code">${otp}</div>
            <div class="otp-expiry">⏱ This OTP is valid for <strong>10 minutes</strong> and can only be used once.</div>
          </div>

          <p>Enter this OTP along with your new password on the reset page.</p>

          <div class="notice">
            ⚠️ If you did not request a password reset, please ignore this email.
            Your password will remain unchanged and this OTP will expire automatically.
            Never share this code with anyone.
          </div>
        </td>
      </tr>
      <tr>
        <td class="footer">
          <p>This is an automated security email. Do not reply to this message.</p>
          <p>Need help? Contact <a href="mailto:${supportEmail}">${supportEmail}</a></p>
        </td>
      </tr>
    </table>
  </center>
</body>
</html>`;
};

module.exports = { getRegistrationTemplate, getPasswordResetOTPTemplate };
