import { Dibby } from "@/components/Dibby";

// While a page is on its way: Dibby, bobbing. The still shows if motion is off.
export default function Loading() {
  return (
    <main className="page page--center" aria-busy="true" aria-label="Loading">
      <section className="empty">
        <Dibby mood="loading" size="md" />
      </section>
    </main>
  );
}
