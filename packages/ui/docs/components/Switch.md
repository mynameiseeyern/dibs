# Switch

Switch, checkbox and radio. Switches (`db-switch`) turn a setting on or off right away; checkboxes and radios (`db-check`) are choices inside a form. Rows are at least `size-tap` tall.

- The consumer wraps a native `<input>` in its `<label>` so the whole row is tappable. Switches take `role="switch"`.
- Checked fills are `primary-base` with a springy thumb. The off track is `stroke-sub-300` so the switch and its white thumb stay at least 3:1 against the surface in both themes.
