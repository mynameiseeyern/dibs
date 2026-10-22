-- Day 3: guests can add an email to keep their plans on every browser.
-- When someone signs in with that email (within an hour of asking), the guest's
-- plan memberships move onto their account. Service key only, like the rest of guests.
alter table guests add column if not exists email text;
alter table guests add column if not exists email_requested_at timestamptz;
create index if not exists guests_email_idx on guests (lower(email)) where email is not null;
