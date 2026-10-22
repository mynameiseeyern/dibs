-- Wrap-up can end with "Nothing to split": a hangout where nobody paid for anything, or people
-- sorted it themselves. Then the plan shows no Square up card until someone adds a bill.
alter table plans add column if not exists no_bills boolean not null default false;
