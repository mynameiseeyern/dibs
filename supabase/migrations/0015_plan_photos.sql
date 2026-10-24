-- The Dibby camera: up to three photos each, for people who were there. Images live in a private
-- bucket and are only ever served through the app (/p/<slug>/photos/<id>), after it checks who's
-- asking. No public URLs, no policies: service key only.
create table if not exists plan_photos (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references plans on delete cascade,
  member_id uuid not null references plan_members on delete cascade,
  path text not null,
  width int,
  height int,
  created_at timestamptz not null default now()
);
create index if not exists plan_photos_plan_idx on plan_photos (plan_id);
alter table plan_photos enable row level security;

-- Private bucket: JPEGs only (the app shrinks and re-encodes on the phone, which also drops GPS),
-- 5 MB cap per file.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('plan-photos', 'plan-photos', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;
