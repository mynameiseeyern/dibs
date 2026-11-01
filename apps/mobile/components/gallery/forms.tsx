import { useState } from "react";
import { Text, View } from "react-native";
import * as Checkbox from "@/components/ui/checkbox";
import * as Datepicker from "@/components/ui/datepicker";
import * as DigitInput from "@/components/ui/digit-input";
import * as Label from "@/components/ui/label";
import * as Radio from "@/components/ui/radio";
import * as SegmentedControl from "@/components/ui/segmented-control";
import * as Slider from "@/components/ui/slider";
import * as Switch from "@/components/ui/switch";
import * as TabMenuHorizontal from "@/components/ui/tab-menu-horizontal";
import * as Textarea from "@/components/ui/textarea";
import { Section } from "./section";

function Row({ children }: { children: React.ReactNode }) {
  return <View className="min-h-11 flex-row items-center gap-3">{children}</View>;
}

export function FormsGallery() {
  const [closed, setClosed] = useState(true);
  const [came, setCame] = useState(true);
  const [vibe, setVibe] = useState("chill");
  const [split, setSplit] = useState("even");
  const [tab, setTab] = useState("plan");
  const [spots, setSpots] = useState(6);
  const [note, setNote] = useState("");
  const [code, setCode] = useState("4821");
  const [start, setStart] = useState<Date | null>(null);

  return (
    <>
      <Section title="Switch, checkbox, radio">
        <Row>
          <Switch.Root checked={closed} onCheckedChange={setClosed} accessibilityLabel="Close the group" />
          <Text className="flex-1 text-paragraph-md text-text-strong-950">Close the group at a limit</Text>
        </Row>
        <Row>
          <Switch.Root disabled accessibilityLabel="Disabled switch" />
          <Text className="flex-1 text-paragraph-md text-text-disabled-300">Disabled</Text>
        </Row>
        <Row>
          <Checkbox.Root checked={came} onCheckedChange={setCame} accessibilityLabel="Sam came" />
          <Text className="flex-1 text-paragraph-md text-text-strong-950">Sam came</Text>
          <Checkbox.Root checked="indeterminate" accessibilityLabel="Some came" />
          <Checkbox.Root disabled accessibilityLabel="Disabled" />
        </Row>
        <Radio.Group value={vibe} onValueChange={setVibe} className="gap-1">
          {[
            ["chill", "Chill"],
            ["extra", "Extra"],
            ["straight", "Straight up"],
          ].map(([v, label]) => (
            <Row key={v}>
              <Radio.Item value={v} accessibilityLabel={label} />
              <Text className="text-paragraph-md text-text-strong-950">{label}</Text>
            </Row>
          ))}
        </Radio.Group>
      </Section>

      <Section title="Segmented control">
        <SegmentedControl.Root value={split} onValueChange={setSplit}>
          <SegmentedControl.List>
            <SegmentedControl.Trigger value="even">Even</SegmentedControl.Trigger>
            <SegmentedControl.Trigger value="items">
              <SegmentedControl.Icon name="list-check" />
              By item
            </SegmentedControl.Trigger>
            <SegmentedControl.Trigger value="custom">Custom</SegmentedControl.Trigger>
          </SegmentedControl.List>
          <SegmentedControl.Content value="even" className="pt-2">
            <Text className="text-paragraph-sm text-text-sub-600">Everyone pays the same.</Text>
          </SegmentedControl.Content>
          <SegmentedControl.Content value="items" className="pt-2">
            <Text className="text-paragraph-sm text-text-sub-600">Tick what you had.</Text>
          </SegmentedControl.Content>
          <SegmentedControl.Content value="custom" className="pt-2">
            <Text className="text-paragraph-sm text-text-sub-600">Type each share.</Text>
          </SegmentedControl.Content>
        </SegmentedControl.Root>
      </Section>

      <Section title="Tab menu">
        <TabMenuHorizontal.Root value={tab} onValueChange={setTab}>
          <TabMenuHorizontal.List>
            <TabMenuHorizontal.Trigger value="plan">
              <TabMenuHorizontal.Icon name="calendar-event-line" />
              Plan
            </TabMenuHorizontal.Trigger>
            <TabMenuHorizontal.Trigger value="chat">
              <TabMenuHorizontal.Icon name="chat-3-line" />
              Chat
            </TabMenuHorizontal.Trigger>
            <TabMenuHorizontal.Trigger value="photos">
              <TabMenuHorizontal.Icon name="image-line" />
              Photos
            </TabMenuHorizontal.Trigger>
            <TabMenuHorizontal.Trigger value="bills">
              <TabMenuHorizontal.Icon name="receipt-line" />
              Square up
            </TabMenuHorizontal.Trigger>
          </TabMenuHorizontal.List>
        </TabMenuHorizontal.Root>
      </Section>

      <Section title="Slider">
        <Label.Root>
          Spots <Label.Sub>{spots}</Label.Sub>
        </Label.Root>
        <Slider.Root value={spots} onValueChange={setSpots} min={2} max={20} step={1} accessibilityLabel="Spots" />
      </Section>

      <Section title="Textarea">
        <Textarea.Root value={note} onChangeText={setNote} maxLength={200} placeholder="BYO, bring a jumper…">
          <Textarea.CharCounter current={note.length} max={200} />
        </Textarea.Root>
        <Textarea.Root disabled placeholder="Disabled" />
      </Section>

      <Section title="Digit input">
        <DigitInput.Root numInputs={6} value={code} onChange={setCode} />
        <DigitInput.Root numInputs={6} value="12" onChange={() => {}} hasError />
      </Section>

      <Section title="Datepicker">
        <Datepicker.Root mode="datetime" value={start} onChange={setStart} placeholder="Pick a day and time" minimumDate={new Date()} accessibilityLabel="When" />
        <Datepicker.Root mode="time" value={start} onChange={setStart} placeholder="Pick a time" accessibilityLabel="Time" />
      </Section>
    </>
  );
}
