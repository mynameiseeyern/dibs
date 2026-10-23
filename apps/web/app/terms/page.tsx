import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms", robots: { index: true, follow: true } };

export default function Terms() {
  return (
    <LegalPage title="Terms" updated="24 October 2026">
      <p>The short version: dibs is a free beta for planning things with your mates. Be decent, and know what it does and doesn&rsquo;t do.</p>

      <h2>Who can use it</h2>
      <p>
        You need to be 18 or over to organise a plan. Anyone with a plan link can join it as a guest. You&rsquo;re responsible for who you share
        your plan links with: anyone with the link can see the plan&rsquo;s name, time and place name.
      </p>

      <h2>It&rsquo;s a beta</h2>
      <p>
        Things will change, and sometimes break. We&rsquo;ll do our best to keep your plans safe, but don&rsquo;t rely on dibs as the only record
        of anything important.
      </p>

      <h2>Money</h2>
      <p>
        dibs never holds, moves or guarantees money. It works out who owes what and shows PayID details so you can pay each other from your own
        bank. Whether and how people pay is between you and them. Card roulette is a bit of fun between friends; nobody has to opt in.
      </p>

      <h2>Dibby and places</h2>
      <p>
        Dibby is an AI. It can get things wrong, so check a place&rsquo;s details before you go. Place details come from Google Maps and may be
        out of date. dibs isn&rsquo;t responsible for venues, bookings or what happens on the night.
      </p>

      <h2>Be decent</h2>
      <ul>
        <li>Don&rsquo;t use dibs to harass anyone, or to share anything illegal, hateful or that isn&rsquo;t yours to share.</li>
        <li>Don&rsquo;t try to break, overload or get around how dibs works.</li>
        <li>Hosts can take places off a vote and remove plans. We can remove content or accounts that break these terms.</li>
      </ul>

      <h2>Your stuff</h2>
      <p>
        What you post stays yours. You let dibs store it and show it to the people on your plan so the app works. See{" "}
        <a href="/privacy">Privacy</a> for what we keep and how to delete it.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or problems: <a href="mailto:hello@dibby.social">hello@dibby.social</a>.
      </p>
    </LegalPage>
  );
}
