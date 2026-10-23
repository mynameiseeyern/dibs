# BillSplit

The “square up” card: who paid, the total in `number-lg`, then a row per person with their share in DM Mono or a Square badge. The viewer’s own row carries the pay action.

- The consumer provides the payer, total, and per-person rows (name, note, amount or paid state). Amounts always show cents.
- Intentional addition: shared payments are core to Dibs; built from Card, Avatar, Badge and Button.

## States

- **Owes:** the amount in DM Mono.
- **Paid, waiting:** "Says they've paid" with a Confirm button for the person who paid the bill.
- **Square:** a success badge with a check.
- **Saving (loading):** the button spins a loader and reads "Saving…", disabled until it lands (`ActionForm`). If the connection drops it retries, then says it couldn't save, with Try again. Disabled on its own (no spinner) means you can't tap it yet.
