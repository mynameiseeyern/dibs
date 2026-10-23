import { notFound } from "next/navigation";
import { Wordmark } from "@/components/Logo";
import { Gallery } from "./Gallery";
import { DibsPieces } from "./DibsPieces";

export const metadata = { title: "Components" };

// Dev-only: every AlignUI component in its Dibs styling, to check against the design system.
export default function UiGallery() {
  if (process.env.NODE_ENV === "production") notFound();
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
