-- Day 3: controls for Dibby's automatic messages (ARV-24).
-- The organiser sets how chatty Dibby is per plan; anyone can mute the nudges for themselves.
-- Messages Dibby posts on its own are flagged `auto`, so a muted member's thread hides them.
alter table plans add column if not exists dibby_volume text not null default 'normal'
  check (dibby_volume in ('quiet', 'normal', 'loud'));
alter table plan_members add column if not exists dibby_muted boolean not null default false;
alter table messages add column if not exists auto boolean not null default false;
