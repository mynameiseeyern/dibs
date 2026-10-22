import json, os
OUT = os.path.join(os.path.dirname(__file__), '..', 'tokens.json')

def hex2rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
def lum(h):
    def c(v): return v / 12.92 if v <= 0.03928 else ((v + .055) / 1.055) ** 2.4
    r, g, b = map(c, hex2rgb(h)); return .2126 * r + .7152 * g + .0722 * b
def cr(a, b):
    la, lb = sorted([lum(a), lum(b)], reverse=True); return (la + .05) / (lb + .05)
def blend(fg_hex, alpha, bg_hex):
    f, b = hex2rgb(fg_hex), hex2rgb(bg_hex)
    return '#' + ''.join('%02x' % round((f[i] * alpha + b[i] * (1 - alpha)) * 255) for i in range(3))
def rgba(h, a):
    r, g, b = (round(x * 255) for x in hex2rgb(h)); return f'rgba({r}, {g}, {b}, {a})'

T = []
def tok(name, light, dark, usage):
    T.append({"name": name, "value": {"light": light, "dark": dark}, "usage": usage})

# ---- Neutrals (from the Dibs V3 logo board: ink #141216, sub #57525C, muted #6B6570) ----
tok('bg-white-0', '#ffffff', '#1d1a22', 'Cards, inputs, sheets. In Dark this is a step lighter than the page, so cards still read as raised.')
tok('bg-weak-50', '#f7f6f9', '#141216', 'Page background, grouped-list background, chat thread background. The darkest surface in Dark.')
tok('bg-soft-200', '#eeecf2', '#2a2631', 'Secondary button fill, switch and progress tracks, other people\'s chat bubbles, skeletons.')
tok('bg-sub-300', '#dcd8e3', '#3d3846', 'Pressed neutral fills; heavy dividers.')
tok('bg-surface-800', '#2a2630', '#e8e5ec', 'Tooltips and toasts.')
tok('bg-strong-950', '#141216', '#ffffff', 'Inverse surface: the ink lockup card, neutral solid buttons.')
tok('text-strong-950', '#141216', '#ffffff', 'Headings and body copy on bg-white-0, bg-weak-50, bg-soft-200.')
tok('text-sub-600', '#57525c', '#c2bdc8', 'Secondary copy, taglines, helper text on bg-white-0, bg-weak-50, bg-soft-200.')
tok('text-soft-400', '#6b6570', '#9a94a0', 'Meta, timestamps, placeholders on bg-white-0 and bg-weak-50.')
tok('text-disabled-300', '#bdb8c3', '#5a5560', 'Disabled labels only, deliberately low contrast; never for content.')
tok('text-white-0', '#ffffff', '#141216', 'Text on bg-strong-950 and bg-surface-800.')
tok('stroke-strong-950', '#141216', '#ffffff', 'Chunky outlines on sticker cards; selected vote option border.')
tok('stroke-sub-300', '#8f8997', '#6e6876', 'Input, checkbox and radio borders (3:1 on bg-white-0).')
tok('stroke-soft-200', '#e8e5ec', '#2c2832', 'Hairline dividers and card borders.')
tok('stroke-white-0', '#ffffff', '#141216', 'Ring around stacked avatars.')
tok('static-black', '#141216', '#141216', 'Ink that never flips: text and icons on accent-base (lime) and away-base.')
tok('static-white', '#ffffff', '#ffffff', 'White that never flips: text on primary-base, switch thumbs, the friends in the logo.')
# The crew: ten fixed pastels matching the clay figures. Never flip; ink text on top.
for n, v in [('violet', '#DCD3FF'), ('lime', '#C8F03C'), ('sun', '#FFE7A8'), ('mint', '#BDF2D5'), ('tangerine', '#FFD1BD'), ('sky', '#C9E0FF'), ('coral', '#FFC4CF'), ('rose', '#FFD0E6'), ('aqua', '#BFF0F5'), ('ivory', '#F3EEE4')]:
    tok(f'crew-{n}', v, v, f'The {n} crew member: roulette wedges, share-card faces, anything that must match the clay art in both themes. Ink text on top.')
tok('overlay', 'rgba(20, 18, 22, 0.40)', 'rgba(0, 0, 0, 0.64)', 'Scrim behind bottom sheets and modals.')

