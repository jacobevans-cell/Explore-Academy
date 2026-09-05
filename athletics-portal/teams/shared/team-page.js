import { TEAM_DATA, TEAM_PAGE_LINKS } from './team-data.js?v=20260904-8';

const VOLLEYBALL_TEAM_IDS = ['jv-girls-volleyball','varsity-girls-volleyball','boys-volleyball'];
const VOLLEYBALL_WORK_FRIDAYS = new Set([
  '2026-09-04','2026-09-18','2026-09-25','2026-10-02','2026-10-23','2026-11-06','2026-11-13'
]);
const VOLLEYBALL_FRIDAY_TIME = '1:15–3:45 PM';

function esc(value=''){return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');}
function teamById(id){return Object.values(TEAM_DATA).find(team=>team.id===id);}
function nav(team){return `<nav class="team-nav"><div class="team-nav-inner"><a class="team-brand" href="../../athletics.html">Explore Academy Athletics</a><div class="team-links">${TEAM_PAGE_LINKS.map(([label,href])=>`<a href="${href}"${href.startsWith(team.id)?' aria-current="page"':''}>${esc(label)}</a>`).join('')}</div></div></nav>`;}
function mapsUrl(game){const destination=game.address||game.opponent;return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent('Explore Academy Peoria, AZ')}&destination=${encodeURIComponent(destination)}`;}
function travelPlan(game){const hasAddress=Boolean(game.address);const drive=game.drive||'Live route';const leave=game.leave||'TBA';const arrival=game.arrival||'TBA';return `<div class="travel-plan"><div class="travel-head"><span>🚐 GAME DAY TRAVEL PLAN</span><small>From Explore Academy Peoria</small></div><div class="travel-venue"><strong>📍 ${esc(game.opponent)}</strong><span>${hasAddress?esc(game.address):'Open Maps for venue directions'}</span></div><div class="travel-stats"><div><small>EST. DRIVE</small><strong>🚗 ${esc(drive)}</strong></div><div><small>LEAVE SCHOOL BY</small><strong>🚌 ${esc(leave)}</strong></div><div><small>TARGET ARRIVAL</small><strong>✅ ${esc(arrival)}</strong></div></div><a class="maps-button" href="${mapsUrl(game)}" target="_blank" rel="noopener noreferrer">🗺️ OPEN LIVE GOOGLE MAPS DIRECTIONS</a></div>`;}
function gameDate(game){const match=String(game.date||'').match(/^([A-Za-z]{3})\s+(\d{1,2})$/);if(!match)return null;const months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};const month=months[match[1]];if(month===undefined)return null;return new Date(2026,month,Number(match[2]),12,0,0,0);}
function weekdayForGame(game){const date=gameDate(game);return date?date.toLocaleDateString('en-US',{weekday:'long'}):'';}
function isPastGame(game){const date=gameDate(game);if(!date)return false;date.setHours(23,59,59,999);return date.getTime()<Date.now();}
function gameCard(game,index,total){const weekday=weekdayForGame(game);return `<div class="card game-card${game.detail?.toLowerCase().includes('pink out')?' pink-out':''}"><div class="game-top"><div><div class="card-label">Game ${index+1} of ${total}</div><div class="card-title">${weekday?`${esc(weekday)} • `:''}${esc(game.date)} • ${esc(game.time)}</div></div>${game.detail?`<div class="event-badge">${esc(game.detail)}</div>`:''}</div><div class="card-value game-opponent">${game.location?`${esc(game.location)} vs. `:''}${esc(game.opponent)}</div>${travelPlan(game)}</div>`;}
function games(team){if(!team.games?.length)return '<div class="grid game-grid">'+Array.from({length:3},()=>'<div class="card"><div class="card-title">Future game</div><div class="card-label">Schedule pending</div><div class="pending">—</div></div>').join('')+'</div>';const indexed=team.games.map((game,index)=>({game,index}));const upcoming=indexed.filter(item=>!isPastGame(item.game));const past=indexed.filter(item=>isPastGame(item.game));const upcomingHtml=upcoming.length?`<div class="grid game-grid">${upcoming.map(item=>gameCard(item.game,item.index,team.games.length)).join('')}</div>`:'<div class="schedule-empty">No upcoming games currently scheduled.</div>';const pastHtml=past.length?`<details class="past-games"><summary><span>Past Games</span><strong>${past.length}</strong><small>Tap to view completed dates</small></summary><div class="past-games-body"><div class="grid game-grid">${past.map(item=>gameCard(item.game,item.index,team.games.length)).join('')}</div></div></details>`:'';return upcomingHtml+pastHtml;}

function dateKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function currentWeek(){const today=new Date();today.setHours(12,0,0,0);const day=today.getDay();const monday=new Date(today);monday.setDate(today.getDate()+(day===0?-6:1-day));const dates=[];for(let i=0;i<5;i++){const d=new Date(monday);d.setDate(monday.getDate()+i);dates.push(d);}return dates;}
function practiceGameConflicts(){const map=new Map();for(const team of Object.values(TEAM_DATA)){if(!VOLLEYBALL_TEAM_IDS.includes(team.id))continue;for(const game of team.games||[]){const date=gameDate(game);if(!date)continue;const key=dateKey(date);if(!map.has(key))map.set(key,[]);map.get(key).push({team,game});}}return map;}
function weekRangeLabel(dates){if(!dates.length)return'';const first=dates[0],last=dates[dates.length-1];const sameMonth=first.getMonth()===last.getMonth();return sameMonth?`${first.toLocaleDateString('en-US',{month:'short'})} ${first.getDate()}–${last.getDate()}`:`${first.toLocaleDateString('en-US',{month:'short',day:'numeric'})}–${last.toLocaleDateString('en-US',{month:'short',day:'numeric'})}`;}
function conflictText(conflicts){return conflicts.map(({team,game})=>`${team.title} game at ${game.time} vs. ${game.opponent}`).join(' • ');}
function teamIsInSeason(team,date){
  if(!VOLLEYBALL_TEAM_IDS.includes(team.id))return false;
  if(!team.seasonStart&&!team.seasonEnd)return true;
  const key=dateKey(date);
  if(team.seasonStart&&key<team.seasonStart)return false;
  if(team.seasonEnd&&key>team.seasonEnd)return false;
  return true;
}
function practice(team){
  const days=['Monday','Tuesday','Wednesday','Thursday','Friday'];
  const byDay=new Map((team.practice||[]).map(item=>[item.day,item]));
  if(!VOLLEYBALL_TEAM_IDS.includes(team.id)){
    return {banner:'Team practice schedule',cards:days.map(day=>{const item=byDay.get(day);return `<div class="card"><div class="card-title">${day}</div><div class="card-label">${item?.time?'Practice':'Schedule pending'}</div>${item?.time?`<div class="card-value">${esc(item.time)}</div>${item.detail?`<div class="card-detail">${esc(item.detail)}</div>`:''}`:'<div class="pending">—</div>'}</div>`;}).join('')};
  }
  const dates=currentWeek();
  const conflictsByDate=practiceGameConflicts();
  const cards=days.map((day,index)=>{
    const date=dates[index];
    const item=byDay.get(day);
    const conflicts=conflictsByDate.get(dateKey(date))||[];
    const dateLabel=date.toLocaleDateString('en-US',{month:'short',day:'numeric'});
    if(conflicts.length){
      return `<div class="card practice-card practice-conflict"><div class="practice-day-row"><div><div class="card-title">${day}</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status conflict">GAME DAY</span></div><div class="practice-cancel">NO PRACTICE</div><div class="practice-reason">🚫 ${esc(conflictText(conflicts))}</div><div class="practice-note">All volleyball practices canceled because the same coach covers JV Girls, Varsity Girls, and Boys.</div></div>`;
    }
    if(day==='Friday'){
      const workFriday=VOLLEYBALL_WORK_FRIDAYS.has(dateKey(date));
      if(workFriday&&teamIsInSeason(team,date)){
        return `<div class="card practice-card practice-active"><div class="practice-day-row"><div><div class="card-title">Friday</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status active">PRACTICE</span></div><div class="card-value practice-time">${VOLLEYBALL_FRIDAY_TIME}</div><div class="card-detail">Friday workday practice • all in-season volleyball teams</div></div>`;
      }
      return `<div class="card practice-card practice-off"><div class="practice-day-row"><div><div class="card-title">Friday</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status off">NO PRACTICE</span></div><div class="practice-rest">${workFriday?'Team not in season':'Coach not working this Friday'}</div></div>`;
    }
    if(item?.time && String(item.time).toUpperCase()!=='OFF'){
      return `<div class="card practice-card practice-active"><div class="practice-day-row"><div><div class="card-title">${day}</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status active">PRACTICE</span></div><div class="card-value practice-time">${esc(item.time)}</div>${item.detail?`<div class="card-detail">${esc(item.detail)}</div>`:''}</div>`;
    }
    if(item?.time && String(item.time).toUpperCase()==='OFF'){
      return `<div class="card practice-card practice-off"><div class="practice-day-row"><div><div class="card-title">${day}</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status off">OFF</span></div><div class="practice-rest">No scheduled practice</div></div>`;
    }
    return `<div class="card practice-card practice-pending"><div class="practice-day-row"><div><div class="card-title">${day}</div><div class="practice-date">${esc(dateLabel)}</div></div><span class="practice-status pending-status">PENDING</span></div><div class="pending">Schedule pending</div></div>`;
  }).join('');
  return {banner:`<strong>📅 CURRENT WEEK • ${esc(weekRangeLabel(dates))}</strong><span>Game days cancel all volleyball practices. Friday practice occurs only on designated coach work Fridays.</span>`,cards};
}

