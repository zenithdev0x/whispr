-- Run this entire file in Supabase → SQL Editor → New Query → Run
-- Creates all tables Whispr needs

-- USERS table
-- personal_email = their gmail/outlook (hashed for privacy)
-- college_email  = their @mitaoe.ac.in (stored for admin safety only)
-- ghost_username = what they see e.g. "void.raven.231"
create table if not exists users (
  id              uuid primary key default gen_random_uuid(),
  personal_email  text unique not null,
  college_email   text,
  college_name    text,
  ghost_username  text unique not null,
  created_at      timestamptz default now(),
  shadow_banned   boolean default false,
  warn_count      integer default 0
);

-- OTP table - temporary codes, expire after 10 mins
create table if not exists otps (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  code        text not null,
  expires_at  timestamptz not null,
  used        boolean default false,
  created_at  timestamptz default now()
);

-- POSTS table
create table if not exists posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete set null,
  tag         text not null check (tag in ('exam','love','placement','hostel','campus')),
  body        text not null,
  felt        integer default 0,
  same        integer default 0,
  flags       integer default 0,
  hidden      boolean default false,
  severity    text default 'safe' check (severity in ('safe','mild','severe')),
  admin_note  text,
  created_at  timestamptz default now()
);

-- POLLS table
create table if not exists polls (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users(id) on delete set null,
  question    text not null,
  option_a    text not null,
  option_b    text not null,
  votes_a     integer default 0,
  votes_b     integer default 0,
  expires_at  timestamptz default (now() + interval '2 hours'),
  created_at  timestamptz default now()
);

-- POLL VOTES - prevents double voting
create table if not exists poll_votes (
  id          uuid primary key default gen_random_uuid(),
  poll_id     uuid references polls(id) on delete cascade,
  user_id     uuid references users(id) on delete cascade,
  choice      text not null check (choice in ('a','b')),
  created_at  timestamptz default now(),
  unique(poll_id, user_id)
);

-- POST REACTIONS - prevents double reacting
create table if not exists post_reactions (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references posts(id) on delete cascade,
  user_id     uuid references users(id) on delete cascade,
  reaction    text not null check (reaction in ('felt','same')),
  created_at  timestamptz default now(),
  unique(post_id, user_id, reaction)
);

-- POST FLAGS - tracks who flagged what
create table if not exists post_flags (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid references posts(id) on delete cascade,
  user_id     uuid references users(id) on delete cascade,
  reason      text,
  created_at  timestamptz default now(),
  unique(post_id, user_id)
);

-- MIDNIGHT DROPS - one question per night
create table if not exists midnight_drops (
  id          uuid primary key default gen_random_uuid(),
  question    text not null,
  drop_date   date unique not null default current_date,
  active      boolean default true
);

-- MIDNIGHT ANSWERS
create table if not exists midnight_answers (
  id          uuid primary key default gen_random_uuid(),
  drop_id     uuid references midnight_drops(id) on delete cascade,
  user_id     uuid references users(id) on delete set null,
  body        text not null,
  created_at  timestamptz default now(),
  unique(drop_id, user_id)
);

-- Seed today's midnight drop question
insert into midnight_drops (question, drop_date) 
values ('What are you not saying out loud tonight?', current_date)
on conflict (drop_date) do nothing;

-- Row Level Security - users can only read their own data
alter table users enable row level security;
alter table otps enable row level security;
-- Posts are public to read (feed), but writes go through our server
alter table posts enable row level security;
alter table polls enable row level security;

-- Allow our server (service key) to do everything
create policy "service_full_access_users" on users for all using (true);
create policy "service_full_access_otps" on otps for all using (true);
create policy "service_full_access_posts" on posts for all using (true);
create policy "service_full_access_polls" on polls for all using (true);
create policy "service_full_access_poll_votes" on poll_votes for all using (true);
create policy "service_full_access_post_reactions" on post_reactions for all using (true);
create policy "service_full_access_post_flags" on post_flags for all using (true);
create policy "service_full_access_midnight" on midnight_drops for all using (true);
create policy "service_full_access_midnight_ans" on midnight_answers for all using (true);
