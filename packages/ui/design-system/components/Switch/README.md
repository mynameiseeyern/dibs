# Switch

Switch, checkbox and radio. Switches (`db-switch`) turn a setting on or off right away; checkboxes and radios (`db-check`) are choices inside a form. Rows are at least `size-tap` tall.

- The consumer wraps a native `<input>` in its `<label>` so the whole row is tappable. Switches take `role="switch"`.
- Checked fills are `primary-base` with a springy thumb.
