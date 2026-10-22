"use client";

import * as Button from "@/components/ui/button";
import * as CompactButton from "@/components/ui/compact-button";
import * as Badge from "@/components/ui/badge";
import * as Avatar from "@/components/ui/avatar";
import * as AvatarGroup from "@/components/ui/avatar-group";
import * as Alert from "@/components/ui/alert";
import * as Input from "@/components/ui/input";
import * as Label from "@/components/ui/label";
import * as Hint from "@/components/ui/hint";
import * as Switch from "@/components/ui/switch";
import * as Checkbox from "@/components/ui/checkbox";
import * as Radio from "@/components/ui/radio";
import * as SegmentedControl from "@/components/ui/segmented-control";
import * as TabMenu from "@/components/ui/tab-menu-horizontal";
import * as ProgressBar from "@/components/ui/progress-bar";
import * as Tooltip from "@/components/ui/tooltip";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { Calendar } from "@/components/ui/datepicker";
import * as Select from "@/components/ui/select";
import * as Textarea from "@/components/ui/textarea";
import * as Popover from "@/components/ui/popover";
import * as Dropdown from "@/components/ui/dropdown";
import * as Drawer from "@/components/ui/drawer";
import * as Tag from "@/components/ui/tag";
import * as Divider from "@/components/ui/divider";
import * as Accordion from "@/components/ui/accordion";
import * as Slider from "@/components/ui/slider";
import * as DigitInput from "@/components/ui/digit-input";
import * as ProgressCircle from "@/components/ui/progress-circle";
import * as LinkButton from "@/components/ui/link-button";
import { useState } from "react";
import {
  RiAddLine,
  RiMapPinLine,
  RiTimeLine,
  RiCheckboxCircleFill,
  RiInformationFill,
  RiErrorWarningFill,
  RiAlertFill,
  RiCloseLine,
  RiWhatsappLine,
  RiCalendarLine,
  RiMore2Line,
  RiPencilLine,
  RiDeleteBinLine,
  RiArrowRightSLine,
} from "@remixicon/react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="section">
      <h2 className="title-h5">{title}</h2>
      {children}
    </section>
  );
}

