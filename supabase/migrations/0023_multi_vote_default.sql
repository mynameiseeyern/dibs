-- Multiple picks, part 2 of 2: apply once the multiple-picks code is live.
-- The app already creates plans with 3; this makes the database default match.
-- Plans that already exist keep what they have: nobody's vote changes mid-way.
alter table plans alter column max_votes set default 3;
