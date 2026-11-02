import { Dibby } from "@/components/Dibby";

// Where the sign-in email lands. FinishSignIn (in the root layout) reads the session
// from the link and sends you on; this is just what shows for that split second.
export const metadata = { title: "Signing in" };

export default function Done() {
  return (
    <main className="page page--center">
      <section className="empty">
        <Dibby mood="wave" size="md" />
        <h1 className="title-h3">Signing you in&hellip;</h1>
        <p className="muted">
          Stuck here? <a href="/login">Send a new link</a>.
        </p>
      </section>
    </main>
  );
}
