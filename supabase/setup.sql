-- dibs: full database setup. Paste this whole file into Supabase > SQL editor > New query, then Run.
-- Generated from supabase/migrations (0001 + 0002). Safe to run once on a fresh project.

-- Dibs POC schema. Supabase (Postgres 15+), Sydney region.
-- Organisers sign in (auth.users). Guests have no Supabase session: the web app
-- verifies their signed device cookie and writes on their behalf with the service key,
-- so every guest write goes through a server route, never straight from the browser.

create extension if not exists pgcrypto;

-- ---------- Types ----------
create type vibe as enum ('chill', 'extra', 'straight');
create type plan_status as enum ('voting', 'locked', 'wrapped', 'cancelled');
create type member_role as enum ('organiser', 'cohost', 'guest');
create type rsvp as enum ('in', 'maybe', 'out');
create type monogram_colour as enum ('violet', 'lime', 'sun', 'mint', 'tangerine');
create type option_kind as enum ('venue', 'activity');
create type message_kind as enum ('text', 'dibby', 'system');
create type split_mode as enum ('even', 'amount', 'percent', 'exclude', 'roulette');
create type share_status as enum ('owed', 'says_paid', 'confirmed');

-- ---------- People ----------
create table profiles (
  user_id uuid primary key references auth.users on delete cascade,
  first_name text not null,
  last_name text not null,
  dob date not null,
  payid text,
  payid_name text,
  created_at timestamptz not null default now(),
  constraint adult check (dob <= (current_date - interval '18 years'))
);

