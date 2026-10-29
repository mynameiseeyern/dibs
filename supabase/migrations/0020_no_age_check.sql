-- No age check for now: sign-up stops asking for a date of birth.
-- Existing birthdays stay as they are; new profiles leave it empty.
alter table profiles drop constraint if exists adult;
alter table profiles alter column dob drop not null;
