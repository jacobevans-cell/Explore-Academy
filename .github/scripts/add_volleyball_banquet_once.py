from pathlib import Path
import re

DATA = Path('athletics-portal/teams/shared/team-data.js')
JS = Path('athletics-portal/teams/shared/team-page.js')
CSS = Path('athletics-portal/teams/shared/team-pages.css')
JV = Path('athletics-portal/teams/jv-girls-volleyball.html')
VARS = Path('athletics-portal/teams/varsity-girls-volleyball.html')

banquet_block = """    events: [
      {
        type: 'banquet',
        date: 'Nov 20',
        time: '5:00–7:30 PM',
        title: 'End-of-Season Volleyball Banquet',
        subtitle: 'JV + Varsity Girls Volleyball • Season Celebration',
        location: 'TBA',
        items: [
          { icon: '👗', title: 'Fancy Dress', detail: 'Dress up for the celebration' },
          { icon: '🍽️', title: 'Potluck Food', detail: 'Families bring food to share' },
          { icon: '📸', title: 'Media Day Pictures', detail: 'Player and team photos' }
        ]
      }
    ],
"""

data = DATA.read_text()
if "title: 'End-of-Season Volleyball Banquet'" not in data:
    jv_marker = """      { date: 'Sep 24', time: '5:45 PM', opponent: 'Sequoia Pathfinder Verrado', location: 'Away', drive: 'Live route', leave: 'TBA', arrival: '5:15 PM', detail: '✨ GLOW IN THE DARK GAME • Fun Game • Ends 7:45 PM • At Sequoia Pathfinder' }
    ],
    standingsSource:"""
    if jv_marker not in data:
        raise SystemExit('JV insertion marker not found')
    data = data.replace(jv_marker, jv_marker.replace("    standingsSource:", banquet_block + "    standingsSource:"), 1)

    var_marker = """      { date: 'Nov 9', time: '4:45 PM', opponent: 'CASA Academy', location: 'Away', drive: 'Live route', leave: 'TBA', arrival: '4:15 PM', detail: '⚠️ OUTDOOR • CONCRETE COURT' }
    ]
  },
  boysVolleyball:"""
    if var_marker not in data:
        raise SystemExit('Varsity insertion marker not found')
    data = data.replace(var_marker, var_marker.replace("    ]\n  },\n  boysVolleyball:", "    ]\n" + banquet_block + "  },\n  boysVolleyball:"), 1)
DATA.write_text(data)

js = JS.read_text()
if 'function teamEvents(team)' not in js:
    marker = '\n\nfunction dateKey(date)'
    if marker not in js:
        raise SystemExit('JS insertion marker not found')
    event_functions = r'''
function eventCard(event){
  const weekday=weekdayForGame(event);
  const features=(event.items||[]).map((item,index)=>`<div class="banquet-feature banquet-feature-${index+1}"><span class="banquet-feature-icon">${esc(item.icon||'✦')}</span><div><strong>${esc(item.title||'')}</strong>${item.detail?`<small>${esc(item.detail)}</small>`:''}</div></div>`).join('');
  const location=event.location&&String(event.location).toUpperCase()!=='TBA'?`<div class="banquet-location"><span>📍</span><div><small>LOCATION</small><strong>${esc(event.location)}</strong></div></div>`:`<div class="banquet-location banquet-location-tba"><span>📍</span><div><small>LOCATION</small><strong>Location TBA</strong><em>Venue will be announced</em></div></div>`;
  return `<article class="team-event-card banquet-card"><div class="banquet-kicker">✨ FORMAL SEASON CELEBRATION ✨</div><div class="banquet-title">🏆 END-OF-SEASON BANQUET</div><div class="banquet-subtitle">${esc(event.subtitle||'JV + Varsity Girls Volleyball')}</div><div class="banquet-date-row"><div class="banquet-date"><small>DATE</small><strong>${weekday?`${esc(weekday)}, `:''}${esc(event.date)}</strong></div><div class="banquet-time"><small>TIME</small><strong>${esc(event.time)}</strong></div></div><div class="banquet-features">${features}</div>${location}<div class="banquet-footer">❤️ Celebrate the season • 📸 Capture the memories • 🏐 One volleyball family</div></article>`;
}
function teamEvents(team){
  if(!team.events?.length)return'';
  return `<section class="section team-events" id="events"><div class="team-events-head"><div><div class="kicker">Special Team Event</div><h2>Season Celebration</h2></div><span class="team-events-badge">JV + VARS</span></div>${team.events.map(eventCard).join('')}</section>`;
}
'''
    js = js.replace(marker, '\n' + event_functions + marker, 1)

