import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Share, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AccountInfo } from "@dibs/shared/api";
import * as Card from "@/components/dibby/card";
import { SiteFooter, Wordmark } from "@/components/dibby/brand";
import * as Avatar from "@/components/ui/avatar";
import * as Button from "@/components/ui/button";
import * as Hint from "@/components/ui/hint";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import * as SegmentedControl from "@/components/ui/segmented-control";
import * as Switch from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import { deleteAccount, getAccount, resetCalendarLink, setBetaUpdates } from "@/lib/api";
import { useSession } from "@/lib/session";
import { getThemeChoice, setThemeChoice, type ThemeChoice } from "@/lib/theme";

/**
 * The web's /account, in the same order: who you are, your wheel record, keeping your plans
 * (guests), emails and calendar (accounts), look, then your plans, switching, signing out and
 * deleting (Apple wants that in the app). The logo takes you home, like the web's.
 */
export default function Account() {
  const { state, signOut, hasGuestPass, setGuestPass } = useSession();
  const [info, setInfo] = useState<AccountInfo | null>(null);

  useFocusEffect(
    useCallback(() => {
      getAccount()
        .then(setInfo)
        .catch(() => setInfo(null));
      // Fetch again when who's on the phone changes (signing in or out, forgetting a guest).
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.status, hasGuestPass])
  );

  const signedIn = state.status === "signedIn";
  const meName = signedIn && state.me?.name ? `${state.me.name.first} ${state.me.name.last}`.trim() : null;
  const name = info?.name ?? meName;
  const kind = info?.kind ?? (signedIn ? "account" : hasGuestPass ? "guest" : "none");
  const email = info?.email ?? (signedIn ? state.me?.email : null) ?? null;

  return (
    <SafeAreaView className="flex-1 bg-bg-weak-50" edges={["top", "bottom"]}>
      <ScrollView contentContainerClassName="gap-6 px-4 pb-4 pt-4">
        <Pressable accessibilityRole="link" accessibilityLabel="Dibby, your plans" onPress={() => router.replace("/")} className="self-start active:opacity-70">
          <Wordmark />
        </Pressable>

        {!name ? (
          <View className="gap-3">
            <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
              You&rsquo;re not signed in
            </Text>
            <Text className="text-paragraph-md text-text-sub-600">Sign in to see your plans, or open a plan link from the group chat.</Text>
            <Button.Root size="large" block onPress={() => router.push("/sign-in")}>
              Sign in
            </Button.Root>
          </View>
        ) : (
          <Card.Root>
            <View className="flex-row items-center gap-4">
              <Avatar.Root size="56" color="violet" name={name} />
              <View className="min-w-0 flex-1">
                <Text accessibilityRole="header" className="text-title-h4 text-text-strong-950">
                  {name}
                </Text>
                <Text className="text-paragraph-sm text-text-sub-600">{kind === "account" ? (email ?? "Signed in") : "Guest on this phone, no account"}</Text>
              </View>
            </View>
          </Card.Root>
        )}

        {info?.record ? (
          <Card.Root>
            <Text className="text-subheading-sm uppercase text-text-sub-600">Your wheel record</Text>
            <Text className="text-title-h4 text-text-strong-950">
              {info.record.lost === 0 ? `Dodged ${info.record.played} ${info.record.played === 1 ? "spin" : "spins"}` : `Lost ${info.record.lost} of ${info.record.played}`}
            </Text>
            <Text className="text-paragraph-sm text-text-sub-600">
              {info.record.lost === 0
                ? "Not a cent from a spin. Charmed."
                : `${info.record.paid} paid from losing spins. ${info.record.lost === info.record.played && info.record.played >= 2 ? "Cursed." : "Could be worse."}`}
            </Text>
          </Card.Root>
        ) : null}

        {kind === "guest" ? (
          <Card.Root>
            <Text accessibilityRole="header" className="text-title-h5 text-text-strong-950">
              Keep your plans on every device
            </Text>
            <Text className="text-paragraph-sm text-text-sub-600">
              Right now you&rsquo;re only on this phone. Add your email and your plans come with you to your laptop, another phone or the WhatsApp browser.
            </Text>
            <Button.Root size="large" block onPress={() => router.push("/sign-in")}>
              Email me a link
            </Button.Root>
            <Text className="text-paragraph-xs text-text-sub-600">We only use it to sign you in. No spam, no newsletters.</Text>
          </Card.Root>
        ) : null}

        {kind === "account" && info ? <Emails key={String(info.beta_updates)} info={info} onChange={setInfo} /> : null}
        {kind === "account" && info?.calendar_url ? <Calendar url={info.calendar_url} onChange={setInfo} /> : null}

        <Card.Root>
          <Text accessibilityRole="header" className="text-title-h5 text-text-strong-950">
            Look
          </Text>
          <ThemePicker />
        </Card.Root>

        {name ? (
          <View className="gap-3">
            <Button.Root variant="neutral" mode="lighter" block onPress={() => router.replace("/")}>
              <Button.Icon name="calendar-event-line" />
              Your plans
            </Button.Root>
            {kind === "account" ? (
              <>
                <Button.Root variant="neutral" mode="lighter" block onPress={() => router.push("/name")}>
                  <Button.Icon name="user-line" />
                  Change your name
                </Button.Root>
                <Button.Root
                  variant="neutral"
                  mode="lighter"
                  block
                  onPress={async () => {
                    await signOut();
                    router.replace("/sign-in");
                  }}
                >
                  <Button.Icon name="user-shared-line" />
                  Switch account
                </Button.Root>
                <Button.Root
                  mode="ghost"
                  block
                  onPress={async () => {
                    await signOut();
                    router.replace("/");
                  }}
                >
                  Sign out
                </Button.Root>
                <DeleteAccount onDeleted={signOut} />
              </>
            ) : (
              <>
                <Button.Root variant="neutral" mode="lighter" block onPress={() => router.push("/sign-in")}>
                  <Button.Icon name="login-box-line" />I have an account
                </Button.Root>
                <Button.Root
                  mode="ghost"
                  block
                  onPress={async () => {
                    await setGuestPass(null);
                    router.replace("/");
                  }}
                >
                  {`Not ${name.split(" ")[0]}? Forget me on this phone`}
                </Button.Root>
              </>
            )}
          </View>
        ) : null}

        {__DEV__ ? (
          <LinkButton.Root variant="gray" className="self-center" onPress={() => router.push("/ui")}>
            Components
          </LinkButton.Root>
        ) : null}
        <SiteFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

/** The web's "Emails from Dibby" card: Beta updates, saved as soon as the switch moves. */
function Emails({ info, onChange }: { info: AccountInfo; onChange: (i: AccountInfo) => void }) {
  const [on, setOn] = useState(Boolean(info.beta_updates));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function flip(v: boolean) {
    setOn(v);
    setBusy(true);
    setError(null);
    try {
      onChange(await setBetaUpdates(v));
    } catch (e) {
      setOn(!v);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card.Root>
      <Text accessibilityRole="header" className="text-title-h5 text-text-strong-950">
        Emails from Dibby
      </Text>
      <View className="min-h-11 flex-row items-center gap-3">
        <Switch.Root checked={on} onCheckedChange={flip} disabled={busy || !info.email} accessibilityLabel="Beta updates" />
        <Text className="text-paragraph-md text-text-strong-950">Beta updates</Text>
      </View>
      <Hint.Root hasError={Boolean(error)}>
        {error ??
          (!info.email
            ? "Add an email to your account to get these."
            : on
              ? `A short email to ${info.email} when we ship something new.`
              : "Off. Turn it on for a short email when we ship something new.")}
      </Hint.Root>
    </Card.Root>
  );
}

/** The web's "Your calendar" card (CalendarFeed): subscribe, Google, copy, reset. */
function Calendar({ url, onChange }: { url: string; onChange: (i: AccountInfo) => void }) {
  const webcal = url.replace(/^https?:\/\//, "webcal://");
  const google = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`;
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <Card.Root>
      <Text accessibilityRole="header" className="text-title-h5 text-text-strong-950">
        Your calendar
      </Text>
      <Text className="text-paragraph-sm text-text-sub-600">
        Plans you&rsquo;re in show up in your calendar once they&rsquo;re locked in, and change when the plan does. Called off or can&rsquo;t go? It drops off.
      </Text>
      <Button.Root size="large" block onPress={() => Linking.openURL(webcal)}>
        <Button.Icon name="calendar-check-line" />
        Subscribe in Calendar
      </Button.Root>
      <Button.Root variant="neutral" mode="lighter" block onPress={() => Linking.openURL(google)}>
        <Button.Icon name="google-line" />
        Add to Google Calendar
      </Button.Root>
      <Button.Root
        variant="neutral"
        mode="ghost"
        block
        // The share sheet has Copy, and needs no new native module (that'd mean a new build).
        onPress={() => Share.share({ message: url })}
      >
        <Button.Icon name="share-line" />
        Share link for another calendar
      </Button.Root>
      <Text className="text-paragraph-xs text-text-sub-600">
        Calendars check for changes about once an hour, Google less often. Want it quicker on an iPhone? Set your calendar to refresh every 15 minutes. Keep the link to yourself: anyone with it can see your plans.{" "}
        <Text accessibilityRole="button" onPress={() => setOpen(true)} className="underline">
          Reset link
        </Text>
      </Text>
      <Modal.Root open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <Modal.Content>
          <Modal.Header title="Reset your calendar link?" description="The old link stops working, so any calendar using it stops updating. Subscribe again with the new one." />
          <Modal.Footer>
            <Button.Root
              variant="error"
              mode="lighter"
              size="large"
              block
              disabled={busy}
              onPress={async () => {
                setBusy(true);
                try {
                  onChange(await resetCalendarLink());
                  toast.success("New link made", { description: "Subscribe again with it." });
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                  setOpen(false);
                }
              }}
            >
              {busy ? "Resetting…" : "Reset link"}
            </Button.Root>
            <Modal.Close>
              <Button.Root variant="neutral" mode="stroke" size="large" block>
                Keep it
              </Button.Root>
            </Modal.Close>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </Card.Root>
  );
}

const THEMES: { id: ThemeChoice; label: string; icon: "smartphone-line" | "sun-line" | "moon-line" }[] = [
  { id: "system", label: "Auto", icon: "smartphone-line" },
  { id: "light", label: "Light", icon: "sun-line" },
  { id: "dark", label: "Dark", icon: "moon-line" },
];

/** Light, dark, or match the phone (the web's ThemePicker). */
function ThemePicker() {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  useEffect(() => {
    getThemeChoice().then(setChoice);
  }, []);
  return (
    <SegmentedControl.Root
      value={choice}
      onValueChange={(v) => {
        const t = v as ThemeChoice;
        setChoice(t);
        setThemeChoice(t);
      }}
    >
      <SegmentedControl.List accessibilityLabel="Appearance">
        {THEMES.map((t) => (
          <SegmentedControl.Trigger key={t.id} value={t.id}>
            <SegmentedControl.Icon name={t.icon} />
            {t.label}
          </SegmentedControl.Trigger>
        ))}
      </SegmentedControl.List>
    </SegmentedControl.Root>
  );
}

/** The web's DeleteAccount: a ghost red button and a sheet that says what goes. */
function DeleteAccount({ onDeleted }: { onDeleted: () => Promise<void> }) {
  const [deleting, setDeleting] = useState(false);
  async function remove() {
    setDeleting(true);
    try {
      await deleteAccount();
      await onDeleted();
      toast.success("Your account's deleted");
      router.replace("/");
    } catch (e) {
      toast.error("Couldn't delete it", { description: (e as Error).message });
      setDeleting(false);
    }
  }
  return (
    <Modal.Root>
      <Modal.Trigger>
        <Button.Root variant="error" mode="ghost" block>
          <Button.Icon name="delete-bin-line" />
          Delete my account
        </Button.Root>
      </Modal.Trigger>
      <Modal.Content>
        <Modal.Header
          title="Delete your account?"
          description="Your name, PayID and sign-in are gone for good. On plans you were in, you'll show as a former member so shared bills still add up."
        />
        <Modal.Footer>
          <Button.Root variant="error" size="large" block disabled={deleting} onPress={remove}>
            {deleting ? "Deleting…" : "Delete my account"}
          </Button.Root>
          <Modal.Close>
            <Button.Root variant="neutral" mode="stroke" size="large" block>
              Keep it
            </Button.Root>
          </Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