function roster(team){return(team.roster||[]).map(player=>`<div class="card"><div class="number">${player.number?`#${esc(player.number)}`:''}</div><div class="card-title">${esc(player.name)}</div><div class="card-detail">${player.detail?esc(player.detail):'Player'}</div></div>`).join('');}
async function standings(team){const host=document.querySelector('[data-standings-host]');if(!host)return;if(!team.standingsPath){host.innerHTML='<div class="pending">Standings and record will appear here when confirmed.</div>';return;}try{const response=await fetch(team.standingsPath,{cache:'no-store'});if(!response.ok)throw new Error('standings unavailable');const data=await response.json();const rows=data.regionStandings||data.standings||data.teams||[];if(!Array.isArray(rows)||!rows.length)throw new Error('no standings rows');const label=data.regionName||team.standingsSource||'Standings';host.innerHTML=`<div class="card-label">${esc(label)}</div><table><thead><tr><th>Team</th><th>W</th><th>L</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${esc(row.team||row.name||'')}</td><td>${esc(row.wins??row.w??'')}</td><td>${esc(row.losses??row.l??'')}</td></tr>`).join('')}</tbody></table>`;}catch(_){host.innerHTML='<div class="pending">Standings are temporarily unavailable.</div>';}}
function render(){const teamId=document.body.dataset.teamId;const team=teamById(teamId);if(!team){document.body.innerHTML='<p>Team not found.</p>';return;}const practiceView=practice(team);document.title=`${team.title} | Explore Academy`;document.body.innerHTML=`${nav(team)}<main class="page"><div class="wrap"><section class="hero"><div><div class="kicker">Explore Academy ${esc(team.sport)}</div><h1 class="title">${esc(team.title)}</h1><div class="subtitle">${esc(team.subtitle||'Explore Academy')}</div><div class="actions"><a href="#practice">Practice Times</a><a href="#schedule">Game Schedule</a><a href="#roster">Meet the Team</a></div></div><div class="photo">Team photo<br>coming soon</div></section><div class="stats"><div class="stat"><div class="stat-value">${team.games?.length||'—'}</div><div class="stat-label">Games</div></div><div class="stat"><div class="stat-value">—</div><div class="stat-label">Current Record</div></div><div class="stat"><div class="stat-value">—</div><div class="stat-label">Season Progress</div></div></div><section class="section" id="practice"><h2>This Week's Practice Schedule</h2><div class="banner practice-banner">${practiceView.banner}</div><div class="grid practice-grid">${practiceView.cards}</div></section><section class="section" id="schedule"><h2>2026 Match Schedule</h2>${games(team)}</section><section class="section" id="roster"><h2>Meet the Team</h2><div class="grid">${roster(team)}</div></section><section class="section"><h2>${esc(team.title)} Standings</h2><div class="standings" data-standings-host></div></section><a class="back" href="../../athletics.html">← Back to Explore Academy Athletics</a></div></main>`;standings(team);}
render();
