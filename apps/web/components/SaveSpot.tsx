"use client";

import { useEffect, useState } from "react";
import * as Button from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

const KEY = "dibs:spot-saved";

/**
 * A guest's private rejoin link (lib/rejoin.ts): no email, so this is how they get back if the
 * browser forgets them (incognito, cleared data, a new phone). On the plan it hides once
 * they've saved it; on /account it always shows.
 */
export function SaveSpot({ url, name, always = false }: { url: string; name: string; always?: boolean }) {
  const [hidden, setHidden] = useState(!always);
  useEffect(() => {
    if (always) return;
    try {
      setHidden(localStorage.getItem(KEY) === url);
    } catch {
      setHidden(false);
    }
  }, [url, always]);
  if (hidden) return null;

  const saved = () => {
    try {
      localStorage.setItem(KEY, url);
    } catch {}
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied", { description: "Keep it somewhere you'll find it, like your notes." });
    } catch {
      toast.info("Copy your link", { description: url, duration: 12000 });
    }
    saved();
  };
  const text = `My Dibby link, to get back to my plans as ${name}: ${url}`;

  return (
    <section className="db-card section" aria-labelledby="spot-h">
      <div>
        <h2 id="spot-h" className="label-md">
          Save your spot
        </h2>
        <p className="paragraph-sm muted">
          No email, no worries. Keep this link and it brings you back as {name} on any browser. It&rsquo;s just for you, so don&rsquo;t post it in the group.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button.Root type="button" variant="neutral" mode="lighter" onClick={copy}>
          <Button.Icon as="i" className="ri-file-copy-line" />
          Copy link
        </Button.Root>
        <Button.Root asChild variant="neutral" mode="lighter">
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer" onClick={saved}>
            <Button.Icon as="i" className="ri-whatsapp-line" />
            Send to myself
          </a>
        </Button.Root>
      </div>
      {!always && (
        <Button.Root
          type="button"
          mode="ghost"
          size="small"
          className="self-start"
          onClick={() => {
            saved();
            setHidden(true);
          }}
        >
          I&rsquo;ve got it
        </Button.Root>
      )}
    </section>
  );
}
