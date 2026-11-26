/*
 * The "it's all free" story, told the same way on /about and /app: what's free (everything),
 * the honest answer to "so what's the catch?", and what the browser and the app each do.
 * Server components, no state. Keep the copy here so the two pages never disagree.
 */

const FREE = [
  "Making plans",
  "Joining with a link",
  "Voting and RSVPs",
  "Ask Dibby",
  "Chat",
  "Splitting bills",
  "PayID settle-up",
  "Spin the wheel",
  "The Dibby camera",
  "Recaps",
];

export function AllFree() {
  return (
    <section className="section landing__free" aria-labelledby="free-h">
      <span className="landing__badge label-sm">
        <i className="ri-price-tag-3-line db-icon" aria-hidden="true" /> $0, for everyone
      </span>
      <h2 id="free-h" className="title-h4">
        Free. All of it.
      </h2>
      <p className="paragraph-md muted">
        No premium plan, no free trial, no card details. Every feature is free for you and your whole crew, in your browser and in the app.
      </p>
      <ul className="landing__perks">
        {FREE.map((f) => (
          <li key={f} className="paragraph-sm">
            <i className="ri-check-line db-icon" aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>
    </section>
  );
}

const BROWSER = [
  "Make a plan, no account needed",
  "Your mates join from the link",
  "Vote, RSVP and ask Dibby for spots",
  "Chat once you add your email",
  "Split the bill and square up",
  "Plans in your calendar, with an account",
];

const APP = [
  "Everything in the browser, plus:",
  "Notifications instead of emails",
  "Every plan you’ve been on, in one spot",
  "Saved crews: re-invite the same group in a tap",
  "Scan the receipt to split it",
  "See when everyone’s free from their calendars",
];

export function BrowserOrApp({ appLink = true, appStatus = "Coming to iPhone and Android" }: { appLink?: boolean; appStatus?: string }) {
  return (
    <section className="section" aria-labelledby="where-h">
      <h2 id="where-h" className="title-h4">
        Browser or app? Both free.
      </h2>
      <p className="paragraph-md muted">Your mates never need the app. The link works in any browser. The app&rsquo;s for whoever ends up organising every week.</p>
      <div className="landing__compare">
        <div className="db-card landing__side">
          <h3 className="label-lg">
            <i className="ri-global-line db-icon" aria-hidden="true" /> In your browser
          </h3>
          <span className="paragraph-xs muted">Works now</span>
          <ul>
            {BROWSER.map((b) => (
              <li key={b} className="paragraph-sm">
                {b}
              </li>
            ))}
          </ul>
        </div>
        <div className="db-card landing__side" data-app>
          <h3 className="label-lg">
            <i className="ri-smartphone-line db-icon" aria-hidden="true" /> In the app
          </h3>
          <span className="paragraph-xs muted">{appStatus}</span>
          <ul>
            {APP.map((b, i) => (
              <li key={b} className={`paragraph-sm${i === 0 ? " landing__plus" : ""}`}>
                {b}
              </li>
            ))}
          </ul>
          {appLink && (
            <a className="label-sm" href="/app">
              Hear when it&rsquo;s out <i className="ri-arrow-right-line db-icon" aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export function TheCatch() {
  return (
    <section className="section" aria-labelledby="catch-h">
      <h2 id="catch-h" className="title-h4">
        So what&rsquo;s the catch?
      </h2>
      <dl className="landing__faq">
        <div className="db-card">
          <dt className="label-lg">How is it free?</dt>
          <dd className="paragraph-sm muted">
            It doesn&rsquo;t cost much to run yet, so we cover it. Down the track, places like bars, restaurants and activities might pay to show up as a
            suggestion. Those will always say Sponsored, they never get extra votes, and we never use your data to aim them at you.
          </dd>
        </div>
        <div className="db-card">
          <dt className="label-lg">Will it stay free?</dt>
          <dd className="paragraph-sm muted">Yep. Everything you can do now stays free. Your mates will never pay to join a plan or to pay someone back.</dd>
        </div>
        <div className="db-card">
          <dt className="label-lg">What happens to my data?</dt>
          <dd className="paragraph-sm muted">
            It runs your plans and that&rsquo;s it. We don&rsquo;t sell it or use it for ads. The <a href="/privacy">privacy page</a> has the details.
          </dd>
        </div>
        <div className="db-card">
          <dt className="label-lg">Does it touch my money?</dt>
          <dd className="paragraph-sm muted">Never. It works out who owes what and shows the PayID. You pay each other in your own bank app.</dd>
        </div>
      </dl>
    </section>
  );
}
