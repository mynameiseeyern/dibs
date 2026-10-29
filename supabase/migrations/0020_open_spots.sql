-- Spots, part 1 of 2: safe to apply before the code ships (the old code still sees 20 everywhere).
-- An organiser can close a plan to a number of spots (2 to 100), or leave it open (null). Past the
-- limit, people who say they're in wait in line and move up, first on, first off, as spots open
-- (fillFromWaitlist in apps/web/lib/plan-ops.ts).
alter table plans alter column capacity drop not null;
alter table plans drop constraint if exists plans_capacity_check;
alter table plans add constraint plans_capacity_check check (capacity is null or capacity between 2 and 100);

-- Where you are in line. People already waiting keep the order they joined in.
alter table plan_members add column if not exists waitlisted_at timestamptz;
update plan_members set waitlisted_at = joined_at where waitlisted and waitlisted_at is null;
