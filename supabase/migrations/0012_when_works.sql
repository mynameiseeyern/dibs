-- ARV-21: "When works?" The host puts up to four times to the crew, people going tick the ones
-- they're free for, and the host goes with the best one (it becomes the plan's start).
create table if not exists plan_times (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans on delete cascade,
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (plan_id, starts_at)
);
create index if not exists plan_times_plan_idx on plan_times (plan_id);

create table if not exists time_votes (
  time_id uuid not null references plan_times on delete cascade,
  plan_id uuid not null references plans on delete cascade,
  member_id uuid not null references plan_members on delete cascade,
  created_at timestamptz not null default now(),
  primary key (time_id, member_id)
);
create index if not exists time_votes_plan_idx on time_votes (plan_id);

-- No policies: service key only. Everything goes through server actions that check planAccess.
alter table plan_times enable row level security;
alter table time_votes enable row level security;
