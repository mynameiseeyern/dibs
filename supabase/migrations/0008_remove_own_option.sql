-- Members can take their own suggestion off a plan's vote; hosts can still remove any.
-- (The app does this through a server action; this keeps row-level security in step.)
create policy "members remove own options" on options for delete using (added_by = my_member_id(plan_id));
