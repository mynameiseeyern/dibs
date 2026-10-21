#!/usr/bin/env python3
"""Draft Dibs screens as static HTML using the real design-system CSS, one file per screen."""
import os

NM = "/home/claude/dibs/apps/web/node_modules"
UI = "/home/claude/dibs/packages/ui/src"
APP = "/home/claude/dibs/apps/web/app/globals.css"
OUT = os.path.dirname(os.path.abspath(__file__))

def fontface(fam, pkg, w):
    return f'@font-face{{font-family:"{fam}";src:url("file://{NM}/@fontsource/{pkg}/files/{pkg}-latin-{w}-normal.woff2") format("woff2");font-weight:{w}}}'

FONTS = "".join(
    [fontface("Bricolage Grotesque", "bricolage-grotesque", w) for w in (700, 800)]
    + [fontface("Figtree", "figtree", w) for w in (400, 500, 600, 700, 800)]
    + [fontface("DM Mono", "dm-mono", w) for w in (400, 500)]
)
app_css = open(APP).read().split("\n", 2)[2]  # drop the two @import lines

EXTRA = """
.mock-note{position:fixed;top:0;left:0;right:0;height:0}
.thread{display:flex;flex-direction:column;gap:10px}
.dibby-card{background:var(--bg-white-0);border:1.5px solid var(--accent-light);border-radius:16px;padding:12px;margin-top:8px;display:flex;flex-direction:column;gap:8px}
.dibby-card .opt{display:flex;gap:10px;align-items:center;font:600 15px/20px var(--font-sans)}
.dibby-card .opt small{display:block;font:400 13px/18px var(--font-sans);color:var(--text-sub-600)}
.dibby-card .opt i{color:var(--primary-base);font-size:18px}
.composer{display:flex!important;flex-direction:row!important;gap:8px;align-items:center;width:100%}
.composer .db-input{flex:1 1 auto}
.dock{position:static!important;margin-top:8px}
body .page{padding-bottom:16px}
.composer .db-input{flex:1}
.typing{display:inline-flex;gap:4px;padding:12px 14px;border-radius:24px;border-bottom-left-radius:6px;background:var(--accent-lighter);border:1.5px solid var(--accent-light)}
.typing span{width:7px;height:7px;border-radius:50%;background:var(--primary-base);opacity:.5}
.typing span:nth-child(2){opacity:.75}.typing span:nth-child(3){opacity:1}
.wheel{position:relative;width:260px;height:260px;margin:8px auto 0}
.wheel svg{width:100%;height:100%}
.pointer{position:absolute;top:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:14px solid transparent;border-right:14px solid transparent;border-top:24px solid var(--bg-strong-950)}
.moment{display:flex;flex-direction:column;align-items:center;text-align:center;gap:12px;padding:24px 8px}
.big-amount{font:500 44px/48px var(--font-mono);letter-spacing:-0.02em}
.payid{display:flex;flex-direction:column;gap:0}
.payid-row{display:flex;align-items:center;gap:12px;min-height:60px;border-top:1px solid var(--stroke-soft-200)}
.payid-row:first-child{border-top:0}
.payid-row .k{font:400 13px/18px var(--font-sans);color:var(--text-sub-600)}
.payid-row .v{font:600 16px/22px var(--font-sans)}
.payid-row .v.mono{font:500 16px/22px var(--font-mono)}
.payid-row > div{flex:1;min-width:0}
.stars{display:flex;gap:6px;font-size:34px;color:var(--accent-dark)}
.stars i.off{color:var(--bg-sub-300)}
.mvp{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.mvp button{all:unset;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:16px;border:1.5px solid var(--stroke-soft-200);font:600 13px/16px var(--font-sans);text-align:center}
.mvp button[aria-pressed=true]{border-color:var(--primary-base);background:var(--primary-lighter)}
.tick{display:flex;align-items:center;gap:12px;min-height:60px;border-top:1px solid var(--stroke-soft-200)}
.tick:first-child{border-top:0}
.tick .person__name{flex:1}
.tick input{appearance:none;width:26px;height:26px;border-radius:8px;border:1.5px solid var(--stroke-sub-300);display:grid;place-content:center;margin:0}
.tick input:checked{background:var(--primary-base);border-color:var(--primary-base)}
.tick input:checked::after{content:"";width:12px;height:7px;border:solid #fff;border-width:0 0 2.5px 2.5px;transform:translateY(-2px) rotate(-45deg)}
.money-total{display:flex;align-items:baseline;gap:4px;font:500 40px/44px var(--font-mono)}
.money-total span{font-size:24px;color:var(--text-sub-600)}
.db-segmented button{white-space:nowrap}
.og{width:1200px;height:630px;background:#6D4AFF;color:#fff;padding:64px 72px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;font-family:var(--font-sans)}
"""

