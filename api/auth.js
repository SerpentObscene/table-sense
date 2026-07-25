const { checkPassword, makeSessionCookie } = require('./_auth');

module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let body = req.body;
  // Vercel usually parses JSON bodies automatically, but guard in case it arrives as a raw string.
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const password = (body && body.password) || '';

  let ok;
  try {
    ok = checkPassword(password);
  } catch (err) {
    // APP_PASSWORD or SESSION_SECRET not configured on the server.
    res.status(500).json({ error: 'Server is not configured correctly: ' + err.message });
    return;
  }

  if (!ok) {
    // Never reveal the actual password or its hash — but a length comparison is safe
    // and catches the single most common cause of "I set it correctly but it still
    // fails": invisible trailing whitespace or a newline pasted into the Vercel
    // environment variable field, which makes APP_PASSWORD silently longer than
    // what you typed into the login box.
    const expectedLength = (process.env.APP_PASSWORD || '').length;
    res.status(401).json({
      error: 'Incorrect password.',
      debug: {
        youTypedLength: password.length,
        serverExpectsLength: expectedLength,
        hint: password.length !== expectedLength
          ? 'Lengths differ — check for a trailing space or newline in APP_PASSWORD on Vercel.'
          : 'Lengths match, so the text itself differs — check for a typo or a case mismatch.'
      }
    });
    return;
  }

  res.setHeader('Set-Cookie', makeSessionCookie());
  res.status(200).json({ ok: true });
};
