-- ARV-53: deleting an account. The person becomes "Former member" in shared plans (the app
-- renames their memberships first), so bills and who-came stay correct for everyone else.
-- Plans they organised stay up for the crew, with no host account behind them.
alter table plans alter column organiser_id drop not null;
alter table plans drop constraint if exists plans_organiser_id_fkey;
alter table plans add constraint plans_organiser_id_fkey foreign key (organiser_id) references auth.users on delete set null;
