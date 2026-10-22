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
        </SegmentedControl.Root>
        <TabMenu.Root defaultValue="plans">
          <TabMenu.List>
            <TabMenu.Trigger value="plans">Plans</TabMenu.Trigger>
            <TabMenu.Trigger value="bills">Bills</TabMenu.Trigger>
            <TabMenu.Trigger value="recap">Recap</TabMenu.Trigger>
          </TabMenu.List>
        </TabMenu.Root>
      </Section>

      <Section title="Progress and tooltip">
        <ProgressBar.Root value={66} />
        <ProgressBar.Root value={100} color="accent" />
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
    </Tooltip.Provider>
  );
}
