// The "square up" card, ported from `.db-split` (docs/components/BillSplit.md): who paid, the
// total in DM Mono, then a row per share.
//
// Privacy (root CLAUDE.md): balances are private. Only the payer gets every row; everyone else
// gets their own row (`isYou`) and a count, via <BillSettled settled={4} of={6} />. This component
// renders what it's given, so callers decide which rows to pass.

import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { formatAud } from "@dibs/shared/bills";
import type { MonogramColour } from "@dibs/shared/types";
import { Icon } from "@/components/ui/icon";
import * as Card from "./card";
import { Monogram } from "./monogram";

export type ShareState =
  /** Still owes this amount, in integer cents. */
  | { kind: "owes"; cents: number }
  /** Says they've paid; the payer confirms. */
  | { kind: "paid-waiting" }
  | { kind: "square" };

export type ShareRow = {
  id: string;
  name: string;
  colour: MonogramColour;
  /** A line under the name: "2 dumplings, 1 beer". */
  note?: string;
  state: ShareState;
  /** The viewer's own row: says "You" and carries the action. */
  isYou?: boolean;
  /** Pay, Mark as paid, Confirm: whatever applies to this viewer and row. */
  action?: ReactNode;
};

type BillSplitProps = {
  title: string;
  /** "Mia paid". */
  payerName: string;
  totalCents: number;
  currency?: string;
  rows: ShareRow[];
  /** Under the rows: the settled count, or a Hint. */
  footer?: ReactNode;
};

export function BillSplit({ title, payerName, totalCents, currency = "AUD", rows, footer }: BillSplitProps) {
  return (
    <Card.Root>
      <View className="flex-row items-end justify-between gap-3 pb-1">
        <View className="shrink gap-0.5">
          <Text className="text-label-md text-text-strong-950">{title}</Text>
          <Text className="text-paragraph-sm text-text-sub-600">{payerName} paid</Text>
        </View>
        <Text className="text-number-lg text-text-strong-950">{formatAud(totalCents, currency)}</Text>
      </View>
      <View>
        {rows.map((r) => (
          <View key={r.id} className="min-h-14 flex-row items-center gap-3 border-t border-stroke-soft-200 py-2">
            <Monogram name={r.name} colour={r.colour} size={36} />
            <View className="flex-1">
              <Text numberOfLines={1} className="text-label-md text-text-strong-950">
                {r.isYou ? "You" : r.name}
              </Text>
              {r.note ? (
                <Text numberOfLines={1} className="text-paragraph-sm text-text-sub-600">
                  {r.note}
                </Text>
              ) : null}
            </View>
            <ShareValue state={r.state} currency={currency} />
            {r.action}
          </View>
        ))}
      </View>
      {footer}
    </Card.Root>
  );
}

function ShareValue({ state, currency }: { state: ShareState; currency: string }) {
  if (state.kind === "owes") return <Text className="text-number-md text-text-strong-950">{formatAud(state.cents, currency)}</Text>;
  if (state.kind === "paid-waiting") return <Text className="text-paragraph-sm text-text-sub-600">Says they've paid</Text>;
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-success-lighter px-2 py-0.5">
      <Icon name="check-line" className="text-[14px] leading-[14px] text-success-dark" />
      <Text className="text-label-xs text-success-dark">Square</Text>
    </View>
  );
}

/** "4 of 6 settled": what everyone but the payer sees. Counts only, never who owes what. */
export function BillSettled({ settled, of }: { settled: number; of: number }) {
  const pct = of > 0 ? Math.round((settled / of) * 100) : 0;
  return (
    <View className="gap-2 pt-1">
      <Text className="text-paragraph-sm text-text-sub-600">{settled === of && of > 0 ? "Money square." : `${settled} of ${of} settled`}</Text>
      <View className="h-1.5 overflow-hidden rounded-full bg-bg-soft-200" accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: of, now: settled }}>
        <View className="h-full rounded-full bg-accent-base" style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}