# ---- Primary: Dibs violet ----
tok('primary-base', '#6d4aff', '#6d4aff', 'THE brand colour (the V3 app-icon tile). Primary buttons, active tabs, own chat bubbles, progress. Text on it is static-white.')
tok('primary-dark', '#4a2fd6', '#b3a3ff', 'Violet text and links on bg-white-0 / bg-weak-50 / primary-lighter.')
tok('primary-darker', '#3420a3', '#d3c9ff', 'Pressed links; hover of primary buttons.')
tok('primary-light', '#ddd4ff', rgba('#6d4aff', .40), 'Selected-row fill, violet badge border.')
tok('primary-lighter', '#f1edff', rgba('#6d4aff', .22), 'Soft violet fill: lighter badges, selected vote option, highlighted cards.')

# ---- Accent: Dibs lime (the friend with a hand up) ----
tok('accent-base', '#c8f03c', '#c8f03c', 'The “calling dibs” lime. One moment per screen: the winning vote, “I\'m in”, squared up. Text on it is static-black, never white.')
tok('accent-dark', '#4a5e00', '#d9f77a', 'Lime-family text on accent-lighter and bg-white-0.')
tok('accent-light', '#e4f8a0', rgba('#c8f03c', .34), 'Lime border on soft fills.')
tok('accent-lighter', '#f5fcd9', rgba('#c8f03c', .16), 'Soft lime fill behind accent-dark text.')
# ---- Semantic families (Align UI naming kept: dark / base / light / lighter) ----
FAM = [
  ('information', '#2f80ed', '#14549e', '#c9e0ff', '#eef5ff', '#4a93f5', '#a6ccff', 'Blueberry', 'Neutral info: tips, links in alerts, “what did I miss?” recaps.'),
  ('warning',     '#ff9f1c', '#8a4b00', '#ffdcaa', '#fff4e3', '#ffaa33', '#ffcf8a', 'Apricot',   'Needs attention soon: vote closing, booking cap nearly full.'),
  ('error',       '#f04d61', '#a3112f', '#ffc4cf', '#ffeef1', '#ff5a75', '#ffa6b6', 'Cherry',    'Failed payment, can’t make it, invalid input, destructive actions.'),
  ('success',     '#1fbf6a', '#0b6b3c', '#b5f0cf', '#e8fbf0', '#2fd67c', '#8debb6', 'Mint',      'Paid, squared up, plan locked.'),
  ('away',        '#ffd23f', '#7a5c00', '#fff0b3', '#fffae3', '#ffd84f', '#ffe68f', 'Sunshine',  'Maybe, pending RSVP, waiting on someone.'),
  ('feature',     '#e0589b', '#a1155c', '#ffd0e6', '#fff0f7', '#f06aac', '#ffb3d8', 'Raspberry', 'New features and upgrades.'),
  ('verified',    '#1cc8d9', '#066b75', '#b6f1f6', '#e8fbfd', '#2fd3e3', '#94ecf4', 'Lagoon',    'Verified PayID, booked with a partner.'),
  ('highlighted', '#ff8a3d', '#a3420b', '#ffd9bf', '#fff3ea', '#ff9a55', '#ffc49c', 'Tangerine', 'Celebrations: card-roulette results, someone shouted.'),
  ('stable',      '#14b8a6', '#0b6b61', '#b3efe7', '#e6faf7', '#22c9b6', '#8de6dc', 'Seafoam',   'Steady state: recurring plan, online, active.'),
  ('faded',       '#8a8494', '#3f3a47', '#e3e0e8', '#f3f2f6', '#8a8494', '#d6d2dc', 'Pebble',    'Archived, draft, past plans.'),
]
for n, base, dk, lt, ltr, dbase, dtext, word, use in FAM:
    tok(f'{n}-base', base, dbase, f'{word}. Solid fill for status dots, icons and filled badges; text on it is static-black. {use}')
    tok(f'{n}-dark', dk, dtext, f'{word} text and icons on {n}-lighter and bg-white-0.')
    tok(f'{n}-light', lt, rgba(dbase, .28), f'{word} border on soft alerts; stronger soft fill.')
    tok(f'{n}-lighter', ltr, rgba(dbase, .16), f'{word} soft fill behind {n}-dark text (alerts, lighter badges).')

tok('focus-ring', '#4a2fd6', '#b3a3ff', 'Solid 2px focus outline with a 2px offset on every interactive element (≥3:1 on all surfaces).')

# ---- contrast audit ----
def v(name, th):
    for t in T:
        if t['name'] == name:
            x = t['value'][th]; return x
