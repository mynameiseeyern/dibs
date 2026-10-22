-- Day 3: reactions on plan thread messages (ARV-16). One row per person per emoji per message.
create table if not exists message_reactions (
  message_id uuid not null references messages on delete cascade,
  plan_id uuid not null references plans on delete cascade,
  member_id uuid not null references plan_members on delete cascade,
  emoji text not null check (emoji in ('👍', '❤️', '😂', '🎉')),
  created_at timestamptz not null default now(),
  primary key (message_id, member_id, emoji)
);
create index if not exists message_reactions_plan_idx on message_reactions (plan_id);

-- No policies: service key only. Reactions go through a server action, members only.
alter table message_reactions enable row level security;
