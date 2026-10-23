import type { Metadata, Viewport } from "next";
// Fonts are bundled (no Google request at build or run time).
import "@fontsource/bricolage-grotesque/latin-700.css";
import "@fontsource/bricolage-grotesque/latin-800.css";
import "@fontsource/figtree/latin-400.css";
import "@fontsource/figtree/latin-500.css";
import "@fontsource/figtree/latin-600.css";
import "@fontsource/figtree/latin-700.css";
import "@fontsource/figtree/latin-800.css";
import "@fontsource/dm-mono/latin-400.css";
import "@fontsource/dm-mono/latin-500.css";
import "remixicon/fonts/remixicon.css";
import "./globals.css";
import { siteUrl } from "@/lib/site";
import { SITE_DESCRIPTION, SITE_NAME, TAGLINE } from "@/lib/og";
import { FinishSignIn } from "@/components/FinishSignIn";
import { Toaster } from "@/components/ui/toast";
import { OfflineBanner } from "@/components/OfflineBanner";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  applicationName: SITE_NAME,
  title: { default: `${SITE_NAME}: ${TAGLINE.toLowerCase()}`, template: "%s · dibs" },
  description: SITE_DESCRIPTION,
  // Plans and personal pages stay out of search. The landing page opts back in.
  robots: { index: false, follow: false },
  openGraph: { title: `${SITE_NAME}: ${TAGLINE.toLowerCase()}`, description: SITE_DESCRIPTION, siteName: SITE_NAME, type: "website", locale: "en_AU", url: "/" },
  twitter: { card: "summary_large_image", title: `${SITE_NAME}: ${TAGLINE.toLowerCase()}`, description: SITE_DESCRIPTION },
  appleWebApp: { title: SITE_NAME, capable: true, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141216" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        <OfflineBanner />
        {children}
        <FinishSignIn />
        <Toaster />
      </body>
    </html>
  );
}