old_closed = '''  document.body.innerHTML=`${nav(team)}<main class="page"><div class="wrap"><section class="season-gate closed"><div class="season-gate-icon">🏁</div><div class="kicker">${esc(team.title)}</div><h1>Season Closed</h1><p>The 2026 ${esc(team.title)} season has ended.</p><div class="season-gate-dates">${seasonDetails(team)}</div><a class="season-gate-link" href="../../athletics.html">← Back to Eagles Athletics</a></section></div></main>`;'''
new_closed = '''  document.body.innerHTML=`${nav(team)}<main class="page"><div class="wrap"><section class="season-gate closed"><div class="season-gate-icon">🏁</div><div class="kicker">${esc(team.title)}</div><h1>Season Closed</h1><p>The 2026 ${esc(team.title)} season has ended.</p><div class="season-gate-dates">${seasonDetails(team)}</div></section>${teamEvents(team)}<a class="season-gate-link season-closed-back" href="../../athletics.html">← Back to Eagles Athletics</a></div></main>`;'''
if old_closed in js:
    js = js.replace(old_closed, new_closed, 1)
elif '${teamEvents(team)}<a class="season-gate-link season-closed-back"' not in js:
    raise SystemExit('Closed page marker not found')

old_actions = '<div class="actions"><a href="#practice">Practice Times</a><a href="#schedule">Game Schedule</a><a href="#roster">Meet the Team</a></div>'
new_actions = '<div class="actions"><a href="#practice">Practice Times</a><a href="#schedule">Game Schedule</a>${team.events?.length?\'<a href="#events">Banquet</a>\':\'\'}<a href="#roster">Meet the Team</a></div>'
if old_actions in js:
    js = js.replace(old_actions, new_actions, 1)
elif 'href="#events">Banquet</a>' not in js:
    raise SystemExit('Action link marker not found')

old_schedule = '<section class="section" id="schedule"><h2>2026 Match Schedule</h2>${games(team)}</section><section class="section" id="roster">'
new_schedule = '<section class="section" id="schedule"><h2>2026 Match Schedule</h2>${games(team)}</section>${teamEvents(team)}<section class="section" id="roster">'
if old_schedule in js:
    js = js.replace(old_schedule, new_schedule, 1)
elif '${teamEvents(team)}<section class="section" id="roster">' not in js:
    raise SystemExit('Schedule insertion marker not found')

js = re.sub(r"\./team-data\.js\?v=[^']+", './team-data.js?v=20260910-banquet1', js, count=1)
JS.write_text(js)

