const express  = require('express')
const router   = express.Router()
const supabase = require('../db/supabase')
const auth     = require('../middleware/auth')

// ── GET /midnight ──
// Returns today's drop + whether current user answered
router.get('/', auth, async (req, res) => {
  const today = new Date().toISOString().split('T')[0]

  const { data: drop } = await supabase
    .from('midnight_drops')
    .select('id, question, drop_date')
    .eq('drop_date', today)
    .single()

  if (!drop) return res.json({ drop: null, answered: false, count: 0 })

  // Count answers
  const { count } = await supabase
    .from('midnight_answers')
    .select('id', { count: 'exact', head: true })
    .eq('drop_id', drop.id)

  // Check if this user already answered
  const { data: mine } = await supabase
    .from('midnight_answers')
    .select('body')
    .eq('drop_id', drop.id)
    .eq('user_id', req.user.id)
    .single()

  res.json({ drop, answered: !!mine, myAnswer: mine?.body || null, count: count || 0 })
})

// ── POST /midnight/answer ──
router.post('/answer', auth, async (req, res) => {
  const { body } = req.body
  if (!body || body.trim().length < 2) return res.status(400).json({ error: 'Too short' })

  const today = new Date().toISOString().split('T')[0]
  const { data: drop } = await supabase
    .from('midnight_drops')
    .select('id')
    .eq('drop_date', today)
    .single()

  if (!drop) return res.status(404).json({ error: 'No drop tonight' })

  // Check window — only between 00:00 and 01:00
  const hour = new Date().getHours()
  if (hour !== 0) return res.status(403).json({ error: 'Drop is locked right now — come back at midnight' })

  const { error } = await supabase.from('midnight_answers').insert({
    drop_id: drop.id,
    user_id: req.user.id,
    body:    body.trim()
  })

  if (error && error.code === '23505') return res.status(400).json({ error: 'Already answered tonight' })
  if (error) return res.status(500).json({ error: 'Could not save answer' })

  res.json({ ok: true })
})

module.exports = router
