import { db } from "./firebase.js";
import { requireVerifiedUser } from "./auth.js";
import {
  teams as fallbackTeams, windowMap, gradeCompatible, genderCompatible
} from "./seed-data.js";
import {
  collection,getDocs,doc,setDoc,updateDoc,deleteDoc,serverTimestamp,getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const $=id=>document.getElementById(id);
const user=await requireVerifiedUser({admin:true});

let athletes=[], teams=fallbackTeams, registrations=[];
let docsByAthlete=new Map(), paymentsByAthlete=new Map();

const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const name=a=>`${a?.firstName||""} ${a?.lastName||""}`.trim()||"Unnamed Athlete";
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n||0));

function notice(text,type="info",auto=false){
  const el=$("registrationAdminStatus"); if(!el)return;
  el.textContent=text; el.className=`notice ${type} status show`;
  if(auto)setTimeout(()=>el.classList.remove("show"),5000);
}

function teamById(id){return teams.find(t=>t.id===id)}
function athleteById(id){return athletes.find(a=>a.id===id)}
function requiredDocs(aid){
  const docs=docsByAthlete.get(aid)||[];
  const approved=new Set(docs.filter(d=>d.reviewStatus==="approved").map(d=>d.type));
  return {
    approved:["birth-certificate","physical"].filter(x=>approved.has(x)).length,
    birth:approved.has("birth-certificate"),
    physical:approved.has("physical")
  };
}
function balance(aid){
  return (paymentsByAthlete.get(aid)||[]).reduce((sum,p)=>sum+Math.max(0,Number(p.amountDue||0)-Number(p.amountPaid||0)),0);
}
function conflictText(r){
  const ids=Array.isArray(r.conflictTeamIds)?r.conflictTeamIds:[];
  return ids.length?ids.map(id=>teamById(id)?.displayName||teamById(id)?.name||id).join(", "):"None";
}

async function load(){
  notice("Loading registrations…","info");
  try{
    const [as,ts]=await Promise.all([getDocs(collection(db,"athletes")),getDocs(collection(db,"teams"))]);
    athletes=as.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>name(a).localeCompare(name(b)));
    if(!ts.empty)teams=ts.docs.map(d=>({id:d.id,...d.data()}));

    registrations=[]; docsByAthlete.clear(); paymentsByAthlete.clear();

    for(const a of athletes){
      const [rs,ds,ps]=await Promise.all([
        getDocs(collection(db,"athletes",a.id,"registrations")),
        getDocs(collection(db,"athletes",a.id,"documents")),
        getDocs(collection(db,"athletes",a.id,"payments"))
      ]);
      rs.forEach(d=>registrations.push({id:d.id,athleteId:a.id,...d.data()}));
      docsByAthlete.set(a.id,ds.docs.map(d=>({id:d.id,...d.data()})));
      paymentsByAthlete.set(a.id,ps.docs.map(d=>({id:d.id,...d.data()})));
    }

    if($("registrationCount"))$("registrationCount").textContent=registrations.filter(r=>r.status==="submitted").length;
    fillControls();
    render();
    notice(registrations.length?`${registrations.length} sports choice${registrations.length===1?"":"s"} loaded.`:"No sports choices yet.","success",true);
  }catch(e){
    console.error("Registration workflow load failed",e);
    notice(`REGISTRATION LOAD FAILED (${e?.code||"unknown"}): ${e?.message||e}`,"danger");
  }
}

