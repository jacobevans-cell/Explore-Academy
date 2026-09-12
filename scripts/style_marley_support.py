from pathlib import Path

js = Path('athletics-portal/teams/shared/team-page.js')
s = js.read_text()
old = 'const eventNote=dayEvents.length?`<div class="practice-week-event">📅 ${esc(weeklyEventText(dayEvents))}</div>`:\'\';'
new = 'const isMarleySupport=dayEvents.some(({event})=>/support marley yee/i.test(String(event.title||\'\')));const eventNote=dayEvents.length?`<div class="practice-week-event${isMarleySupport?\' marley-support-event\':\'\'}">${isMarleySupport?\'📣 💙\':\'📅\'} ${esc(weeklyEventText(dayEvents))}${isMarleySupport?\'<div class="marley-support-tag">G4 TEAMMATE SUPPORT NIGHT</div><div class="marley-support-message">🏐 Show up. Cheer loud. Support Marley.</div>\':\'\'}</div>`:\'\';'
if old not in s:
    raise SystemExit('eventNote marker not found')
s = s.replace(old, new, 1)
js.write_text(s)

cssp = Path('athletics-portal/teams/shared/practice-week.css')
css = cssp.read_text()
marker = '/* MARLEY SUPPORT EVENT */'
block = '''
/* MARLEY SUPPORT EVENT */
.practice-week-event.marley-support-event{position:relative;margin-top:12px;padding:14px 14px 13px;border-radius:16px;background:linear-gradient(135deg,#071d39 0%,#0a315f 42%,#8d1026 100%);border:3px solid #d7e0e8;color:#fff;box-shadow:0 10px 22px rgba(7,29,57,.22),inset 0 0 0 2px rgba(255,255,255,.08);font-size:12px;font-weight:950;line-height:1.45;overflow:hidden}.practice-week-event.marley-support-event:before{content:'';position:absolute;left:0;right:0;top:0;height:5px;background:linear-gradient(90deg,#ffffff,#c9d4df,#c21432,#ffffff)}.marley-support-tag{display:inline-flex;margin-top:9px;padding:5px 8px;border-radius:999px;background:#fff;color:#0a315f;border:2px solid #c21432;font-size:9px;letter-spacing:.08em;font-weight:950}.marley-support-message{margin-top:8px;color:#fff;font-size:11px;font-weight:900}.practice-card:has(.marley-support-event){border-top-color:#c21432;background:linear-gradient(180deg,#f8fbff,#fff 70%);box-shadow:0 12px 28px rgba(7,29,57,.12)}
'''
if marker not in css:
    css += '\n' + block
cssp.write_text(css)
