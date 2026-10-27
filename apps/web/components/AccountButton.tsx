import type { Here } from "@/lib/viewer";
import { NavMenu } from "./NavMenu";

/** Top-bar menu: your avatar with an account, a kebab without one. See NavMenu. */
export function AccountButton({ here }: { here: Here }) {
  return <NavMenu name={here.name} signedIn={Boolean(here.organiser)} />;
}
