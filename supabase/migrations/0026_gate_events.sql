-- Funnel gates ("Keep this plan", add an email to chat): shown and converted. Same rules as the
-- rest of the log: IDs and small counts only. props.gate says which gate.
alter table events drop constraint if exists events_name_check;
alter table events add constraint events_name_check check (name in (
  'plan_created', 'plan_locked', 'member_joined', 'plan_shared', 'app_interest',
  'bill_created', 'bill_shares_set', 'share_settled',
  'gate_shown', 'gate_converted'
));
