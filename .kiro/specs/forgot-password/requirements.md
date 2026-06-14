# Requirements Document

## Introduction

This feature replaces the existing OTP-based forgot/reset password flow in the volunteer management system with a secure, token-based flow. The new flow generates a cryptographically random token, hashes it before storage, emails a reset link to the user, and validates the raw token on submission. The backend enforces rate limiting, one-time token use, and 1-hour expiry. The frontend provides a polished UX with loading states, password strength indication, and clear error/success messaging — all without leaking whether a given email exists in the system.

## Glossary

- **Auth_Controller**: The Express controller at `server/src/controllers/authController.js` responsible for authentication-related request handling.
- **User_Model**: The Mongoose model at `server/src/models/User.js` representing registered users.
- **Email_Service**: The module at `server/src/services/emailService.js` responsible for dispatching emails.
- **Email_Template**: The module at `server/src/templates/emailTemplate.js` that generates HTML email bodies.
- **Rate_Limiter**: The `express-rate-limit` middleware instance applied to the forgot-password endpoint.
- **Reset_Token**: A cryptographically random 32-byte value generated via `crypto.randomBytes`, transmitted in plain form via URL and stored as a SHA-256 hash in the database.
- **Token_Hash**: The SHA-256 digest of the raw Reset_Token, stored on the User_Model to prevent exposure of usable tokens in case of a database breach.
- **ForgotPassword_Page**: The React page at `client/src/pages/ForgotPassword.jsx` rendered at the `/forgot-password` route.
- **ResetPassword_Page**: The React page at `client/src/pages/ResetPassword.jsx` rendered at the `/reset-password/:token` route.
- **API_Client**: The fetch wrapper at `client/src/services/api.js` used by all frontend pages to communicate with the backend.
- **Notification_Context**: The React context at `client/src/context/NotificationContext.jsx` that provides the `showToast` function for transient user messages.
- **Password_Strength_Indicator**: A UI component within the ResetPassword_Page that classifies a candidate password as Weak, Fair, or Strong based on length and character composition.

---

## Requirements

### Requirement 1: Secure Reset Token Generation and Storage

**User Story:** As a security engineer, I want reset tokens to be cryptographically random and stored only as hashes, so that a database compromise does not yield usable password reset tokens.

#### Acceptance Criteria

1. WHEN a password reset is requested, THE Auth_Controller SHALL generate a Reset_Token using `crypto.randomBytes(32)`.
2. WHEN a Reset_Token is generated, THE Auth_Controller SHALL compute its Token_Hash using SHA-256 before persisting any value to the database.
3. THE User_Model SHALL store the Token_Hash in a field named `passwordResetToken` (String) and the expiry timestamp in a field named `passwordResetExpires` (Date). These are distinct from the existing OTP fields (`resetPasswordToken` / `resetPasswordExpires`) which remain for backward compatibility.
4. THE Auth_Controller SHALL NOT log the raw Reset_Token value to any console output or logging system.
5. WHEN a reset is completed or a new reset is requested for the same account, THE Auth_Controller SHALL set `passwordResetToken` and `passwordResetExpires` to `undefined` on the User_Model document such that a subsequent query on those fields returns null.

---

### Requirement 2: Forgot Password Endpoint

**User Story:** As a volunteer, I want to request a password reset link by email, so that I can regain access to my account without contacting an administrator.

#### Acceptance Criteria

