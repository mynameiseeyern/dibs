-- Day 2: option notes, PayID on the bill (guests can be payers too), roulette opt-ins.
-- Rebuilt by Claude after the original was overwritten; matches the store code in apps/web/lib/store.

alter table options add column note text;

-- A payer who isn't signed up (a guest) enters their PayID on the bill itself.
alter table bills add column payid text, add column payid_name text;
-- People who tapped "I'm in" for this bill's roulette spin, before the spin.
alter table bills add column roulette_entrants uuid[] not null default '{}';

-- PayID from the bill if set, otherwise from the payer's profile.
-- Only for callers with a share on this bill who were confirmed at wrap-up.
create or replace function get_payid(b uuid, caller_member uuid default null)
returns table (payer_name text, payid text)
language sql stable security definer set search_path = public as $$
  select coalesce(bl.payid_name, pm.display_name), coalesce(bl.payid, pr.payid)
  from bills bl
  join plan_members pm on pm.id = bl.payer_member_id
  left join profiles pr on pr.user_id = pm.user_id
  join bill_shares s on s.bill_id = bl.id
  join plan_members me on me.id = s.member_id
  where bl.id = b
    and me.attended is true
    and (me.user_id = auth.uid() or (caller_member is not null and me.id = caller_member and auth.role() = 'service_role'))
$$;

alter publication supabase_realtime add table bills, bill_shares;

-- One vote per person per plan: voting again moves your vote.
create or replace function one_vote_per_plan() returns trigger language plpgsql as $$
begin
  delete from votes v
  using options o_new, options o_old
  where o_new.id = new.option_id
    and o_old.id = v.option_id
    and o_old.plan_id = o_new.plan_id
    and v.member_id = new.member_id
    and v.option_id <> new.option_id;
  return new;
end $$;
create trigger one_vote_per_plan before insert on votes for each row execute function one_vote_per_plan();
