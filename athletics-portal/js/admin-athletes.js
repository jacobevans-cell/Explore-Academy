import { db } from "./firebase.js";
import { requireVerifiedUser } from "./auth.js";
import {
  collection, getDocs, doc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const $ = id => document.getElementById(id);
const user = await requireVerifiedUser({admin:true});

let athletes = [];
let detailCache = new Map();

const money = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n||0));
const esc = v => String(v ?? "").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const athleteName = a => `${a?.firstName||""} ${a?.lastName||""}`.trim() || "Unnamed Athlete";
const linked = a => !!String(a?.familyUid||"").trim();

function status(message,type="info",autoHide=false){
  const box=$("athleteAdminStatus");
  if(!box) return;
  box.textContent=message;
  box.className=`notice ${type} status show`;
  if(autoHide) setTimeout(()=>box.classList.remove("show"),5000);
}

async function getSubcollection(aid,name){
  try{
    const s=await getDocs(collection(db,"athletes",aid,name));
    return s.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){
    console.warn(`Unable to load ${name} for ${aid}`,e);
    return [];
  }
}

async function getTeamRosterMembership(aid){
  const memberships=[];
  try{
    const ts=await getDocs(collection(db,"teams"));
    for(const td of ts.docs){
      const rs=await getDocs(collection(db,"teams",td.id,"roster"));
      const match=rs.docs.find(x=>x.id===aid);
      if(match) memberships.push({teamId:td.id,teamName:td.data().name||td.id,...match.data()});
    }
  }catch(e){ console.warn("Roster membership load failed",e); }
  return memberships;
}

async function detailsFor(a){
  if(detailCache.has(a.id)) return detailCache.get(a.id);
  const [registrations,documents,payments,rosters]=await Promise.all([
    getSubcollection(a.id,"registrations"),
    getSubcollection(a.id,"documents"),
    getSubcollection(a.id,"payments"),
    getTeamRosterMembership(a.id)
  ]);
  const result={registrations,documents,payments,rosters};
  detailCache.set(a.id,result);
  return result;
}

function complianceSummary(documents){
  const approved=new Set(documents.filter(d=>d.reviewStatus==="approved").map(d=>d.type));
  return {approved:["birth-certificate","physical"].filter(x=>approved.has(x)).length};
}
function balanceSummary(payments){
  return payments.reduce((sum,p)=>sum+Math.max(0,Number(p.amountDue||0)-Number(p.amountPaid||0)),0);
}

async function loadAthletes(){
  status("Loading athlete records…","info");
  try{
    const snap=await getDocs(collection(db,"athletes"));
    athletes=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>athleteName(a).localeCompare(athleteName(b)));
    detailCache.clear();
    await renderAthletes();
    if($("athleteCount")) $("athleteCount").textContent=athletes.length;
    status(athletes.length?`${athletes.length} athlete profile${athletes.length===1?"":"s"} loaded.`:"No athlete profiles yet. Add one here or have a family register.","success",true);
  }catch(e){
    console.error("Athlete load failed",e);
    status(`ATHLETE LOAD FAILED (${e?.code||"unknown"}): ${e?.message||e}`,"danger");
  }
}

async function renderAthletes(){
  const tbody=$("athleteRows"); if(!tbody) return;
  const q=($("athleteSearch")?.value||"").trim().toLowerCase();
  const grade=$("athleteGradeFilter")?.value||"";
  const linkFilter=$("athleteLinkFilter")?.value||"";

  const visible=athletes.filter(a=>{
    const hay=`${athleteName(a)} ${a.guardianName||""} ${a.guardianEmail||a.email||""}`.toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(grade && String(a.grade)!==grade) return false;
    if(linkFilter==="linked" && !linked(a)) return false;
    if(linkFilter==="unlinked" && linked(a)) return false;
    return true;
  });

  if(!visible.length){
    tbody.innerHTML='<tr><td colspan="8">No matching athletes.</td></tr>';
    return;
  }

  const rows=[];
  for(const a of visible){
    const d=await detailsFor(a);
    const comp=complianceSummary(d.documents);
    const bal=balanceSummary(d.payments);
    const activeRegs=d.registrations.filter(r=>!["declined","withdrawn"].includes(r.status)).length;
    rows.push(`<tr>
      <td><strong>${esc(athleteName(a))}</strong><br><small>${linked(a)?"Family linked":"Admin-created"}</small></td>
      <td>${esc(a.grade||"—")}</td>
      <td>${esc(a.guardianName||"—")}<br><small>${esc(a.guardianEmail||a.email||"")}</small></td>
      <td>${activeRegs}</td>
      <td>${comp.approved}/2</td>
      <td>${money(bal)}</td>
      <td>${esc(a.adminEligibility||"eligible")}</td>
      <td><button class="btn btn-secondary" data-admin-athlete="${esc(a.id)}">Open</button></td>
    </tr>`);
  }
  tbody.innerHTML=rows.join("");
  tbody.querySelectorAll("[data-admin-athlete]").forEach(b=>b.onclick=()=>openAthlete(b.dataset.adminAthlete));
}

