const { createClient } = require('@supabase/supabase-js');

// This key must NEVER reach the browser — it bypasses Row Level Security entirely.
// It's only ever used here, inside a serverless function that runs on the server.
// Supabase supports both the legacy name (SUPABASE_SERVICE_ROLE_KEY) and the newer
// "secret key" naming (SUPABASE_SECRET_KEY) introduced in their 2025/2026 API key
// migration — either works, so both are accepted.
function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      'Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY ' +
      '(or SUPABASE_SECRET_KEY) as environment variables.'
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

module.exports = { getSupabase };
