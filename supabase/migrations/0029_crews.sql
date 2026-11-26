-- ARV-88: Crews. A crew is a group of friends who keep making plans together. Accounts only.
-- Safe to apply before the code ships: every plan stays crew-less and visible by link, as now.
--
-- The web server reads with the service key, so the real gate is in code (crewPlanAccess and
-- friends in packages/shared/src/crews.ts, checked in every route and server action). The
-- policies below are the second layer, for anything that ever reads with a user's session.

create type crew_role as enum ('owner', 'admin', 'member');
create type plan_visibility as enum ('crew', 'link');
create type crew_request_status as enum ('pending', 'approved', 'declined', 'cancelled');

create table if not exists crews (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 40),
  emoji text not null check (length(emoji) between 1 and 16),
  created_by uuid references auth.users on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists crew_members (
  crew_id uuid not null references crews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role crew_role not null default 'member',
  muted boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);
create index if not exists crew_members_user on crew_members (user_id);
-- One owner per crew. Handing over is one transaction: owner → admin, then the new owner.
create unique index if not exists crew_members_one_owner on crew_members (crew_id) where role = 'owner';

-- Invite links, Discord-style (ARV-89). Any member can make one. The link carries a random
-- token; we keep only its hash, like guests. Null expires_at = never, null max_uses = no limit.
create table if not exists crew_invites (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews on delete cascade,
  token_hash text not null unique,
  created_by uuid references auth.users on delete set null,
  created_by_role crew_role not null,
  expires_at timestamptz,
  max_uses int check (max_uses is null or max_uses in (1, 5, 10, 25)),
  uses int not null default 0 check (uses >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists crew_invites_crew on crew_invites (crew_id);

-- Asking to join. An invite gets you to Ask to join; the owner or an admin decides.
create table if not exists crew_join_requests (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  invite_id uuid references crew_invites on delete set null,
  status crew_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users on delete set null
);
-- One open request per person per crew.
create unique index if not exists crew_join_requests_one_pending on crew_join_requests (crew_id, user_id) where status = 'pending';
create index if not exists crew_join_requests_user_pending on crew_join_requests (user_id) where status = 'pending';

-- Who was removed, so they can only come back through a fresh invite from the owner or an admin.
create table if not exists crew_removals (
  crew_id uuid not null references crews on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  removed_by uuid references auth.users on delete set null,
  removed_at timestamptz not null default now(),
  primary key (crew_id, user_id)
);

-- A plan belongs to one crew or none. Visibility only matters for crew plans: 'link' is every plan
-- today. Deleting a crew unlinks its plans (crew_id → null) and leaves visibility alone, so a
-- crew-only plan of a deleted crew stays visible to the people already on it and no one else.
alter table plans add column if not exists crew_id uuid references crews on delete set null;
alter table plans add column if not exists visibility plan_visibility not null default 'link';
create index if not exists plans_crew on plans (crew_id) where crew_id is not null;

-- ---------- Helpers (security definer so policies don't recurse) ----------
create or replace function my_crew_role(c uuid) returns crew_role
language sql stable security definer set search_path = public as $$
  select role from crew_members where crew_id = c and user_id = auth.uid()
$$;

-- ---------- Row-level security ----------
alter table crews enable row level security;
alter table crew_members enable row level security;
alter table crew_invites enable row level security;
alter table crew_join_requests enable row level security;
alter table crew_removals enable row level security;

create policy "members read crew" on crews for select using (my_crew_role(id) is not null);
create policy "members read crew members" on crew_members for select using (my_crew_role(crew_id) is not null);
-- crew_invites, crew_join_requests, crew_removals: no policies, only the server touches them.

-- Crew members can see the crew's plans before they've joined them (the crew page list).
create policy "crew members read crew plans" on plans for select
  using (crew_id is not null and my_crew_role(crew_id) is not null);

-- Someone removed from a crew loses its crew-only plans straight away, even ones they were on.
-- Policies are OR'd, so tighten the plan read with a restrictive policy.
create policy "crew-only plans need the crew" on plans as restrictive for select
  using (visibility = 'link' or crew_id is null or my_crew_role(crew_id) is not null);