def page(name, body, dock="", title="dibs", width=None):
    html = f"""<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<link rel="stylesheet" href="file://{UI}/tokens.css"><link rel="stylesheet" href="file://{UI}/components.css">
<link rel="stylesheet" href="file://{NM}/remixicon/fonts/remixicon.css">
<style>{FONTS}{app_css}{EXTRA}</style></head><body>
{body}
{f'<div class="dock"><div class="dock__inner">{dock}</div></div>' if dock else ''}
</body></html>"""
    open(os.path.join(OUT, f"{name}.html"), "w").write(html)

LOGO = '<svg width="32" height="32" viewBox="0 0 200 200" aria-hidden="true"><rect width="200" height="200" rx="48" fill="#6D4AFF"/><g transform="translate(30 30)"><circle cx="32" cy="88" r="22" fill="#fff" fill-opacity=".55"/><circle cx="108" cy="88" r="22" fill="#fff" fill-opacity=".55"/><circle cx="70" cy="52" r="26" fill="#C8F03C"/><rect x="62" y="84" width="16" height="36" rx="8" fill="#C8F03C"/></g></svg>'
DIBBY = '<svg width="32" height="32" viewBox="0 0 140 140" aria-hidden="true"><circle cx="70" cy="70" r="70" fill="#C8F03C"/><circle cx="70" cy="66" r="40" fill="#6D4AFF"/><circle cx="56" cy="60" r="7" fill="#fff"/><circle cx="84" cy="60" r="7" fill="#fff"/><path d="M53 78Q70 90 87 78" stroke="#fff" stroke-width="7" stroke-linecap="round" fill="none"/></svg>'

def topbar(badge=None, back=None):
    left = f'<a class="db-btn db-btn--secondary db-btn--icon" aria-label="Back"><i class="ri-arrow-left-line db-icon"></i></a>' if back else f'<a class="wordmark">{LOGO}dibs</a>'
    b = f'<span class="db-badge db-badge--primary">{badge}</span>' if badge else ''
    return f'<header class="topbar">{left}{b}</header>'

def av(initials, colour, size="sm"):
    s = f" db-avatar--{size}" if size else ""
    return f'<span class="db-avatar{s} db-avatar--{colour}">{initials}</span>'

CREW = [("EN","Ee Ng","violet"),("SL","Sam Lee","lime"),("JT","Jess Tran","sun"),("TP","Tom Park","mint"),("MW","Mia Wong","tangerine"),("AK","Alex Kim","violet")]

def stack(n=5, more=0):
    s = "".join(av(i,c) for i,_,c in CREW[:n])
    if more: s += f'<span class="db-avatar db-avatar--sm db-avatar--more">+{more}</span>'
    return f'<span class="db-avatar-group">{s}</span>'

def plan_card(eyebrow, title, facts, foot_right, sticker=True):
    fl = "".join(f'<li><i class="{ic} db-icon"></i> {t}</li>' for ic,t in facts)
    return f'''<article class="db-card db-plan{' db-card--sticker' if sticker else ''}"><span class="db-plan__eyebrow">{eyebrow}</span>
<h1 class="db-plan__title plan-title">{title}</h1><ul class="db-plan__facts">{fl}</ul>
<div class="db-plan__foot">{stack()}{foot_right}</div></article>'''

