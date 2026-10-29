-- Spots, part 2 of 2: apply once the open-spots code is live (the old code reads null as "full").
-- New plans are open by default, and plans still on the old automatic 20 with nobody waiting open
-- up too. Anyone who set their own number, or has a waitlist going, keeps it.
alter table plans alter column capacity drop default;
update plans p set capacity = null
where p.capacity = 20
  and not exists (select 1 from plan_members m where m.plan_id = p.id and m.waitlisted);
