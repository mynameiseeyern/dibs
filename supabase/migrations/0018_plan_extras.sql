-- Plan extras: everything beyond RSVP (group chat, uploading pics, bills, recap) can be
-- switched off per plan. We store what's off, so every existing plan keeps them all on.
-- Turning one off only hides it: messages, photos, bills and recap answers stay put.
alter table plans add column if not exists extras_off text[] not null default '{}'
  check (extras_off <@ array['chat', 'photos', 'bills', 'recap']::text[]);