def msg(initials, colour, name, text, mine=False):
    if mine:
        return f'<div class="db-msg db-msg--mine"><div class="db-msg__bubble">{text}</div></div>'
    return f'<div class="db-msg">{av(initials,colour)}<div><div class="db-msg__name">{name}</div><div class="db-msg__bubble">{text}</div></div></div>'

def dibby(text, extra=""):
    return f'<div class="db-msg db-msg--ai"><span class="db-avatar db-avatar--sm">{DIBBY}</span><div><div class="db-msg__name">Dibby <span class="db-badge db-badge--faded" style="height:18px;padding:0 6px;font-size:11px">AI</span></div><div class="db-msg__bubble">{text}{extra}</div></div></div>'

def vote(title, meta, count, pct, mine=False, win=False):
    return f'''<button class="db-vote{' db-vote--winning' if win else ''}" aria-pressed="{str(mine).lower()}"><span class="db-vote__title">{title}</span>
<span class="db-vote__meta">{meta}</span><span class="db-vote__count">{count}</span><span class="db-vote__bar"><span style="width:{pct}%"></span></span></button>'''

FRI = ("ri-calendar-line", "Fri 23 Oct · 7:00 pm")
AREA = ("ri-map-pin-line", "Surry Hills")

# 1. Organiser: plan just made, thread with @dibby drafting options
page("01-dibby-drafts-plan", f'''<main class="page">{topbar("You're hosting")}
<section class="section"><h2 class="eyebrow">Plan thread</h2><div class="db-card thread db-chat">
<div class="db-msg__time">Today 6:12pm</div>
{msg("","", "", "@dibby dinner friday in surry hills, cheap-ish, 6 of us", mine=True)}
{dibby("On it. Three spots near Crown St, all under $35 a head:", '''<div class="dibby-card">
<div class="opt"><i class="ri-map-pin-2-fill"></i><div>Chat Thai Surry Hills<small>Thai · $$ · 4.5★ · walk-ins till 8</small></div></div>
<div class="opt"><i class="ri-map-pin-2-fill"></i><div>Bang Bang Burgers<small>Burgers · $ · 4.4★</small></div></div>
<div class="opt"><i class="ri-map-pin-2-fill"></i><div>Kepos St Dumplings<small>Dumplings · $ · 4.6★</small></div></div>
<button class="db-btn db-btn--primary db-btn--block">Lock it in and open the vote</button>
<button class="db-btn db-btn--ghost db-btn--sm">Change something</button></div>''')}
</div></section>
<div class="composer"><div class="db-input"><input placeholder="Message the plan, or @dibby"></div><button class="db-btn db-btn--primary db-btn--icon" aria-label="Send"><i class="ri-send-plane-2-fill db-icon"></i></button></div>
</main>''')

# 2. Organiser plan page with share dock
page("02-organiser-share", f'''<main class="page">{topbar("You're hosting")}
{plan_card("Plan · voting open", "Friday dinner", [FRI, AREA, ("ri-time-line","Vote closes Thu 7pm")], '<span class="db-badge db-badge--accent">1 in</span>')}
<div class="db-alert db-alert--information"><i class="ri-whatsapp-line db-icon"></i><div><strong>Drop it in the group chat</strong>Your crew doesn't need the app. They'll vote and RSVP from the link.</div></div>
<section class="section"><h2 class="eyebrow">What's the move?</h2>
{vote("Chat Thai Surry Hills","Thai · $$","0",0)}{vote("Bang Bang Burgers","Burgers · $","0",0)}{vote("Kepos St Dumplings","Dumplings · $","0",0)}
<button class="db-btn db-btn--ghost db-btn--sm"><i class="ri-add-line db-icon"></i>Add an option</button></section>
</main>''', dock='<button class="db-btn db-btn--dibs db-btn--lg db-btn--block"><i class="ri-whatsapp-line db-icon"></i>Share to the group chat</button>')