function fillControls(){
  const athleteSelect=$("adminChoiceAthlete");
  if(athleteSelect){
    athleteSelect.innerHTML='<option value="">Choose athlete</option>'+athletes.map(a=>`<option value="${esc(a.id)}">${esc(name(a))} • Grade ${esc(a.grade||"—")}</option>`).join("");
  }
  const seasonSelect=$("registrationSeasonFilter");
  if(seasonSelect){
    const windows=[...new Set(teams.map(t=>t.windowId).filter(Boolean))];
    seasonSelect.innerHTML='<option value="">All seasons</option>'+windows.map(id=>`<option value="${esc(id)}">${esc(windowMap[id]?.label||id)}</option>`).join("");
  }
  fillEligibleTeamChoices();
}
function fillEligibleTeamChoices(){
  const aid=$("adminChoiceAthlete")?.value||"";
  const select=$("adminChoiceTeam"); if(!select)return;
  const a=athleteById(aid);
  const rows=a?teams.filter(t=>gradeCompatible(t,a.grade,{adminOverride:true})&&genderCompatible(t,a.gender)):teams;
  select.innerHTML='<option value="">Choose program</option>'+rows.map(t=>`<option value="${esc(t.id)}">${esc(t.displayName||t.name)} • ${esc(t.grades)} • ${esc(windowMap[t.windowId]?.label||"")}</option>`).join("");
}

function render(){
  const tbody=$("registrationRows");if(!tbody)return;
  const q=($("registrationSearch")?.value||"").toLowerCase().trim();
  const sf=$("registrationStatusFilter")?.value||"";
  const wf=$("registrationSeasonFilter")?.value||"";

  const rows=registrations.filter(r=>{
    const a=athleteById(r.athleteId),t=teamById(r.teamId);
    const hay=`${name(a)} ${t?.displayName||t?.name||r.teamName||""}`.toLowerCase();
    return (!q||hay.includes(q))&&(!sf||r.status===sf)&&(!wf||r.windowId===wf||t?.windowId===wf);
  });

  if(!rows.length){
    tbody.innerHTML='<tr><td colspan="9">No matching sports choices.</td></tr>';return;
  }

  tbody.innerHTML=rows.map(r=>{
    const a=athleteById(r.athleteId)||{};
    const t=teamById(r.teamId)||{};
    const docs=requiredDocs(r.athleteId);
    const conflicts=conflictText(r);
    const status=r.status||"submitted";
    return `<tr>
      <td><strong>${esc(name(a))}</strong><br><small>${a.familyUid?"Family":"Admin-created"}</small></td>
      <td>${esc(a.grade||"—")}</td>
      <td><strong>${esc(t.displayName||t.name||r.teamName||r.teamId)}</strong><br><small>${esc(t.leagueLabel||t.league||"")}</small></td>
      <td>${esc(windowMap[r.windowId||t.windowId]?.label||"—")}</td>
      <td>${docs.approved}/2 ${docs.approved===2?'<span class="badge badge-green">Ready</span>':'<span class="badge badge-gold">Missing</span>'}</td>
      <td>${money(balance(r.athleteId))}</td>
      <td>${conflicts==="None"?"None":`<span class="badge badge-gold">⚠ ${esc(conflicts)}</span>`}</td>
      <td><strong>${esc(status)}</strong></td>
      <td>
        ${status!=="approved"?`<button class="btn btn-primary" data-reg-action="approve" data-aid="${esc(r.athleteId)}" data-rid="${esc(r.id)}">Approve</button>`:""}
        ${status!=="waitlist"?`<button class="btn btn-secondary" data-reg-action="waitlist" data-aid="${esc(r.athleteId)}" data-rid="${esc(r.id)}">Waitlist</button>`:""}
        ${status!=="declined"?`<button class="btn btn-danger" data-reg-action="decline" data-aid="${esc(r.athleteId)}" data-rid="${esc(r.id)}">Decline</button>`:""}
      </td>
    </tr>`;
  }).join("");

  tbody.querySelectorAll("[data-reg-action]").forEach(btn=>{
    btn.addEventListener("click",e=>{
      e.preventDefault();e.stopImmediatePropagation();
      review(btn.dataset.aid,btn.dataset.rid,btn.dataset.regAction);
    },true);
  });
}

