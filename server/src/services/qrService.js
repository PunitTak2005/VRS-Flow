const QRCode = require('qrcode');

/**
 * Generate a base64 QR Code image URL for a given payload
 * @param {string|object} data - Payload to encode
 * @returns {Promise<string>} Base64 image URL
 */
const generateQRCode = async (data) => {
  try {
    const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 1,
      color: {
        dark: '#1e293b', // Tailwind slate-800
        light: '#ffffff'
      }
    });
    return qrCodeDataUrl;
  } catch (error) {
    console.error(`❌ Error generating QR code: ${error.message}`);
    // Return empty placeholder
    return '';
  }
};

module.exports = { generateQRCode };
