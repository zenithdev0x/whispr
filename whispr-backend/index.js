require('dotenv').config()  // loads .env file first — must be line 1
const express   = require('express')
const cors      = require('cors')
const rateLimit = require('express-rate-limit')
const cron      = require('node-cron')
const supabase  = require('./db/supabase')

const app = express()

// ── CORS — allow your frontend to talk to this server ──
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://127.0.0.1:5500',
  ],
  credentials: true
}))

app.use(express.json())

// ── RATE LIMITING ──
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests — slow down' }
}))

const authLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many attempts — try again in 15 minutes' }
})

// ── ROUTES ──
app.use('/auth',     authLimit, require('./routes/auth'))
app.use('/posts',    require('./routes/posts'))
app.use('/polls',    require('./routes/polls'))
app.use('/midnight', require('./routes/midnight'))

// ── ROOT ROUTE (fixes "Cannot GET /") ──
app.get('/', (req, res) => {
  res.json({ status: 'Whispr API is live 🚀', version: 'v1' })
})

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() })
})

// ── MIDNIGHT DROP CRON JOB ──
const midnightQuestions = [
  "What are you not saying out loud tonight?",
  "What's the one thing you wish someone would ask you?",
  "What decision are you avoiding right now?",
  "What would you do if nobody was watching?",
  "What's been on your mind for more than a week?",
  "What are you pretending is fine when it isn't?",
  "If you could change one thing about today, what would it be?",
  "What's something you're proud of that you haven't told anyone?",
  "What do you actually want right now?",
  "What's the last thing that made you feel genuinely happy?",
  "What are you most scared of this semester?",
  "What's one thing you wish your family understood about you?",
]

cron.schedule('0 0 * * *', async () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = tomorrow.toISOString().split('T')[0]
  const question = midnightQuestions[Math.floor(Math.random() * midnightQuestions.length)]

  await supabase.from('midnight_drops').insert({
    question,
    drop_date: dateStr
  }).then(() => {
    console.log(`Tomorrow's drop created: "${question}"`)
  })
}, { timezone: 'Asia/Kolkata' })

// ── START ──
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Whispr backend running on port ${PORT}`)
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
})
