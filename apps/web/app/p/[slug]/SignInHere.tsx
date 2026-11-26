"use client";

import { usePathname } from "next/navigation";
import * as Button from "@/components/ui/button";

/** "In the crew? Sign in", back to this same link after. */
export function SignInHere() {
  const path = usePathname() ?? "/home";
  return (
    <Button.Root asChild>
      <a href={`/login?next=${encodeURIComponent(path)}`}>Sign in</a>
    </Button.Root>
  );
}
