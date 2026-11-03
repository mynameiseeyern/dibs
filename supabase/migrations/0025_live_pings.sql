-- Live pages: when anything on a plan changes, send a content-free "changed" ping
-- on the Realtime broadcast topic `plan:<plan id>`. Open plan, chat and bills pages
-- listen for it and re-fetch (`components/LiveRefresh.tsx`), instead of polling.
--
-- The ping carries no data, so nothing private (balances, PayIDs, addresses) goes
-- over Realtime: the page re-renders on the server with the usual access checks.

create or replace function public.ping_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  pid uuid;
begin
  if tg_op = 'DELETE' then r := old; else r := new; end if;

  -- Reading the chat only moves your own seen marker: not news for anyone else.
  if tg_table_name = 'plan_members' and tg_op = 'UPDATE'
     and (to_jsonb(new) - 'chat_seen_at') = (to_jsonb(old) - 'chat_seen_at') then
    return null;
  end if;

  if tg_table_name = 'plans' then
    pid := r.id;
  elsif tg_table_name = 'votes' then
    select o.plan_id into pid from public.options o where o.id = r.option_id;
  elsif tg_table_name in ('bill_shares', 'roulette_spins') then
    select b.plan_id into pid from public.bills b where b.id = r.bill_id;
  else
    pid := r.plan_id;
  end if;

  if pid is not null then
    perform realtime.send('{}'::jsonb, 'changed', 'plan:' || pid::text, false);
  end if;
  return null;
end;
$$;

-- Only triggers call it.
revoke all on function public.ping_plan() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array[
    'plans', 'plan_members', 'options', 'votes', 'plan_times', 'time_votes',
    'messages', 'message_reactions', 'plan_photos', 'bills', 'bill_shares', 'roulette_spins'
  ] loop
    execute format('drop trigger if exists ping_plan on public.%I', t);
    execute format('create trigger ping_plan after insert or update or delete on public.%I for each row execute function public.ping_plan()', t);
  end loop;
end $$;
