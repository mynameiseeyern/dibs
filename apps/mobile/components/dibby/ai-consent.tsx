import { Linking } from "react-native";
import * as SecureStore from "expo-secure-store";
import * as Button from "@/components/ui/button";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import { API_URL } from "@/lib/api";

const KEY = "dibby.ai-consent";

export async function hasAiConsent(): Promise<boolean> {
  return (await SecureStore.getItemAsync(KEY).catch(() => null)) === "yes";
}

/** Asks before the first thing goes to the AI provider, and says exactly who that is. */
export const AI_CONSENT_PLAN =
  "Dibby runs on Claude, made by Anthropic, a third-party AI company. What you ask for and your plan\u2019s name get sent to Anthropic so Dibby can find spots. Anthropic doesn\u2019t train its models on it.";
export const AI_CONSENT_CHAT =
  "Dibby runs on Claude, made by Anthropic, a third-party AI company. When you tag @dibby, your message and the last 20 in this chat go to Anthropic so Dibby can reply. Anthropic doesn\u2019t train its models on it. Dibby only reads messages it\u2019s tagged in.";

export function AiConsent({ open, onOpenChange, onAllow, body = AI_CONSENT_PLAN }: { open: boolean; onOpenChange: (o: boolean) => void; onAllow: () => void; body?: string }) {
  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header title="OK to send this to Dibby's AI?" />
        <Modal.Body>
          {body}
          <LinkButton.Root variant="gray" onPress={() => Linking.openURL(`${API_URL}/privacy`)}>
            Read the privacy page
          </LinkButton.Root>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            size="large"
            block
            onPress={async () => {
              await SecureStore.setItemAsync(KEY, "yes").catch(() => {});
              onOpenChange(false);
              onAllow();
            }}
          >
            Allow
          </Button.Root>
          <Modal.Close>
            <Button.Root variant="neutral" mode="stroke" size="large" block>
              Not now
            </Button.Root>
          </Modal.Close>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
