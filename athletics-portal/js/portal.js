import { db, storage } from "./firebase.js";
import { requireVerifiedUser, ensureUserDoc, logout } from "./auth.js";
import { teams as fallbackTeams, windowMap, gradeCompatible, genderCompatible, athleteOpportunityConflict } from "./seed-data.js";
import {
 collection,getDocs,doc,getDoc,setDoc,deleteDoc,serverTimestamp,query,where
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { ref,uploadBytes } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";

const $=id=>document.getElementById(id);
const user=await requireVerifiedUser();
await ensureUserDoc(user);
$("userEmail").textContent=user.email;
$("logoutBtn").onclick=logout;

let teams=fallbackTeams, athletes=[], athlete=null, registrations=[], payments=[], documents=[];

try{
 const snap=await getDocs(collection(db,"teams"));
 if(!snap.empty) teams=snap.docs.map(d=>({id:d.id,...d.data()}));
}catch(e){ console.warn("Using packaged program catalog.",e); }

$("addAthleteBtn").onclick=()=>$("addAthleteModal").classList.remove("hidden");
$("cancelAddAthlete").onclick=()=>$("addAthleteModal").classList.add("hidden");
$("docType").onchange=()=>$("physicalDates").classList.toggle("hidden",$("docType").value!=="physical");

$("addAthleteForm").onsubmit=async e=>{
 e.preventDefault();
 const id=crypto.randomUUID();
 const data={
   familyUid:user.uid,email:user.email,
   firstName:$("newFirst").value.trim(),lastName:$("newLast").value.trim(),
   grade:$("newGrade").value,gender:$("newGender").value,
   adminEligibility:"eligible",createdAt:serverTimestamp(),updatedAt:serverTimestamp()
 };
 await setDoc(doc(db,"athletes",id),data);
 e.target.reset();$("addAthleteModal").classList.add("hidden");
 await loadAthletes();await selectAthlete(id);
};

await loadAthletes();

async function loadAthletes(){
 const q=query(collection(db,"athletes"),where("familyUid","==",user.uid));
 const snap=await getDocs(q);
 athletes=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>name(a).localeCompare(name(b)));
 renderAthleteCards();
 if(!athlete && athletes.length) await selectAthlete(athletes[0].id);
}
function renderAthleteCards(){
 $("athleteCards").innerHTML=athletes.length?athletes.map(a=>`
 <button class="card athlete-card" data-athlete="${a.id}" style="text-align:left">
   <span class="eyebrow">GRADE ${esc(a.grade||"—")}</span>
   <h3>${esc(name(a))}</h3><p>${esc(a.gender||"Profile incomplete")}</p>
 </button>`).join(""):'<div class="notice warning">Add your first athlete to begin.</div>';
 document.querySelectorAll("[data-athlete]").forEach(b=>b.onclick=()=>selectAthlete(b.dataset.athlete));
}
async function selectAthlete(id){
 athlete=athletes.find(a=>a.id===id);if(!athlete)return;
 $("athleteWorkspace").classList.remove("hidden");
 for(const field of ["firstName","lastName","dob","grade","gender","phone","guardianName","guardianEmail","guardianPhone","emergencyName","emergencyPhone","shirtSize","medicalNotes"]){
   $(field).value=athlete[field]||"";
 }
 $("profileHeading").textContent=`${name(athlete)} • Athlete Profile`;
 $("eligibilityStatus").textContent=athlete.adminEligibility==="hold"?"On Hold":athlete.adminEligibility==="ineligible"?"Ineligible":"Eligible";
 updateProfilePct();
 await Promise.all([loadRegistrations(),loadPayments(),loadDocuments()]);
 await loadSchedule();
 renderPathway();
}

$("profileForm").onsubmit=async e=>{
 e.preventDefault();
 const data=Object.fromEntries(new FormData(e.target).entries());
 data.familyUid=user.uid;data.email=user.email;data.updatedAt=serverTimestamp();
 await setDoc(doc(db,"athletes",athlete.id),data,{merge:true});
 athlete={...athlete,...data};
 athletes=athletes.map(a=>a.id===athlete.id?athlete:a);
 renderAthleteCards();updateProfilePct();renderPathway();
 flash("profileStatus","Profile saved.","success");
};

