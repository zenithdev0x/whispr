const { createClient } = require('@supabase/supabase-js')

// This creates one database connection that the whole app reuses
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service key = full access, never send to frontend
)

module.exports = supabase
