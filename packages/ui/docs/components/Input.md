# Input

Text fields with a visible label above, optional leading icon and a hint below. 44px tall, 16px text so phones don’t zoom on focus.

- The consumer provides the `<label>`, the `<input>` (or `<textarea>`), and hint or error text tied with `aria-describedby`.
- Focus turns the border `primary-base` with a `primary-lighter` glow. Errors use `db-input--error` and a `db-hint--error` line that says how to fix it.
