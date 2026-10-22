-- Day 3: vibe switch (ARV-28). Dibby's automatic messages keep the template they came from,
-- so the thread re-renders them in the plan's current vibe. `body` stays as the text it had
-- when posted, as a fallback.
alter table messages add column if not exists template jsonb;