1. WHEN a POST request is received at `/api/auth/forgot-password` with a valid email address, THE Auth_Controller SHALL look up the user by that email address in the User_Model.
2. WHEN a valid email address belonging to a registered user is provided, THE Auth_Controller SHALL generate a Reset_Token, overwrite any previously stored Token_Hash for that account, set a fresh 1-hour expiry, and dispatch a reset email via the Email_Service.
3. WHEN a valid email address that does not belong to any registered user is provided, THE Auth_Controller SHALL return HTTP 200 with the same generic success message as when the user exists.
4. WHEN the email field is absent or not a valid email format, THE Auth_Controller SHALL return HTTP 400 with `{ "success": false, "message": "Please provide a valid email address" }`.
5. THE Auth_Controller SHALL return `{ "success": true, "message": "If an account with that email exists, a reset link has been sent." }` for all valid-format email submissions, regardless of whether the email is registered.
6. IF a single IP address submits 5 or more requests to `/api/auth/forgot-password` within a fixed 15-minute window, THEN THE Rate_Limiter SHALL return HTTP 429 with `{ "success": false, "message": "Too many password reset attempts. Please try again in 15 minutes." }` and SHALL NOT forward the request to the Auth_Controller.
7. IF the Email_Service throws an error while dispatching the reset email, THEN THE Auth_Controller SHALL return HTTP 500 with `{ "success": false, "message": "Failed to send reset email. Please try again later." }`.

---

### Requirement 3: Reset Password Endpoint

**User Story:** As a volunteer, I want to submit my new password using a link from my email, so that I can complete the password reset without needing to remember an OTP code.

#### Acceptance Criteria

1. WHEN a POST request is received at `/api/auth/reset-password/:token` with `newPassword` and `confirmPassword` body fields, THE Auth_Controller SHALL first validate that the `:token` parameter is a 64-character hexadecimal string; IF it is not, THEN return HTTP 400 with `{ "success": false, "message": "Password reset token is invalid or has expired." }`. Otherwise, THE Auth_Controller SHALL hash the token using SHA-256 and look up a User_Model document where `passwordResetToken` equals that hash and `passwordResetExpires` is greater than the current timestamp.
2. WHEN the Token_Hash lookup returns no matching document, THE Auth_Controller SHALL return HTTP 400 with `{ "success": false, "message": "Password reset token is invalid or has expired." }`.
3. WHEN token validation passes but `newPassword` and `confirmPassword` do not match, THE Auth_Controller SHALL return HTTP 400 with `{ "success": false, "message": "Passwords do not match." }`.
4. WHEN token validation and password match pass but `newPassword` is fewer than 8 characters or contains no digits, THE Auth_Controller SHALL return HTTP 400 with `{ "success": false, "message": "Password must be at least 8 characters and contain at least one number." }`.
5. WHEN all validations pass, THE Auth_Controller SHALL hash `newPassword` with bcrypt at a cost factor of 10 and update the User_Model document's `password` field.
6. WHEN the password update is successful, THE Auth_Controller SHALL set `passwordResetToken` and `passwordResetExpires` to `undefined` on the User_Model document, making the token one-time use only.
7. WHEN the password update is successful, THE Auth_Controller SHALL return HTTP 200 with `{ "success": true, "message": "Password has been reset successfully." }`.
8. IF an unexpected server error occurs during token validation or password update, THEN THE Auth_Controller SHALL return HTTP 500 with `{ "success": false, "message": "An error occurred. Please try again." }`.

---

### Requirement 4: Password Reset Email Template

**User Story:** As a volunteer, I want to receive a clear, professional email with a reset link, so that I can trust the communication and complete the reset with a single click.

#### Acceptance Criteria

1. THE Email_Template SHALL provide a `getPasswordResetTemplate` function that accepts `{ userName, resetUrl, supportEmail }` and returns a complete HTML email string.
2. WHEN the template is rendered, THE Email_Template SHALL include the recipient's name, a reset button rendered as an anchor element with visible call-to-action text linking to `resetUrl`, a 1-hour expiry warning, and a message instructing the recipient to ignore the email if they did not request a reset.
3. THE Email_Service SHALL dispatch the password reset email with the subject line `"Reset Your Password"` and the HTML body generated by `getPasswordResetTemplate`.
4. THE Auth_Controller SHALL construct `resetUrl` as `{CLIENT_URL}/reset-password/{rawToken}` where `CLIENT_URL` is read from the `CLIENT_URL` environment variable. IF `CLIENT_URL` is not set, THEN THE Auth_Controller SHALL return HTTP 500 rather than constructing a malformed URL.

