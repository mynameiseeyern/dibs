// The ⋯ on the plan's details card: the host's things to change about the plan, kept out of the
// way of the round buttons (Share, Calendar, Directions, Chat). Edit; the crew: add it to one,
// who can see it, or take it out (ARV-93, ARV-95); and ending it: call it off (the page stays
// up, marked called off) or, while it's yours alone with no bills, delete it for good. Both ask
// first. Nothing for people who aren't hosts.

import { useState } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import type { PlanDetail } from "@dibs/shared/api";
import * as Button from "@/components/ui/button";
import * as Dropdown from "@/components/ui/dropdown";
import { toast } from "@/components/ui/toast";
import { PickCrew, WhoCanSee } from "@/components/dibby/crew-on-plan";
import { movePlanToCrew } from "@/lib/crews";
import { deletePlan, editPlan } from "@/lib/api";
import { useSession } from "@/lib/session";

/** iOS shows one sheet at a time: let the menu close before the next one opens. */
const AFTER_MENU = 350;

export function PlanMenu({ slug, detail, apply }: { slug: string; detail: PlanDetail; apply: (d: PlanDetail) => void }) {
  const [picking, setPicking] = useState(false);
  const [seeing, setSeeing] = useState(false);
  const { state } = useSession();
  const { crew, visibility, plan } = detail;
  const done = plan.status === "wrapped" || plan.status === "cancelled";
  if (!detail.me?.host) return null;

  const canEdit = plan.status !== "cancelled";
  const canAddToCrew = !crew && !done && state.status === "signedIn";
  const canSwitch = Boolean(crew && visibility);
  const canTakeOut = Boolean(crew?.member);
  // Just you on it: delete it. Anyone else on it: call it off, so they see what happened.
  const canDelete = Boolean(detail.can_delete);
  const canCallOff = !canDelete && (plan.status === "voting" || plan.status === "locked");
  if (!canEdit && !canAddToCrew && !canSwitch && !canTakeOut && !canCallOff && !canDelete) return null;

  const later = (fn: () => void) => setTimeout(fn, AFTER_MENU);

  function takeOut() {
    Alert.alert(`Take it out of ${crew!.name}?`, "It goes back to an ordinary plan: anyone with the link can get in, and it's off the crew's page.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Take it out",
        onPress: async () => {
          try {
            apply((await movePlanToCrew(slug, null)).detail);
            toast.success("Taken out of the crew");
          } catch (e) {
            toast.error("Couldn't take it out", { description: (e as Error).message });
          }
        },
      },
    ]);
  }

  function callOff() {
    Alert.alert("Call it off?", "Everyone sees it's not happening, and nobody owes anything for it. The plan stays up so no one's left wondering.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Call it off",
        style: "destructive",
        onPress: async () => {
          try {
            apply((await editPlan(slug, { field: "cancel" })).detail);
            toast.success("Called off");
          } catch (e) {
            toast.error("Couldn't call it off", { description: (e as Error).message });
          }
        },
      },
    ]);
  }

  function remove() {
    Alert.alert("Delete this plan?", "It's gone for good, with its vote and chat, and the link stops working. Nobody else has joined, so nobody loses it.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePlan(slug);
            toast.success("Deleted");
            router.dismissTo("/");
          } catch (e) {
            toast.error("Couldn't delete it", { description: (e as Error).message });
          }
        },
      },
    ]);
  }

  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger>
          <Button.Root variant="neutral" mode="ghost" iconOnly accessibilityLabel="Plan options" hitSlop={4}>
            <Button.Icon name="more-2-fill" />
          </Button.Root>
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.Label>{plan.title}</Dropdown.Label>
          {canEdit ? (
            <Dropdown.Item onSelect={() => router.push(`/p/${slug}/edit`)}>
              <Dropdown.ItemIcon name="edit-line" />
              Edit plan
            </Dropdown.Item>
          ) : null}
          {canAddToCrew ? (
            <Dropdown.Item onSelect={() => later(() => setPicking(true))}>
              <Dropdown.ItemIcon name="group-line" />
              Add to a crew
            </Dropdown.Item>
          ) : null}
          {canSwitch ? (
            <Dropdown.Item onSelect={() => later(() => setSeeing(true))}>
              <Dropdown.ItemIcon name="eye-line" />
              Who can see this
            </Dropdown.Item>
          ) : null}
          {canTakeOut ? (
            <Dropdown.Item onSelect={() => later(takeOut)}>
              <Dropdown.ItemIcon name="logout-box-r-line" />
              Take it out of the crew
            </Dropdown.Item>
          ) : null}
          {canCallOff || canDelete ? <Dropdown.Separator /> : null}
          {canCallOff ? (
            <Dropdown.Item destructive onSelect={() => later(callOff)}>
              <Dropdown.ItemIcon name="close-circle-line" />
              Call it off
            </Dropdown.Item>
          ) : null}
          {canDelete ? (
            <Dropdown.Item destructive onSelect={() => later(remove)}>
              <Dropdown.ItemIcon name="delete-bin-line" />
              Delete plan
            </Dropdown.Item>
          ) : null}
        </Dropdown.Content>
      </Dropdown.Root>

      <PickCrew
        open={picking}
        onOpenChange={setPicking}
        onPick={async (c) => {
          setPicking(false);
          try {
            const { detail: next, moved } = await movePlanToCrew(slug, c.id);
            apply(next);
            toast.success(
              `Added to ${c.emoji} ${c.name}`,
              moved.visibility === "link" ? { description: "Some people on it aren't in the crew, so anyone with the link can still get in. Switch to crew only from ⋯ if you want." } : { description: "Crew only now." }
            );
          } catch (e) {
            toast.error("Couldn't add it", { description: (e as Error).message });
          }
        }}
      />
      {crew ? <WhoCanSee slug={slug} detail={detail} apply={apply} open={seeing} onOpenChange={setSeeing} /> : null}
    </>
  );
}
