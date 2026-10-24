-- When each person last opened their plan's chat, so the Chat button can show how many messages
-- are new to them, on any device. Null until they first open it (then "new" means since they joined).
alter table plan_members add column if not exists chat_seen_at timestamptz;