async function review(aid,rid,action){
  const r=registrations.find(x=>x.athleteId===aid&&x.id===rid);
  const a=athleteById(aid),t=teamById(r?.teamId);
  if(!r||!a||!t)return notice("Registration record could not be resolved.","danger");

  if(action==="approve"){
    if(["hold","ineligible"].includes(a.adminEligibility||"")){
      if(!confirm(`${name(a)} is currently marked ${a.adminEligibility}. Approve anyway?`))return;
    }
    const docs=requiredDocs(aid);
    if(docs.approved<2){
      if(!confirm(`${name(a)} has only ${docs.approved}/2 required documents approved. Add to roster anyway?`))return;
    }

    await setDoc(doc(db,"teams",t.id,"roster",aid),{
      athleteId:aid,athleteName:name(a),grade:a.grade||"",gender:a.gender||"",
      sourceRegistrationId:rid,addedAt:serverTimestamp(),addedBy:user.email
    },{merge:true});

    const athleteFee=Number(t.sportsFee||0);
    if(athleteFee>0){
      const pref=doc(db,"athletes",aid,"payments",`team-${t.id}`);
      const existing=await getDoc(pref);
      const paid=existing.exists()?Number(existing.data().amountPaid||0):0;
      await setDoc(pref,{
        teamId:t.id,label:`${t.displayName||t.name} Sports Fee`,
        amountDue:athleteFee,amountPaid:paid,
        status:paid>=athleteFee?"paid":paid>0?"partial":"due",
        updatedAt:serverTimestamp()
      },{merge:true});
    }

    await updateDoc(doc(db,"athletes",aid,"registrations",rid),{
      status:"approved",reviewedAt:serverTimestamp(),reviewedBy:user.email
    });
    notice(`${name(a)} approved and added to ${t.displayName||t.name}.`,"success");
  }else{
    try{await deleteDoc(doc(db,"teams",t.id,"roster",aid));}catch(_){}
    const status=action==="decline"?"declined":"waitlist";
    await updateDoc(doc(db,"athletes",aid,"registrations",rid),{
      status,reviewedAt:serverTimestamp(),reviewedBy:user.email
    });
    notice(`${name(a)} moved to ${status}.`,"success");
  }
  await load();
}

$("adminAddChoiceBtn")?.addEventListener("click",()=>{
  $("adminAddChoiceCard").classList.remove("hidden");
});
$("adminCancelAddChoice")?.addEventListener("click",()=>{
  $("adminAddChoiceCard").classList.add("hidden");
});
$("adminChoiceAthlete")?.addEventListener("change",fillEligibleTeamChoices);

$("adminAddChoiceForm")?.addEventListener("submit",async e=>{
  e.preventDefault();e.stopImmediatePropagation();
  const aid=$("adminChoiceAthlete").value,tid=$("adminChoiceTeam").value;
  const a=athleteById(aid),t=teamById(tid);if(!a||!t)return;
  const initial=$("adminChoiceStatus").value||"submitted";
  try{
    await setDoc(doc(db,"athletes",aid,"registrations",tid),{
      athleteId:aid,familyUid:a.familyUid||"",teamId:tid,teamName:t.displayName||t.name,
      windowId:t.windowId,status:"submitted",
      adminEntry:true,adminNote:$("adminChoiceNote").value.trim(),
      submittedAt:serverTimestamp(),submittedBy:user.email
    },{merge:true});
    $("adminAddChoiceCard").classList.add("hidden");
    e.target.reset();
    await load();
    if(initial==="approved")await review(aid,tid,"approve");
    else if(initial==="waitlist")await review(aid,tid,"waitlist");
    else notice(`Sports choice added for ${name(a)}.`,"success",true);
  }catch(error){
    console.error("Manual sports choice failed",error);
    notice(`SAVE FAILED (${error?.code||"unknown"}): ${error?.message||error}`,"danger");
  }
},true);

$("registrationSearch")?.addEventListener("input",render);
$("registrationStatusFilter")?.addEventListener("change",render);
$("registrationSeasonFilter")?.addEventListener("change",render);

await load();
