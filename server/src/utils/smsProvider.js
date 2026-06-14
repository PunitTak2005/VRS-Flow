// src/utils/smsProvider.js
/*
  Simple wrapper around Twilio (or mock). Reads env vars:
    TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM
  If any are missing, it falls back to a console logger so the app works locally.
*/
let twilio;
try {
  twilio = require('twilio');
} catch (e) {
  console.warn('Twilio module not found, SMS will be mocked.');
  twilio = null;
}
const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM } = process.env;

let client = null;
if (TWILIO_SID && TWILIO_TOKEN) {
  client = twilio(TWILIO_SID, TWILIO_TOKEN);
}

/**
 * Send an SMS message.
 * @param {string} to      E.164 formatted phone number (+1234567890)
 * @param {string} body    Message body
 */
async function sendSms(to, body) {
  if (!client) {
    console.log(`[SMS MOCK] To ${to}: ${body}`);
    return;
  }
  try {
    await client.messages.create({ from: TWILIO_FROM, to, body });
    console.log(`SMS sent to ${to}`);
  } catch (err) {
    console.error('SMS sending error:', err);
    throw err;
  }
}

module.exports = { sendSms };
