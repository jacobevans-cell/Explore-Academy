import { db, storage } from "./firebase.js";
import { requireVerifiedUser, ensureUserDoc, logout } from "./auth.js";
import { programWindows, teams as fallbackTeams, windowMap, gradeCompatible, genderCompatible, athleteOpportunityConflict } from "./seed-data.js";
import {
 collection,getDocs,doc,getDoc,setDoc,updateDoc,deleteDoc,serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { ref,getBlob } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

const $=id=>document.getElementById(id);
const user=await requireVerifiedUser({admin:true});
await ensureUserDoc(user);
$("adminEmail").textContent=user.email;$("logoutBtn").onclick=logout;

let athletes=[],teams=fallbackTeams,regs=[],documents=[],payments=[],rosters={},events=[];

for(const b of document.querySelectorAll("[data-panel]")) b.onclick=()=>{
 document.querySelectorAll("[data-panel]").forEach(x=>x.classList.remove("active"));b.classList.add("active");
 document.querySelectorAll(".admin-panel").forEach(x=>x.classList.remove("active"));$(b.dataset.panel).classList.add("active");
};

$("seedBtn").onclick=async()=>{
 const btn=$("seedBtn"),old=btn.textContent;btn.disabled=true;btn.textContent="Refreshing...";
 try{
  for(const w of programWindows) await setDoc(doc(db,"seasons",w.id),{...w,updatedAt:serverTimestamp()},{merge:true});
  for(const t of fallbackTeams) await setDoc(doc(db,"teams",t.id),{...t,updatedAt:serverTimestamp()},{merge:true});
  toast(`Catalog refreshed: ${programWindows.length} windows and ${fallbackTeams.length} programs.`,"success");await refresh();
 }catch(e){console.error(e);toast(`${e.code||"Error"}: ${e.message||e}`,"danger")}
 finally{btn.disabled=false;btn.textContent=old}
};

await refresh();

async function refresh(){
 await loadTeams();await loadAthletes();await Promise.all([loadRegs(),loadDocs(),loadPayments(),loadEvents()]);
 renderAthletes();renderAttention();
}
async function loadTeams(){
 const s=await getDocs(collection(db,"teams"));teams=s.empty?fallbackTeams:s.docs.map(d=>({id:d.id,...d.data()}));
 rosters={};
 for(const t of teams){const r=await getDocs(collection(db,"teams",t.id,"roster"));rosters[t.id]=r.docs.map(d=>({athleteId:d.id,...d.data()}))}
 $("teamCount").textContent=teams.length;renderTeams();fillTeamSelects();
}
async function loadAthletes(){
 const s=await getDocs(collection(db,"athletes"));athletes=s.docs.map(d=>({id:d.id,...d.data()}));
 $("athleteCount").textContent=athletes.length;fillAthleteSelects();
}
async function loadRegs(){
 regs=[];
 for(const a of athletes){const s=await getDocs(collection(db,"athletes",a.id,"registrations"));s.forEach(d=>regs.push({id:d.id,athleteId:a.id,athlete:name(a),grade:a.grade||"",...d.data()}))}
 $("registrationCount").textContent=regs.filter(r=>r.status==="submitted").length;renderRegs();
}
async function loadDocs(){
 documents=[];
 for(const a of athletes){const s=await getDocs(collection(db,"athletes",a.id,"documents"));s.forEach(d=>documents.push({id:d.id,athleteId:a.id,athlete:name(a),...d.data()}))}
 $("documentPending").textContent=documents.filter(d=>(d.reviewStatus||"pending")==="pending").length;renderDocs();
}
async function loadPayments(){
 payments=[];
 for(const a of athletes){const s=await getDocs(collection(db,"athletes",a.id,"payments"));s.forEach(d=>payments.push({id:d.id,athleteId:a.id,athlete:name(a),...d.data()}))}
 renderPayments();
}
async function loadEvents(){
 events=[];
 for(const t of teams){const s=await getDocs(collection(db,"teams",t.id,"events"));s.forEach(d=>events.push({id:d.id,teamId:t.id,teamName:t.name,...d.data()}))}
 renderEvents();
}

function renderAthletes(){
 const q=$("athleteSearch").value.toLowerCase(),gf=$("athleteGradeFilter").value;
 const rows=athletes.filter(a=>(!q||`${name(a)} ${a.guardianName||""}`.toLowerCase().includes(q))&&(!gf||String(a.grade)===gf));
 $("athleteRows").innerHTML=rows.map(a=>{
  const bal=balance(a.id),comp=compliance(a.id);
  return `<tr><td><strong>${esc(name(a))}</strong><br><small>${esc(a.email||"")}</small></td><td>${esc(a.grade||"")}</td><td>${esc(a.gender||"")}</td><td>${esc(a.guardianName||"")}</td><td>${comp.approved}/2</td><td>${money(bal)}</td><td><button class="btn btn-secondary" data-athlete="${a.id}">Open</button></td></tr>`;
 }).join("")||'<tr><td colspan="7">No athletes yet.</td></tr>';
 document.querySelectorAll("[data-athlete]").forEach(b=>b.onclick=()=>openAthlete(b.dataset.athlete));
}
$("athleteSearch").oninput=renderAthletes;$("athleteGradeFilter").onchange=renderAthletes;
function openAthlete(id){
 const a=athletes.find(x=>x.id===id);if(!a)return;
 $("selectedAthleteId").value=id;$("selectedAthlete").textContent=name(a);
 $("adminEligibility").value=a.adminEligibility||"eligible";$("adminNote").value=a.adminNote||"";
 $("athleteDetail").innerHTML=`<div class="grid grid-4"><div><span class="metric-label">Grade</span><div class="metric">${esc(a.grade||"—")}</div></div><div><span class="metric-label">Balance</span><div class="metric">${money(balance(id))}</div></div><div><span class="metric-label">Documents</span><div class="metric">${compliance(id).approved}/2</div></div><div><span class="metric-label">Interests</span><div class="metric">${regs.filter(r=>r.athleteId===id).length}</div></div></div>`;
 $("athleteEditor").classList.remove("hidden");document.querySelector('[data-panel="athletesPanel"]').click();
}
$("athleteAdminForm").onsubmit=async e=>{
 e.preventDefault();const id=$("selectedAthleteId").value;if(!id)return;
 await setDoc(doc(db,"athletes",id),{adminEligibility:$("adminEligibility").value,adminNote:$("adminNote").value.trim(),adminUpdatedAt:serverTimestamp()},{merge:true});
 toast("Athlete status saved.","success");await refresh();openAthlete(id);
};

function renderRegs(){
 $("registrationRows").innerHTML=regs.map(r=>`<tr><td>${esc(r.athlete)}</td><td>${esc(r.grade)}</td><td>${esc(teamName(r.teamId))}</td><td>${esc(windowMap[r.windowId]?.label||"")}</td><td>${conflictLabel(r)}</td><td>${esc(r.status||"submitted")}</td><td><button class="btn btn-secondary" data-reg="${r.athleteId}|${r.id}|approved">Approve</button> <button class="btn btn-secondary" data-reg="${r.athleteId}|${r.id}|waitlist">Waitlist</button> <button class="btn btn-danger" data-reg="${r.athleteId}|${r.id}|declined">Decline</button></td></tr>`).join("")||'<tr><td colspan="7">No sport interests yet.</td></tr>';
 document.querySelectorAll("[data-reg]").forEach(b=>b.onclick=()=>reviewReg(...b.dataset.reg.split("|")));
}
async function reviewReg(aid,id,status){
 const r=regs.find(x=>x.athleteId===aid&&x.id===id),t=teams.find(x=>x.id===r?.teamId),a=athletes.find(x=>x.id===aid);if(!r||!t||!a)return;
 if(status==="approved"){
   const valid=gradeCompatible(t,a.grade,{adminOverride:true})&&genderCompatible(t,a.gender);
   if(!valid&&!confirm("This athlete is outside normal team eligibility. Use admin override anyway?"))return;
   await setDoc(doc(db,"teams",t.id,"roster",aid),{athleteId:aid,athleteName:name(a),grade:a.grade||"",gender:a.gender||"",addedAt:serverTimestamp()},{merge:true});
   if(Number(t.sportsFee||0)>0){
     const p=doc(db,"athletes",aid,"payments",`team-${t.id}`),ps=await getDoc(p),paid=ps.exists()?Number(ps.data().amountPaid||0):0,due=Number(t.sportsFee||0);
     await setDoc(p,{teamId:t.id,label:`${t.name} Sports Fee`,amountDue:due,amountPaid:paid,status:paymentStatus(due,paid),updatedAt:serverTimestamp()},{merge:true});
   }
 }
 await updateDoc(doc(db,"athletes",aid,"registrations",id),{status,reviewedAt:serverTimestamp(),reviewedBy:user.email});
 toast(`Interest ${status}.`,"success");await refresh();
}
function conflictLabel(r){return Array.isArray(r.conflictTeamIds)&&r.conflictTeamIds.length?`⚠ ${r.conflictTeamIds.map(teamName).join(", ")}`:"None"}

function renderDocs(){
 $("documentRows").innerHTML=documents.map(d=>`<tr><td>${esc(d.athlete)}</td><td>${esc(labelDoc(d.type))}</td><td>${d.physicalExpirationDate?esc(d.physicalExpirationDate):"—"}</td><td>${esc(d.reviewStatus||"pending")}</td><td><button class="btn btn-secondary" data-file="${escAttr(d.storagePath||"")}">Open</button> <button class="btn btn-secondary" data-doc="${d.athleteId}|${d.id}|approved">Approve</button> <button class="btn btn-danger" data-doc="${d.athleteId}|${d.id}|rejected">Reject</button></td></tr>`).join("")||'<tr><td colspan="5">No documents.</td></tr>';
 document.querySelectorAll("[data-file]").forEach(b=>b.onclick=async()=>{try{const blob=await getBlob(ref(storage,b.dataset.file)),url=URL.createObjectURL(blob);window.open(url,"_blank","noopener");setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(e){toast("Unable to open file.","danger")}});
 document.querySelectorAll("[data-doc]").forEach(b=>b.onclick=async()=>{const [aid,id,status]=b.dataset.doc.split("|");await updateDoc(doc(db,"athletes",aid,"documents",id),{reviewStatus:status,reviewedAt:serverTimestamp()});await refresh()});
}
function renderPayments(){
 let due=0,paid=0;payments.forEach(p=>{due+=Number(p.amountDue||0);paid+=Number(p.amountPaid||0)});
 $("paymentsDue").textContent=money(Math.max(0,due-paid));$("paymentsPaid").textContent=money(paid);
 $("paymentRows").innerHTML=payments.map(p=>`<tr><td>${esc(p.athlete)}</td><td>${esc(p.label||"Sports Fee")}</td><td>${money(p.amountDue)}</td><td>${money(p.amountPaid)}</td><td>${money(Math.max(0,Number(p.amountDue||0)-Number(p.amountPaid||0)))}</td><td>${esc(p.status||"due")}</td></tr>`).join("")||'<tr><td colspan="6">No fees posted.</td></tr>';
}
function fillAthleteSelects(){
 $("paymentAthlete").innerHTML='<option value="">Choose athlete</option>'+athletes.map(a=>`<option value="${a.id}">${esc(name(a))}</option>`).join("");
}
$("paymentForm").onsubmit=async e=>{
 e.preventDefault();const aid=$("paymentAthlete").value,id=$("paymentRecord").value;if(!aid||!id)return;
 const refp=doc(db,"athletes",aid,"payments",id),snap=await getDoc(refp);if(!snap.exists())return toast("Payment record not found.","danger");
 const p=snap.data(),amount=Number($("paymentAmount").value||0),newPaid=Number(p.amountPaid||0)+amount;
 const tx=[...(p.transactions||[]),{amount,method:$("paymentMethod").value,reference:$("paymentReference").value.trim(),date:new Date().toISOString()}];
 await updateDoc(refp,{amountPaid:newPaid,status:paymentStatus(Number(p.amountDue||0),newPaid),transactions:tx,updatedAt:serverTimestamp()});
 e.target.reset();toast("Payment posted.","success");await refresh();
};

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
function compliance(id){const ds=documents.filter(d=>d.athleteId===id&&d.reviewStatus==="approved"),set=new Set(ds.map(d=>d.type));return{approved:["birth-certificate","physical"].filter(x=>set.has(x)).length}}
function balance(id){return payments.filter(p=>p.athleteId===id).reduce((n,p)=>n+Math.max(0,Number(p.amountDue||0)-Number(p.amountPaid||0)),0)}
function paymentStatus(due,paid){if(due<=0)return"waived";if(paid<=0)return"due";if(paid<due)return"partial";return"paid"}
function fillAthleteSelects(){ $("paymentAthlete").innerHTML='<option value="">Choose athlete</option>'+athletes.map(a=>`<option value="${a.id}">${esc(name(a))}</option>`).join("") }
$("paymentAthlete").onchange=()=>{const aid=$("paymentAthlete").value;$("paymentRecord").innerHTML='<option value="">Choose fee</option>'+payments.filter(p=>p.athleteId===aid).map(p=>`<option value="${p.id}">${esc(p.label||p.id)} • ${money(Math.max(0,Number(p.amountDue||0)-Number(p.amountPaid||0)))}</option>`).join("")};
function teamName(id){return teams.find(t=>t.id===id)?.name||id}
function athleteName(id){return name(athletes.find(a=>a.id===id)||{})}
function name(a){return `${a?.firstName||""} ${a?.lastName||""}`.trim()||"Unnamed Athlete"}
function labelDoc(v){return v==="birth-certificate"?"Birth Certificate":v==="physical"?"Sports Physical":v==="insurance"?"Insurance":"Document"}
function money(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n||0))}
function toast(text,type){const e=$("adminStatus");e.textContent=text;e.className=`notice ${type} status show`;setTimeout(()=>e.classList.remove("show"),5500)}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function escAttr(v){return esc(v)}
