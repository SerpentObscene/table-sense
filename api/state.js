const { isAuthenticated } = require('./_auth');
const { getSupabase } = require('./_db');

// Single-row key-value pattern: one fixed row holds the whole shared table state
// as a JSON string.
//
// Versioning uses the database's own updated_at timestamp, set here on the server
// at write time — never a client-generated counter. Two independent devices each
// counting their own pushes from 0 will both eventually reach "version 2", "version
// 3", etc, and those numbers collide even though they refer to completely different
// states — the server's clock is the only thing that can't collide between devices.
const ROW_ID = 'main';

module.exports = async (req, res) => {
  if (!isAuthenticated(req)) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (err) {
    res.status(500).json({ error: err.message });
    return;
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('shared_state')
        .select('value, updated_at')
        .eq('id', ROW_ID)
        .maybeSingle();
      if (error) {
        res.status(502).json({ error: 'Supabase read failed: ' + error.message });
        return;
      }
      res.status(200).json({
        value: data ? data.value : null,
        updatedAt: data ? data.updated_at : null
      });
    } catch (err) {
      res.status(502).json({ error: 'Supabase read failed: ' + err.message });
    }
    return;
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const value = body && body.value;
    if (typeof value !== 'string') {
      res.status(400).json({ error: 'Expected { value: "<json string>" }' });
      return;
    }
    const nowIso = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('shared_state')
        .upsert({ id: ROW_ID, value, updated_at: nowIso }, { onConflict: 'id' });
      if (error) {
        res.status(502).json({ error: 'Supabase write failed: ' + error.message });
        return;
      }
      // Hand back the exact timestamp the server just wrote, so the pushing device
      // can immediately treat itself as caught-up without a second round trip.
      res.status(200).json({ ok: true, updatedAt: nowIso });
    } catch (err) {
      res.status(502).json({ error: 'Supabase write failed: ' + err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