async function openAthlete(id){
  const a=athletes.find(x=>x.id===id); if(!a) return;
  const d=await detailsFor(a);
  $("selectedAthleteId").value=id;
  $("selectedAthlete").textContent=athleteName(a);
  $("adminEligibility").value=a.adminEligibility||"eligible";
  $("adminNote").value=a.adminNote||"";

  $("athleteLinkBadge").innerHTML=linked(a)
    ? '<span class="badge badge-green">Family linked</span>'
    : '<span class="badge badge-gold">Admin-created / not yet family linked</span>';

  const comp=complianceSummary(d.documents);
  const bal=balanceSummary(d.payments);
  $("athleteDetail").innerHTML=`
    <div class="grid grid-4" style="margin-top:12px">
      <div><span class="metric-label">Grade</span><div class="metric">${esc(a.grade||"—")}</div></div>
      <div><span class="metric-label">Sports Choices</span><div class="metric">${d.registrations.length}</div></div>
      <div><span class="metric-label">Documents</span><div class="metric">${comp.approved}/2</div></div>
      <div><span class="metric-label">Balance</span><div class="metric">${money(bal)}</div></div>
    </div>
    <div class="grid grid-2" style="margin-top:14px">
      <div class="check"><div><strong>Guardian</strong><small>${esc(a.guardianName||"Not entered")} ${a.guardianEmail?`• ${esc(a.guardianEmail)}`:""} ${a.guardianPhone?`• ${esc(a.guardianPhone)}`:""}</small></div></div>
      <div class="check"><div><strong>Emergency Contact</strong><small>${esc(a.emergencyName||"Not entered")} ${a.emergencyPhone?`• ${esc(a.emergencyPhone)}`:""}</small></div></div>
    </div>`;

  const sportRows=[
    ...d.registrations.map(r=>`<div class="check"><div><strong>${esc(r.teamName||r.teamId)}</strong><small>Interest • ${esc(r.status||"submitted")}</small></div></div>`),
    ...d.rosters.map(r=>`<div class="check"><div><strong>${esc(r.teamName||r.teamId)}</strong><small>Rostered${r.jerseyNumber?` • #${esc(r.jerseyNumber)}`:""}${r.position?` • ${esc(r.position)}`:""}</small></div><span class="badge badge-green">TEAM</span></div>`)
  ];
  $("athleteSportsDetail").innerHTML=sportRows.join("")||"<p>No sports choices or team assignments yet.</p>";

  const complianceRows=[
    ...d.documents.map(x=>`<div class="check"><div><strong>${esc(docLabel(x.type))}</strong><small>${esc(x.reviewStatus||"pending")}${x.physicalExpirationDate?` • expires ${esc(x.physicalExpirationDate)}`:""}</small></div></div>`),
    ...d.payments.map(p=>`<div class="check"><div><strong>${esc(p.label||"Sports Fee")}</strong><small>${money(p.amountPaid||0)} paid of ${money(p.amountDue||0)}</small></div></div>`)
  ];
  $("athleteComplianceDetail").innerHTML=complianceRows.join("")||"<p>No documents or payment records yet.</p>";

  $("athleteEditor").classList.remove("hidden");
}

function docLabel(v){
  return v==="birth-certificate"?"Birth Certificate":v==="physical"?"Sports Physical":v==="insurance"?"Insurance":"Document";
}

$("adminAddAthleteBtn")?.addEventListener("click",()=>{
  $("adminAddAthleteCard").classList.remove("hidden");
  $("athleteEditor").classList.add("hidden");
  $("adminNewFirst")?.focus();
});
$("adminCancelAddAthlete")?.addEventListener("click",()=>{
  $("adminAddAthleteCard").classList.add("hidden");
});
$("closeAthleteEditor")?.addEventListener("click",()=>$("athleteEditor").classList.add("hidden"));

$("adminAddAthleteForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  const btn=e.submitter;
  if(btn){btn.disabled=true;btn.textContent="Creating…";}
  try{
    const id=crypto.randomUUID();
    const guardianEmail=$("adminNewGuardianEmail").value.trim();
    await setDoc(doc(db,"athletes",id),{
      familyUid:"",
      email:guardianEmail,
      firstName:$("adminNewFirst").value.trim(),
      lastName:$("adminNewLast").value.trim(),
      grade:$("adminNewGrade").value,
      gender:$("adminNewGender").value,
      guardianName:$("adminNewGuardian").value.trim(),
      guardianEmail,
      guardianPhone:$("adminNewGuardianPhone").value.trim(),
      adminEligibility:$("adminNewEligibility").value,
      adminNote:$("adminNewNote").value.trim(),
      profileOrigin:"admin",
      familyLinkStatus:"unlinked",
      createdBy:user.email,
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    });
    e.target.reset();
    $("adminAddAthleteCard").classList.add("hidden");
    status("Athlete record created. It remains unlinked until a family account is connected.","success");
    await loadAthletes();
    await openAthlete(id);
  }catch(error){
    console.error("Admin athlete create failed",error);
    status(`CREATE FAILED (${error?.code||"unknown"}): ${error?.message||error}`,"danger");
  }finally{
    if(btn){btn.disabled=false;btn.textContent="Create Athlete Record";}
  }
});

$("athleteAdminForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  e.stopImmediatePropagation();
  const id=$("selectedAthleteId").value;
  if(!id) return;
  try{
    await updateDoc(doc(db,"athletes",id),{
      adminEligibility:$("adminEligibility").value,
      adminNote:$("adminNote").value.trim(),
      adminUpdatedAt:serverTimestamp(),
      adminUpdatedBy:user.email
    });
    const a=athletes.find(x=>x.id===id);
    if(a){a.adminEligibility=$("adminEligibility").value;a.adminNote=$("adminNote").value.trim();}
    status("Athlete admin status saved.","success",true);
    await renderAthletes();
  }catch(error){
    status(`SAVE FAILED (${error?.code||"unknown"}): ${error?.message||error}`,"danger");
  }
},true);

$("athleteSearch")?.addEventListener("input",renderAthletes);
$("athleteGradeFilter")?.addEventListener("change",renderAthletes);
$("athleteLinkFilter")?.addEventListener("change",renderAthletes);

await loadAthletes();
