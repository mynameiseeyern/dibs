import { useCallback, useState } from "react";
import { Platform, RefreshControl, ScrollView, Share, Text, View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { DEFAULT_INVITE_EXPIRY, INVITE_EXPIRY, INVITE_EXPIRY_LABEL, INVITE_MAX_USES, type CrewDetail, type CrewRole, type InviteExpiry, type InviteMaxUses } from "@dibs/shared/crews";
import * as Badge from "@/components/ui/badge";
import * as Button from "@/components/ui/button";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { Choice } from "@/components/dibby/flow";
import { TopBar } from "@/components/dibby/top-bar";
import { NeedsAccount } from "@/components/dibby/crews-strip";
import { CrewPlans } from "@/components/dibby/crew-plans";
import { decideRequest, getCrew, inviteLasts, inviteMessage, newInvite, revokeInvite } from "@/lib/crews";
import { useSession } from "@/lib/session";

type Load = { kind: "loading" } | { kind: "error"; message: string } | { kind: "ok"; detail: CrewDetail };

const ROLE: Record<CrewRole, string | null> = { owner: "Owner", admin: "Admin", member: null };
const USES_LABEL = (n: InviteMaxUses) => (n === null ? "No limit" : `${n} ${n === 1 ? "person" : "people"}`);

/**
 * A crew: its plans (ARV-92), people asking to join, who's in, and invite links (ARV-91).
 * Renaming, roles and leaving come in ARV-94.
 */
export default function Crew() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useSession();
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [inviting, setInviting] = useState(false);
  const signedIn = state.status === "signedIn";

  const fetchCrew = useCallback(async () => {
    if (!signedIn) return;
    try {
      setLoad({ kind: "ok", detail: await getCrew(id) });
    } catch (e) {
      setLoad((prev) => (prev.kind === "ok" ? prev : { kind: "error", message: (e as Error).message }));
    }
  }, [id, signedIn]);
  useFocusEffect(
    useCallback(() => {
      fetchCrew();
    }, [fetchCrew])
  );

  if (!signedIn) return <NeedsAccount />;
  if (load.kind !== "ok")
    return (
      <SafeAreaView className="flex-1" edges={["bottom"]}>
        <TopBar />
        {load.kind === "error" ? <Text className="p-4 text-paragraph-md text-text-sub-600">{load.message}</Text> : null}
      </SafeAreaView>
    );

  const { crew, members, requests, invites, can } = load.detail;
  const apply = (detail: CrewDetail) => setLoad({ kind: "ok", detail });

  async function decide(requestId: string, approve: boolean, name: string) {
    try {
      apply(await decideRequest(id, requestId, approve));
      if (approve) toast.success(`${name.split(" ")[0]}'s in`);
    } catch (e) {
      toast.error("Couldn't save that", { description: (e as Error).message });
    }
  }
  async function turnOff(inviteId: string) {
    try {
      apply(await revokeInvite(id, inviteId));
      toast.success("Link turned off", { description: "Anyone who taps it now sees it's expired." });
    } catch (e) {
      toast.error("Couldn't turn it off", { description: (e as Error).message });
    }
  }

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <TopBar />
      <ScrollView
        contentContainerClassName="gap-6 p-4"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await fetchCrew();
              setRefreshing(false);
            }}
          />
        }
      >
        <View className="flex-row items-center gap-3">
          <View className="size-16 items-center justify-center rounded-lg bg-primary-lighter">
            <Text className="text-[34px] leading-[40px]">{crew.emoji}</Text>
          </View>
          <View className="flex-1 gap-0.5">
            <Text accessibilityRole="header" numberOfLines={2} className="text-title-h4 text-text-strong-950">
              {crew.name}
            </Text>
            <Text className="text-paragraph-md text-text-sub-600">
              {crew.members} {crew.members === 1 ? "person" : "people"}
            </Text>
          </View>
        </View>

        {requests.length > 0 ? (
          <Section title={`Asking to join (${requests.length})`}>
            {requests.map((r) => (
              <View key={r.id} className="flex-row items-center gap-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3">
                <Text numberOfLines={1} className="flex-1 text-label-md text-text-strong-950">
                  {r.name}
                </Text>
                <Button.Root size="small" variant="neutral" mode="stroke" accessibilityLabel={`Say no to ${r.name}`} onPress={() => decide(r.id, false, r.name)}>
                  No
                </Button.Root>
                <Button.Root size="small" accessibilityLabel={`Let ${r.name} in`} onPress={() => decide(r.id, true, r.name)}>
                  Let them in
                </Button.Root>
              </View>
            ))}
          </Section>
        ) : null}

        {load.detail.plans ? <CrewPlans plans={load.detail.plans} /> : null}

        <Section title="In the crew">
          {members.map((m) => (
            <View key={m.user_id} className="min-h-11 flex-row items-center gap-2">
              <Text numberOfLines={1} className="flex-1 text-paragraph-md text-text-strong-950">
                {m.name}
                {m.you ? <Text className="text-text-soft-400"> (you)</Text> : null}
              </Text>
              {ROLE[m.role] ? (
                <Badge.Root color={m.role === "owner" ? "primary" : "faded"}>{ROLE[m.role]!}</Badge.Root>
              ) : null}
            </View>
          ))}
        </Section>

        {invites.length > 0 ? (
          <Section title={can.manageRequests ? "Invite links" : "Your invite links"}>
            {invites.map((i) => {
              const used = i.max_uses === null ? `${i.uses} used` : `${i.uses} of ${i.max_uses} used`;
              const by = i.mine ? "Your link" : `${i.made_by ?? "Someone"}'s link`;
              return (
                <View key={i.id} className="flex-row items-center gap-3 rounded-lg border border-stroke-soft-200 bg-bg-white-0 p-3">
                  <View className="flex-1 gap-0.5">
                    <Text className="text-label-md text-text-strong-950">{by}</Text>
                    <Text className="text-paragraph-sm text-text-sub-600">
                      {used} · {inviteLasts(i)}
                    </Text>
                  </View>
                  <LinkButton.Root variant="error" onPress={() => turnOff(i.id)}>
                    Turn off
                  </LinkButton.Root>
                </View>
              );
            })}
            <Text className="text-paragraph-xs text-text-soft-400">A link only gets people to Ask to join. The owner or an admin lets them in.</Text>
          </Section>
        ) : null}
      </ScrollView>
      <View className="gap-3 p-4">
        {can.makePlan ? (
          <Button.Root variant="dibs" size="large" block onPress={() => router.push({ pathname: "/new", params: { crew: crew.id } })}>
            <Button.Icon name="add-line" />
            Make a plan
          </Button.Root>
        ) : null}
        {can.makeInvite ? (
          <Button.Root variant="primary" mode="stroke" size="large" block onPress={() => setInviting(true)}>
            <Button.Icon name="user-add-line" />
            Invite people
          </Button.Root>
        ) : null}
      </View>
      <InviteSheet open={inviting} onOpenChange={setInviting} crew={crew} onMade={fetchCrew} />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="gap-2">
      <Text accessibilityRole="header" className="text-subheading-sm uppercase text-text-soft-400">
        {title}
      </Text>
      {children}
    </View>
  );
}

