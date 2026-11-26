"use client";

import { useCallback, useRef, useState } from "react";
import * as Button from "@/components/ui/button";
import * as Modal from "@/components/ui/modal";

const KEY = "dibs:ai-consent";

function given(): boolean {
  try {
    return localStorage.getItem(KEY) === "yes";
  } catch {
    return false;
  }
}

/**
 * Asks once, before anything you tag @dibby with goes to the AI provider, and says who that is
 * (ARV-59, App Store 5.1.2(i) on the phone). `ensure()` resolves true straight away once you've
 * allowed it on this browser; otherwise it shows the dialog and resolves with your answer.
 * The server checks the `ai_consent` field too, so a tagged message without it isn't sent on.
 */
export function useAiConsent() {
  const [open, setOpen] = useState(false);
  const answer = useRef<((ok: boolean) => void) | null>(null);

  const ensure = useCallback((): Promise<boolean> => {
    if (given()) return Promise.resolve(true);
    setOpen(true);
    return new Promise((resolve) => {
      answer.current = resolve;
    });
  }, []);

  function settle(ok: boolean) {
    if (ok) {
      try {
        localStorage.setItem(KEY, "yes");
      } catch {}
    }
    setOpen(false);
    answer.current?.(ok);
    answer.current = null;
  }

  const dialog = (
    <Modal.Root open={open} onOpenChange={(o) => !o && settle(false)}>
      <Modal.Content>
        <Modal.Header title="OK to send this to Dibby's AI?" />
        <Modal.Body>
          <p>
            Dibby runs on Claude, made by Anthropic, a third-party AI company. When you tag @dibby, your message and the last 20 in this chat go to
            Anthropic so Dibby can reply. Anthropic doesn&rsquo;t train its models on it. Dibby only reads messages it&rsquo;s tagged in.
          </p>
          <p className="paragraph-sm">
            <a href="/privacy" target="_blank" rel="noreferrer">
              Read the privacy page
            </a>
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button.Root type="button" variant="neutral" mode="stroke" size="large" block onClick={() => settle(false)}>
            Not now
          </Button.Root>
          <Button.Root type="button" size="large" block onClick={() => settle(true)}>
            Allow
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );

  return { ensure, given, dialog };
}