create table guests (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  device_token_hash text not null unique,
  removed_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------- Plans ----------
create table plans (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  organiser_id uuid not null references auth.users on delete restrict,
  title text not null check (length(title) between 1 and 80),
  area text,
  starts_at timestamptz,
  venue_place_id text,
  venue_name text,
  vibe vibe not null default 'chill',
  status plan_status not null default 'voting',
  vote_deadline timestamptz,
  capacity int not null default 20 check (capacity between 2 and 20),
  plus_ones boolean not null default false,
  version int not null default 1,
  updated_note text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table plan_members (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans on delete cascade,
  user_id uuid references auth.users on delete set null,
  guest_id uuid references guests on delete set null,
  role member_role not null default 'guest',
  display_name text not null,
  colour monogram_colour not null default 'violet',
  rsvp rsvp,
  plus_one boolean not null default false,
  waitlisted boolean not null default false,
  attended boolean,
  joined_at timestamptz not null default now(),
  unique (plan_id, user_id),
  unique (plan_id, guest_id)
);
create index on plan_members (plan_id);

create table options (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans on delete cascade,
  kind option_kind not null default 'venue',
  place_id text,
  label text not null,
  added_by uuid references plan_members on delete set null,
  created_at timestamptz not null default now()
);

create table votes (
  option_id uuid not null references options on delete cascade,
  member_id uuid not null references plan_members on delete cascade,
  created_at timestamptz not null default now(),
  primary key (option_id, member_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans on delete cascade,
  member_id uuid references plan_members on delete set null, -- null = Dibby or system
  kind message_kind not null default 'text',
  body text not null check (length(body) between 1 and 2000),
  mentions_dibby boolean not null default false,
  created_at timestamptz not null default now()
);
create index on messages (plan_id, created_at);

create table dibby_log (
  plan_id uuid not null references plans on delete cascade,
  day date not null,
  proactive_count int not null default 0,
  last_error text,
  primary key (plan_id, day)
);

-- ---------- Money ----------
create table bills (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans on delete cascade,
  payer_member_id uuid not null references plan_members,
  title text not null,
  total_cents int not null check (total_cents >= 0),
  currency char(3) not null default 'AUD',
  split_mode split_mode not null default 'even',
  seed text not null default encode(gen_random_bytes(8), 'hex'),
  roulette_loser_id uuid references plan_members,
  created_at timestamptz not null default now()
);

create table bill_shares (
  bill_id uuid not null references bills on delete cascade,
  member_id uuid not null references plan_members,
  amount_cents int not null check (amount_cents >= 0),
  status share_status not null default 'owed',
  says_paid_at timestamptz,
  confirmed_at timestamptz,
  reminded_at timestamptz,
  primary key (bill_id, member_id)
);

create table roulette_spins (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references bills on delete cascade,
  entrant_ids uuid[] not null,
  result_member_id uuid not null references plan_members,
  created_at timestamptz not null default now()
);

-- ---------- Recap ----------
create table recap_answers (
  plan_id uuid not null references plans on delete cascade,
  member_id uuid not null references plan_members on delete cascade,
  stars int check (stars between 1 and 5),
  best_moment text check (length(best_moment) <= 280),
  mvp_member_id uuid references plan_members,
  primary key (plan_id, member_id)
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans on delete cascade,
  member_id uuid not null references plan_members on delete cascade,
  storage_path text not null,
  width int,
  height int,
  created_at timestamptz not null default now()
);

create or replace function photos_cap() returns trigger language plpgsql as $$
begin
  if (select count(*) from photos where plan_id = new.plan_id) >= 10 then
    raise exception 'A plan can have up to 10 photos';
  end if;
  return new;
end $$;
create trigger photos_cap before insert on photos for each row execute function photos_cap();

-- ---------- Helpers (security definer so policies don't recurse) ----------
create or replace function my_member_id(p uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select id from plan_members where plan_id = p and user_id = auth.uid()
$$;

create or replace function is_host(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from plan_members where plan_id = p and user_id = auth.uid() and role in ('organiser', 'cohost'))
$$;

create or replace function is_attendee(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from plan_members where plan_id = p and user_id = auth.uid() and attended is true)
$$;

-- PayID only for people with a share on this bill who were confirmed at wrap-up.
-- Called by the server for guests (passing their member id) and by signed-in users.
create or replace function get_payid(b uuid, caller_member uuid default null)
returns table (payer_name text, payid text)
language sql stable security definer set search_path = public as $$
  select pm.display_name, pr.payid
  from bills bl
  join plan_members pm on pm.id = bl.payer_member_id
  join profiles pr on pr.user_id = pm.user_id
  join bill_shares s on s.bill_id = bl.id
  join plan_members me on me.id = s.member_id
  where bl.id = b
    and me.attended is true
    and (me.user_id = auth.uid() or (caller_member is not null and me.id = caller_member and auth.role() = 'service_role'))
$$;

-- "4 of 6 settled" without showing who owes what.
create or replace function settled_summary(p uuid)
returns table (settled int, total int)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where s.status = 'confirmed')::int, count(*)::int
  from bill_shares s join bills b on b.id = s.bill_id
  where b.plan_id = p and s.amount_cents > 0 and s.member_id <> b.payer_member_id
$$;

-- ---------- Row-level security ----------
alter table profiles enable row level security;
alter table guests enable row level security;
alter table plans enable row level security;
alter table plan_members enable row level security;
alter table options enable row level security;
alter table votes enable row level security;
alter table messages enable row level security;
alter table dibby_log enable row level security;
alter table bills enable row level security;
alter table bill_shares enable row level security;
alter table roulette_spins enable row level security;
alter table recap_answers enable row level security;
alter table photos enable row level security;

-- guests and dibby_log: no policies = service key only.

create policy "own profile" on profiles for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Plans are public by link: the slug is the secret. The page fetches by slug server-side.
create policy "members read plan" on plans for select using (my_member_id(id) is not null);
create policy "organiser creates plan" on plans for insert with check (organiser_id = auth.uid());
create policy "hosts edit plan" on plans for update using (is_host(id));

create policy "members read members" on plan_members for select using (my_member_id(plan_id) is not null);
create policy "edit own rsvp" on plan_members for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "hosts edit members" on plan_members for update using (is_host(plan_id));

create policy "members read options" on options for select using (my_member_id(plan_id) is not null);
create policy "members add options" on options for insert with check (added_by = my_member_id(plan_id));
create policy "hosts remove options" on options for delete using (is_host(plan_id));

create policy "members read votes" on votes for select
  using (exists (select 1 from options o where o.id = option_id and my_member_id(o.plan_id) is not null));
create policy "own vote" on votes for all
  using (exists (select 1 from options o where o.id = option_id and member_id = my_member_id(o.plan_id)))
  with check (exists (select 1 from options o where o.id = option_id and member_id = my_member_id(o.plan_id)));

create policy "members read thread" on messages for select using (my_member_id(plan_id) is not null);
create policy "members post" on messages for insert with check (member_id = my_member_id(plan_id) and kind = 'text');

create policy "attendees read bills" on bills for select using (is_attendee(plan_id));
create policy "payer adds bill" on bills for insert with check (payer_member_id = my_member_id(plan_id) and is_attendee(plan_id));
create policy "payer edits bill" on bills for update using (payer_member_id = my_member_id(plan_id));

-- Balances are private: your own share, or every share on a bill you paid.
create policy "own or payer reads shares" on bill_shares for select using (
  exists (select 1 from bills b where b.id = bill_id
          and (member_id = my_member_id(b.plan_id) or b.payer_member_id = my_member_id(b.plan_id))));
create policy "payer confirms" on bill_shares for update using (
  exists (select 1 from bills b where b.id = bill_id and b.payer_member_id = my_member_id(b.plan_id)));
create policy "say paid" on bill_shares for update using (
  exists (select 1 from bills b where b.id = bill_id and member_id = my_member_id(b.plan_id)))
  with check (status in ('owed', 'says_paid'));

create policy "attendees read spins" on roulette_spins for select
  using (exists (select 1 from bills b where b.id = bill_id and is_attendee(b.plan_id)));

create policy "attendees read recap" on recap_answers for select using (is_attendee(plan_id));
create policy "own recap" on recap_answers for all using (member_id = my_member_id(plan_id) and is_attendee(plan_id))
  with check (member_id = my_member_id(plan_id) and is_attendee(plan_id));

create policy "attendees read photos" on photos for select using (is_attendee(plan_id));
create policy "attendees upload" on photos for insert with check (member_id = my_member_id(plan_id) and is_attendee(plan_id));

-- Signed-in users can only change payment status on a share, never the amount.
revoke update on bill_shares from authenticated;
grant update (status, says_paid_at, confirmed_at) on bill_shares to authenticated;

-- ---------- Realtime ----------
alter publication supabase_realtime add table messages, plan_members, votes, options;

-- Day 2: option notes, PayID on the bill (guests can be payers too), roulette opt-ins.
-- Rebuilt by Claude after the original was overwritten; matches the store code in apps/web/lib/store.

alter table options add column note text;

-- A payer who isn't signed up (a guest) enters their PayID on the bill itself.
alter table bills add column payid text, add column payid_name text;
-- People who tapped "I'm in" for this bill's roulette spin, before the spin.
alter table bills add column roulette_entrants uuid[] not null default '{}';

-- PayID from the bill if set, otherwise from the payer's profile.
-- Only for callers with a share on this bill who were confirmed at wrap-up.
create or replace function get_payid(b uuid, caller_member uuid default null)
returns table (payer_name text, payid text)
language sql stable security definer set search_path = public as $$
  select coalesce(bl.payid_name, pm.display_name), coalesce(bl.payid, pr.payid)
  from bills bl
  join plan_members pm on pm.id = bl.payer_member_id
  left join profiles pr on pr.user_id = pm.user_id
  join bill_shares s on s.bill_id = bl.id
  join plan_members me on me.id = s.member_id
  where bl.id = b
    and me.attended is true
    and (me.user_id = auth.uid() or (caller_member is not null and me.id = caller_member and auth.role() = 'service_role'))
$$;

alter publication supabase_realtime add table bills, bill_shares;

-- One vote per person per plan: voting again moves your vote.
create or replace function one_vote_per_plan() returns trigger language plpgsql as $$
begin
  delete from votes v
  using options o_new, options o_old
  where o_new.id = new.option_id
    and o_old.id = v.option_id
    and o_old.plan_id = o_new.plan_id
    and v.member_id = new.member_id
    and v.option_id <> new.option_id;
  return new;
end $$;
create trigger one_vote_per_plan before insert on votes for each row execute function one_vote_per_plan();
