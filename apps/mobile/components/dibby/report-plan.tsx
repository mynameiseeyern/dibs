import { useState } from "react";
import { Linking, View } from "react-native";
import { router } from "expo-router";
import { REPORT_REASONS } from "@dibs/shared/report-reasons";
import * as Button from "@/components/ui/button";
import * as LinkButton from "@/components/ui/link-button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { reportContent } from "@/lib/api";

/** Report a plan, block whoever made it, or get in touch. Reporting or blocking drops it from your app straight away. */
export function ReportPlan({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send(reason: string, block: boolean) {
    setBusy(true);
    try {
      await reportContent(slug, { kind: "plan", reason, block });
      setOpen(false);
      toast.success(block ? "Blocked. You won't see their plans" : "Thanks, we'll take a look", { description: "We look at every report within 24 hours." });
      router.replace("/");
    } catch (e) {
      toast.error("Couldn't send that", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-row flex-wrap gap-4">
      <LinkButton.Root variant="gray" onPress={() => setOpen(true)}>
        Report or block
      </LinkButton.Root>
      <LinkButton.Root variant="gray" onPress={() => Linking.openURL("mailto:hello@dibby.social?subject=Dibby%20help")}>
        Help: hello@dibby.social
      </LinkButton.Root>
      <Modal.Root open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <Modal.Content>
          <Modal.Header title="What's wrong with it?" description="It stays private." />
          <Modal.Footer>
            {REPORT_REASONS.map((r) => (
              <Button.Root key={r.id} variant="neutral" mode="lighter" size="large" block disabled={busy} onPress={() => send(r.id, false)}>
                {r.label}
              </Button.Root>
            ))}
            <Button.Root variant="error" mode="lighter" size="large" block disabled={busy} onPress={() => send("other", true)}>
              Block the organiser
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </View>
  );
}
