import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const SOURCE_URL='https://www.gobound.com/az/azcaa/gvbcaa/2026-27/standings?level=L7&idGroup=h20260520024408776628b2b39ee0644';
const OUTPUT=path.resolve(process.cwd(),'data/jv-standings.json');
const REGION_NAME='Roadrunner Region';
const REGION_TEAMS=[
  [/basis.*goodyear/i,'BASIS Goodyear','Golden Eagles'],
  [/explore academy/i,'Explore Academy','Eagles'],
  [/sequoia pathfinder.*verrado/i,'Sequoia Pathfinder Academy Verrado','Jets'],
  [/south valley prep/i,'South Valley Prep and Arts Academy','Bengals'],
  [/liberty traditional/i,'Liberty Traditional School','Eagles']
];
const clean=v=>String(v??'').replace(/\u00a0/g,' ').replace(/\s+/g,' ').trim();
const norm=v=>clean(v).toLowerCase().replace(/[.:()%]/g,'');
const asInt=v=>/^\d+$/.test(clean(v))?Number(clean(v)):null;
const pct=(w,l)=>w+l?(w/(w+l)).toFixed(3).replace(/^0/,''):'.000';

function parse(rows){
  const headerAt=rows.findIndex(r=>{const n=r.map(norm);return n.some(x=>/^(team|school|member|name)$/.test(x))&&n.some(x=>/^(w|wins?)$/.test(x))&&n.some(x=>/^(l|loss|losses)$/.test(x));});
  if(headerAt<0)return[];
  const headers=rows[headerAt].map(norm);
  const teamIndex=headers.findIndex(x=>/^(team|school|member|name)$/.test(x));
  const wIndex=headers.findIndex(x=>/^(w|wins?)$/.test(x));
  const lIndex=headers.findIndex(x=>/^(l|loss|losses)$/.test(x));
  const rankIndex=headers.findIndex(x=>/^(#|rank|rk|place|pos)$/.test(x));
  const out=[];
  for(const cells of rows.slice(headerAt+1)){
    const team=clean(cells[teamIndex]).replace(/^\d+[.)]?\s*/,'');
    const wins=asInt(cells[wIndex]); const losses=asInt(cells[lIndex]);
    if(!team||wins==null||losses==null)continue;
    out.push({team,wins,losses,rank:rankIndex>=0?asInt(cells[rankIndex]):out.length+1,pct:pct(wins,losses),...( /explore academy/i.test(team)?{ours:true}:{} )});
  }
  return out;
}

let previous={};
try{previous=JSON.parse(await fs.readFile(OUTPUT,'utf8'));}catch{}
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});
  await page.goto(SOURCE_URL,{waitUntil:'domcontentloaded',timeout:90000});
  await page.waitForTimeout(8000);
  const snapshot=await page.evaluate(()=>({text:(document.body?.innerText||'').slice(0,75000),tables:[...document.querySelectorAll('table')].map(t=>[...t.querySelectorAll('tr')].map(r=>[...r.querySelectorAll(':scope > th,:scope > td')].map(c=>(c.innerText||c.textContent||'').replace(/\s+/g,' ').trim()))) }));
  if(/verify that you(?:'|’)re not a robot|javascript is disabled/i.test(snapshot.text))throw new Error('Bound anti-bot page returned; existing standings left untouched.');
  const candidates=snapshot.tables.map(parse).sort((a,b)=>b.length-a.length);
  const standings=candidates.find(rows=>rows.length>=10&&rows.some(r=>/explore academy/i.test(r.team)))||[];
  if(standings.length<10)throw new Error(`Refusing update: only ${standings.length} standings rows found.`);
  const region=REGION_TEAMS.map(([match,name,mascot])=>{
    const live=standings.find(r=>match.test(r.team));
    if(live)return {...live,team:name,mascot,...(/explore academy/i.test(name)?{ours:true}:{})};
    const old=(previous.regionStandings||[]).find(r=>match.test(r.team||''));
    return old||{team:name,mascot,wins:null,losses:null,pct:null,missingFromFeed:true};
  }).sort((a,b)=>Number(b.pct||-1)-Number(a.pct||-1));
  const payload={source:'CAA / Bound',sourceUrl:SOURCE_URL,updatedAt:new Date().toISOString(),standings,regionName:REGION_NAME,regionStandings:region};
  await fs.writeFile(OUTPUT,JSON.stringify(payload,null,2)+'\n','utf8');
  console.log(`Updated ${standings.length} overall teams and ${region.length} ${REGION_NAME} teams.`);
}finally{await browser.close();}
