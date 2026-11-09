-- Report, block and ban (Apple guideline 1.2, Google's UGC policy). A "person" is `u:<user id>` or
-- `g:<guest id>`. No foreign keys on people, so a report outlives the account it's about.
-- No policies: service key only. Written by the server, read by /admin/reports.
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('message', 'photo', 'plan', 'member')),
  plan_id uuid references plans on delete set null,
  target_id text,
  target_person text,
  reporter text,
  reason text not null,
  note text check (length(note) <= 500),
  -- What it said when it was reported, so it can still be judged if it's since been edited or deleted.
  snapshot text,
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists reports_status_idx on reports (status, created_at);
create index if not exists reports_reporter_idx on reports (reporter);
alter table reports enable row level security;

create table if not exists blocks (
  blocker text not null,
  blocked text not null,
  blocked_name text not null,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
alter table blocks enable row level security;

-- plan_id null: off the whole service. Set: off that plan, and can't join it again.
create table if not exists bans (
  id uuid primary key default gen_random_uuid(),
  person text not null,
  plan_id uuid references plans on delete cascade,
  created_at timestamptz not null default now()
);
create unique index if not exists bans_person_plan_idx on bans (person, coalesce(plan_id, '00000000-0000-0000-0000-000000000000'::uuid));
alter table bans enable row level security;