/** Make a link Discord-style: how long it works and how many can use it, then straight to the share sheet. */
function InviteSheet({ open, onOpenChange, crew, onMade }: { open: boolean; onOpenChange: (o: boolean) => void; crew: CrewDetail["crew"]; onMade: () => void }) {
  const [expiry, setExpiry] = useState<InviteExpiry>(DEFAULT_INVITE_EXPIRY);
  const [uses, setUses] = useState<InviteMaxUses>(null);
  const [busy, setBusy] = useState(false);

  async function make() {
    setBusy(true);
    try {
      const link = await newInvite(crew.id, { expiry, max_uses: uses });
      onOpenChange(false);
      onMade();
      await Share.share(Platform.OS === "ios" ? { message: inviteMessage(crew, ""), url: link.url } : { message: inviteMessage(crew, link.url) }).catch(() => {});
    } catch (e) {
      toast.error("Couldn't make a link", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header title="Invite people" description="They tap the link and ask to join. You say yes." />
        <Modal.Body>
          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-label-sm text-text-sub-600">Link works for</Text>
              <View className="flex-row flex-wrap gap-2">
                {INVITE_EXPIRY.map((e) => (
                  <Choice key={e} label={INVITE_EXPIRY_LABEL[e]} selected={expiry === e} onPress={() => setExpiry(e)} />
                ))}
              </View>
            </View>
            <View className="gap-2">
              <Text className="text-label-sm text-text-sub-600">How many can use it</Text>
              <View className="flex-row flex-wrap gap-2">
                {INVITE_MAX_USES.map((n) => (
                  <Choice key={String(n)} label={USES_LABEL(n)} selected={uses === n} onPress={() => setUses(n)} />
                ))}
              </View>
            </View>
          </View>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root size="large" block disabled={busy} onPress={make}>
            <Button.Icon name="share-forward-line" />
            {busy ? "Making it…" : "Share the link"}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
