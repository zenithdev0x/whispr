const express  = require('express')
const router   = express.Router()
const supabase = require('../db/supabase')
const auth     = require('../middleware/auth')

// ── GET /polls ──
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('polls')
    .select('id, question, option_a, option_b, votes_a, votes_b, expires_at, created_at')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return res.status(500).json({ error: 'Could not load polls' })
  res.json(data)
})

// ── POST /polls ──
router.post('/', auth, async (req, res) => {
  const { question, option_a, option_b } = req.body
  if (!question || !option_a || !option_b) {
    return res.status(400).json({ error: 'Question and both options required' })
  }

  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours

  const { data, error } = await supabase
    .from('polls')
    .insert({ user_id: req.user.id, question, option_a, option_b, expires_at: expiresAt })
    .select()
    .single()

  if (error) return res.status(500).json({ error: 'Could not create poll' })
  res.status(201).json(data)
})

// ── POST /polls/:id/vote ──
router.post('/:id/vote', auth, async (req, res) => {
  const { choice } = req.body
  if (!['a','b'].includes(choice)) return res.status(400).json({ error: 'Invalid choice' })

  // Check already voted
  const { data: existing } = await supabase
    .from('poll_votes')
    .select('id')
    .eq('poll_id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (existing) return res.status(400).json({ error: 'Already voted' })

  await supabase.from('poll_votes').insert({
    poll_id: req.params.id,
    user_id: req.user.id,
    choice
  })

  const col = choice === 'a' ? 'votes_a' : 'votes_b'
  const { data: poll } = await supabase.from('polls').select('votes_a,votes_b').eq('id', req.params.id).single()
  await supabase.from('polls').update({ [col]: (poll[col] || 0) + 1 }).eq('id', req.params.id)

  res.json({ voted: true, choice })
})

module.exports = router
