-- Push notifications for the native app: one row per phone (its Expo push token), belonging to
-- an account or a guest pass. Signing in moves the phone onto the account (the app registers its
-- token again). Safe to apply before the code ships.
-- Service key only, like calendar_feeds: the API routes and the sender are the only readers.
create table if not exists push_tokens (
  token text primary key,
  user_id uuid references auth.users on delete cascade,
  guest_id uuid references guests on delete cascade,
  platform text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now(),
  check (user_id is not null or guest_id is not null)
);
create index if not exists push_tokens_user on push_tokens (user_id) where user_id is not null;
create index if not exists push_tokens_guest on push_tokens (guest_id) where guest_id is not null;
alter table push_tokens enable row level security;
-- No policies: only the server touches this table.
