# BottomSheet

Dialogs. On phones they slide up from the bottom (`radius-xl` top corners, grab handle, full-width stacked actions within thumb reach); from 768px the same markup centres as a modal with actions in a row.

- The consumer provides the title, one or two sentences, and at most two actions, the safe one last on phones. Use `role="dialog"`, `aria-modal`, `aria-labelledby`, trap focus and close on Escape and scrim tap.
- Scrim is `overlay`.
