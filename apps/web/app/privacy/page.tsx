import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy", robots: { index: true, follow: true } };

export default function Privacy() {
  return (
    <LegalPage title="Privacy" updated="9 November 2026">
      <p>
        Dibby helps a group make a plan, decide where to go and square up after. This is what we keep, why, and how to get rid of it. If
        anything here is unclear, email <a href="mailto:hello@dibby.social">hello@dibby.social</a>.
      </p>

      <p>
        Dibby is run by Ee Yern Ng, a sole trader in Sydney (ABN 97 837 335 531).
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
          <strong>Your PayID and the name on it,</strong> if you add them, so people who owe you can pay you. Only people with a share on a bill you
          paid, who were confirmed as there on the day, can see it.
        </li>
        <li>
          <strong>What you do on a plan:</strong> your RSVP, votes, the times you&rsquo;re free, places you add, chat messages, reactions, bills and
          who&rsquo;s paid, and recap answers. People on the plan see these.
        </li>
        <li>
          <strong>Pics you upload to a plan,</strong> up to three each. They&rsquo;re shrunk on your phone before they&rsquo;re sent, which
          also strips the location and camera details. They stay hidden until the host wraps up, and then only people who came can see them.
          They&rsquo;re kept in private storage and never at a public link. You can take yours down any time after they develop.
        </li>
        <li>
          <strong>Guests:</strong> if you join without an account, we keep your name and a signed cookie on your browser so Dibby knows it&rsquo;s you
          next time. The cookie lasts a year.
        </li>
        <li>
          <strong>Your calendar link,</strong> if you have an account and turn it on. It&rsquo;s a private address your calendar app checks for
          plans you&rsquo;re going to once they have a time. Anyone with the link can see those plans, so keep it to yourself. You can reset it on{" "}
          <a href="/account">You</a> any time and the old link stops working.
        </li>
        <li>
          <strong>Reports and blocks.</strong> If you report something, we keep the report, a copy of what it said and who sent it, so we can act on it. If you block someone,
          we keep that so we can hide them from you. The person you report or block isn&rsquo;t told it was you.
        </li>
        <li>
          <strong>Usage counts:</strong> we log moments like &ldquo;a plan was made&rdquo;, &ldquo;a vote was cast&rdquo; or &ldquo;a bill was
          settled&rdquo;, with IDs only (no names, messages, places or amounts), to see whether Dibby is working. When someone opens a plan link
          they&rsquo;re not on yet, we count it with a random ID kept in that browser, which isn&rsquo;t tied to a name or account.
        </li>
      </ul>

      <h2>Money</h2>
      <p>
        Dibby never holds or moves money. Settling up happens in your own banking app with the PayID details. Balances are private: you see your
        own share, the person who paid sees their bill, and everyone else sees how many have settled.
      </p>

      <h2>The AI in your chat</h2>
      <p>
        Dibby has an AI member in every plan&rsquo;s chat. It only works when someone tags @dibby or types in &ldquo;Ask Dibby&rdquo;. Then what they typed, the plan&rsquo;s
        details, the names of the people on it and the last 20 messages in that plan&rsquo;s chat go to our AI provider, Anthropic, so it can reply. Your email and PayID never do. Anthropic
        handles this on our behalf and doesn&rsquo;t train its models on it. The app asks for your OK the first time. It doesn&rsquo;t remember anything between plans and never mentions money or anything
        personal.
      </p>

      <h2>The app and the browser</h2>
      <p>
        The Dibby app for iPhone and Android uses the same account and keeps the same data as the website. It doesn&rsquo;t collect anything
        extra about you.
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
        <li>Apple and Google: if you use the Dibby app, you get it from their app stores, under their own privacy policies.</li>
      </ul>
      <p>
        Some of these companies store or process data outside Australia, mostly in the United States. We only share what each one needs to do
        its job.
      </p>
      <p>
        We don&rsquo;t sell your data or use it for ads. If places ever pay to show up as a suggestion, they&rsquo;ll be marked Sponsored, and we
        won&rsquo;t use your data to aim them at you.
      </p>

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
          <strong>Accounts:</strong> go to <a href="/account">You</a> and tap &ldquo;Delete my account&rdquo;. Your sign-in, email, PayID, calendar link and any date of
          birth you gave in the early beta are deleted. On plans you were part of, you show as &ldquo;Former member&rdquo;, so everyone else&rsquo;s bills still add up.
          Messages you sent in a plan&rsquo;s chat stay there for the group, under that name.
        </li>
      </ul>

      <h2>Under 16s</h2>
      <p>
        Dibby is for people 16 and up. If you think someone younger has joined, email{" "}
        <a href="mailto:hello@dibby.social">hello@dibby.social</a> and we&rsquo;ll delete their details.
      </p>

      <h2>Your rights</h2>
      <p>
        We follow the Australian Privacy Principles. You can ask what we hold about you, ask us to correct it, or complain, by emailing{" "}
        <a href="mailto:hello@dibby.social">hello@dibby.social</a>. If you&rsquo;re not happy with our answer, you can go to the Office of the
        Australian Information Commissioner (OAIC).
      </p>
    </LegalPage>
  );
}
