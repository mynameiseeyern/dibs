import { Text, View } from "react-native";
import * as Card from "@/components/dibby/card";
import { PlanCard, PlanCardSkeleton } from "@/components/dibby/plan-card";
import { VoteOption } from "@/components/dibby/vote-option";
import { ChatMessage, ChatSystem, ChatThread, ChatTime } from "@/components/dibby/chat";
import { BillSettled, BillSplit } from "@/components/dibby/bill-split";
import { Icon } from "@/components/ui/icon";
import { Section } from "./section";

export function DibbyGallery() {
  return (
    <>
      <Section title="Card">
        <Card.Root>
          <Card.Title>Default</Card.Title>
          <Card.Text>For grouped stuff. Don't put a card in a card.</Card.Text>
        </Card.Root>
        <Card.Root variant="sticker">
          <Card.Title>Sticker</Card.Title>
          <Card.Text>The one card that matters right now.</Card.Text>
        </Card.Root>
        <Card.Root variant="raised">
          <Card.Title>Raised</Card.Title>
          <Card.Text>A softer clay lift.</Card.Text>
        </Card.Root>
        <View className="flex-row gap-3">
          <Card.Root variant="violet" className="flex-1">
            <Card.Title>Violet</Card.Title>
            <Card.Text>White text.</Card.Text>
          </Card.Root>
          <Card.Root variant="ink" className="flex-1">
            <Card.Title>Ink</Card.Title>
            <Card.Text>White text.</Card.Text>
          </Card.Root>
        </View>
      </Section>

      <Section title="Plan card">
        <PlanCard
          eyebrow="Fri 7pm"
          title="Dumplings after the lab"
          status="locked"
          facts={[
            { icon: "map-pin-line", text: "Din Tai Fung, Chatswood" },
            { icon: "group-line", text: "6 in, 2 maybe" },
          ]}
          footer={<Text className="text-label-sm text-primary-dark">You're in</Text>}
        />
        <PlanCard
          eyebrow="Sat arvo"
          title="Bondi to Bronte walk"
          status="voting"
          facts={[
            { icon: "time-line", text: "2pm, or vote for another time" },
            { icon: "group-line", text: "4 in" },
          ]}
        />
        <PlanCard eyebrow="Thu 8pm" title="Trivia at the Lord Nelson" status="cancelled" facts={[{ icon: "map-pin-line", text: "The Rocks" }]} />
        <PlanCardSkeleton />
      </Section>

      <Section title="Vote option">
        <VoteOption title="Din Tai Fung" meta="Chatswood · $$" votes={4} share={4 / 7} winning onPress={() => {}} />
        <VoteOption title="Mr Wong" meta="CBD · $$$ · added by Priya" votes={2} share={2 / 7} mine onPress={() => {}} />
        <VoteOption
          title="Chinese Noodle Restaurant"
          meta="Haymarket · $"
          votes={1}
          share={1 / 7}
          leading={
            <View className="size-9 items-center justify-center rounded-sm bg-bg-soft-200">
              <Icon name="restaurant-line" className="text-text-sub-600" />
            </View>
          }
          readOnlyReason="You're a maybe, so you can't vote yet. Say you're in to have a say."
        />
        <VoteOption title="Someone's place" meta="Vote's closed" votes={0} share={0} disabled />
      </Section>

      <Section title="Chat">
        <ChatThread>
          <ChatTime>Fri 6:42pm</ChatTime>
          <ChatMessage from="them" name="Priya" colour="sky">
            who's actually coming lol
          </ChatMessage>
          <ChatMessage from="them" name="Priya" colour="sky" first={false}>
            need numbers for the booking
          </ChatMessage>
          <ChatMessage from="me">me! running 10 late tho</ChatMessage>
          <ChatMessage from="dibby">6 of you are in. Din Tai Fung has a table for 6 at 7:15 if you want it.</ChatMessage>
          <ChatSystem>Priya set the place.</ChatSystem>
        </ChatThread>
      </Section>

      <Section title="Bill split">
        <BillSplit
          title="Dumplings"
          payerName="Priya"
          totalCents={18640}
          rows={[
            { id: "1", name: "Priya", colour: "sky", note: "Paid the bill", state: { kind: "square" } },
            { id: "2", name: "Jordan", colour: "lime", note: "2 baskets, 1 milk tea", state: { kind: "owes", cents: 3420 }, isYou: true },
            { id: "3", name: "Mia", colour: "rose", state: { kind: "paid-waiting" } },
            { id: "4", name: "Tom", colour: "mint", state: { kind: "owes", cents: 2985 } },
          ]}
          footer={<BillSettled settled={1} of={3} />}
        />
        <Card.Root>
          <BillSettled settled={4} of={6} />
        </Card.Root>
      </Section>
    </>
  );
}
