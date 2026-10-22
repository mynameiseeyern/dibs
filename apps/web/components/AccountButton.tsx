import type { Here } from "@/lib/viewer";
import { Monogram } from "./Monogram";

/** Top-bar "you" button: your initials, through to who you are on this browser and switching. */
export function AccountButton({ here }: { here: Here }) {
  if (!here.name) {
    return (
      <a className="db-btn db-btn--ghost db-btn--sm" href="/login?next=/home">
        Sign in
      </a>
    );
  }
  return (
    <a className="account-btn" href="/account" aria-label={`You're ${here.name}. Account and switching`}>
      <Monogram name={here.name} colour="violet" />
    </a>
  );
}
