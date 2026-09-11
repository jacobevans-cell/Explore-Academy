from pathlib import Path
import re

p = Path('athletics-portal/teams/shared/team-page.js')
s = p.read_text()

if 'function teamEventsByDate()' not in s:
    marker = 'function practiceGameConflicts(){const map=new Map();'
    insert = """function teamEventsByDate(){const map=new Map();for(const team of Object.values(TEAM_DATA)){for(const event of team.events||[]){const date=gameDate(event);if(!date)continue;const key=dateKey(date);if(!map.has(key))map.set(key,[]);map.get(key).push({team,event});}}return map;}\nfunction weeklyEventText(items){return items.map(({event})=>`${event.title||'Team Event'}${event.time?` • ${event.time}`:''}${event.location?` • ${event.location}`:''}`).join(' • ');}\nfunction scheduledPracticeTime(team,date,day){const key=dateKey(date);if(team.id==='varsity-girls-volleyball'){if(key>='2026-09-28'&&key<='2026-10-04')return '3:15–5:15 PM';if(key>='2026-10-05'&&key<='2026-11-19'){if(day==='Monday'||day==='Wednesday')return '3:15–5:15 PM';if(day==='Tuesday'||day==='Thursday')return '4:45–6:30 PM';}}if(team.id==='boys-volleyball'){if(key>='2026-10-05'&&key<='2026-11-19'&&(day==='Tuesday'||day==='Thursday'))return '3:15–4:45 PM';if(key>='2026-11-20'&&day!=='Friday')return '3:15–4:30 PM';}const item=(team.practice||[]).find(x=>x.day===day);return item?.time||'';}\nfunction practiceGameConflicts(){const map=new Map();"""
    if marker not in s:
        raise SystemExit('practice conflict marker not found')
    s = s.replace(marker, insert, 1)

pat = re.compile(r"function practice\(team,weekOffset=0\)\{.*?\n\}\nfunction renderPractice", re.S)
new = """function practice(team,weekOffset=0){
  const days=['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const dates=weekDates(weekOffset);
  const conflictsByDate=practiceGameConflicts();
  const eventsByDate=teamEventsByDate();
  const cards=days.map((day,index)=>{
    const date=dates[index];
    const key=dateKey(date);
    const dateLabel=date.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    const schoolClosure=SCHOOL_CLOSED_DATES.get(key);
    if(schoolClosure)return schoolClosureCard(day,date,schoolClosure);
    const dayEvents=(eventsByDate.get(key)||[]).filter(x=>x.team.id===team.id);
    const eventNote=dayEvents.length?`<div class=\"practice-week-event\">📅 ${esc(weeklyEventText(dayEvents))}</div>`:'';
    if(!teamIsInSeason(team,date)&&!dayEvents.length)return outOfSeasonCard(team,day,date);
    const conflicts=conflictsByDate.get(key)||[];
    if(conflicts.length)return `<div class=\"card practice-card practice-conflict\"><div class=\"practice-day-row\"><div><div class=\"card-title\">${day}</div><div class=\"practice-date\">${esc(dateLabel)}</div></div><span class=\"practice-status conflict\">GAME DAY</span></div><div class=\"practice-cancel\">NO PRACTICE</div><div class=\"practice-reason\">🚫 ${esc(conflictText(conflicts))}</div>${eventNote}<div class=\"practice-note\">Volleyball practice is canceled on game days because the same coach covers the volleyball teams.</div></div>`;
    if(day==='Friday'){
      const workFriday=VOLLEYBALL_WORK_FRIDAYS.has(key);
      if(!workFriday)return `<div class=\"card practice-card practice-off\"><div class=\"practice-day-row\"><div><div class=\"card-title\">Friday</div><div class=\"practice-date\">${esc(dateLabel)}</div></div><span class=\"practice-status off\">NO PRACTICE</span></div><div class=\"practice-rest\">Coach not working this Friday</div>${eventNote}</div>`;
      const mixed=key>='2026-10-05'&&teamIsInSeason(teamById('varsity-girls-volleyball'),date)&&teamIsInSeason(teamById('boys-volleyball'),date);
      const fridayTime=key>='2026-11-20'&&team.id==='boys-volleyball'?'3:15–4:30 PM':VOLLEYBALL_FRIDAY_TIME;
      return `<div class=\"card practice-card practice-active\"><div class=\"practice-day-row\"><div><div class=\"card-title\">Friday</div><div class=\"practice-date\">${esc(dateLabel)}</div></div><span class=\"practice-status active\">PRACTICE</span></div><div class=\"card-value practice-time\">${esc(fridayTime)}</div><div class=\"practice-note\">${mixed?'🏐 Mixed Varsity Girls + Boys practice':'🏐 Volleyball practice'}</div>${eventNote}</div>`;
    }
    if(!teamIsInSeason(team,date))return dayEvents.length?`<div class=\"card practice-card practice-off\"><div class=\"practice-day-row\"><div><div class=\"card-title\">${day}</div><div class=\"practice-date\">${esc(dateLabel)}</div></div><span class=\"practice-status off\">EVENT</span></div>${eventNote}</div>`:outOfSeasonCard(team,day,date);
    const time=scheduledPracticeTime(team,date,day);
    if(!time)return `<div class=\"card practice-card practice-off\"><div class=\"practice-day-row\"><div><div class=\"card-title\">${day}</div><div class=\"practice-date\">${esc(dateLabel)}</div></div><span class=\"practice-status off\">NO PRACTICE</span></div><div class=\"practice-rest\">Scheduled off day</div>${eventNote}</div>`;
    return `<div class=\"card practice-card practice-active\"><div class=\"practice-day-row\"><div><div class=\"card-title\">${day}</div><div class=\"practice-date\">${esc(dateLabel)}</div></div><span class=\"practice-status active\">PRACTICE</span></div><div class=\"card-value practice-time\">${esc(time)}</div>${eventNote}</div>`;
  }).join('');
  return {banner:'Practice, games & team events',cards};
}
function renderPractice"""
s2,n = pat.subn(new,s,count=1)
if n != 1:
    raise SystemExit(f'practice replacement count {n}')
p.write_text(s2)

cssp = Path('athletics-portal/teams/shared/practice-week.css')
css = cssp.read_text()
if '.practice-week-event' not in css:
    css += '\n.practice-week-event{margin-top:10px;padding:9px 10px;border-radius:12px;background:#eef5fb;border:1px solid #c8dced;color:#0a315f;font-size:11px;font-weight:900;line-height:1.35}\n'
cssp.write_text(css)
