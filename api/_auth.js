// Stateless signed-cookie auth. No session database needed:
// the cookie itself carries an expiry + an HMAC signature that only the server
// (which knows SESSION_SECRET) can produce or verify. Cracking it requires the secret.
const crypto = require('crypto');

const COOKIE_NAME = 'ts_auth';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 year — effectively "log in once"

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }
  return secret;
}

function sha256Hex(input) {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

// Constant-time-ish comparison of two hex digests (equal length by construction, since both are sha256 hex).
function safeEqualHex(a, b) {
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function checkPassword(submitted) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) {
    throw new Error('APP_PASSWORD environment variable is not set');
  }
  // Hash both sides first so comparison length is fixed regardless of input length (avoids leaking length via timing).
  return safeEqualHex(sha256Hex(submitted || ''), sha256Hex(expected));
}

function makeSessionCookie() {
  const secret = getSecret();
  const payload = JSON.stringify({ exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  const cookieValue = `${payloadB64}.${sig}`;
  return `${COOKIE_NAME}=${cookieValue}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    out[key] = val;
  });
  return out;
}

// Returns true if the request carries a valid, unexpired, correctly-signed session cookie.
function isAuthenticated(req) {
  try {
    const secret = getSecret();
    const cookies = parseCookies(req.headers.cookie);
    const raw = cookies[COOKIE_NAME];
    if (!raw) return false;
    const dotIdx = raw.lastIndexOf('.');
    if (dotIdx === -1) return false;
    const payloadB64 = raw.slice(0, dotIdx);
    const sig = raw.slice(dotIdx + 1);
    const expectedSig = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
    if (!safeEqualHex(sig, expectedSig)) return false;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || Date.now() > payload.exp) return false;
    return true;
  } catch (err) {
    return false;
  }
}

module.exports = { checkPassword, makeSessionCookie, clearSessionCookie, isAuthenticated, COOKIE_NAME };