# 3. WhatsApp preview card (1200x630)
open(os.path.join(OUT, "03-whatsapp-card.html"), "w").write(f'''<!doctype html><html><head><meta charset="utf-8">
<link rel="stylesheet" href="file://{UI}/tokens.css"><style>{FONTS}body{{margin:0}}
.og{{width:1200px;height:630px;background:#6D4AFF;color:#fff;padding:64px 72px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:space-between;font-family:Figtree}}
.og h1{{font:800 96px/1 "Bricolage Grotesque";letter-spacing:-0.03em;margin:0}}
.og .facts{{font:500 38px/1.3 Figtree;opacity:.92;margin-top:20px}}
.og .row{{display:flex;align-items:center;justify-content:space-between}}
.og .avs{{display:flex}} .og .avs span{{width:76px;height:76px;border-radius:50%;display:grid;place-content:center;font:700 30px Figtree;color:#141216;box-shadow:0 0 0 5px #6D4AFF;margin-left:-14px}}
.og .avs span:first-child{{margin-left:0}}
.og .count{{background:#C8F03C;color:#141216;font:800 40px/1 Figtree;padding:18px 30px;border-radius:999px;border:3px solid #141216;box-shadow:0 6px 0 #141216}}
.og .brand{{display:flex;align-items:center;gap:14px;font:800 44px/1 "Bricolage Grotesque";letter-spacing:-0.04em}}
</style></head><body><div class="og">
<div class="brand"><svg width="56" height="56" viewBox="0 0 200 200"><rect width="200" height="200" rx="48" fill="#fff" fill-opacity=".14"/><g transform="translate(30 30)"><circle cx="32" cy="88" r="22" fill="#fff" fill-opacity=".55"/><circle cx="108" cy="88" r="22" fill="#fff" fill-opacity=".55"/><circle cx="70" cy="52" r="26" fill="#C8F03C"/><rect x="62" y="84" width="16" height="36" rx="8" fill="#C8F03C"/></g></svg>dibs</div>
<div><h1>Friday dinner</h1><div class="facts">Fri 23 Oct · 7pm · Chat Thai, Surry Hills</div></div>
<div class="row"><div class="avs"><span style="background:#DCD3FF">EN</span><span style="background:#C8F03C">SL</span><span style="background:#FFE7A8">JT</span><span style="background:#BDF2D5">TP</span><span style="background:#FFD3BA">MW</span></div><div class="count">6 in</div></div>
</div></body></html>''')

# 4. Guest voting
page("04-guest-votes", f'''<main class="page">{topbar("You're on this plan")}
{plan_card("Plan · voting open", "Friday dinner", [FRI, AREA, ("ri-time-line","Vote closes Thu 7pm")], '<span class="db-badge db-badge--accent">5 in</span>')}
<section class="section"><div class="section__head"><h2 class="eyebrow">What's the move?</h2><span class="small muted">4 of 6 voted</span></div>
{vote("Chat Thai Surry Hills","3 votes · you voted","3",60,mine=True,win=True)}
{vote("Kepos St Dumplings","1 vote","1",20)}
{vote("Bang Bang Burgers","0 votes","0",0)}
<button class="db-btn db-btn--ghost db-btn--sm"><i class="ri-add-line db-icon"></i>Add an option</button></section>
<section class="section"><h2 class="eyebrow">Plan thread</h2><div class="db-card thread db-chat">
{msg("JT","sun","Jess Tran","chat thai or riot")}
{msg("TP","mint","Tom Park","can we do 7:30, finishing work late")}
{dibby("Tom can only make 7:30. Want me to move it? Hosts can tap yes.")}
</div></section></main>''')

