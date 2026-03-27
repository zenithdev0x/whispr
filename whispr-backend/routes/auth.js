const express    = require('express')
const jwt        = require('jsonwebtoken')
const router     = express.Router()
const supabase   = require('../db/supabase')
const { sendOTP, verifyOTP } = require('../lib/otp')
const { generateUnique }     = require('../lib/ghost')

// ── POST /auth/send-otp ──
// Body: { email: "user@gmail.com" }
// Sends a 4-digit code to the email
router.post('/send-otp', async (req, res) => {
  const { email } = req.body
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email' })
  }

  try {
    await sendOTP(email.toLowerCase().trim())
    res.json({ ok: true, message: 'Code sent' })
  } catch (err) {
    console.error('Send OTP error:', err)
    res.status(500).json({ error: 'Failed to send code — try again' })
  }
})

// ── POST /auth/verify-otp ──
// Body: { email, code }
// Verifies code, creates user if new, returns JWT
router.post('/verify-otp', async (req, res) => {
  const { email, code } = req.body
  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code required' })
  }

  const valid = await verifyOTP(email.toLowerCase().trim(), code)
  if (!valid) {
    return res.status(400).json({ error: 'Wrong or expired code' })
  }

  // Check if user already exists
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('personal_email', email.toLowerCase())
    .single()

  // New user — create account + ghost username
  if (!user) {
    const ghost = await generateUnique()
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({ personal_email: email.toLowerCase(), ghost_username: ghost })
      .select()
      .single()

    if (error) return res.status(500).json({ error: 'Account creation failed' })
    user = newUser
  }

  // Issue JWT — only contains safe info, never email
  const token = jwt.sign(
    { id: user.id, ghost: user.ghost_username, college: user.college_name },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )

  res.json({
    token,
    ghost:    user.ghost_username,
    college:  user.college_name || null,
    isNew:    !user.college_email
  })
})

// ── POST /auth/verify-college ──
// Body: { collegeEmail, code }
// Verifies college email, updates user record
router.post('/verify-college', async (req, res) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Not logged in' })
  const token = authHeader.split(' ')[1]
  let decoded
  try { decoded = jwt.verify(token, process.env.JWT_SECRET) }
  catch { return res.status(401).json({ error: 'Session expired' }) }

  const { collegeEmail, code } = req.body
  const valid = await verifyOTP(collegeEmail.toLowerCase(), code)
  if (!valid) return res.status(400).json({ error: 'Wrong or expired code' })

  // Detect college from domain
  const domain = collegeEmail.split('@')[1] || ''
  const collegeMap = {
    'mitaoe.ac.in': 'MIT AOE',
    'pict.edu':     'PICT',
    'coep.ac.in':   'COEP',
    'vjti.ac.in':   'VJTI',
    'mit.edu.in':   'MIT Pune',
  }
  const collegeName = collegeMap[domain.toLowerCase()] || domain.split('.')[0].toUpperCase()

  await supabase
    .from('users')
    .update({ college_email: collegeEmail.toLowerCase(), college_name: collegeName })
    .eq('id', decoded.id)

  // Issue new token with college info
  const newToken = jwt.sign(
    { id: decoded.id, ghost: decoded.ghost, college: collegeName },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  )

  res.json({ token: newToken, college: collegeName })
})

module.exports = router
