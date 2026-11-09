"use client";

import { useState, useTransition } from "react";
import { REPORT_REASONS, type ReportReason } from "@dibs/shared/moderation";
import * as Button from "@/components/ui/button";
import * as Label from "@/components/ui/label";
import * as Modal from "@/components/ui/modal";
import * as Radio from "@/components/ui/radio";
import * as Textarea from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import "./content-menu.css";

type Result = { error?: string };

/**
 * The "…" on anything someone else put on a plan: report it, block them, and for hosts, take it
 * down. Reporting hides the thing for you straight away; the report goes to our queue.
 */
export function ContentMenu({
  title,
  label,
  variant = "icon",
  triggerText,
  report,
  block,
  remove,
}: {
  title: string;
  /** What a screen reader hears on the trigger. */
  label: string;
  variant?: "icon" | "link" | "button";
  triggerText?: string;
  report?: (reason: ReportReason, note: string) => Promise<Result>;
  block?: { name: string; act: () => Promise<Result> };
  remove?: { label: string; done: string; warn?: string; act: () => Promise<Result> };
}) {
  const [open, setOpen] = useState(false);
  const [screen, setScreen] = useState<"menu" | "report" | "block" | "remove">(report && !block && !remove ? "report" : "menu");
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  const first = block?.name.split(" ")[0];

  const reset = () => {
    setScreen(report && !block && !remove ? "report" : "menu");
    setReason(null);
    setNote("");
  };
  const run = (act: () => Promise<Result>, done: string, description?: string) =>
    start(async () => {
      const res = await act();
      if (res.error) return void toast.error(res.error);
      setOpen(false);
      reset();
      toast.success(done, description ? { description } : undefined);
    });

  const heading = screen === "report" ? "What's wrong with it?" : screen === "block" ? `Block ${first}?` : screen === "remove" ? `${remove?.label}?` : title;

  return (
    <>
      {variant === "icon" ? (
        <button type="button" className="content-menu__dots" aria-label={label} onClick={() => setOpen(true)}>
          <i className="ri-more-fill db-icon" aria-hidden="true" />
        </button>
      ) : variant === "link" ? (
        <button type="button" className="content-menu__link" aria-label={label} onClick={() => setOpen(true)}>
          <i className="ri-flag-line db-icon" aria-hidden="true" /> {triggerText}
        </button>
      ) : (
        <Button.Root type="button" variant="neutral" mode="ghost" size="large" block onClick={() => setOpen(true)}>
          <i className="ri-flag-line db-icon" aria-hidden="true" /> {triggerText}
        </Button.Root>
      )}
      <Modal.Root
        open={open}
        onOpenChange={(o) => {
          if (pending) return;
          setOpen(o);
          if (!o) reset();
        }}
      >
        <Modal.Content>
          <Modal.Header title={heading} />
          <Modal.Body>
            {screen === "report" ? (
              <div className="flex flex-col gap-3">
                <Radio.Group value={reason ?? ""} onValueChange={(v) => setReason(v as ReportReason)} className="flex flex-col">
                  {REPORT_REASONS.map((r) => (
                    <label key={r.id} className="flex min-h-11 cursor-pointer items-center gap-3">
                      <Radio.Item value={r.id} />
                      <span className="paragraph-md">{r.label}</span>
                    </label>
                  ))}
                </Radio.Group>
                <div className="flex flex-col gap-1">
                  <Label.Root htmlFor="report-note">
                    Anything else? <Label.Sub>(optional)</Label.Sub>
                  </Label.Root>
                  <Textarea.Root id="report-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={2} simple />
                </div>
                <p className="paragraph-xs muted">It stays private. We look at every report within 24 hours.</p>
              </div>
            ) : screen === "block" ? (
              <p>You won&rsquo;t see {first}&rsquo;s messages or photos on any plan. They won&rsquo;t be told. You can undo it on your account page.</p>
            ) : screen === "remove" ? (
              <p>{remove?.warn ?? "This can't be undone."}</p>
            ) : (
              <p className="sr-only">Pick what you want to do.</p>
            )}
          </Modal.Body>
          <Modal.Footer>
            {screen === "report" ? (
              <>
                <Button.Root size="large" block disabled={pending || !reason} onClick={() => run(() => report!(reason!, note), "Thanks, we'll take a look", "It's hidden for you now.")}>
                  {pending ? "Sending…" : "Send report"}
                </Button.Root>
                {(block || remove) && (
                  <Button.Root variant="neutral" mode="lighter" size="large" block disabled={pending} onClick={() => setScreen("menu")}>
                    Back
                  </Button.Root>
                )}
              </>
            ) : screen === "block" ? (
              <>
                <Button.Root variant="error" size="large" block disabled={pending} onClick={() => run(block!.act, `${first}'s blocked`)}>
                  {pending ? "Blocking…" : `Block ${first}`}
                </Button.Root>
                <Button.Root variant="neutral" mode="lighter" size="large" block disabled={pending} onClick={() => setScreen("menu")}>
                  Back
                </Button.Root>
              </>
            ) : screen === "remove" ? (
              <>
                <Button.Root variant="error" size="large" block disabled={pending} onClick={() => run(remove!.act, remove!.done)}>
                  {pending ? "Working on it…" : remove!.label}
                </Button.Root>
                <Button.Root variant="neutral" mode="lighter" size="large" block disabled={pending} onClick={() => setScreen("menu")}>
                  Back
                </Button.Root>
              </>
            ) : (
              <>
                {report && (
                  <Button.Root variant="neutral" mode="lighter" size="large" block onClick={() => setScreen("report")}>
                    <i className="ri-flag-line db-icon" aria-hidden="true" /> Report
                  </Button.Root>
                )}
                {block && (
                  <Button.Root variant="neutral" mode="lighter" size="large" block onClick={() => setScreen("block")}>
                    <i className="ri-forbid-line db-icon" aria-hidden="true" /> Block {first}
                  </Button.Root>
                )}
                {remove && (
                  <Button.Root variant="error" mode="lighter" size="large" block onClick={() => setScreen("remove")}>
                    <i className="ri-delete-bin-line db-icon" aria-hidden="true" /> {remove.label}
                  </Button.Root>
                )}
                <Modal.Close asChild>
                  <Button.Root mode="ghost" variant="neutral" size="large" block>
                    Close
                  </Button.Root>
                </Modal.Close>
              </>
            )}
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </>
  );
}
