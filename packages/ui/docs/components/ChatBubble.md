# ChatBubble

Messages in the group thread. Others on `bg-soft-200`, yours on `primary-base` with white text, the AI member on `accent-lighter` with its avatar.

- The consumer provides the text, sender name and avatar for others’ messages, and timestamps between bursts.
- Intentional addition: chat runs alongside every plan in Dibby.

## States

- **Default:** others on `bg-soft-200` with their monogram and first name above a burst; yours on `primary-base`; Dibby on `accent-lighter` with its avatar and an AI badge; system lines centred and muted.
- **Read only:** for maybes, people who haven't replied and the waitlist, the composer becomes a dashed "Read only" box with the reason under it.
- **Disabled:** guests without an account read the chat with a line saying they need the app to chat (they can still vote and RSVP). The send button stays disabled until there's text, and while a message is sending.
- **Loading:** the send button is disabled while the message goes; the thread refreshes with it.