# 5. Plan locked in moment
page("05-plan-locked", f'''<main class="page">{topbar("You're on this plan")}
<section class="moment"><span class="db-badge db-badge--accent"><i class="ri-lock-2-fill db-icon"></i>Locked in</span>
<h1 class="hero-title">Chat Thai it is.</h1><p class="muted">3 votes to 1. See you Friday at 7:30.</p></section>
{plan_card("Plan · locked in", "Friday dinner", [("ri-calendar-line","Fri 23 Oct · 7:30 pm"), ("ri-map-pin-line","Chat Thai, 20 Campbell St, Surry Hills"), ("ri-group-line","6 coming, 1 maybe")], '<span class="db-badge db-badge--accent">6 in</span>')}
<div class="db-row"><button class="db-btn db-btn--secondary"><i class="ri-calendar-event-line db-icon"></i>Add to calendar</button><button class="db-btn db-btn--secondary"><i class="ri-map-2-line db-icon"></i>Directions</button></div>
</main>''')

# 6. Wrap-up: who came
ticks = "".join(f'<label class="tick">{av(i,c,None)}<span class="person__name">{n}<small>{"Organiser · " if k==0 else ""}Said they were in</small></span><input type="checkbox" {"checked" if k!=4 else ""}></label>' for k,(i,n,c) in enumerate(CREW))
page("06-wrap-up", f'''<main class="page">{topbar(back=True)}
<div class="section"><span class="eyebrow">Friday dinner · wrap-up</span><h1 class="title-h3">Who actually came?</h1>
<p class="muted">Only people you tick can be added to bills or see your PayID.</p></div>
<div class="db-card"><div class="people">{ticks}</div></div>
<p class="small muted">Mia said she was in but you've unticked her. She won't be on any bills.</p>
</main>''', dock='<button class="db-btn db-btn--primary db-btn--lg db-btn--block">5 came · on to bills</button>')

# 7. Add a bill
rows = "".join(f'<div class="db-split__row">{av(i,c)}<span class="db-split__who">{n}{"<small>Paid</small>" if k==1 else ""}</span><span class="db-split__owe">${a}</span></div>' for k,((i,n,c),a) in enumerate(zip([CREW[0],CREW[1],CREW[2],CREW[3],CREW[5]],["37.20","37.20","37.20","37.20","37.20"])))
page("07-add-bill", f'''<main class="page">{topbar(back=True)}
<div class="section"><span class="eyebrow">Friday dinner</span><h1 class="title-h3">Add a bill</h1></div>
<div class="db-field"><label class="db-label">What for</label><div class="db-input"><input value="Dinner at Chat Thai"></div></div>
<div class="db-field"><label class="db-label">Total</label><div class="db-input"><span class="muted" style="font:500 18px var(--font-mono)">$</span><input value="186.00" style="font:500 18px/26px var(--font-mono)"></div></div>
<div class="db-field"><span class="db-label">Split</span><div class="db-segmented"><button aria-pressed="true">Even</button><button>Amounts</button><button>Not all</button><button>Spin</button></div></div>
<section class="db-card db-split"><div class="db-split__total"><div><div class="db-plan__eyebrow">Sam paid</div><div class="db-split__amount">$186.00</div></div><span class="db-badge db-badge--primary">5 people</span></div>{rows}</section>
<p class="small muted">Sam's PayID shows only to these 5.</p>
</main>''', dock='<button class="db-btn db-btn--primary db-btn--lg db-btn--block">Save bill</button>')

# 8. Roulette opt-in
def wheel(names, colours, rot=0):
    import math
    n=len(names); segs=""; labels=""
    for k in range(n):
        a0=2*math.pi*k/n-math.pi/2; a1=2*math.pi*(k+1)/n-math.pi/2
        x0,y0=130+125*math.cos(a0),130+125*math.sin(a0); x1,y1=130+125*math.cos(a1),130+125*math.sin(a1)
        segs+=f'<path d="M130 130 L{x0:.1f} {y0:.1f} A125 125 0 0 1 {x1:.1f} {y1:.1f} Z" fill="{colours[k]}" stroke="#141216" stroke-width="2"/>'
        am=(a0+a1)/2; lx,ly=130+80*math.cos(am),130+80*math.sin(am)
        labels+=f'<text x="{lx:.1f}" y="{ly:.1f}" text-anchor="middle" dominant-baseline="middle" transform="rotate({-rot} {lx:.1f} {ly:.1f})" font-family="Figtree" font-weight="800" font-size="18" fill="#141216">{names[k]}</text>'
    return f'<div class="wheel"><div class="pointer"></div><svg viewBox="0 0 260 260" style="transform:rotate({rot}deg)">{segs}{labels}<circle cx="130" cy="130" r="22" fill="#141216"/><circle cx="130" cy="130" r="8" fill="#C8F03C"/></svg></div>'
