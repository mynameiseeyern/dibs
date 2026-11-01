import { useState } from "react";
import { Text, View } from "react-native";
import * as Accordion from "@/components/ui/accordion";
import * as Button from "@/components/ui/button";
import * as Drawer from "@/components/ui/drawer";
import * as Dropdown from "@/components/ui/dropdown";
import * as Modal from "@/components/ui/modal";
import * as Popover from "@/components/ui/popover";
import * as Select from "@/components/ui/select";
import * as Tooltip from "@/components/ui/tooltip";
import { Section } from "./section";

const TIMES = [
  ["18:00", "6pm"],
  ["18:30", "6:30pm"],
  ["19:00", "7pm"],
  ["19:30", "7:30pm"],
  ["20:00", "8pm"],
];

export function OverlaysGallery() {
  const [time, setTime] = useState<string>();
  const [last, setLast] = useState("Nothing picked yet");

  return (
    <>
      <Section title="Modal (bottom sheet)">
        <Modal.Root>
          <Modal.Trigger>
            <Button.Root variant="neutral" mode="lighter">
              Open sheet
            </Button.Root>
          </Modal.Trigger>
          <Modal.Content>
            <Modal.Header title="Bail on Friday dumplings?" description="No stress. We'll let the crew know you can't make it." />
            <Modal.Footer>
              <Modal.Close>
                <Button.Root variant="error" block size="large">
                  Can't make it
                </Button.Root>
              </Modal.Close>
              <Modal.Close>
                <Button.Root variant="neutral" mode="ghost" block size="large">
                  Keep me in
                </Button.Root>
              </Modal.Close>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      </Section>

      <Section title="Drawer">
        <Drawer.Root>
          <Drawer.Trigger>
            <Button.Root variant="neutral" mode="lighter">
              Plan settings
            </Button.Root>
          </Drawer.Trigger>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Plan settings</Drawer.Title>
            </Drawer.Header>
            <Drawer.Body>Full height on a phone. The bottom sheet (Modal) is the default; use this when there's a lot to scroll.</Drawer.Body>
            <Drawer.Footer>
              <Drawer.Close>
                <Button.Root block size="large">
                  Done
                </Button.Root>
              </Drawer.Close>
            </Drawer.Footer>
          </Drawer.Content>
        </Drawer.Root>
      </Section>

      <Section title="Dropdown and popover">
        <View className="flex-row flex-wrap items-center gap-2">
          <Dropdown.Root>
            <Dropdown.Trigger>
              <Button.Root variant="neutral" mode="stroke" iconOnly accessibilityLabel="More">
                <Button.Icon name="more-2-line" />
              </Button.Root>
            </Dropdown.Trigger>
            <Dropdown.Content>
              <Dropdown.Label>This option</Dropdown.Label>
              <Dropdown.Item onSelect={() => setLast("See details")}>
                <Dropdown.ItemIcon name="information-line" />
                See details
              </Dropdown.Item>
              <Dropdown.Item onSelect={() => setLast("Edit plan")}>
                <Dropdown.ItemIcon name="pencil-line" />
                Edit plan
              </Dropdown.Item>
              <Dropdown.Separator />
              <Dropdown.Item destructive onSelect={() => setLast("Take it off the vote")}>
                <Dropdown.ItemIcon name="delete-bin-line" />
                Take it off the vote
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>

          <Popover.Root>
            <Popover.Trigger>
              <Button.Root variant="neutral" mode="lighter">
                Popover
              </Button.Root>
            </Popover.Trigger>
            <Popover.Content>
              <Text className="text-label-lg text-text-strong-950">Pick a day</Text>
              <Text className="text-paragraph-md text-text-sub-600">Anything can go in here, like the calendar.</Text>
            </Popover.Content>
          </Popover.Root>

          <Tooltip.Root>
            <Tooltip.Trigger>
              <Button.Root variant="neutral" mode="lighter" size="small">
                Long press me
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content>Only you can see this</Tooltip.Content>
          </Tooltip.Root>
        </View>
        <Text className="text-paragraph-sm text-text-soft-400">Last picked: {last}</Text>
      </Section>

      <Section title="Select">
        <Select.Root value={time} onValueChange={setTime}>
          <Select.Trigger>
            <Select.TriggerIcon name="time-line" />
            <Select.Value placeholder="Pick a time" />
          </Select.Trigger>
          <Select.Content title="Start time">
            {TIMES.map(([v, label]) => (
              <Select.Item key={v} value={v}>
                {label}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Select.Root disabled>
          <Select.Trigger>
            <Select.Value placeholder="Disabled" />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="x">Nope</Select.Item>
          </Select.Content>
        </Select.Root>
      </Section>

      <Section title="Accordion">
        <Accordion.Root type="single" collapsible>
          {[
            ["Who sees my address?", "Only people in the plan."],
            ["Does the app hold money?", "Never. It just shows PayID details."],
          ].map(([q, a]) => (
            <Accordion.Item key={q} value={q}>
              <Accordion.Trigger>
                {q}
                <Accordion.Arrow />
              </Accordion.Trigger>
              <Accordion.Content>{a}</Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Section>
    </>
  );
}
