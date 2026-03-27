const nodemailer = require('nodemailer')
const supabase   = require('../db/supabase')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
  user: 'zenith.dev26@gmail.com',
pass: 'eghl xtws dmae nzsm'
  }
})

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

async function sendOTP(email) {
  const code      = generateCode()
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  await supabase.from('otps').update({ used: true }).eq('email', email).eq('used', false)
  await supabase.from('otps').insert({ email, code, expires_at: expiresAt.toISOString() })

  await transporter.sendMail({
    from: 'Whispr <zenith.dev26@gmail.com>',
    to: email,
    subject: 'Your Whispr verification code',
    html: `
      <div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:32px;">
        <h2 style="font-size:24px;margin-bottom:8px">whispr</h2>
        <p style="color:#666;margin-bottom:24px">Your verification code:</p>
        <div style="background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;">
          ${code}
        </div>
        <p style="color:#999;font-size:12px;margin-top:16px">Expires in 10 minutes. Do not share this.</p>
      </div>
    `
  })
  return true
}

async function verifyOTP(email, code) {
  const { data } = await supabase
    .from('otps')
    .select('*')
    .eq('email', email)
    .eq('code', code)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!data) return false

  await supabase.from('otps').update({ used: true }).eq('id', data.id)
  return true
}

module.exports = { sendOTP, verifyOTP }