---

### Requirement 5: Forgot Password Frontend Page

**User Story:** As a volunteer, I want a simple page to request a password reset, so that I can initiate the flow from within the app without navigating away.

#### Acceptance Criteria

1. THE ForgotPassword_Page SHALL render an email input field and a "Send Reset Link" submit button at the `/forgot-password` route.
2. WHEN the submit button is clicked and the API call is in progress, THE ForgotPassword_Page SHALL disable the submit button and display a "Sending..." loading label.
3. WHEN the API_Client receives a successful response, THE ForgotPassword_Page SHALL hide the form and display a success confirmation message that contains the phrase "check your email".
4. IF the API_Client receives an error response, THEN THE ForgotPassword_Page SHALL display an inline error message below the form without navigating away.
5. THE ForgotPassword_Page SHALL include a visible link back to the `/login` route.

---

### Requirement 6: Reset Password Frontend Page

**User Story:** As a volunteer, I want to set a new password through a secure page linked from my email, so that I can complete the reset flow with confidence.

#### Acceptance Criteria

1. THE ResetPassword_Page SHALL be accessible at the route `/reset-password/:token` and SHALL extract the token from the URL parameter. IF the `:token` URL parameter is absent (direct navigation to `/reset-password`), THE ResetPassword_Page SHALL display an error message indicating the link is invalid and render a link to `/forgot-password`.
2. THE ResetPassword_Page SHALL render a New Password field and a Confirm Password field, each with a show/hide visibility toggle.
3. THE ResetPassword_Page SHALL render a Password_Strength_Indicator that updates in real time as the user types in the New Password field, displaying "Weak" for passwords fewer than 8 characters, "Fair" for passwords of 8–9 characters containing characters from only a single character class (letters only, digits only, or symbols only), and "Strong" for passwords of 10 or more characters with at least one uppercase letter, one number, and one special character.
4. WHEN the form is submitted and `newPassword` does not equal `confirmPassword`, THE ResetPassword_Page SHALL display an inline validation error and SHALL NOT submit the request to the API_Client.
5. WHEN the form is submitted and `newPassword` is fewer than 8 characters or contains no digits, THE ResetPassword_Page SHALL display an inline validation error and SHALL NOT submit the request to the API_Client.
6. WHEN the form is submitted and passes client-side validation, THE ResetPassword_Page SHALL call the API_Client with a POST to `/auth/reset-password/{token}` where `{token}` is the literal token value extracted from the page's URL parameter, disabling the submit button and showing a loading state during the request.
7. WHEN the API_Client receives a successful response, THE ResetPassword_Page SHALL call `showToast` from the Notification_Context with a success message and navigate to `/login`.
8. IF the API_Client receives a 400 or 500 error response, THEN THE ResetPassword_Page SHALL display an inline error message and a link back to `/forgot-password`.

---

### Requirement 7: Route Registration and Backward Compatibility

**User Story:** As a developer, I want the new token-based endpoints registered correctly in Express, so that the frontend can reach them and the old OTP routes remain available during any transition period.

#### Acceptance Criteria

1. THE Auth_Controller SHALL export `forgotPasswordToken` and `resetPasswordToken` as named exports alongside the existing `forgotPassword` and `resetPassword` exports.
2. THE Auth_Controller (routes file) SHALL register `POST /api/auth/forgot-password` mapped to `forgotPasswordToken` with the Rate_Limiter (fixed-window, 5 requests per 15 minutes per IP) applied as middleware.
3. THE Auth_Controller (routes file) SHALL register `POST /api/auth/reset-password/:token` mapped to `resetPasswordToken`.
4. THE App.jsx router SHALL define a route at `/reset-password/:token` (with URL parameter) in addition to or replacing the existing `/reset-password` (no parameter) route, so that token-bearing links resolve correctly.
