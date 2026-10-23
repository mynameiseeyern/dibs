import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy", robots: { index: true, follow: true } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="24 October 2026">
      <p>
        Dibby helps a group make a plan, decide where to go and square up after. This is what we keep, why, and how to get rid of it. If
        anything here is unclear, email <a href="mailto:hello@dibby.social">hello@dibby.social</a>.
      </p>

      <h2>What we keep</h2>
      <ul>
        <li>
          <strong>Your name.</strong> First and last, so your crew knows who&rsquo;s coming. Everyone on a plan sees the names of the others on it.
        </li>
        <li>
          <strong>Your email,</strong> if you sign in or add one, so you can sign in and keep your plans across devices. We don&rsquo;t show it to
          anyone.
        </li>
        <li>
          <strong>Your date of birth,</strong> if you organise plans, to check you&rsquo;re 18 or over. We don&rsquo;t show it to anyone.
        </li>
        <li>
          <strong>Your PayID and the name on it,</strong> if you add them, so people who owe you can pay you. Only people with a share on a bill you
          paid, who were confirmed as there on the night, can see it.
        </li>
        <li>
          <strong>What you do on a plan:</strong> your RSVP, votes, the times you&rsquo;re free, places you add, chat messages, reactions, bills and
          who&rsquo;s paid, and recap answers. People on the plan see these.
        </li>
        <li>
          <strong>Guests:</strong> if you join without an account, we keep your name and a signed cookie on your browser so Dibby knows it&rsquo;s you
          next time. The cookie lasts a year.
        </li>
        <li>
          <strong>Usage counts:</strong> we log moments like &ldquo;a plan was made&rdquo; or &ldquo;a bill was settled&rdquo;, with IDs only (no
          names, messages, places or amounts), to see whether Dibby is working.
        </li>
      </ul>

      <h2>Money</h2>
      <p>
        Dibby never holds or moves money. Settling up happens in your own banking app with the PayID details. Balances are private: you see your
        own share, the person who paid sees their bill, and everyone else sees how many have settled.
      </p>

      <h2>The AI in your chat</h2>
      <p>
        Dibby has an AI member in every plan&rsquo;s chat. It only reads messages that tag @dibby, and what you type in &ldquo;Ask Dibby&rdquo;. Those
        are sent to our AI provider, Anthropic, so it can reply. It doesn&rsquo;t remember anything between plans and never mentions money or anything
        personal.
      </p>

      <h2>Places and your location</h2>
      <p>
        Place search and place details (photos, reviews, hours) come from Google Maps. We only store a place&rsquo;s ID. If you let Dibby use your
        location for &ldquo;near me&rdquo;, it&rsquo;s rounded to about 100&nbsp;m, used once to steer the search, and never saved or sent to the
        AI. A place someone types in (like their home) shows its name to anyone with the plan link, and its address only to people on the plan.
      </p>

      <h2>Who else handles your data</h2>
      <ul>
        <li>Supabase: our database and sign-in.</li>
        <li>Vercel: hosts the app.</li>
        <li>Anthropic: the AI&rsquo;s replies, for messages that tag @dibby.</li>
        <li>Google Maps Platform: place search, place details and weather.</li>
        <li>Resend: sends sign-in links and, if you opt in, beta updates.</li>
        <li>Sentry: crash reports, so we can fix what breaks. We don&rsquo;t send it names, messages or amounts.</li>
      </ul>
      <p>We don&rsquo;t sell your data or use it for ads.</p>

      <h2>Emails</h2>
      <p>
        We send sign-in links when you ask for one. Beta updates are opt-in: off unless you switch them on, and every one has an unsubscribe link
        that works without signing in.
      </p>

      <h2>Deleting your stuff</h2>
      <ul>
        <li>
          <strong>Guests:</strong> tap &ldquo;Remove me from this plan&rdquo; on a plan to delete your name and data from it.
        </li>
        <li>
          <strong>Accounts:</strong> go to <a href="/account">You</a> and tap &ldquo;Delete my account&rdquo;. Your sign-in, email, date of birth
          and PayID are deleted. On plans you were part of, you show as &ldquo;Former member&rdquo;, so everyone else&rsquo;s bills still add up.
          Messages you sent in a plan&rsquo;s chat stay there for the group, under that name.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        We follow the Australian Privacy Principles. You can ask what we hold about you, ask us to correct it, or complain, by emailing{" "}
        <a href="mailto:hello@dibby.social">hello@dibby.social</a>. If you&rsquo;re not happy with our answer, you can go to the Office of the
        Australian Information Commissioner (OAIC).
      </p>
    </LegalPage>
  );
}
