# Button

Pill buttons for every tap. **Primary** (`primary-base`, white label) is the main action; **Dibs** (`accent-base` lime, ink label, `shadow-pop`) is the one “I’m in / call dibs” moment on a screen, at most once; **Secondary** (`bg-soft-200`) for the alternative; **Ghost** (`primary-dark` text) for low-weight links; **Danger** (`error-lighter`) for bailing or deleting.

- The consumer provides the label and an optional Remix icon (`<i class="ri-… db-icon">`). Icon-only buttons need `aria-label`.
- Sizes: `db-btn--lg` (`size-control-lg`, 52px) for the bottom-of-screen action on phones, use `db-btn--block` there; default 44px (`size-control-md`); `db-btn--sm` 36px only inside cards on desktop.
- Labels are short verbs in sentence case and the group's vibe: “Lock it in”, “Pay $42”, “I’m in”. Never “Submit” or “OK”.
- Presses squash to 96% with the spring easing; the Dibs button sinks into its shadow.
