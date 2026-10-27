-- Guest-first plans: an optional category and description on every plan, and the labels a
-- signed-in organiser made up, saved as their own presets.

alter table plans add column if not exists category text check (category is null or char_length(category) between 1 and 30);
alter table plans add column if not exists description text check (description is null or char_length(description) between 1 and 500);

-- Most recent first, at most 12 (the app trims). Preset labels Dibby ships with aren't stored.
alter table profiles add column if not exists plan_categories text[] not null default '{}';
