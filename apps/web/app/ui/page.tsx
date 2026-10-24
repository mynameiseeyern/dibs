import { notFound } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { Gallery } from "./Gallery";
import { DibsPieces } from "./DibsPieces";

export const metadata = { title: "Components" };

// Dev and preview only: every AlignUI component in its Dibs styling, to check against the design system.
export default function UiGallery() {
  // Also on Vercel preview deploys, so a branch can be checked before it hits main.
  if (process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview") notFound();
  return (
    <main className="page">
      <header className="topbar">
        <Wordmark href="/" />
      </header>
      <h1 className="title-h3">Components</h1>
      <Gallery />
      <DibsPieces />
    </main>
  );
}
