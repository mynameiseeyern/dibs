import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms", robots: { index: true, follow: true } };

export default function Terms() {
  return (
    <LegalPage title="Terms" updated="5 November 2026">
      <p>The short version: Dibby is a free beta for planning things with your mates. Be decent, and know what it does and doesn&rsquo;t do.</p>

      <h2>Who can use it</h2>
      <p>
        You need to be 16 or older to use Dibby. Anyone 16+ with a plan link can join it as a guest. You&rsquo;re responsible for who you share
        your plan links with: anyone with the link can see the plan&rsquo;s name, time and place name.
      </p>
      <p>
        Organisers and co-hosts run their plans: they can edit them, close spots, take places off a vote and call plans off. If
        you use the Dibby app, Apple&rsquo;s or Google&rsquo;s app store terms apply too.
      </p>

      <h2>It&rsquo;s a beta</h2>
      <p>
        Things will change, and sometimes break. We&rsquo;ll do our best to keep your plans safe, but don&rsquo;t rely on Dibby as the only record
        of anything important.
      </p>

      <h2>Money</h2>
      <p>
        Dibby never holds, moves or guarantees money. It works out who owes what and shows PayID details so you can pay each other from your own
        bank. Whether and how people pay is between you and them. Spinning the wheel is a bit of fun between friends; nobody has to opt in.
      </p>

      <h2>The AI and places</h2>
      <p>
        The AI in your chat can get things wrong, so check a place&rsquo;s details before you go. Place details come from Google Maps and may be
        out of date. Dibby isn&rsquo;t responsible for venues, bookings or what happens on the day.
      </p>

      <h2>Be decent</h2>
      <ul>
        <li>Don&rsquo;t use Dibby to harass anyone, or to share anything illegal, hateful or that isn&rsquo;t yours to share.</li>
        <li>Don&rsquo;t try to break, overload or get around how Dibby works.</li>
        <li>Hosts can take places off a vote and remove plans. We can remove content or accounts that break these terms.</li>
      </ul>

      <h2>Our responsibility</h2>
      <p>
        Dibby is free and provided as it is. To the extent the law allows, we aren&rsquo;t liable for losses from using it, like a missed plan, a
        venue that&rsquo;s closed or a mate who doesn&rsquo;t pay you back. Nothing here takes away your rights under the Australian Consumer
        Law.
      </p>

      <h2>Your stuff</h2>
      <p>
        What you post stays yours. You let Dibby store it and show it to the people on your plan so the app works. See{" "}
        <a href="/privacy">Privacy</a> for what we keep and how to delete it.
      </p>

      <h2>Leaving, and changes to these terms</h2>
      <p>
        You can stop using Dibby or delete your account from <a href="/account">You</a> any time. If we change these terms in a big way,
        we&rsquo;ll say so in the app or by email first. These terms are governed by the laws of New South Wales, Australia.
      </p>

      <h2>Contact</h2>
      <p>
        Dibby is run by Ee Yern Ng, a sole trader in Sydney (ABN 97 837 335 531). Questions or problems:{" "}
        <a href="mailto:hello@dibby.social">hello@dibby.social</a>.
      </p>
    </LegalPage>
  );
}