WC=["#C8F03C","#DCD3FF","#FFE7A8","#BDF2D5"]
entr="".join(f'<li class="person">{av(i,c,None)}<span class="person__name">{n}<small>{s}</small></span>{b}</li>' for (i,n,c),s,b in [
 (CREW[1],"In",'<span class="db-badge db-badge--accent">In</span>'),(CREW[2],"In",'<span class="db-badge db-badge--accent">In</span>'),
 (CREW[3],"In",'<span class="db-badge db-badge--accent">In</span>'),(CREW[0],"You",'<span class="db-badge db-badge--accent">In</span>'),(CREW[5],"Sitting this one out",'<span class="db-badge db-badge--faded">Out</span>')])
page("08-roulette-opt-in", f'''<main class="page">{topbar(back=True)}
<div class="section"><span class="eyebrow">Card roulette · Dinner at Chat Thai</span><h1 class="title-h3">Loser pays the lot</h1>
<p class="muted">$186.00. Only people who tap in are on the wheel.</p></div>
{wheel(["Sam","Jess","Tom","Ee"],WC,-45)}
<div class="db-card"><ul class="people">{entr}</ul></div>
</main>''', dock='<button class="db-btn db-btn--dibs db-btn--lg db-btn--block"><i class="ri-refresh-line db-icon"></i>Spin it</button>')

# 9. Roulette result
page("09-roulette-result", f'''<main class="page">{topbar(back=True)}
<section class="moment"><span class="eyebrow">Card roulette</span>{wheel(["Sam","Jess","Tom","Ee"],WC,135)}
<h1 class="hero-title">Tom's shout.</h1><p class="muted">Tom covers the $186.00. Everyone else is square on this one.</p></section>
<div class="db-card db-card--ink"><div class="db-label" style="color:inherit">Tom pays Sam back</div><div style="font:400 14px/22px var(--font-sans)">Sam's PayID is on Tom's screen. Nobody else owes anything for dinner.</div></div>
</main>''', dock='<button class="db-btn db-btn--secondary db-btn--lg db-btn--block">Back to bills</button>')

# 10. Guest settle up
page("10-guest-settle-up", f'''<main class="page">{topbar("You're on this plan")}
<div class="section"><span class="eyebrow">Friday dinner · square up</span><h1 class="title-h3">You owe Sam</h1></div>
<section class="moment" style="padding:8px"><div class="big-amount">$37.20</div><p class="muted">Dinner at Chat Thai, split 5 ways</p></section>
<div class="db-card payid">
<div class="payid-row"><div><div class="k">Pay to</div><div class="v">Sam Lee</div></div><button class="db-btn db-btn--secondary db-btn--sm"><i class="ri-file-copy-line db-icon"></i>Copy</button></div>
<div class="payid-row"><div><div class="k">PayID</div><div class="v mono">0412 345 678</div></div><button class="db-btn db-btn--secondary db-btn--sm"><i class="ri-file-copy-line db-icon"></i>Copy</button></div>
<div class="payid-row"><div><div class="k">Amount</div><div class="v mono">37.20</div></div><button class="db-btn db-btn--secondary db-btn--sm"><i class="ri-file-copy-line db-icon"></i>Copy</button></div>
<div class="payid-row"><div><div class="k">Reference</div><div class="v">Dibs · Fri dinner</div></div><button class="db-btn db-btn--secondary db-btn--sm"><i class="ri-file-copy-line db-icon"></i>Copy</button></div>
</div>
<p class="small muted">Pay from your banking app. dibs never touches the money.</p>
<div class="db-stack"><div class="db-hint">4 of 6 settled</div><div class="db-progress db-progress--accent"><span style="width:67%"></span></div></div>
</main>''', dock='<button class="db-btn db-btn--primary db-btn--lg db-btn--block"><i class="ri-check-line db-icon"></i>I\'ve paid Sam</button>')

