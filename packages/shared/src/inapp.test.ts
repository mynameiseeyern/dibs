import { describe, expect, it } from "vitest";
import { inAppBrowser, openInBrowserHref } from "./inapp";

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36";

describe("inAppBrowser", () => {
  it("spots Messenger on iPhone and Android, ahead of Facebook", () => {
    expect(inAppBrowser(`${IOS} [FBAN/MessengerForiOS;FBAV/480.0;FBBV/1;FBDV/iPhone15,2]`)).toEqual({ app: "Messenger", os: "ios" });
    expect(inAppBrowser(`${ANDROID} [FB_IAB/Orca-Android;FBAV/480.0;]`)).toEqual({ app: "Messenger", os: "android" });
  });
  it("spots Facebook, Instagram and TikTok", () => {
    expect(inAppBrowser(`${IOS} [FBAN/FBIOS;FBAV/490.0;]`)?.app).toBe("Facebook");
    expect(inAppBrowser(`${ANDROID} [FB_IAB/FB4A;FBAV/490.0;]`)?.app).toBe("Facebook");
    expect(inAppBrowser(`${IOS} Instagram 360.0.0 (iPhone15,2; iOS 18_1)`)?.app).toBe("Instagram");
    expect(inAppBrowser(`${ANDROID} musical_ly_2023 BytedanceWebview`)?.app).toBe("TikTok");
  });
  it("leaves real browsers alone", () => {
    expect(inAppBrowser(`${IOS} Version/18.1 Safari/604.1`)).toBeNull();
    expect(inAppBrowser(ANDROID)).toBeNull();
    expect(inAppBrowser(null)).toBeNull();
  });
});

describe("openInBrowserHref", () => {
  const url = "https://dibby.social/p/abc123?x=1";
  it("uses an intent on Android with the page as the fallback", () => {
    expect(openInBrowserHref(url, "android")).toBe(`intent://dibby.social/p/abc123?x=1#Intent;scheme=https;S.browser_fallback_url=${encodeURIComponent(url)};end`);
  });
  it("uses Safari's scheme on iPhone", () => {
    expect(openInBrowserHref(url, "ios")).toBe("x-safari-https://dibby.social/p/abc123?x=1");
  });
  it("has no shortcut elsewhere or for plain http", () => {
    expect(openInBrowserHref(url, "other")).toBeNull();
    expect(openInBrowserHref("http://localhost:3000/p/a", "ios")).toBeNull();
  });
});
