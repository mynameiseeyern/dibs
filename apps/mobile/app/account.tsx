import { useState } from "react";
import { Linking, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Card from "@/components/dibby/card";
import * as Button from "@/components/ui/button";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { API_URL, deleteAccount } from "@/lib/api";
import { useSession } from "@/lib/session";

/** Who you're signed in as, the legal pages, signing out and deleting your account (Apple wants it in-app). */
export default function Account() {
  const { state, signOut } = useSession();
  const me = state.status === "signedIn" ? state.me : null;
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    setDeleting(true);
    try {
      await deleteAccount();
      await signOut();
      toast.success("Your account's deleted");
      router.replace("/");
    } catch (e) {
      toast.error("Couldn't delete it", { description: (e as Error).message });
      setDeleting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1" edges={["bottom"]}>
      <ScrollView contentContainerClassName="gap-4 p-4">
        <Text accessibilityRole="header" className="text-title-h3 text-text-strong-950">
          {me?.name ? `${me.name.first} ${me.name.last}` : "Your account"}
        </Text>
        {me?.email ? <Text className="text-paragraph-md text-text-sub-600">Signed in as {me.email}</Text> : null}

        <Card.Root>
          <View className="gap-4">
            <LinkButton.Root variant="black" onPress={() => router.push("/name")}>
              Change your name
            </LinkButton.Root>
            <LinkButton.Root variant="black" onPress={() => Linking.openURL(`${API_URL}/account`)}>
              PayID, calendar and emails (on the web)
            </LinkButton.Root>
            <LinkButton.Root variant="black" onPress={() => Linking.openURL(`${API_URL}/privacy`)}>
              Privacy
            </LinkButton.Root>
            <LinkButton.Root variant="black" onPress={() => Linking.openURL(`${API_URL}/terms`)}>
              Terms
            </LinkButton.Root>
            <LinkButton.Root variant="black" onPress={() => Linking.openURL("mailto:hello@dibby.social")}>
              Help: hello@dibby.social
            </LinkButton.Root>
          </View>
        </Card.Root>

        <Modal.Root>
          <Modal.Trigger>
            <LinkButton.Root variant="error">Delete my account</LinkButton.Root>
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

        {__DEV__ ? (
          <LinkButton.Root variant="gray" onPress={() => router.push("/ui")}>
            Components
          </LinkButton.Root>
        ) : null}
      </ScrollView>
      <View className="p-4">
        <Button.Root
          size="large"
          mode="stroke"
          variant="neutral"
          block
          onPress={async () => {
            await signOut();
            router.replace("/");
          }}
        >
          Sign out
        </Button.Root>
      </View>
    </SafeAreaView>
  );
}