css = CSS.read_text()
if '/* End-of-season JV + Varsity banquet */' not in css:
    css += r'''

/* End-of-season JV + Varsity banquet */
.team-events{scroll-margin-top:78px}.team-events-head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:18px}.team-events-head h2{margin:0}.team-events-head .kicker{margin-bottom:5px}.team-events-badge{display:inline-flex;align-items:center;justify-content:center;padding:9px 14px;border-radius:999px;background:linear-gradient(180deg,#fff 0,#d9e0e7 45%,#fff 52%,#aeb9c6 100%);border:2px solid #9ba8b6;color:#0a2b54;font-size:11px;font-weight:950;letter-spacing:.12em;box-shadow:inset 0 1px 0 #fff,0 5px 15px rgba(7,29,57,.16)}
.banquet-card{position:relative;overflow:hidden;max-width:980px;margin:0 auto;border:4px solid #d71936;border-radius:28px;padding:22px;background:linear-gradient(145deg,#062c5d 0,#0b56a0 20%,#e9eef4 20.4%,#fff 47%,#eef2f6 68%,#0a4c92 68.4%,#062b59 100%);box-shadow:0 22px 48px rgba(7,42,82,.22),inset 0 0 0 2px rgba(255,255,255,.9)}
.banquet-card:after{content:'';position:absolute;pointer-events:none;inset:-35% -20%;background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.38) 46%,rgba(255,255,255,.08) 53%,transparent 60%);transform:translateX(-48%) rotate(5deg);opacity:.72}.banquet-card>*{position:relative;z-index:1}
.banquet-kicker{text-align:center;color:#d71936;font-size:11px;font-weight:950;letter-spacing:.16em;text-transform:uppercase;margin:2px 0 8px;text-shadow:0 1px 0 #fff}
.banquet-title{background:linear-gradient(180deg,#ff3650 0,#d71936 42%,#a70820 48%,#e61b39 72%,#8c071b 100%);border:2px solid #fff;border-radius:18px;padding:16px 18px;text-align:center;color:#fff;font-size:clamp(20px,4vw,34px);font-weight:1000;letter-spacing:.045em;text-shadow:0 2px 0 rgba(80,0,12,.5),0 0 12px rgba(255,255,255,.3);box-shadow:inset 0 2px 0 rgba(255,255,255,.65),inset 0 -4px 8px rgba(72,0,12,.28),0 9px 22px rgba(122,4,23,.3)}
.banquet-subtitle{text-align:center;margin:12px 0 18px;color:#0a2b54;font-size:14px;font-weight:900;letter-spacing:.025em}
.banquet-date-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.banquet-date,.banquet-time{border-radius:18px;padding:16px;text-align:center;border:2px solid #b7c2ce;background:linear-gradient(180deg,#fff 0,#e1e7ed 43%,#fff 50%,#c2ccd6 100%);box-shadow:inset 0 2px 0 #fff,0 8px 18px rgba(7,42,82,.12)}.banquet-date small,.banquet-time small{display:block;color:#6b7888;font-size:9px;font-weight:950;letter-spacing:.13em;margin-bottom:4px}.banquet-date strong,.banquet-time strong{display:block;color:#082e60;font-size:clamp(17px,3.2vw,24px);font-weight:1000}
.banquet-features{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:14px}.banquet-feature{min-height:115px;border-radius:18px;padding:16px;display:flex;align-items:center;gap:12px;border:2px solid rgba(255,255,255,.85);box-shadow:inset 0 1px 0 rgba(255,255,255,.7),0 8px 18px rgba(7,29,57,.15)}.banquet-feature-1{background:linear-gradient(145deg,#f52343,#a6071e);color:#fff}.banquet-feature-2{background:linear-gradient(145deg,#fff,#dfe7ef);color:#0a2b54;border-color:#b5c1cd}.banquet-feature-3{background:linear-gradient(145deg,#1976c9,#073d78);color:#fff}.banquet-feature-icon{font-size:30px;filter:drop-shadow(0 2px 2px rgba(0,0,0,.14))}.banquet-feature strong{display:block;font-size:15px;font-weight:1000}.banquet-feature small{display:block;margin-top:4px;font-size:11px;line-height:1.35;font-weight:750;opacity:.92}
.banquet-location{margin-top:14px;display:flex;align-items:center;gap:12px;border-radius:18px;padding:14px 16px;background:linear-gradient(180deg,#0d5da8,#06366c);border:2px solid #fff;color:#fff;box-shadow:inset 0 2px 0 rgba(255,255,255,.35),0 8px 18px rgba(7,42,82,.2)}.banquet-location>span{font-size:25px}.banquet-location small{display:block;font-size:9px;font-weight:950;letter-spacing:.12em;opacity:.82}.banquet-location strong{display:block;font-size:16px;font-weight:1000}.banquet-location em{display:block;font-size:11px;font-style:normal;margin-top:2px;opacity:.85}.banquet-location-tba{background:linear-gradient(180deg,#164f89,#082f5c)}
.banquet-footer{margin-top:14px;padding:11px 14px;border-radius:14px;text-align:center;background:linear-gradient(180deg,#fff 0,#e5ebf1 48%,#fff 54%,#c7d0da 100%);border:2px solid #d71936;color:#0a2b54;font-size:11px;font-weight:950;letter-spacing:.035em;box-shadow:inset 0 1px 0 #fff}.season-closed-back{display:inline-block;margin-top:26px}
@media(max-width:700px){.team-events-head{align-items:flex-start}.banquet-card{padding:14px;border-radius:22px}.banquet-date-row,.banquet-features{grid-template-columns:1fr}.banquet-feature{min-height:0}.banquet-title{padding:14px 10px}.banquet-subtitle{font-size:12px}}
'''
CSS.write_text(css)

for page in (JV, VARS):
    html = page.read_text()
    html = re.sub(r'team-pages\.css\?v=[^\"]+', 'team-pages.css?v=20260910-banquet1', html)
    html = re.sub(r'team-page\.js\?v=[^\"]+', 'team-page.js?v=20260910-banquet1', html)
    page.write_text(html)