function updateProfilePct(){
 const keys=["firstName","lastName","dob","grade","gender","guardianName","guardianPhone","emergencyName","emergencyPhone"];
 const pct=Math.round(keys.filter(k=>athlete[k]).length/keys.length*100);
 $("profilePct").textContent=pct+"%";$("profileBar").style.width=pct+"%";
}
function eligibleTeams(){
 return teams.filter(t=>gradeCompatible(t,athlete.grade)&&genderCompatible(t,athlete.gender)&&!["cancelled","complete"].includes(t.status));
}
function renderPathway(){
 const eligible=eligibleTeams();
 const grouped={};
 for(const t of eligible){
   const label=`${t.audience==="Elementary"?"Grades 4–5":t.audience==="Middle School"?"Grades 6–8":"Grades 4–8"} • ${windowMap[t.windowId]?.label||"Program"}`;
   (grouped[label]??=[]).push(t);
 }
 $("sportsPathway").innerHTML=Object.entries(grouped).map(([label,rows])=>`
   <div class="pathway-block" style="margin:14px 0">
   <strong>${esc(label)}</strong>
   <div class="checklist" style="margin-top:8px">${rows.map(t=>{
     const existing=registrations.find(r=>r.teamId===t.id&&r.status!=="declined");
     const conflicts=eligible.filter(o=>o.id!==t.id&&athleteOpportunityConflict(t,o) && registrations.some(r=>r.teamId===o.id&&r.status!=="declined"));
     return `<div class="check">
       <div style="flex:1"><strong>${esc(t.displayName||t.name)}</strong>
       <small>${fmt(t.competitionStart)} – ${fmt(t.regularSeasonEnd)}${conflicts.length?` • ⚠ overlaps ${conflicts.map(x=>esc(x.displayName||x.name)).join(", ")}`:""}</small></div>
       ${existing?`<span class="badge badge-blue">${esc(existing.status)}</span><button class="btn btn-danger" data-withdraw="${t.id}">Withdraw</button>`:`<button class="btn btn-primary" data-interest="${t.id}">I'm Interested</button>`}
     </div>`;
   }).join("")}</div></div>`).join("")||"<p>Complete grade and gender to see eligible sports.</p>";

 document.querySelectorAll("[data-interest]").forEach(b=>b.onclick=()=>submitInterest(b.dataset.interest));
 document.querySelectorAll("[data-withdraw]").forEach(b=>b.onclick=()=>withdrawInterest(b.dataset.withdraw));
}
async function submitInterest(teamId){
 if(!athlete.firstName||!athlete.grade||!athlete.gender)return flash("registrationStatus","Complete the athlete profile first.","warning");
 const t=teams.find(x=>x.id===teamId);if(!t)return;
 const selected=registrations.filter(r=>r.status!=="declined").map(r=>teams.find(x=>x.id===r.teamId)).filter(Boolean);
 const conflicts=selected.filter(o=>athleteOpportunityConflict(t,o));
 await setDoc(doc(db,"athletes",athlete.id,"registrations",teamId),{
   athleteId:athlete.id,familyUid:user.uid,teamId:t.id,teamName:t.displayName||t.name,
   windowId:t.windowId,status:"submitted",conflictTeamIds:conflicts.map(x=>x.id),submittedAt:serverTimestamp()
 });
 await loadRegistrations();renderPathway();
 flash("registrationStatus",conflicts.length?`Interest saved. This overlaps ${conflicts.map(x=>x.displayName||x.name).join(", ")}.`:"Interest saved. No athlete conflict detected.","success");
}
async function withdrawInterest(teamId){
 if(!confirm("Withdraw this sports interest?"))return;
 await deleteDoc(doc(db,"athletes",athlete.id,"registrations",teamId));
 await loadRegistrations();renderPathway();
}
async function loadRegistrations(){
 const snap=await getDocs(collection(db,"athletes",athlete.id,"registrations"));
 registrations=snap.docs.map(d=>({id:d.id,...d.data()}));
 $("registrationList").innerHTML=registrations.length?registrations.map(r=>`
 <div class="check"><div><strong>${esc(r.teamName||r.teamId)}</strong><small>${esc(windowMap[r.windowId]?.label||"")} • ${esc(r.status||"submitted")}</small></div></div>`).join(""):"";
}

