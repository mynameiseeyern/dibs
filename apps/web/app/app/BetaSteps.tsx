import QRCode from "qrcode";
import * as Button from "@/components/ui/button";
import { inApp, TESTFLIGHT_APP, type Device } from "@/lib/beta";

/**
 * Getting the beta (TestFlight, Play testing), for /app while the beta's open. Phones get the steps
 * for their phone; a computer gets a QR code for this same page. With `next` (a crew invite or plan
 * they were opening), the last step takes them back to it in the app.
 */
export async function BetaSteps({ ios, android, device, next, pageUrl }: { ios: string | null; android: string | null; device: Device; next: string | null; pageUrl: string }) {
  if (device === "desktop") {
    const svg = await QRCode.toString(pageUrl, { type: "svg", margin: 1, errorCorrectionLevel: "M" });
    return (
      <div className="beta-qr">
        <div className="beta-qr__code" role="img" aria-label="QR code for this page" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="paragraph-md muted">
          Scan it with your phone&rsquo;s camera to get the beta{ios && android ? " on iPhone or Android" : ios ? " on iPhone" : " on Android"}.
        </p>
      </div>
    );
  }

  const open = next ? (
    <li>
      <strong>{next.startsWith("/c/") ? "Open your invite" : "Open your plan"}</strong>
      <span className="muted">Once it&rsquo;s in, tap this to pick up where you left off.</span>
      <Button.Root asChild variant="primary" mode="stroke" size="medium">
        <a href={inApp(next)}>{next.startsWith("/c/") ? "Open your invite" : "Open your plan"}</a>
      </Button.Root>
    </li>
  ) : null;
  const signIn = (
    <li>
      <strong>Sign in with your email</strong>
      <span className="muted">The same one as here, so your plans are waiting.</span>
    </li>
  );

  if (device === "ios" && ios)
    return (
      <ol className="beta-steps">
        <li>
          <strong>Get TestFlight</strong>
          <span className="muted">Apple&rsquo;s free app for trying betas.</span>
          <Button.Root asChild variant="neutral" mode="lighter" size="medium">
            <a href={TESTFLIGHT_APP}>
              <i className="ri-apple-fill db-icon" aria-hidden="true" />
              Get TestFlight
            </a>
          </Button.Root>
        </li>
        <li>
          <strong>Join the beta</strong>
          <span className="muted">Opens TestFlight. Tap Accept, then Install.</span>
          <Button.Root asChild variant="dibs" size="medium">
            <a href={ios}>Join the Dibby beta</a>
          </Button.Root>
        </li>
        {signIn}
        {open}
      </ol>
    );

  if (device === "android" && android)
    return (
      <ol className="beta-steps">
        <li>
          <strong>Join the test</strong>
          <span className="muted">Opens Google Play. Tap Become a tester, then download it.</span>
          <Button.Root asChild variant="dibs" size="medium">
            <a href={android}>
              <i className="ri-google-play-fill db-icon" aria-hidden="true" />
              Join the Dibby test
            </a>
          </Button.Root>
        </li>
        {signIn}
        {open}
      </ol>
    );

  // A phone the beta isn't on yet.
  return null;
}
