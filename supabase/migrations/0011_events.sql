-- ARV-50: event log for the pilot's four numbers (plans locked, bills settled, repeat plans,
-- web to app). IDs and small counts only: no names, messages, places or amounts. No foreign keys,
-- so deleting a plan or an account never breaks the log.
create table if not exists events (
  id bigint generated always as identity primary key,
  name text not null check (name in (
    'plan_created', 'plan_locked', 'member_joined', 'plan_shared', 'app_interest',
    'bill_created', 'bill_shares_set', 'share_settled'
  )),
  plan_id uuid,
  user_id uuid,
  guest_id uuid,
  bill_id uuid,
  props jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);
create index if not exists events_name_at_idx on events (name, at);

-- No policies: service key only. Written by the server, read by /admin/metrics.
alter table events enable row level security;
