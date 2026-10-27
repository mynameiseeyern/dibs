"use client";

import { useTransition } from "react";
import { signOutAction } from "@/app/actions";
import * as Dropdown from "@/components/ui/dropdown";
import * as Button from "@/components/ui/button";
import { Monogram } from "./Monogram";

type Props = {
  /** Who's on this browser: their name, or null for nobody. */
  name: string | null;
  /** Signed in with an account (not just a guest on this browser). */
  signedIn: boolean;
};

/**
 * The one menu in the top bar. With an account it's your avatar, and Your plans lives inside it.
 * Without one it's a kebab: Your plans if you're a guest here, About, and signing in.
 */
export function NavMenu({ name, signedIn }: Props) {
  const [pending, start] = useTransition();
  const guest = !signedIn && Boolean(name);
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        {signedIn && name ? (
          <button type="button" className="account-btn" aria-label={`You're ${name}. Menu`}>
            <Monogram name={name} colour="violet" />
          </button>
        ) : (
          <Button.Root type="button" variant="neutral" mode="ghost" iconOnly aria-label="Menu">
            <Button.Icon as="i" className="ri-more-2-fill" />
          </Button.Root>
        )}
      </Dropdown.Trigger>
      <Dropdown.Content align="end" className="w-60">
        {name && <Dropdown.Label>{signedIn ? name : `On this browser as ${name}`}</Dropdown.Label>}
        {name && (
          <Item href="/home" icon="ri-calendar-event-line">
            Your plans
          </Item>
        )}
        <Item href="/" icon="ri-add-line">
          New plan
        </Item>
        {signedIn && (
          <Item href="/account" icon="ri-user-3-line">
            Your account
          </Item>
        )}
        {guest && (
          <Item href="/account" icon="ri-mail-line">
            Keep your plans
          </Item>
        )}
        <Item href="/about" icon="ri-information-line">
          About Dibby
        </Item>
        <Dropdown.Separator />
        {signedIn ? (
          <Dropdown.Item disabled={pending} onSelect={() => start(() => signOutAction())}>
            <Dropdown.ItemIcon as="i" className="ri-logout-box-r-line" aria-hidden="true" />
            {pending ? "Signing out…" : "Sign out"}
          </Dropdown.Item>
        ) : (
          <Item href="/login?next=/home" icon="ri-login-box-line">
            Sign in
          </Item>
        )}
      </Dropdown.Content>
    </Dropdown.Root>
  );
}

function Item({ href, icon, children }: { href: string; icon: string; children: React.ReactNode }) {
  return (
    <Dropdown.Item asChild>
      <a href={href}>
        <Dropdown.ItemIcon as="i" className={icon} aria-hidden="true" />
        {children}
      </a>
    </Dropdown.Item>
  );
}
