-- Day 3: Dibby's automatic nudges (ARV-24).
-- We stay on Vercel Hobby, where cron runs at most daily, so nudges are checked when
-- someone opens the plan. Each nudge is claimed by inserting its row: the primary key
-- makes the claim atomic, so two page loads at once can't both post it.
create table if not exists dibby_nudges (
  plan_id uuid not null references plans on delete cascade,
  kind text not null,          -- 'rsvp' | 'vote_closing'
  key text not null,           -- what makes it unique, e.g. the day or the vote deadline
  created_at timestamptz not null default now(),
  primary key (plan_id, kind, key)
);
create index if not exists dibby_nudges_plan_time_idx on dibby_nudges (plan_id, created_at);

-- No policies: service key only, like dibby_log.
alter table dibby_nudges enable row level security;
