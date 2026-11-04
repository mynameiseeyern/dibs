-- Top of the funnel: a plan link opened, a vote cast, an account made. Same rules as the rest of
-- the log: IDs and small counts only (plan_link_opened keeps a random per-browser ID in props).
alter table events drop constraint if exists events_name_check;
alter table events add constraint events_name_check check (name in (
  'plan_created', 'plan_locked', 'member_joined', 'plan_shared', 'app_interest',
  'bill_created', 'bill_shares_set', 'share_settled',
  'gate_shown', 'gate_converted',
  'plan_link_opened', 'vote_cast', 'account_created'
));
