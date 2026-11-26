import { useState } from "react";
import { REPORT_REASONS } from "@dibs/shared/report-reasons";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";
import { toast } from "@/components/ui/toast";
import { reportContent } from "@/lib/api";

/** What the long-press was on: a chat message, or someone on the who's going list. */
export type ReportTarget = { kind: "message" | "member"; id: string; name: string };

/**
 * Report a message or a person, or block them (Apple 1.2, the web's ContentMenu). Opened by a
 * long-press, so it stays out of the way. Blocking hides everything they post in your chats
 * and drops their plans from your app; it's never shown to them.
 */
export function ReportSheet({ slug, target, onClose, onDone }: { slug: string; target: ReportTarget | null; onClose: () => void; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"menu" | "why">("menu");
  const first = target?.name.split(" ")[0] ?? "them";

  function close() {
    if (busy) return;
    setStep("menu");
    onClose();
  }

  async function send(reason: string, block: boolean) {
    if (!target) return;
    setBusy(true);
    try {
      await reportContent(slug, { kind: target.kind, target_id: target.id, reason, block });
      toast.success(block ? `Blocked ${first}` : "Thanks, we'll take a look", {
        description: block ? "You won't see their messages or plans." : "We look at every report within 24 hours.",
      });
      setStep("menu");
      onClose();
      onDone();
    } catch (e) {
      toast.error("Couldn't send that", { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal.Root open={Boolean(target)} onOpenChange={(o) => !o && close()}>
      <Modal.Content>
        {step === "menu" ? (
          <>
            <Modal.Header title={target?.kind === "message" ? `${first}'s message` : first} description="Reports are private. They never know it was you." />
            <Modal.Footer>
              <Button.Root variant="neutral" mode="lighter" size="large" block disabled={busy} onPress={() => setStep("why")}>
                {target?.kind === "message" ? "Report message" : `Report ${first}`}
              </Button.Root>
              <Button.Root variant="error" mode="lighter" size="large" block disabled={busy} onPress={() => send("other", true)}>
                {`Block ${first}`}
              </Button.Root>
            </Modal.Footer>
          </>
        ) : (
          <>
            <Modal.Header title="What's wrong with it?" description="It stays private." />
            <Modal.Footer>
              {REPORT_REASONS.map((r) => (
                <Button.Root key={r.id} variant="neutral" mode="lighter" size="large" block disabled={busy} onPress={() => send(r.id, false)}>
                  {r.label}
                </Button.Root>
              ))}
            </Modal.Footer>
          </>
        )}
      </Modal.Content>
    </Modal.Root>
  );
}
