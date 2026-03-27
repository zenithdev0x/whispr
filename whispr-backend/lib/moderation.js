const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Returns { severity: 'safe'|'mild'|'severe', reason: string, mh: boolean }
async function checkPost(text) {
  try {
    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001', // fast + cheap for moderation
      max_tokens: 100,
      messages: [{
        role:    'user',
        content: `You are a content moderator for Whispr — an anonymous college social app in India (MIT AOE, Pune).

Post: "${text}"

Classify severity:
"safe"   — personal feelings, no person targeted
"mild"   — "[word] is [adjective]" where word could be a name, vague targeting — send to admin review
"severe" — name+insult/slur, threats, sexual content, doxxing — remove immediately

Rule: "X is [any adjective]" where X could be a name = mild minimum.

JSON only, no markdown: {"severity":"safe"|"mild"|"severe","reason":"one sentence","mh":true|false}`
      }]
    })

    const raw = msg.content[0]?.text?.trim() || ''
    return JSON.parse(raw)
  } catch (err) {
    // If AI fails for any reason, default to safe — community flags are the backup
    console.error('Moderation check failed:', err.message)
    return { severity: 'safe', reason: '', mh: false }
  }
}

module.exports = { checkPost }
