-- Calendar subscription: each account gets one private link (webcal://…/cal/<token>.ics) that
-- Apple Calendar, Google Calendar or Outlook subscribe to. It lists the plans you're in with a
-- time and a place, and keeps them up to date. Safe to apply before the code ships.
-- The token is the only key, so it's long and random, and "Reset link" swaps it for a new one.
-- Service key only, like guests: the feed is fetched by calendar apps with no session.
create table if not exists calendar_feeds (
  user_id uuid primary key references auth.users on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);
alter table calendar_feeds enable row level security;
-- No policies: only the server touches this table.
