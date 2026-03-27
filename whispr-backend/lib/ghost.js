const supabase = require('../db/supabase')

const ADJ  = ['void','dark','null','echo','phantom','static','drift','silent','lost',
               'hollow','burnt','faded','neon','cold','raw','broken','lone','still',
               'haze','ember','ghost','iron','lunar','mute','blank','ashen','pale']
const NOUN = ['raven','orbit','signal','matter','circuit','pulse','cipher','shade',
               'spark','mirror','storm','thread','veil','drift','shard','fog','glitch',
               'frame','rift','flux','prism','wave','core','byte','trace','hollow']

function generate() {
  const a   = ADJ[Math.floor(Math.random() * ADJ.length)]
  const n   = NOUN[Math.floor(Math.random() * NOUN.length)]
  const num = Math.floor(Math.random() * 900) + 100
  return `${a}.${n}.${num}`
}

// Keep generating until we find one that isn't already taken
async function generateUnique() {
  let attempts = 0
  while (attempts < 20) {
    const ghost = generate()
    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('ghost_username', ghost)
      .single()

    if (!data) return ghost  // not taken
    attempts++
  }
  // Fallback with timestamp to guarantee uniqueness
  return `${generate()}.${Date.now().toString(36)}`
}

module.exports = { generate, generateUnique }
