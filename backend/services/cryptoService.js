const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

const ALGORITHM = 'aes-256-gcm';
// Master key is a 64-character hex string representing 32 bytes (256 bits).
const ENCRYPTION_KEY = Buffer.from(process.env.APP_ENCRYPTION_KEY, 'hex');

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedData, iv, authTag) {
  if (!encryptedData || !iv || !authTag) return null;
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// Helper to encrypt a single string and return a composite string "iv:authTag:encryptedData"
// Used for simple settings fields.
function encryptString(text) {
  if (!text) return null;
  const result = encrypt(text);
  return `${result.iv}:${result.authTag}:${result.encryptedData}`;
}

function decryptString(compositeString) {
  if (!compositeString) return null;
  const parts = compositeString.split(':');
  if (parts.length !== 3) return null;
  return decrypt(parts[2], parts[0], parts[1]);
}

function generateSecurePassword() {
  return crypto.randomBytes(32).toString('base64url');
}

module.exports = {
  encrypt,
  decrypt,
  encryptString,
  decryptString,
  generateSecurePassword
};
