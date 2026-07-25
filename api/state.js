const { isAuthenticated } = require('./_auth');
const { getSupabase } = require('./_db');

// Single-row key-value pattern: one fixed row holds the whole shared table state
// as a JSON string, matching how the front-end already serializes and versions it.
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
        .select('value')
        .eq('id', ROW_ID)
        .maybeSingle();
      if (error) {
        res.status(502).json({ error: 'Supabase read failed: ' + error.message });
        return;
      }
      res.status(200).json({ value: data ? data.value : null });
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
    try {
      const { error } = await supabase
        .from('shared_state')
        .upsert({ id: ROW_ID, value, updated_at: new Date().toISOString() }, { onConflict: 'id' });
      if (error) {
        res.status(502).json({ error: 'Supabase write failed: ' + error.message });
        return;
      }
      res.status(200).json({ ok: true });
    } catch (err) {
      res.status(502).json({ error: 'Supabase write failed: ' + err.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