async function loadPayments(){
 const snap=await getDocs(collection(db,"athletes",athlete.id,"payments"));
 payments=snap.docs.map(d=>({id:d.id,...d.data()}));
 let balance=0;
 $("paymentRows").innerHTML=payments.length?payments.map(p=>{
   const b=Math.max(0,Number(p.amountDue||0)-Number(p.amountPaid||0));balance+=b;
   return `<tr><td>${esc(p.label||"Sports Fee")}</td><td>${money(p.amountDue)}</td><td>${money(p.amountPaid)}</td><td>${money(b)}</td><td>${esc(p.status||"due")}</td></tr>`;
 }).join(""):'<tr><td colspan="5">No fees posted.</td></tr>';
 $("amountDue").textContent=money(balance);
}
async function loadDocuments(){
 const snap=await getDocs(collection(db,"athletes",athlete.id,"documents"));
 documents=snap.docs.map(d=>({id:d.id,...d.data()}));
 const approved=new Set(documents.filter(d=>d.reviewStatus==="approved").map(d=>d.type));
 $("docMetric").textContent=`${["birth-certificate","physical"].filter(x=>approved.has(x)).length}/2`;
 $("docList").innerHTML=documents.length?documents.map(d=>`
 <div class="doc-row"><div><strong>${esc(labelDoc(d.type))}</strong><small style="display:block">${esc(d.fileName||"")}${d.physicalExpirationDate?` • Expires ${esc(d.physicalExpirationDate)}`:""}</small></div><span class="badge ${d.reviewStatus==="approved"?"badge-green":"badge-gold"}">${esc(d.reviewStatus||"pending")}</span></div>`).join(""):'<p>No documents uploaded.</p>';
}
$("uploadForm").onsubmit=async e=>{
 e.preventDefault();
 const type=$("docType").value,file=$("docFile").files[0];if(!type||!file)return;
 if(file.size>=10*1024*1024)return flash("uploadStatus","File must be under 10 MB.","danger");
 const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_"), path=`athlete-documents/${athlete.id}/${type}/${Date.now()}-${safe}`;
 await uploadBytes(ref(storage,path),file,{contentType:file.type});
 const id=`${type}-${Date.now()}`;
 await setDoc(doc(db,"athletes",athlete.id,"documents",id),{
   type,fileName:file.name,storagePath:path,reviewStatus:"pending",
   physicalExamDate:type==="physical"?$("physicalExamDate").value:"",
   physicalExpirationDate:type==="physical"?$("physicalExpirationDate").value:"",
   uploadedAt:serverTimestamp()
 });
 e.target.reset();$("physicalDates").classList.add("hidden");await loadDocuments();
 flash("uploadStatus","Uploaded securely and sent for review.","success");
};
async function loadSchedule(){
 const approved=registrations.filter(r=>r.status==="approved");
 const rows=[];
 for(const r of approved){
   const snap=await getDocs(collection(db,"teams",r.teamId,"events"));
   snap.forEach(d=>rows.push({teamName:r.teamName,...d.data()}));
 }
 rows.sort((a,b)=>String(a.date||"").localeCompare(String(b.date||"")));
 $("athleteEventList").innerHTML=rows.length?rows.map(e=>`<div class="check"><div><strong>${esc(e.date||"")} • ${esc(e.title||"")}</strong><small>${esc(e.teamName||"")} ${e.start?"• "+esc(e.start):""} ${e.location?"• "+esc(e.location):""}</small></div></div>`).join(""):"<p>No upcoming approved-team events yet.</p>";
}
function name(a){return `${a?.firstName||""} ${a?.lastName||""}`.trim()||"Unnamed Athlete"}
function fmt(v){if(!v)return "TBA";const [y,m,d]=v.split("-").map(Number);return new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric"}).format(new Date(y,m-1,d))}
function money(n){return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n||0))}
function labelDoc(v){return v==="birth-certificate"?"Birth Certificate":v==="physical"?"Sports Physical":v==="insurance"?"Insurance":"Document"}
function flash(id,text,type){const el=$(id);el.textContent=text;el.className=`notice ${type} status show`;setTimeout(()=>el.classList.remove("show"),5500)}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
