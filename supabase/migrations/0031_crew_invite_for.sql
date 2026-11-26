-- ARV-96: personal crew invites. "Turn this into a crew?" invites the people from your plans by
-- name: each gets their own one-use link, and because the owner picked them, it lets them straight
-- in with no approval. Anyone else who opens it sees it's expired.
alter table crew_invites add column if not exists for_user uuid references auth.users on delete cascade;