grounds = {'light': '#ffffff', 'dark': '#141216'}
def solid(name, th, over):
    x = v(name, th)
    if x.startswith('rgba'):
        p = x[5:-1].split(','); r, g, b = (int(q) for q in p[:3]); a = float(p[3])
        return blend('#%02x%02x%02x' % (r, g, b), a, over)
    return x
checks = [('text-strong-950', 'bg-weak-50', 4.5), ('text-strong-950', 'bg-soft-200', 4.5), ('text-sub-600', 'bg-weak-50', 4.5),
          ('text-sub-600', 'bg-soft-200', 4.5), ('text-soft-400', 'bg-white-0', 4.5), ('text-soft-400', 'bg-weak-50', 4.5),
          ('text-white-0', 'bg-strong-950', 4.5), ('text-white-0', 'bg-surface-800', 4.5), ('primary-dark', 'bg-white-0', 4.5),
          ('primary-dark', 'bg-weak-50', 4.5), ('static-white', 'primary-base', 4.5), ('static-black', 'accent-base', 4.5), ('accent-dark', 'accent-lighter', 4.5), ('accent-dark','bg-white-0',4.5), ('primary-dark','primary-lighter',4.5), ('stroke-sub-300','bg-white-0',3), ('primary-dark', 'primary-lighter', 4.5),
          ('stroke-sub-300', 'bg-white-0', 1.6), ('focus-ring', 'bg-white-0', 3), ('focus-ring', 'bg-weak-50', 3), ('focus-ring', 'bg-soft-200', 3)]
for n, *_ in FAM:
    checks += [(f'{n}-dark', f'{n}-lighter', 4.5), (f'{n}-dark', 'bg-white-0', 4.5)]
fails = []
for th in ('light', 'dark'):
    for fg, bg, need in checks:
        b = solid(bg, th, grounds[th]); f = solid(fg, th, b)
        r = cr(f, b)
        if r < need: fails.append((th, fg, bg, round(r, 2), need))
    # white on solid fills
for th in ('light','dark'):
    for n in ('primary',):
        r = cr('#ffffff', v(f'{n}-base', th)); print(th, 'white on', n, round(r, 2))
    for n in ('error','information','accent','away','success','warning','verified','stable','highlighted','feature'):
        r = cr('#141216', v(f'{n}-base', th)); print(th, 'ink on', n, round(r, 2))
print('FAILS', fails)

