import { db, storage } from "./firebase.js";
import { requireVerifiedUser, ensureUserDoc, logout } from "./auth.js";
import { programWindows, teams as fallbackTeams, windowMap, gradeCompatible, genderCompatible, athleteOpportunityConflict } from "./seed-data.js";
import {
 collection,getDocs,doc,getDoc,setDoc,updateDoc,deleteDoc,serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// NOTE: Athletes, Registrations, Documents/Compliance, and Payments panels are
// owned by admin-athletes.js, admin-registrations.js, admin-compliance.js, and
// admin-payments.js respectively. This file only owns Teams, Schedules, the
// Overview attention list, and the shared team catalog seed button — it must
// not render into #athleteRows, #registrationRows, #paymentRows, or
// #complianceRows, since those modules already own that DOM.

const $=id=>document.getElementById(id);
const user=await requireVerifiedUser({admin:true});
$("adminEmail").textContent=user.email;$("logoutBtn").onclick=logout;

let athletes=[],teams=fallbackTeams,regs=[],documents=[],payments=[],rosters={},events=[];
for(const t of teams) rosters[t.id]=[];
queueMicrotask(()=>{
  try{
    $("teamCount").textContent=teams.length;
    renderTeams();
    fillTeamSelects();
  }catch(e){ console.warn("Initial local team preview deferred",e); }
});

try {
 await ensureUserDoc(user);
} catch(e) {
 console.error("User doc setup failed",e);
 toast(`Account setup warning: ${e.code||e.message||e}`,"danger");
}

$("seedBtn").onclick=async()=>{
 const btn=$("seedBtn"),old=btn.textContent;
 btn.disabled=true;
 btn.textContent="Refreshing...";
 // Always show the approved catalog immediately. This proves the button and
 // local athletics model are working even if Firestore rejects the write.
 teams=[...fallbackTeams];
 rosters={};
 for(const t of teams) rosters[t.id]=rosters[t.id]||[];
 $("teamCount").textContent=teams.length;
 renderTeams();
 fillTeamSelects();
 persistentStatus(`Loaded ${fallbackTeams.length} programs locally. Saving to Firebase...`,"info");

 try{
  for(const w of programWindows){
    await setDoc(doc(db,"seasons",w.id),{...w,updatedAt:serverTimestamp()},{merge:true});
  }
  for(const t of fallbackTeams){
    await setDoc(doc(db,"teams",t.id),{...t,updatedAt:serverTimestamp()},{merge:true});
  }
  persistentStatus(`SUCCESS: Firebase catalog saved. ${programWindows.length} season windows and ${fallbackTeams.length} programs are now live.`,"success");
  await refresh();
 }catch(e){
  console.error("Team catalog Firebase save failed",e);
  const code=e?.code||"unknown";
  const message=e?.message||String(e);
  persistentStatus(`FIREBASE SAVE FAILED (${code}): ${message}. The teams shown below are the local approved catalog only.`,"danger");
 }finally{
  btn.disabled=false;
  btn.textContent=old;
 }
};

try {
 await refresh();
} catch(e) {
 console.error("Initial admin refresh failed",e);
 toast(`Admin data load failed: ${e.code||e.message||e}`,"danger");
}

async function refresh(){
 await loadTeams();await loadAthletes();await Promise.all([loadRegs(),loadDocs(),loadPayments(),loadEvents()]);
 renderAttention();
}
async function loadTeams(){
 const s=await getDocs(collection(db,"teams"));teams=s.empty?fallbackTeams:s.docs.map(d=>({id:d.id,...d.data()}));
 rosters={};
 for(const t of teams){const r=await getDocs(collection(db,"teams",t.id,"roster"));rosters[t.id]=r.docs.map(d=>({athleteId:d.id,...d.data()}))}
 $("teamCount").textContent=teams.length;renderTeams();fillTeamSelects();
}
async function loadAthletes(){
 const s=await getDocs(collection(db,"athletes"));athletes=s.docs.map(d=>({id:d.id,...d.data()}));
}
async function loadRegs(){
 regs=[];
 for(const a of athletes){const s=await getDocs(collection(db,"athletes",a.id,"registrations"));s.forEach(d=>regs.push({id:d.id,athleteId:a.id,athlete:name(a),grade:a.grade||"",...d.data()}))}
}
async function loadDocs(){
 documents=[];
 for(const a of athletes){const s=await getDocs(collection(db,"athletes",a.id,"documents"));s.forEach(d=>documents.push({id:d.id,athleteId:a.id,athlete:name(a),...d.data()}))}
}
async function loadPayments(){
 payments=[];
 for(const a of athletes){const s=await getDocs(collection(db,"athletes",a.id,"payments"));s.forEach(d=>payments.push({id:d.id,athleteId:a.id,athlete:name(a),...d.data()}))}
}
async function loadEvents(){
 events=[];
 for(const t of teams){const s=await getDocs(collection(db,"teams",t.id,"events"));s.forEach(d=>events.push({id:d.id,teamId:t.id,teamName:t.name,...d.data()}))}
 renderEvents();
}

function renderTeams(){
 $("teamRows").innerHTML=teams.map(t=>`<tr><td><strong>${esc(t.name)}</strong></td><td>${esc(t.audience||"")}</td><td>${esc(t.grades)}</td><td>${esc(windowMap[t.windowId]?.label||"")}</td><td>${(rosters[t.id]||[]).length}/${t.targetRoster||"—"}</td><td>${money(t.costEstimate||0)}</td><td>${esc(t.status||"")}</td><td><button class="btn btn-secondary" data-team="${t.id}">Manage</button></td></tr>`).join("");
 document.querySelectorAll("[data-team]").forEach(b=>b.onclick=()=>openTeam(b.dataset.team));
}
function openTeam(id){
 const t=teams.find(x=>x.id===id);if(!t)return;
 $("selectedTeamId").value=id;$("selectedTeamName").textContent=t.name;$("selectedTeamMeta").textContent=`${t.audience} • Grades ${t.grades} • ${windowMap[t.windowId]?.label||""}`;
 $("teamStatus").value=t.status||"interest";$("teamCoach").value=t.coach||"";$("teamCoachEmail").value=t.coachEmail||"";$("teamFee").value=t.sportsFee||"";$("teamMinRoster").value=t.minRoster||"";$("teamTargetRoster").value=t.targetRoster||"";
 const eligible=athletes.filter(a=>!(rosters[id]||[]).some(r=>r.athleteId===a.id)&&gradeCompatible(t,a.grade,{adminOverride:false})&&genderCompatible(t,a.gender));
 $("teamAddAthlete").innerHTML='<option value="">Choose eligible athlete</option>'+eligible.map(a=>`<option value="${a.id}">${esc(name(a))} • Grade ${esc(a.grade)}</option>`).join("");
 renderRoster(t);$("teamEditor").classList.remove("hidden");document.querySelector('[data-panel="teamsPanel"]').click();
}
function renderRoster(t){
 $("teamRosterList").innerHTML=(rosters[t.id]||[]).map(r=>`<div class="check"><div style="flex:1"><strong>${esc(r.athleteName||athleteName(r.athleteId))}</strong><small>#${esc(r.jerseyNumber||"—")} • ${esc(r.position||"Unassigned")}</small></div><button class="btn btn-danger" data-remove="${t.id}|${r.athleteId}">Remove</button></div>`).join("")||"<p>No athletes rostered.</p>";
 document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=async()=>{const [tid,aid]=b.dataset.remove.split("|");if(!confirm("Remove athlete from roster?"))return;await deleteDoc(doc(db,"teams",tid,"roster",aid));const rr=doc(db,"athletes",aid,"registrations",tid),s=await getDoc(rr);if(s.exists())await updateDoc(rr,{status:"waitlist"});await refresh();openTeam(tid)});
}
$("teamSettingsForm").onsubmit=async e=>{
 e.preventDefault();const id=$("selectedTeamId").value;
 await setDoc(doc(db,"teams",id),{status:$("teamStatus").value,coach:$("teamCoach").value.trim(),coachEmail:$("teamCoachEmail").value.trim(),sportsFee:Number($("teamFee").value||0),minRoster:Number($("teamMinRoster").value||0),targetRoster:Number($("teamTargetRoster").value||0),updatedAt:serverTimestamp()},{merge:true});
 toast("Team saved.","success");await refresh();openTeam(id);
};
$("teamAddAthleteBtn").onclick=async()=>{
 const tid=$("selectedTeamId").value,aid=$("teamAddAthlete").value;if(!tid||!aid)return;
 const a=athletes.find(x=>x.id===aid);
 await setDoc(doc(db,"teams",tid,"roster",aid),{athleteId:aid,athleteName:name(a),grade:a.grade,gender:a.gender,jerseyNumber:$("teamAddNumber").value.trim(),position:$("teamAddPosition").value.trim(),addedAt:serverTimestamp()},{merge:true});
 await refresh();openTeam(tid);
};
function fillTeamSelects(){
 $("eventTeamId").innerHTML='<option value="">Choose team</option>'+teams.map(t=>`<option value="${t.id}">${esc(t.name)} • ${esc(t.audience)}</option>`).join("");
}
function renderEvents(){
 events.sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
 $("eventList").innerHTML=events.map(e=>`<div class="check"><div><strong>${esc(e.date||"")} • ${esc(e.title||"")}</strong><small>${esc(e.teamName)} ${e.opponent?"• "+esc(e.opponent):""} ${e.start?"• "+esc(e.start):""}</small></div></div>`).join("")||"<p>No events yet.</p>";
}
$("eventForm").onsubmit=async e=>{
 e.preventDefault();const tid=$("eventTeamId").value;if(!tid)return;
 const id=crypto.randomUUID();
 await setDoc(doc(db,"teams",tid,"events",id),{type:$("eventType").value,title:$("eventTitle").value.trim(),opponent:$("eventOpponent").value.trim(),homeAway:$("eventHomeAway").value,date:$("eventDate").value,arrival:$("eventArrival").value,start:$("eventStart").value,end:$("eventEnd").value,location:$("eventLocation").value.trim(),transportation:$("eventTransportation").value.trim(),notes:$("eventNotes").value.trim(),createdAt:serverTimestamp()});
 e.target.reset();toast("Event added.","success");await loadEvents();
};
function renderAttention(){
 const out=[];
 const pending=regs.filter(r=>r.status==="submitted");if(pending.length)out.push(`${pending.length} sports interest${pending.length===1?"":"s"} awaiting review`);
 const pd=documents.filter(d=>(d.reviewStatus||"pending")==="pending");if(pd.length)out.push(`${pd.length} document${pd.length===1?"":"s"} awaiting review`);
 const bal=athletes.filter(a=>balance(a.id)>0);if(bal.length)out.push(`${bal.length} athlete${bal.length===1?"":"s"} with balance due`);
 const today=new Date().toISOString().slice(0,10),soon=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
 const exp=documents.filter(d=>d.type==="physical"&&d.reviewStatus==="approved"&&d.physicalExpirationDate&&d.physicalExpirationDate<=soon);if(exp.length)out.push(`${exp.length} physical${exp.length===1?"":"s"} expired or expiring within 30 days`);
 for(const a of athletes){
   const rosterTeams=teams.filter(t=>(rosters[t.id]||[]).some(r=>r.athleteId===a.id));
   for(let i=0;i<rosterTeams.length;i++)for(let j=i+1;j<rosterTeams.length;j++)if(athleteOpportunityConflict(rosterTeams[i],rosterTeams[j]))out.push(`${name(a)}: athlete conflict — ${rosterTeams[i].name} / ${rosterTeams[j].name}`);
 }
 $("attentionList").innerHTML=out.length?out.map(x=>`<div class="check"><span>⚠️</span><strong>${esc(x)}</strong></div>`).join(""):'<div class="notice success">Nothing currently needs attention.</div>';
}
function balance(id){return payments.filter(p=>p.athleteId===id).reduce((n,p)=>n+Math.max(0,Number(p.amountDue||0)-Number(p.amountPaid||0)),0)}
function athleteName(id){return name(athletes.find(a=>a.id===id)||{})}
function name(a){return `${a?.firstName||""} ${a?.lastName||""}`.trim()||"Unnamed Athlete"}
function money(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n||0))}
function toast(text,type){const e=$("adminStatus");if(!e)return;e.textContent=text;e.className=`notice ${type} status show`;setTimeout(()=>e.classList.remove("show"),5500)}
function persistentStatus(text,type="info"){const e=$("adminStatus");if(!e)return;e.textContent=text;e.className=`notice ${type} status show`;}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
