# Badge

Small pills that label a state: RSVP, money, vote status. Each status uses its family's `-lighter` fill with `-dark` text; `db-badge--accent` (lime) marks the winner.

- The consumer provides the text, and an icon or `db-badge--dot` when colour alone would carry meaning. Status is never colour only: “Squared up”, “Owes $42”.
- `db-badge--count` is the unread counter on tabs and avatars; give it an `aria-label`.