tokens = {
  "name": "Dibs", "version": 1,
  "meta": {"source": "code", "note": "Structure (semantic bg/text/stroke ladder, status families, type-scale names, control sizes) derived from the Align UI-based finance, HR, marketing and AI templates; values come from the Dibs V3 logo (violet #6D4AFF, lime #C8F03C, ink #141216) and the Friends App product plan.", "synced": "2026-10-21"},
  "color": {"themes": [{"id": "light", "name": "Light"}, {"id": "dark", "name": "Dark"}], "tokens": T},
  "type": {
    "fonts": [
      {"family": "DM Mono", "file": "fonts/DMMono-Regular.ttf", "weight": "400", "style": "normal"},
      {"family": "DM Mono", "file": "fonts/DMMono-Medium.ttf", "weight": "500", "style": "normal"}],
    "families": {"display": "\"Bricolage Grotesque\", Figtree, system-ui, sans-serif", "sans": "Figtree, \"DM Sans\", system-ui, -apple-system, \"Segoe UI\", sans-serif",
                 "mono": "\"DM Mono\", ui-monospace, \"SF Mono\", Menlo, monospace"},
    "groups": [
      {"name": "Title", "family": "display", "styles": [
        {"name": "title-display", "fontSize": "56px", "lineHeight": "60px", "fontWeight": 800, "letterSpacing": "-0.025em", "sample": "suggest it, square up", "usage": "Marketing heroes on screens ≥ 768px. On phones use title-h2."},
        {"name": "title-h1", "fontSize": "44px", "lineHeight": "48px", "fontWeight": 800, "letterSpacing": "-0.02em", "sample": "Friday dinner?", "usage": "Page hero on tablet/desktop. On phones step down to title-h3. Always sentence case or lowercase, never Title Case."},
        {"name": "title-h2", "fontSize": "36px", "lineHeight": "42px", "fontWeight": 800, "letterSpacing": "-0.015em", "sample": "Who’s in?", "usage": "Section heroes; the largest title on phones."},
        {"name": "title-h3", "fontSize": "30px", "lineHeight": "36px", "fontWeight": 700, "letterSpacing": "-0.01em", "sample": "Thai’s winning", "usage": "Page title on phones."},
        {"name": "title-h4", "fontSize": "24px", "lineHeight": "30px", "fontWeight": 700, "letterSpacing": "-0.01em", "sample": "Up next", "usage": "Card and sheet titles."},
        {"name": "title-h5", "fontSize": "20px", "lineHeight": "26px", "fontWeight": 700, "letterSpacing": "-0.005em", "sample": "Who’s coming", "usage": "Section headers inside cards, modal titles on phones."},
        {"name": "title-h6", "fontSize": "18px", "lineHeight": "24px", "fontWeight": 700, "letterSpacing": "0em", "sample": "Your groups", "usage": "List group headers."}]},
      {"name": "Label", "family": "sans", "styles": [
        {"name": "label-lg", "fontSize": "18px", "lineHeight": "24px", "fontWeight": 600, "letterSpacing": "-0.01em", "sample": "Lock it in", "usage": "Large buttons, prominent row titles."},
        {"name": "label-md", "fontSize": "16px", "lineHeight": "22px", "fontWeight": 600, "letterSpacing": "-0.005em", "sample": "I’m in", "usage": "Default buttons, form labels, list row titles. The workhorse."},
        {"name": "label-sm", "fontSize": "14px", "lineHeight": "20px", "fontWeight": 600, "letterSpacing": "0em", "sample": "See all", "usage": "Small buttons, tabs, tags."},
        {"name": "label-xs", "fontSize": "12px", "lineHeight": "16px", "fontWeight": 600, "letterSpacing": "0.005em", "sample": "New", "usage": "Badges and counters only."}]},
      {"name": "Paragraph", "family": "sans", "styles": [
        {"name": "paragraph-lg", "fontSize": "18px", "lineHeight": "28px", "fontWeight": 400, "letterSpacing": "-0.005em", "sample": "Share a link in the group chat. Nobody has to install anything to vote.", "usage": "Intro paragraphs and empty-state copy."},
        {"name": "paragraph-md", "fontSize": "16px", "lineHeight": "26px", "fontWeight": 400, "letterSpacing": "0em", "sample": "Dinner’s sorted. You owe Sam $42, tap to pay.", "usage": "Default body copy. Never set reading text smaller than this on phones."},
        {"name": "paragraph-sm", "fontSize": "14px", "lineHeight": "22px", "fontWeight": 400, "letterSpacing": "0em", "sample": "Voting closes Friday 6pm", "usage": "Hints, helper text, secondary row text."},
        {"name": "paragraph-xs", "fontSize": "12px", "lineHeight": "18px", "fontWeight": 400, "letterSpacing": "0.01em", "sample": "18+ only. No cut, no stakes.", "usage": "Legal and captions only."}]},
      {"name": "Subheading", "family": "sans", "styles": [
        {"name": "subheading-sm", "fontSize": "13px", "lineHeight": "16px", "fontWeight": 700, "letterSpacing": "0.08em", "sample": "THIS WEEKEND", "usage": "Uppercase eyebrow above a group of rows. Write it in capitals."},
        {"name": "subheading-xs", "fontSize": "11px", "lineHeight": "14px", "fontWeight": 700, "letterSpacing": "0.08em", "sample": "BETA", "usage": "Uppercase micro-labels inside badges."}]},
      {"name": "Numbers", "family": "mono", "styles": [
        {"name": "number-lg", "fontSize": "32px", "lineHeight": "36px", "fontWeight": 500, "letterSpacing": "-0.02em", "sample": "$248.60", "usage": "Balances and hero stats."},
        {"name": "number-md", "fontSize": "16px", "lineHeight": "22px", "fontWeight": 500, "letterSpacing": "0em", "sample": "$42.00", "usage": "Amounts in rows and tables; aligns digits."},
        {"name": "code", "fontSize": "14px", "lineHeight": "20px", "fontWeight": 400, "letterSpacing": "0em", "sample": "DIBS-7F3K", "usage": "IDs, codes, keyboard keys."}]}]},
  "spacing": {"tokens": [
    {"name": "space-1", "value": "4px", "usage": "Icon-to-label gap in badges."},
    {"name": "space-2", "value": "8px", "usage": "Gap between an icon and its label; tight stacks."},
    {"name": "space-3", "value": "12px", "usage": "Gap between form fields' label and control; list row vertical padding."},
    {"name": "space-4", "value": "16px", "usage": "Phone page gutter; card padding on phones; default stack gap."},
    {"name": "space-5", "value": "20px", "usage": "Card padding on tablet and up."},
    {"name": "space-6", "value": "24px", "usage": "Gap between cards; desktop gutter."},
    {"name": "space-8", "value": "32px", "usage": "Between page sections on phones."},
    {"name": "space-12", "value": "48px", "usage": "Between page sections on desktop."},
    {"name": "space-16", "value": "64px", "usage": "Hero padding."}]},
  "radius": {"tokens": [
    {"name": "radius-xs", "value": "6px", "usage": "Checkboxes, kbd keys."},
    {"name": "radius-sm", "value": "10px", "usage": "Tags, small buttons, tooltips; the 40px app icon."},
    {"name": "radius-md", "value": "16px", "usage": "Inputs, default buttons, segmented controls, vote options; the 64px app icon."},
    {"name": "radius-lg", "value": "24px", "usage": "Cards, plan cards, alerts, chat bubbles, the ink lockup card."},
    {"name": "radius-xl", "value": "32px", "usage": "Bottom sheets and modals (top corners on phones)."},
    {"name": "radius-icon", "value": "24%", "usage": "App-icon tile at any size (48 on 200, from the V3 logo)."},
    {"name": "radius-full", "value": "999px", "usage": "Pill buttons, badges, avatars, switches."}]},
  "size": {"note": "Control heights. Everything tappable is at least size-tap.", "tokens": [
    {"name": "size-tap", "value": "44px", "usage": "Minimum touch target for anything tappable (WCAG 2.5.5 / Apple HIG)."},
    {"name": "size-control-lg", "value": "52px", "usage": "Large buttons: the one main action at the bottom of a phone screen."},
    {"name": "size-control-md", "value": "44px", "usage": "Default buttons and inputs."},
    {"name": "size-control-sm", "value": "36px", "usage": "Compact buttons inside cards on desktop; pad the hit area to size-tap on touch."}]},
  "motion": {"note": "Animate only to show cause and effect or to reward a moment. Nothing loops in the background. Under prefers-reduced-motion, 3D moments become a still and a fade.", "tokens": [
    {"name": "motion-fast", "value": "150ms", "usage": "Hover, press, toggles."},
    {"name": "motion-base", "value": "250ms", "usage": "Most transitions: cards appearing, values changing, tabs."},
    {"name": "motion-expressive", "value": "500ms", "usage": "Signature pops and reveals."},
    {"name": "ease-standard", "value": "cubic-bezier(0.2, 0, 0, 1)", "usage": "Default easing."},
    {"name": "ease-spring", "value": "cubic-bezier(0.34, 1.56, 0.64, 1)", "usage": "Pop-ups: a figure springing up, like calling dibs. Overshoots a touch."},
    {"name": "ease-exit", "value": "cubic-bezier(0.4, 0, 1, 1)", "usage": "Things leaving: delete, cancel, dismiss."}]},
  "shadow": {"tokens": [
    {"name": "shadow-xs", "value": {"light": "0 1px 2px 0 rgba(20, 18, 22, 0.06)", "dark": "0 1px 2px 0 rgba(0, 0, 0, 0.4)"}, "usage": "Inputs and resting buttons."},
    {"name": "shadow-sm", "value": {"light": "0 4px 12px -2px rgba(20, 18, 22, 0.10)", "dark": "0 4px 12px -2px rgba(0, 0, 0, 0.5)"}, "usage": "Cards that float over the cream page."},
    {"name": "shadow-md", "value": {"light": "0 16px 32px -12px rgba(20, 18, 22, 0.20)", "dark": "0 16px 32px -12px rgba(0, 0, 0, 0.6)"}, "usage": "Popovers, dropdowns, tooltips, sheets."},
    {"name": "shadow-pop", "value": {"light": "0 4px 0 0 #141216", "dark": "0 4px 0 0 #000000"}, "usage": "Sticker shadow for the one lime or violet hero action on a screen and sticker cards with a stroke-strong-950 border. Collapses to 0 on press."}]}
}
json.dump(tokens, open(OUT, 'w'), indent=1, ensure_ascii=False)
print('tokens', len(T))
