const express    = require('express')
const router     = express.Router()
const supabase   = require('../db/supabase')
const auth       = require('../middleware/auth')
const { checkPost } = require('../lib/moderation')

// ── GET /posts ──
// Returns recent posts for the feed (no user emails, just content)
router.get('/', async (req, res) => {
  const { tag, limit = 30 } = req.query

  let query = supabase
    .from('posts')
    .select('id, tag, body, felt, same, flags, created_at')
    .eq('hidden', false)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit))

  if (tag && tag !== 'all') query = query.eq('tag', tag)

  const { data, error } = await query
  if (error) return res.status(500).json({ error: 'Could not load posts' })

  res.json(data)
})

// ── POST /posts ──
// Creates a new post — requires login
router.post('/', auth, async (req, res) => {
  const { tag, body } = req.body

  if (!body || body.trim().length < 2) {
    return res.status(400).json({ error: 'Post is too short' })
  }
  if (body.length > 180) {
    return res.status(400).json({ error: 'Post is too long' })
  }
  const validTags = ['exam','love','placement','hostel','campus']
  if (!validTags.includes(tag)) {
    return res.status(400).json({ error: 'Invalid tag' })
  }

  // Check if shadow banned
  const { data: user } = await supabase
    .from('users')
    .select('shadow_banned')
    .eq('id', req.user.id)
    .single()

  // Save post immediately — goes live right away
  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      user_id: req.user.id,
      tag:     tag.toLowerCase(),
      body:    body.trim(),
      hidden:  user?.shadow_banned || false
    })
    .select('id, tag, body, felt, same, flags, created_at')
    .single()

  if (error) return res.status(500).json({ error: 'Could not save post' })

  // Return immediately — user sees their post live
  res.status(201).json(post)

  // AI moderation runs in background AFTER response sent
  checkPost(body).then(async (verdict) => {
    if (verdict.severity === 'severe') {
      await supabase
        .from('posts')
        .update({ hidden: true, severity: 'severe', admin_note: verdict.reason })
        .eq('id', post.id)
    } else if (verdict.severity === 'mild') {
      await supabase
        .from('posts')
        .update({ severity: 'mild', admin_note: verdict.reason })
        .eq('id', post.id)
    }
    if (verdict.mh) {
      await supabase
        .from('posts')
        .update({ admin_note: (verdict.reason || '') + ' [MH_FLAG]' })
        .eq('id', post.id)
    }
  }).catch(console.error)
})

// ── POST /posts/:id/react ──
// Toggle felt/same reaction
router.post('/:id/react', auth, async (req, res) => {
  const { reaction } = req.body
  if (!['felt','same'].includes(reaction)) {
    return res.status(400).json({ error: 'Invalid reaction' })
  }

  // Check if already reacted
  const { data: existing } = await supabase
    .from('post_reactions')
    .select('id')
    .eq('post_id', req.params.id)
    .eq('user_id', req.user.id)
    .eq('reaction', reaction)
    .single()

  if (existing) {
    // Un-react
    await supabase.from('post_reactions').delete().eq('id', existing.id)
    await supabase.rpc('decrement_reaction', { post_id: req.params.id, col: reaction })
    return res.json({ reacted: false })
  }

  // React
  await supabase.from('post_reactions').insert({
    post_id:  req.params.id,
    user_id:  req.user.id,
    reaction
  })
  await supabase.rpc('increment_reaction', { post_id: req.params.id, col: reaction })
  res.json({ reacted: true })
})

// ── POST /posts/:id/flag ──
// Flag a post — 3 flags auto-hides it
router.post('/:id/flag', auth, async (req, res) => {
  const { reason } = req.body

  // Check if already flagged by this user
  const { data: existing } = await supabase
    .from('post_flags')
    .select('id')
    .eq('post_id', req.params.id)
    .eq('user_id', req.user.id)
    .single()

  if (existing) return res.status(400).json({ error: 'Already reported' })

  // Save flag
  await supabase.from('post_flags').insert({
    post_id: req.params.id,
    user_id: req.user.id,
    reason:  reason || 'unspecified'
  })

  // Increment flag count
  const { data: post } = await supabase
    .from('posts')
    .select('flags')
    .eq('id', req.params.id)
    .single()

  const newFlags = (post?.flags || 0) + 1
  const autoHide = newFlags >= 3

  await supabase
    .from('posts')
    .update({ flags: newFlags, hidden: autoHide })
    .eq('id', req.params.id)

  res.json({ flags: newFlags, autoHidden: autoHide })
})

module.exports = router
