import type { Here } from "@/lib/viewer";
import { Monogram } from "./Monogram";
import * as Button from "@/components/ui/button";

/** Top-bar "you" button: your initials, through to who you are on this browser and switching. */
export function AccountButton({ here }: { here: Here }) {
  if (!here.name) {
    return (
      <Button.Root asChild mode="ghost" size="small">
        <a href="/login?next=/home">
          Sign in
        </a>
      </Button.Root>
    );
  }
  return (
    <a className="account-btn" href="/account" aria-label={`You're ${here.name}. Account and switching`}>
      <Monogram name={here.name} colour="violet" />
    </a>
  );
}
