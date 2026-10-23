# WhenWorks

"When works?" on a plan (`app/p/[slug]/WhenWorks.tsx`). The host puts up to four times to the crew, people going tick the ones they're free for, and the time most people can do is called out.

- Each row: the time (`label-md`), who's free (monogram stack and a count), a "Best so far" badge on the leader, and an **I'm free** toggle on the right. Hosts also get **Go with this** and a remove button.
- Only people who can take part count towards the best time (going, and hosts).

## States

- **Empty (host):** a single "Not sure when? Ask the crew" button; tapping it opens the add-a-time field.
- **Default:** I'm free (neutral, lighter).
- **Active (ticked):** "Free" with a check, primary filled, `aria-pressed`.
- **Read only:** maybes and people who haven't replied see the rows; tapping I'm free says why instead.
- **Loading:** ticking shows straight away (optimistic) and settles on refresh; adding a time reads "Adding…".