export function Gallery() {
  return (
    <Tooltip.Provider>
      <Section title="Button">
        <div className="db-stack">
          <Button.Root variant="dibs" size="large" block>
            <Button.Icon as={RiWhatsappLine} />
            Share to the group chat
          </Button.Root>
          <Button.Root size="large" block>
            Make the plan
          </Button.Root>
          <div className="db-row">
            <Button.Root>Primary</Button.Root>
            <Button.Root variant="neutral" mode="lighter">
              Secondary
            </Button.Root>
            <Button.Root mode="ghost">Ghost</Button.Root>
            <Button.Root variant="error" mode="lighter">
              Bail
            </Button.Root>
            <Button.Root mode="stroke">Stroke</Button.Root>
            <Button.Root disabled>Disabled</Button.Root>
          </div>
          <div className="db-row">
            <Button.Root size="small" variant="neutral" mode="lighter">
              <Button.Icon as={RiAddLine} />
              Small
            </Button.Root>
            <Button.Root iconOnly aria-label="Add">
              <Button.Icon as={RiAddLine} />
            </Button.Root>
            <CompactButton.Root variant="ghost" aria-label="Close">
              <CompactButton.Icon as={RiCloseLine} />
            </CompactButton.Root>
          </div>
        </div>
      </Section>

      <Section title="Badge">
        <div className="db-row">
          <Badge.Root>Organiser</Badge.Root>
          <Badge.Root color="accent">1 in</Badge.Root>
          <Badge.Root color="warning">
            <Badge.Icon as={RiTimeLine} />
            Voting
          </Badge.Root>
          <Badge.Root color="success">
            <Badge.Dot />
            Squared up
          </Badge.Root>
          <Badge.Root color="error">Owes $42</Badge.Root>
          <Badge.Root color="faded">Maybe</Badge.Root>
          <Badge.Root color="error" variant="filled" square size="small">
            3
          </Badge.Root>
        </div>
      </Section>

      <Section title="Avatar">
        <div className="db-row">
          {(["violet", "lime", "sun", "mint", "tangerine", "sky", "coral", "rose", "aqua", "ivory"] as const).map((c) => (
            <Avatar.Root key={c} color={c}>
              {c.slice(0, 2)}
            </Avatar.Root>
          ))}
        </div>
        <AvatarGroup.Root size="32">
          <Avatar.Root color="violet">EN</Avatar.Root>
          <Avatar.Root color="lime">DN</Avatar.Root>
          <Avatar.Root color="sky">BK</Avatar.Root>
          <AvatarGroup.Overflow>+3</AvatarGroup.Overflow>
        </AvatarGroup.Root>
      </Section>

      <Section title="Alert">
        {(
          [
            ["information", RiInformationFill, "Voting closes Friday 6pm", "3 of you still haven't voted."],
            ["success", RiCheckboxCircleFill, "You're squared up", "Sam got your $42."],
            ["warning", RiAlertFill, "Bills are still open", "Close them once everyone's added theirs."],
            ["error", RiErrorWarningFill, "That didn't save", "Check your connection and try again."],
          ] as const
        ).map(([status, Icon, title, body]) => (
          <Alert.Root key={status} status={status}>
            <Alert.Icon as={Icon} />
            <div>
              <strong>{title}</strong>
              {body}
            </div>
          </Alert.Root>
        ))}
      </Section>

      <Section title="Input">
        <div className="flex flex-col gap-2">
          <Label.Root htmlFor="g-area">Where-ish</Label.Root>
          <Input.Root>
            <Input.Wrapper>
              <Input.Icon as={RiMapPinLine} />
              <Input.Input id="g-area" placeholder="Surry Hills" />
            </Input.Wrapper>
          </Input.Root>
          <Hint.Root>Suburb or venue, whatever's easiest.</Hint.Root>
        </div>
        <div className="flex flex-col gap-2">
          <Label.Root htmlFor="g-err">PayID</Label.Root>
          <Input.Root hasError>
            <Input.Wrapper>
              <Input.Input id="g-err" defaultValue="0400" />
            </Input.Wrapper>
          </Input.Root>
          <Hint.Root hasError>
            <Hint.Icon as={RiErrorWarningFill} />
            That doesn't look like a phone, email or ABN.
          </Hint.Root>
        </div>
      </Section>

      <Section title="Choices">
        <label className="flex min-h-11 items-center gap-3">
          <Switch.Root defaultChecked />
          Plus-ones welcome
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <Checkbox.Root defaultChecked />
          Split it evenly
        </label>
        <Radio.Group defaultValue="chill" className="flex flex-col">
          {["chill", "extra", "straight"].map((v) => (
            <label key={v} className="flex min-h-11 items-center gap-3 capitalize">
              <Radio.Item value={v} />
              {v}
            </label>
          ))}
        </Radio.Group>
      </Section>

      <Section title="Segmented control and tabs">
        <SegmentedControl.Root defaultValue="vote">
          <SegmentedControl.List>
            <SegmentedControl.Trigger value="vote">Vote</SegmentedControl.Trigger>
            <SegmentedControl.Trigger value="chat">Chat</SegmentedControl.Trigger>
            <SegmentedControl.Trigger value="in">Who's in</SegmentedControl.Trigger>
          </SegmentedControl.List>
          {/* Tabs need their panels: each trigger controls one (aria-controls). */}
          {["vote", "chat", "in"].map((v) => (
            <SegmentedControl.Content key={v} value={v} className="paragraph-sm muted pt-2">
              The {v === "in" ? "who's in" : v} panel.
            </SegmentedControl.Content>
          ))}
        </SegmentedControl.Root>
        <TabMenu.Root defaultValue="plans">
          <TabMenu.List>
            <TabMenu.Trigger value="plans">Plans</TabMenu.Trigger>
            <TabMenu.Trigger value="bills">Bills</TabMenu.Trigger>
            <TabMenu.Trigger value="recap">Recap</TabMenu.Trigger>
          </TabMenu.List>
          {["plans", "bills", "recap"].map((v) => (
            <TabMenu.Content key={v} value={v} className="paragraph-sm muted pt-2">
              The {v} panel.
            </TabMenu.Content>
          ))}
        </TabMenu.Root>
      </Section>

      <Section title="Progress and tooltip">
        <ProgressBar.Root value={66} aria-label="Voted" />
        <ProgressBar.Root value={100} color="accent" aria-label="Settled" />
        <div>
          <Tooltip.Root defaultOpen>
            <Tooltip.Trigger asChild>
              <Button.Root variant="neutral" mode="lighter" size="small">
                Hover me
              </Button.Root>
            </Tooltip.Trigger>
            <Tooltip.Content side="right">Only you can see this</Tooltip.Content>
          </Tooltip.Root>
        </div>
      </Section>

      <Section title="Bottom sheet and toast">
        <div className="db-row">
          <Modal.Root>
            <Modal.Trigger asChild>
              <Button.Root variant="neutral" mode="lighter">
                Open sheet
              </Button.Root>
            </Modal.Trigger>
            <Modal.Content>
              <Modal.Header title="Bail on Friday dumplings?" />
              <Modal.Body>No stress. We'll let the crew know you can't make it.</Modal.Body>
              <Modal.Footer>
                <Modal.Close asChild>
                  <Button.Root variant="error" mode="lighter" size="large" block>
                    Yep, I'm out
                  </Button.Root>
                </Modal.Close>
                <Modal.Close asChild>
                  <Button.Root mode="ghost" size="large" block>
                    Actually, I'm in
                  </Button.Root>
                </Modal.Close>
              </Modal.Footer>
            </Modal.Content>
          </Modal.Root>
          <Button.Root variant="neutral" mode="lighter" onClick={() => toast.success("Link copied")}>
            Toast
          </Button.Root>
          <Button.Root
            variant="neutral"
            mode="lighter"
            onClick={() => toast.error("That didn't save", { description: "Check your connection and try again." })}
          >
            Error toast
          </Button.Root>
        </div>
      </Section>

      <Section title="Date picker">
        <DateDemo />
      </Section>

      <Section title="Select and textarea">
        <div className="flex flex-col gap-2">
          <Label.Root>Time</Label.Root>
          <Select.Root defaultValue="19:00">
            <Select.Trigger>
              <Select.TriggerIcon as={RiTimeLine} />
              <Select.Value placeholder="Pick a time" />
            </Select.Trigger>
            <Select.Content>
              {["11:00", "12:30", "15:00", "18:00", "19:00", "21:00"].map((t) => (
                <Select.Item key={t} value={t}>
                  {t}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </div>
        <div className="flex flex-col gap-2">
          <Label.Root htmlFor="g-notes">Anything else?</Label.Root>
          <Textarea.Root id="g-notes" placeholder="BYO, bring a jumper…" maxLength={200}>
            <Textarea.CharCounter current={0} max={200} />
          </Textarea.Root>
        </div>
      </Section>

      <Section title="Popover, dropdown and drawer">
        <div className="db-row">
          <Popover.Root>
            <Popover.Trigger asChild>
              <Button.Root variant="neutral" mode="lighter">Popover</Button.Root>
            </Popover.Trigger>
            <Popover.Content>Only people in the plan see the address.</Popover.Content>
          </Popover.Root>
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <Button.Root variant="neutral" mode="lighter" iconOnly aria-label="More">
                <Button.Icon as={RiMore2Line} />
              </Button.Root>
            </Dropdown.Trigger>
            <Dropdown.Content align="start">
              <Dropdown.Item>
                <Dropdown.ItemIcon as={RiPencilLine} />
                Edit plan
              </Dropdown.Item>
              <Dropdown.Item>
                <Dropdown.ItemIcon as={RiDeleteBinLine} />
                Call it off
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
          <Drawer.Root>
            <Drawer.Trigger asChild>
              <Button.Root variant="neutral" mode="lighter">Drawer</Button.Root>
            </Drawer.Trigger>
            <Drawer.Content>
              <Drawer.Header>
                <Drawer.Title>Plan settings</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body className="p-4">Side panel. Bottom sheet (Modal) is the default on phones.</Drawer.Body>
            </Drawer.Content>
          </Drawer.Root>
        </div>
      </Section>

      <Section title="Tag, divider and link button">
        <div className="db-row">
          <Tag.Root>Surry Hills</Tag.Root>
          <Tag.Root variant="gray">Under $30</Tag.Root>
          <Tag.Root>
            Dumplings
            <Tag.DismissButton />
          </Tag.Root>
        </div>
        <Divider.Root variant="line-text">or</Divider.Root>
        <LinkButton.Root variant="primary" size="medium">
          See who's in
          <LinkButton.Icon as={RiArrowRightSLine} />
        </LinkButton.Root>
      </Section>

      <Section title="Accordion">
        <Accordion.Root type="single" collapsible className="flex flex-col gap-2">
          {[
            ["Who sees my address?", "Only people in the plan."],
            ["Does dibs hold money?", "Never. It just shows PayID details."],
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

      <Section title="Slider, code and progress circle">
        <Slider.Root defaultValue={[6]} min={2} max={20} step={1}>
          <Slider.Thumb />
        </Slider.Root>
        <DigitInput.Root numInputs={6} value="4821" onChange={() => {}} />
        <div className="db-row">
          <ProgressCircle.Root value={66} size="56" />
          <ProgressCircle.Root value={100} size="48" />
        </div>
      </Section>
    </Tooltip.Provider>
  );
}

function DateDemo() {
  const [day, setDay] = useState<Date | undefined>();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    <>
      <div className="rounded-lg p-2 ring-1 ring-inset ring-stroke-soft-200">
        <Calendar mode="single" selected={day} onSelect={setDay} disabled={{ before: today }} weekStartsOn={1} />
      </div>
      <Popover.Root>
        <Popover.Trigger asChild>
          <Button.Root variant="neutral" mode="stroke" size="large" block>
            <Button.Icon as={RiCalendarLine} />
            {day ? day.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" }) : "Pick a date"}
          </Button.Root>
        </Popover.Trigger>
        <Popover.Content className="p-2">
          <Calendar mode="single" selected={day} onSelect={setDay} disabled={{ before: today }} weekStartsOn={1} />
        </Popover.Content>
      </Popover.Root>
    </>
  );
}
