import { TEAM_DATA, TEAM_PAGE_LINKS } from './team-data.js?v=20260911-jvend24';

const VOLLEYBALL_TEAM_IDS = ['jv-girls-volleyball','varsity-girls-volleyball','boys-volleyball'];
const VOLLEYBALL_WORK_FRIDAYS = new Set([
  '2026-09-04','2026-09-18','2026-09-25','2026-10-02','2026-10-23','2026-11-06','2026-11-13'
]);
const VOLLEYBALL_FRIDAY_TIME = '1:15–3:45 PM';
const SCHOOL_CLOSED_DATES = new Map([
  ['2026-09-07','Labor Day • No School']
]);
let practiceWeekOffset = 0;

function esc(value=''){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function teamById(id){return Object.values(TEAM_DATA).find(team=>team.id===id);}
function nav(team){return `<nav class="team-nav"><div class="team-nav-inner"><a class="team-brand" href="../../athletics.html">Explore Academy Athletics</a><div class="team-links">${TEAM_PAGE_LINKS.map(([label,href])=>`<a href="${href}"${href.startsWith(team.id)?' aria-current="page"':''}>${esc(label)}</a>`).join('')}<a href="../admin-calendar.html">Admin</a></div></div></nav>`;}
function mapsUrl(game){const destination=game.address||game.opponent;return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent('Explore Academy Peoria, AZ')}&destination=${encodeURIComponent(destination)}`;}
function travelPlan(game){const hasAddress=Boolean(game.address);const drive=game.drive||'Live route';const leave=game.leave||'TBA';const arrival=game.arrival||'TBA';return `<div class="travel-plan"><div class="travel-head"><span>🚐 GAME DAY TRAVEL PLAN</span><small>From Explore Academy Peoria</small></div><div class="travel-venue"><strong>📍 ${esc(game.opponent)}</strong><span>${hasAddress?esc(game.address):'Open Maps for venue directions'}</span></div><div class="travel-stats"><div><small>EST. DRIVE</small><strong>🚗 ${esc(drive)}</strong></div><div><small>LEAVE SCHOOL BY</small><strong>🚌 ${esc(leave)}</strong></div><div><small>TARGET ARRIVAL</small><strong>✅ ${esc(arrival)}</strong></div></div><a class="maps-button" href="${mapsUrl(game)}" target="_blank" rel="noopener noreferrer">🗺️ OPEN LIVE GOOGLE MAPS DIRECTIONS</a></div>`;}
function gameDate(game){const match=String(game.date||'').match(/^([A-Za-z]{3})\s+(\d{1,2})$/);if(!match)return null;const months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};const month=months[match[1]];if(month===undefined)return null;return new Date(2026,month,Number(match[2]),12,0,0,0);}
function weekdayForGame(game){const date=gameDate(game);return date?date.toLocaleDateString('en-US',{weekday:'long'}):'';}
function isPastGame(game){const date=gameDate(game);if(!date)return false;date.setHours(23,59,59,999);return date.getTime()<Date.now();}
function gameCard(game,index,total,team){const weekday=weekdayForGame(game);const isVarsity=team?.id==='varsity-girls-volleyball';const location=String(game.location||'').toLowerCase();const varsityClass=isVarsity&&location==='home'?' varsity-home':isVarsity&&location==='away'?' varsity-away':'';const locationBadge=isVarsity&&location==='home'?'<div class="location-badge home">🏠 HOME</div>':isVarsity&&location==='away'?'<div class="location-badge away">🚌 AWAY</div>':'';const detail=String(game.detail||'').toLowerCase();const specialClass=detail.includes('pink out')?' pink-out':detail.includes('glow in the dark')?' glow-game':detail.includes('staff vs students')?' campus-clash':'';return `<div class="card game-card${varsityClass}${specialClass}">${locationBadge}<div class="game-top"><div><div class="card-label">Game ${index+1} of ${total}</div><div class="card-title">${weekday?`${esc(weekday)} • `:''}${esc(game.date)} • ${esc(game.time)}</div></div>${game.detail?`<div class="event-badge">${esc(game.detail)}</div>`:''}</div><div class="card-value game-opponent">${esc(game.opponent)}</div>${travelPlan(game)}</div>`;}
function games(team){if(!team.games?.length)return '<div class="grid game-grid">'+Array.from({length:3},()=>'<div class="card"><div class="card-title">Future game</div><div class="card-label">Schedule pending</div><div class="pending">—</div></div>').join('')+'</div>';const indexed=team.games.map((game,index)=>({game,index}));const upcoming=indexed.filter(item=>!isPastGame(item.game));const past=indexed.filter(item=>isPastGame(item.game));const upcomingHtml=upcoming.length?`<div class="grid game-grid">${upcoming.map(item=>gameCard(item.game,item.index,team.games.length,team)).join('')}</div>`:'<div class="schedule-empty">No upcoming games currently scheduled.</div>';const pastHtml=past.length?`<details class="past-games"><summary><span>Past Games</span><strong>${past.length}</strong><small>Tap to view completed dates</small></summary><div class="past-games-body"><div class="grid game-grid">${past.map(item=>gameCard(item.game,item.index,team.games.length,team)).join('')}</div></div></details>`:'';return upcomingHtml+pastHtml;}

function eventCard(event){
  const weekday=weekdayForGame(event);
  const features=(event.items||[]).map((item,index)=>`<div class="banquet-feature banquet-feature-${index+1}"><span class="banquet-feature-icon">${esc(item.icon||'✦')}</span><div><strong>${esc(item.title||'')}</strong>${item.detail?`<small>${esc(item.detail)}</small>`:''}</div></div>`).join('');
  const location=event.location&&String(event.location).toUpperCase()!=='TBA'?`<div class="banquet-location"><span>📍</span><div><small>LOCATION</small><strong>${esc(event.location)}</strong></div></div>`:`<div class="banquet-location banquet-location-tba"><span>📍</span><div><small>LOCATION</small><strong>Location TBA</strong><em>Venue will be announced</em></div></div>`;
  return `<article class="team-event-card banquet-card"><div class="banquet-kicker">🏐 VOLLEYBALL SEASON CELEBRATION 🏐</div><div class="banquet-title">🏆 END-OF-SEASON BANQUET</div><div class="banquet-subtitle">${esc(event.subtitle||'JV Girls + Varsity Girls + Boys Volleyball')}</div><div class="banquet-date-row"><div class="banquet-date"><small>DATE</small><strong>${weekday?`${esc(weekday)}, `:''}${esc(event.date)}</strong></div><div class="banquet-time"><small>TIME</small><strong>${esc(event.time)}</strong></div></div><div class="banquet-features">${features}</div>${location}<div class="banquet-footer">🏐 JV Girls • Varsity Girls • Boys Volleyball • One program</div></article>`;
}
function teamEvents(team){
  const displayEvents=(team.events||[]).filter(event=>!event.weeklyOnly);
  if(!displayEvents.length)return'';
  return `<section class="section team-events" id="events"><div class="team-events-head"><div><div class="kicker">Special Team Event</div><h2>Season Celebration</h2></div><span class="team-events-badge">JV + VARS + BOYS</span></div>${displayEvents.map(eventCard).join('')}</section>`;
}


function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function parseSeasonDate(value,endOfDay=false){if(!value)return null;const parts=String(value).split('-').map(Number);if(parts.length!==3||parts.some(Number.isNaN))return null;return new Date(parts[0],parts[1]-1,parts[2],endOfDay?23:0,endOfDay?59:0,endOfDay?59:0,endOfDay?999:0);}
function seasonState(team,date=new Date()){
  if(!team.season)return {state:'active'};
  const check=new Date(date);check.setHours(12,0,0,0);
  const start=parseSeasonDate(team.season.start);
  const end=parseSeasonDate(team.season.end,true);
  if(start&&check<start)return {state:'upcoming',start,end};
  if(end&&check>end)return {state:'closed',start,end};
  return {state:'active',start,end};
}
function teamIsInSeason(team,date){return seasonState(team,date).state==='active';}
function seasonDetails(team){
  if(!team.season)return'';
  const details=[];
  if(team.season.label)details.push(`<strong>${esc(team.season.label)}</strong>`);
  if(team.season.display)details.push(`<span>${esc(team.season.display)}</span>`);
  if(team.season.regularDisplay)details.push(`<span>${esc(team.season.regularDisplay)}</span>`);
  if(team.season.playoffsDisplay)details.push(`<span>${esc(team.season.playoffsDisplay)}</span>`);
  if(team.season.championshipDisplay)details.push(`<span>${esc(team.season.championshipDisplay)}</span>`);
  if(team.season.championshipLocation)details.push(`<span>Championship Location: ${esc(team.season.championshipLocation)}</span>`);
  return details.join('');
}
function phoenixCalendarNow(){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Phoenix',year:'numeric',month:'numeric',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).reduce((out,part)=>{if(part.type!=='literal')out[part.type]=part.value;return out;},{});
  const today=new Date(Number(parts.year),Number(parts.month)-1,Number(parts.day),12,0,0,0);
  const day=({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6})[parts.weekday]??today.getDay();
  const minutes=(Number(parts.hour)||0)*60+(Number(parts.minute)||0);
  return {today,day,minutes};
}
function defaultPracticeWeekOffset(){
  const {day,minutes}=phoenixCalendarNow();
  return ((day===5&&minutes>=18*60+45)||day===6||day===0)?1:0;
}
function practiceHeadingLabel(offset=practiceWeekOffset){
  const defaultOffset=defaultPracticeWeekOffset();
  if(offset===defaultOffset)return defaultOffset===1?"Next Week's Practice Schedule":"This Week's Practice Schedule";
  return 'Practice Schedule';
}
function weekDates(offset=0){
  const {today,day}=phoenixCalendarNow();
  const monday=new Date(today);
  monday.setDate(today.getDate()+(day===0?-6:1-day)+(offset*7));
  const dates=[];
  for(let i=0;i<5;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);dates.push(d);}
  return dates;
}
function teamEventsByDate(){const map=new Map();for(const team of Object.values(TEAM_DATA)){for(const event of team.events||[]){const date=gameDate(event);if(!date)continue;const key=dateKey(date);if(!map.has(key))map.set(key,[]);map.get(key).push({team,event});}}return map;}
function weeklyEventText(items){return items.map(({event})=>`${event.title||'Team Event'}${event.time?` • ${event.time}`:''}${event.location?` • ${event.location}`:''}`).join(' • ');}
function scheduledPracticeTime(team,date,day){const key=dateKey(date);if(team.id==='varsity-girls-volleyball'){if(key>='2026-09-28'&&key<='2026-10-04')return '3:15–5:15 PM';if(key>='2026-10-05'&&key<='2026-11-19'){if(day==='Monday'||day==='Wednesday')return '3:15–5:15 PM';if(day==='Tuesday'||day==='Thursday')return '4:45–6:30 PM';}}if(team.id==='boys-volleyball'){if(key>='2026-10-05'&&key<='2026-11-19'&&(day==='Tuesday'||day==='Thursday'))return '3:15–4:45 PM';if(key>='2026-11-20'&&day!=='Friday')return '3:15–4:30 PM';}const item=(team.practice||[]).find(x=>x.day===day);return item?.time||'';}
function practiceGameConflicts(){const map=new Map();for(const team of Object.values(TEAM_DATA)){if(!VOLLEYBALL_TEAM_IDS.includes(team.id))continue;for(const game of team.games||[]){const date=gameDate(game);if(!date||!teamIsInSeason(team,date))continue;const key=dateKey(date);if(!map.has(key))map.set(key,[]);map.get(key).push({team,game});}}return map;}
function weekRangeLabel(dates){if(!dates.length)return'';const first=dates[0],last=dates[dates.length-1];const sameMonth=first.getMonth()===last.getMonth();return sameMonth?`${first.toLocaleDateString('en-US',{month:'short'})} ${first.getDate()}–${last.getDate()}`:`${first.toLocaleDateString('en-US',{month:'short',day:'numeric'})}–${last.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;}
function conflictText(conflicts){return conflicts.map(({team,game})=>`${team.title} game at ${game.time} vs. ${game.opponent}`).join(' • ');}
function schoolClosureCard(day,date,reason){
  const dateLabel=date.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  return `<div class="card practice-card practice-off"><div class="practice-day-row"><div><div class="card-title">${day}</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status off">NO PRACTICE</span></div><div class="practice-cancel">NO PRACTICE</div><div class="practice-reason">🏫 ${esc(reason)}</div></div>`;
}
function outOfSeasonCard(team,day,date){
  const state=seasonState(team,date);
  const dateLabel=date.toLocaleDateString('en-US',{month:'short',day:'numeric'});
  const before=state.state==='upcoming';
  const message=before?`Season begins ${team.season?.display||team.season?.start||''}`:'Season has ended';
  return `<div class="card practice-card practice-off"><div class="practice-day-row"><div><div class="card-title">${day}</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status off">OUT OF SEASON</span></div><div class="practice-rest">${esc(message)}</div></div>`;
}
function practice(team,weekOffset=0){
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
    const eventNote=dayEvents.length?`<div class="practice-week-event">📅 ${esc(weeklyEventText(dayEvents))}</div>`:'';
    if(!teamIsInSeason(team,date)&&!dayEvents.length)return outOfSeasonCard(team,day,date);
    const conflicts=conflictsByDate.get(key)||[];
    if(conflicts.length)return `<div class="card practice-card practice-conflict"><div class="practice-day-row"><div><div class="card-title">${day}</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status conflict">GAME DAY</span></div><div class="practice-cancel">NO PRACTICE</div><div class="practice-reason">🚫 ${esc(conflictText(conflicts))}</div>${eventNote}<div class="practice-note">Volleyball practice is canceled on game days because the same coach covers the volleyball teams.</div></div>`;
    if(day==='Friday'){
      const workFriday=VOLLEYBALL_WORK_FRIDAYS.has(key);
      if(!workFriday)return `<div class="card practice-card practice-off"><div class="practice-day-row"><div><div class="card-title">Friday</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status off">NO PRACTICE</span></div><div class="practice-rest">Coach not working this Friday</div>${eventNote}</div>`;
      const mixed=key>='2026-10-05'&&teamIsInSeason(teamById('varsity-girls-volleyball'),date)&&teamIsInSeason(teamById('boys-volleyball'),date);
      const fridayTime=key>='2026-11-20'&&team.id==='boys-volleyball'?'3:15–4:30 PM':VOLLEYBALL_FRIDAY_TIME;
      return `<div class="card practice-card practice-active"><div class="practice-day-row"><div><div class="card-title">Friday</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status active">PRACTICE</span></div><div class="card-value practice-time">${esc(fridayTime)}</div><div class="practice-note">${mixed?'🏐 Mixed Varsity Girls + Boys practice':'🏐 Volleyball practice'}</div>${eventNote}</div>`;
    }
    if(!teamIsInSeason(team,date))return dayEvents.length?`<div class="card practice-card practice-off"><div class="practice-day-row"><div><div class="card-title">${day}</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status off">EVENT</span></div>${eventNote}</div>`:outOfSeasonCard(team,day,date);
    const time=scheduledPracticeTime(team,date,day);
    if(!time)return `<div class="card practice-card practice-off"><div class="practice-day-row"><div><div class="card-title">${day}</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status off">NO PRACTICE</span></div><div class="practice-rest">Scheduled off day</div>${eventNote}</div>`;
    return `<div class="card practice-card practice-active"><div class="practice-day-row"><div><div class="card-title">${day}</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status active">PRACTICE</span></div><div class="card-value practice-time">${esc(time)}</div>${eventNote}</div>`;
  }).join('');
  const defaultOffset=defaultPracticeWeekOffset();
  const label=weekOffset===defaultOffset?(defaultOffset===1?'UPCOMING WEEK':'CURRENT WEEK'):'WEEK OF';
  return {banner:`<strong>📅 ${label} • ${esc(weekRangeLabel(dates))}</strong><span>Practice, games, and team events are shown together. Game days cancel volleyball practice. Friday practice occurs only on designated coach work Fridays.</span>`,cards};
}
function practiceControls(team){
  if(!VOLLEYBALL_TEAM_IDS.includes(team.id))return'';
  const resetLabel=defaultPracticeWeekOffset()===1?'NEXT WEEK':'THIS WEEK';
  return `<div class="practice-week-controls" aria-label="Practice week navigation"><button type="button" class="practice-week-btn" data-practice-prev aria-label="Previous week">← <span>Previous Week</span></button><button type="button" class="practice-week-btn practice-week-today" data-practice-today>${resetLabel}</button><button type="button" class="practice-week-btn" data-practice-next aria-label="Next week"><span>Next Week</span> →</button></div>`;
}
function updatePracticeWeek(team){
  const view=practice(team,practiceWeekOffset);
  const banner=document.querySelector('[data-practice-banner]');
  const grid=document.querySelector('[data-practice-grid]');
  if(banner)banner.innerHTML=view.banner;
  if(grid)grid.innerHTML=view.cards;
  const heading=document.querySelector('[data-practice-heading]');
  if(heading)heading.textContent=practiceHeadingLabel(practiceWeekOffset);
  const todayBtn=document.querySelector('[data-practice-today]');
  const defaultOffset=defaultPracticeWeekOffset();
  if(todayBtn){todayBtn.textContent=defaultOffset===1?'NEXT WEEK':'THIS WEEK';todayBtn.disabled=practiceWeekOffset===defaultOffset;todayBtn.setAttribute('aria-current',practiceWeekOffset===defaultOffset?'true':'false');}
}
function bindPracticeWeekControls(team){
  if(!VOLLEYBALL_TEAM_IDS.includes(team.id))return;
  document.querySelector('[data-practice-prev]')?.addEventListener('click',()=>{practiceWeekOffset-=1;updatePracticeWeek(team);});
  document.querySelector('[data-practice-next]')?.addEventListener('click',()=>{practiceWeekOffset+=1;updatePracticeWeek(team);});
  document.querySelector('[data-practice-today]')?.addEventListener('click',()=>{practiceWeekOffset=defaultPracticeWeekOffset();updatePracticeWeek(team);});
  updatePracticeWeek(team);
}

