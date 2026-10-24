// ARV-13: walks the real app in demo mode (pnpm dev with no Supabase env) as a host and a guest,
// and screenshots each screen at iPhone 13 width in light and dark.
// Usage: from design/screens, npm i --no-save playwright@1.56.1, then BASE=http://localhost:3000 node capture.js app
// Drives the demo app and screenshots each screen at phone size, light and dark.
const { chromium } = require('playwright');
const OUT = process.argv[2] || 'flow';
const BASE = process.env.BASE || 'http://localhost:3000';
const fs = require('fs'); fs.mkdirSync(OUT, { recursive: true });
let n = 0;
async function snap(p, name) {
  await p.addStyleTag({ content: 'nextjs-portal{display:none!important}' }).catch(() => {});
  for (const scheme of ['light', 'dark']) {
    await p.emulateMedia({ colorScheme: scheme });
    await p.waitForTimeout(400);
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const f = `${OUT}/${String(++n).padStart(2, '0')}-${name}-${scheme}.png`;
    await p.screenshot({ path: f, fullPage: true });
    console.log(f, ov ? `OVERFLOW ${ov}px` : '');
  }
}
async function ctx(b) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await c.newPage(); p.setDefaultTimeout(20000); return p;
}
(async () => {
  const b = await chromium.launch();
  const p = await ctx(b);
  await p.goto(BASE + '/', { waitUntil: 'networkidle' }); await snap(p, 'landing');
  await p.goto(BASE + '/login?next=/new', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
  await p.getByRole('button', { name: 'Continue' }).click();
  await p.waitForURL((u) => !u.pathname.startsWith('/login'));
  await p.waitForTimeout(2500);
  if (new URL(p.url()).pathname.startsWith('/onboarding')) {
    for (const [k, v] of [['first_name', 'Ee'], ['last_name', 'Ng'], ['dob', '1995-01-01'], ['payid', '0400 000 000']]) await p.fill(`input[name=${k}]`, v);
    await p.getByRole('button', { name: "Let's go" }).click();
    await p.waitForURL((u) => !u.pathname.startsWith('/onboarding'));
  }
  await p.goto(BASE + '/new', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
  await p.fill('input[name=title]', 'Friday dumplings');
  await snap(p, 'new-plan');
  const fri = p.locator('[aria-label^="Friday"]'); if (await fri.count()) await fri.first().click(); else await p.getByRole('button', { name: /^Fri/ }).first().click();
  await p.getByRole('button', { name: 'Dinner' }).click();
  await p.getByRole('tab', { name: 'Feeling democratic?' }).click();
  await p.waitForTimeout(800); if (await p.locator('#ask').count()) { await p.locator('.db-card [role=switch]').first().click(); await p.waitForTimeout(600); } await p.locator('input[name=area]').fill('Haymarket');
  await snap(p, 'new-plan-vote');
  await p.getByRole('button', { name: 'Make the plan' }).click();
  await p.waitForURL((u) => u.pathname.startsWith('/p/'), { timeout: 60000 });
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(3000);
  await snap(p, 'plan-host-voting');
  const planUrl = p.url();
  for (let i = 0; i < 3; i++) {
    await p.getByRole('button', { name: 'Add a place' }).click();
    await p.fill('#place-q', 'dumplings');
    await p.waitForTimeout(1800);
    await p.locator('.place-row:not([disabled])').nth(0).click();
    if (i === 0) await snap(p, 'place-picker');
    await p.locator('[role=dialog] button', { hasText: ': ' }).last().click();
    await p.waitForTimeout(2000);
  }
  await p.goto(planUrl, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await snap(p, 'plan-host-options');
  // Host votes.
  await p.getByRole('button', { name: /^Vote/ }).first().click(); await p.waitForTimeout(1500);
  // Share sheet
  // Edit plan settings
  await p.goto(planUrl + '/manage', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await snap(p, 'plan-settings');
  // Guest joins on another phone.
  const g = await ctx(b);
  await g.goto(planUrl, { waitUntil: 'networkidle' }); await g.waitForTimeout(2000);
  await snap(g, 'guest-landing');
  await g.fill('#first_name', 'Sam'); await g.fill('#last_name', 'Lee');
  await g.getByRole('button', { name: 'Join the plan' }).click();
  await g.waitForTimeout(3000); await g.waitForLoadState('networkidle');
  const rsvp = g.locator('[aria-label="Are you in?"] button').first(); if (await rsvp.count()) { await rsvp.click(); await g.waitForTimeout(1500); }
  const v = g.getByRole('button', { name: /^Vote/ }); if (await v.count()) { await v.nth(1).click(); await g.waitForTimeout(1500); }
  await snap(g, 'guest-voted');
  await g.goto(planUrl + '/chat', { waitUntil: 'networkidle' }); await g.waitForTimeout(1500);
  const box = g.locator('textarea, input[name=body]').first(); if (await box.count()) { await box.fill('Din Tai Fung or riot'); await box.press('Enter'); await g.waitForTimeout(1500); }
  await snap(g, 'chat');
  // Host locks it in.
  await p.goto(planUrl, { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await p.getByRole('button', { name: /Lock it in now/ }).click(); await p.waitForTimeout(1200);
  const confirm = p.locator('[role=dialog] button', { hasText: /Lock/ }); if (await confirm.count()) await confirm.last().click();
  await p.waitForTimeout(3000);
  await snap(p, 'plan-locked');
  // Co-hosts: open who's going and the organiser's menu on Sam.
  await p.getByText("Who's going", { exact: true }).first().click(); await p.waitForTimeout(800);
  const menu = p.getByRole('button', { name: /^Options for Sam/ });
  if (await menu.count()) { await menu.first().click(); await p.waitForTimeout(1000); await snap(p, 'co-host-menu'); await p.keyboard.press('Escape'); }
  await p.goto(BASE + '/home', { waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
  await snap(p, 'your-plans');
  await p.goto(BASE + '/ui', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500);
  await snap(p, 'states-gallery');
  await b.close();
})().catch((e) => { console.error(e.message.split('\n')[0]); process.exit(1); });
