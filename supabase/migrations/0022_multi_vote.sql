-- Multiple picks, part 1 of 2: safe to apply before the code ships.
-- Each plan says how many places one person can pick on its vote (1 to 3). Everything that
-- exists today is 1, so the old code (and its "voting again moves your vote") keeps working.
-- The new code creates plans with 3; the organiser can switch a plan back to one pick each.
alter table plans add column if not exists max_votes smallint not null default 1
  check (max_votes between 1 and 3);

-- One pick each: voting again moves your vote, as before.
-- More than one: a vote is added, and once you've used them all, another is refused
-- (the app says "untick one first"; this is the backstop).
create or replace function one_vote_per_plan() returns trigger language plpgsql as $$
declare
  _plan uuid;
  _max int;
  _held int;
begin
  select o.plan_id, p.max_votes into _plan, _max
  from options o join plans p on p.id = o.plan_id
  where o.id = new.option_id;

  if coalesce(_max, 1) <= 1 then
    delete from votes v
    using options o_old
    where o_old.id = v.option_id
      and o_old.plan_id = _plan
      and v.member_id = new.member_id
      and v.option_id <> new.option_id;
  else
    select count(*) into _held
    from votes v join options o on o.id = v.option_id
    where o.plan_id = _plan
      and v.member_id = new.member_id
      and v.option_id <> new.option_id;
    if _held >= _max then
      raise exception 'vote limit reached (% picks)', _max using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
