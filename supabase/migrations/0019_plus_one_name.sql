-- Plus-ones: the guest someone's bringing can have a first name ("Ee & Sam"). Optional, so
-- "Ee + 1" still works. Only a name, never an account: they aren't a member of the plan.
alter table plan_members add column if not exists plus_one_name text
  check (plus_one_name is null or char_length(plus_one_name) between 1 and 40);

-- New plans welcome plus-ones unless the organiser says otherwise.
alter table plans alter column plus_ones set default true;
