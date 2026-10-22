-- Beta updates: release notes by email, opt-in only.
-- One row per person per list. Unsubscribing keeps the row (with unsubscribed_at) so we
-- can prove we stopped, and so a later re-subscribe is a deliberate yes, not an accident.
-- Service key only, like guests: the app reads and writes these on the server.

create table if not exists mailing_list (
  id uuid primary key default gen_random_uuid(),
  list text not null default 'beta_updates',
  email text not null,
  user_id uuid references auth.users on delete set null,
  -- Goes in every unsubscribe link, so leaving never needs a sign-in.
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  consented_at timestamptz not null default now(),
  -- Where they said yes: 'onboarding' or 'account'. Kept as a record of consent.
  consent_source text not null,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint mailing_list_email_lower check (email = lower(email))
);
create unique index if not exists mailing_list_list_email on mailing_list (list, email);
create index if not exists mailing_list_user on mailing_list (user_id);

-- Which release note went to whom, so running send again never doubles up.
create table if not exists release_note_sends (
  note_id text not null,
  email text not null,
  provider_id text,
  sent_at timestamptz not null default now(),
  primary key (note_id, email)
);

alter table mailing_list enable row level security;
alter table release_note_sends enable row level security;
-- No policies: only the service key (server and the send command) can touch these.
