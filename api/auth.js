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
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  res.setHeader('Set-Cookie', makeSessionCookie());
  res.status(200).json({ ok: true });
};
