-- ARV-61: a one-time "beta updates?" card on Your plans, for accounts that never answered.
-- Answered = said yes or no anywhere (sign-up box, /account switch, or the card).
alter table profiles add column if not exists beta_prompt_answered_at timestamptz;

-- Anyone already on the list (or who left it) has answered.
update profiles p set beta_prompt_answered_at = now()
where beta_prompt_answered_at is null
  and exists (select 1 from mailing_list m where m.user_id = p.user_id);
