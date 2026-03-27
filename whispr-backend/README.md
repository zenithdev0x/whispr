# Whispr Backend

Node.js + Express API for the Whispr anonymous college social app.

---

## Stack
- **Server**: Node.js + Express
- **Database**: Supabase (Postgres)
- **Email OTP**: Resend
- **AI Moderation**: Anthropic Claude (Haiku - fast & cheap)
- **Hosting**: Railway

---

## Setup (do this once)

### 1. Install Node.js
Download from https://nodejs.org → choose "LTS" version → install

### 2. Set up Supabase
1. Go to https://supabase.com → Sign up → New project
2. Wait for it to finish setting up (~2 mins)
3. Go to SQL Editor → New Query → paste everything from `db/schema.sql` → Run
4. Go to Settings → API → copy:
   - Project URL (looks like `https://xxxx.supabase.co`)
   - service_role key (the secret one, not anon)

### 3. Set up Resend (for OTP emails)
1. Go to https://resend.com → Sign up
2. Go to API Keys → Create API Key → copy it
3. For "from" email: either verify your own domain OR use `onboarding@resend.dev` for testing

### 4. Set up Anthropic
1. Go to https://console.anthropic.com → API Keys → Create Key → copy it

### 5. Configure your secrets
```bash
cp .env.example .env
```
Open `.env` and fill in all your keys.

### 6. Install dependencies
```bash
npm install
```

### 7. Run locally
```bash
npm run dev
```
Server starts at http://localhost:3000
Test it: open http://localhost:3000/health in browser — should show `{"ok":true}`

---

## Deploy to Railway

1. Go to https://railway.app → Sign up with GitHub
2. New Project → Deploy from GitHub repo → select this repo
3. Go to Variables → add all your `.env` values one by one
4. Railway auto-deploys. Your API URL will be something like `https://whispr-backend.up.railway.app`
5. Copy that URL → put it in your frontend as the API base URL

---

## API Endpoints

### Auth
| Method | Endpoint | Body | Description |
|--------|----------|------|-------------|
| POST | `/auth/send-otp` | `{email}` | Send OTP to personal email |
| POST | `/auth/verify-otp` | `{email, code}` | Verify OTP, get JWT token |
| POST | `/auth/verify-college` | `{collegeEmail, code}` | Verify college email |

### Posts
| Method | Endpoint | Auth? | Description |
|--------|----------|-------|-------------|
| GET | `/posts` | No | Get feed (add `?tag=exam` to filter) |
| POST | `/posts` | Yes | Create post |
| POST | `/posts/:id/react` | Yes | Toggle felt/same reaction |
| POST | `/posts/:id/flag` | Yes | Report a post |

### Polls
| Method | Endpoint | Auth? | Description |
|--------|----------|-------|-------------|
| GET | `/polls` | No | Get active polls |
| POST | `/polls` | Yes | Create poll |
| POST | `/polls/:id/vote` | Yes | Vote on poll |

### Midnight Drop
| Method | Endpoint | Auth? | Description |
|--------|----------|-------|-------------|
| GET | `/midnight` | Yes | Get tonight's question + your answer status |
| POST | `/midnight/answer` | Yes | Answer tonight's question (only 00:00-01:00) |

---

## Folder Structure
```
whispr-backend/
├── index.js          ← main server, starts everything
├── db/
│   ├── supabase.js   ← database connection
│   └── schema.sql    ← run this in Supabase to create tables
├── middleware/
│   └── auth.js       ← JWT verification
├── lib/
│   ├── ghost.js      ← ghost username generator
│   ├── otp.js        ← OTP send + verify
│   └── moderation.js ← Claude AI moderation
├── routes/
│   ├── auth.js       ← /auth/* endpoints
│   ├── posts.js      ← /posts/* endpoints
│   ├── polls.js      ← /polls/* endpoints
│   └── midnight.js   ← /midnight/* endpoints
├── .env.example      ← copy to .env and fill in your keys
├── .gitignore        ← keeps .env off GitHub
└── package.json      ← project config + dependencies
```