function roster(team){return [...(team.roster||[])].sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'en',{sensitivity:'base'})).map(player=>`<div class="card"><div class="number">${player.number?`#${esc(player.number)}`:''}</div><div class="card-title">${esc(player.name)}</div><div class="card-detail">${player.detail?esc(player.detail):'Player'}</div></div>`).join('');}
async function standings(team){const host=document.querySelector('[data-standings-host]');if(!host)return;if(!team.standingsPath){host.innerHTML='<div class="pending">Standings and record will appear here when confirmed.</div>';return;}try{const response=await fetch(team.standingsPath,{cache:'no-store'});if(!response.ok)throw new Error('standings unavailable');const data=await response.json();const rows=data.regionStandings||data.standings||data.teams||[];if(!Array.isArray(rows)||!rows.length)throw new Error('no standings rows');const label=data.regionName||team.standingsSource||'Standings';const ourRow=rows.find(row=>row.ours===true)||rows.find(row=>String(row.team||row.name||'').trim().toLowerCase()==='explore academy');if(ourRow){const wins=ourRow.wins??ourRow.w??'';const losses=ourRow.losses??ourRow.l??'';const recordHost=document.querySelector('[data-current-record]');if(recordHost&&wins!==''&&losses!=='')recordHost.textContent=`${wins}–${losses}`;}host.innerHTML=`<div class="card-label">${esc(label)}</div><table><thead><tr><th>Team</th><th>W</th><th>L</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.team||row.name||'')}</td><td>${esc(row.wins??row.w??'')}</td><td>${esc(row.losses??row.l??'')}</td></tr>`).join('')}</tbody></table>`;}catch(_){host.innerHTML='<div class="pending">Standings are temporarily unavailable.</div>';}}
function renderClosed(team){
  document.title=`${team.title} | Season Closed`;
  document.body.innerHTML=`${nav(team)}<main class="page"><div class="wrap"><section class="season-gate closed"><div class="season-gate-icon">🏁</div><div class="kicker">${esc(team.title)}</div><h1>Season Closed</h1><p>The 2026 ${esc(team.title)} season has ended.</p><div class="season-gate-dates">${seasonDetails(team)}</div></section>${teamEvents(team)}<a class="season-gate-link season-closed-back" href="../../athletics.html">← Back to Eagles Athletics</a></div></main>`;
}
function render(){
  const teamId=document.body.dataset.teamId;const team=teamById(teamId);if(!team){document.body.innerHTML='<p>Team not found.</p>';return;}
  const status=seasonState(team);
  if(status.state==='closed'){renderClosed(team);return;}
  practiceWeekOffset=defaultPracticeWeekOffset();
  const practiceView=practice(team,practiceWeekOffset);
  const preSeason=status.state==='upcoming'&&team.season;
  const seasonBanner=team.season?`<div class="season-strip ${preSeason?'upcoming':'active'}"><div><strong>${preSeason?'⏳ SEASON OPENS SOON':'🏐 SEASON ACTIVE'}</strong><span>${esc(team.season.display||'')}</span></div>${preSeason?`<span class="season-strip-status">Starts ${esc(team.season.start)}</span>`:''}</div>`:'';
  document.title=`${team.title} | Explore Academy`;
  document.body.innerHTML=`${nav(team)}<main class="page"><div class="wrap">${seasonBanner}<section class="hero"><div><div class="kicker">Explore Academy ${esc(team.sport)}</div><h1 class="title">${esc(team.title)}</h1><div class="subtitle">${esc(team.subtitle||'Explore Academy')}</div><div class="actions"><a href="#practice">Practice Times</a><a href="#schedule">Game Schedule</a>${team.events?.length?'<a href="#events">Banquet</a>':''}<a href="#roster">Meet the Team</a></div></div><div class="photo">Team photo<br>coming soon</div></section><div class="stats"><div class="stat"><div class="stat-value">${team.games?.length||'—'}</div><div class="stat-label">Games</div></div><div class="stat"><div class="stat-value" data-current-record>—</div><div class="stat-label">Current Record</div></div><div class="stat"><div class="stat-value">${preSeason?'UPCOMING':'ACTIVE'}</div><div class="stat-label">Season Status</div></div></div><section class="section" id="practice"><div class="practice-section-head"><h2 data-practice-heading>${practiceHeadingLabel(practiceWeekOffset)}</h2>${practiceControls(team)}</div><div class="banner practice-banner" data-practice-banner>${practiceView.banner}</div><div class="grid practice-grid" data-practice-grid>${practiceView.cards}</div></section><section class="section" id="schedule"><h2>2026 Match Schedule</h2>${games(team)}</section>${teamEvents(team)}<section class="section" id="roster"><h2>Meet the Team</h2><div class="grid">${roster(team)}</div></section><section class="section"><h2>${esc(team.title)} Standings</h2><div class="standings" data-standings-host></div></section><a class="back" href="../../athletics.html">← Back to Explore Academy Athletics</a></div></main>`;
  standings(team);
  bindPracticeWeekControls(team);
}
render();