# 11. Payer confirms
prow=[(CREW[2],"Says paid · 2 min ago",'<button class="db-btn db-btn--primary db-btn--sm">Confirm</button>'),
      (CREW[0],"Paid",'<span class="db-badge db-badge--success"><i class="ri-check-line db-icon"></i>Square</span>'),
      (CREW[3],"Paid",'<span class="db-badge db-badge--success"><i class="ri-check-line db-icon"></i>Square</span>'),
      (CREW[5],"Owes",'<span class="db-split__owe">$37.20</span>')]
pr="".join(f'<div class="db-split__row">{av(i,c)}<span class="db-split__who">{n}<small>{s}</small></span>{b}</div>' for (i,n,c),s,b in prow)
page("11-payer-confirms", f'''<main class="page">{topbar("Your bill")}
<div class="db-alert db-alert--information" role="status"><i class="ri-notification-3-fill db-icon"></i><div><strong>Jess says she's paid</strong>Check your bank, then confirm so she's square.</div></div>
<section class="db-card db-split"><div class="db-split__total"><div><div class="db-plan__eyebrow">You paid · Dinner at Chat Thai</div><div class="db-split__amount">$186.00</div></div><span class="db-badge db-badge--success db-badge--dot">2 of 4 square</span></div>{pr}</section>
<p class="small muted">Only you can see who owes what. Everyone else just sees how many are square.</p>
</main>''')

# 12. All settled + recap
mvp="".join(f'<button aria-pressed="{str(k==2).lower()}">{av(i,c,None)}{n.split()[0]}</button>' for k,(i,n,c) in enumerate([CREW[1],CREW[2],CREW[3],CREW[5]]))
page("12-all-settled-recap", f'''<main class="page">{topbar("You're on this plan")}
<section class="moment"><span class="db-badge db-badge--success"><i class="ri-checkbox-circle-fill db-icon"></i>All squared up</span>
<h1 class="hero-title">Money square.</h1><p class="muted">Everyone's paid back for Friday. Nice work, crew.</p></section>
<section class="db-card section"><h2 class="title-h4">How was it?</h2>
<div class="stars"><i class="ri-star-fill"></i><i class="ri-star-fill"></i><i class="ri-star-fill"></i><i class="ri-star-fill"></i><i class="ri-star-fill off"></i></div>
<div class="db-field"><label class="db-label">Best moment</label><div class="db-input"><input value="Tom losing roulette on his birthday week"></div></div>
<div class="db-field"><span class="db-label">MVP</span><div class="mvp">{mvp}</div></div>
<button class="db-btn db-btn--secondary db-btn--block"><i class="ri-image-add-line db-icon"></i>Add photos (3 of 10)</button>
</section></main>''', dock='<button class="db-btn db-btn--primary db-btn--lg db-btn--block">Save to the diary</button>')

# 13. Cancelled
page("13-called-off", f'''<main class="page">{topbar()}
<div class="db-alert db-alert--warning" role="status"><i class="ri-close-circle-fill db-icon"></i><div><strong>Called off</strong>Ee called this one off. No bills were added, so nobody owes anything.</div></div>
{plan_card("Plan · called off", "Friday dinner", [FRI, AREA], '<span class="db-badge db-badge--faded">Off</span>', sticker=False)}
<section class="empty" style="padding:24px"><p class="muted">Keen for another go? Ask the crew in the chat.</p></section>
</main>''')

print("ok")
