import { db } from "./firebase.js";
import { requireVerifiedUser } from "./auth.js";
import {
  collection,getDocs,doc,getDoc,setDoc,serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const $=id=>document.getElementById(id);
const user=await requireVerifiedUser({admin:true});
const FEE=45;
const PAYMENT_ID="athletics-2026-27";

let athletes=[], rows=[];

const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const name=a=>`${a?.firstName||""} ${a?.lastName||""}`.trim()||"Unnamed Athlete";
const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n||0));

function notice(text,type="info",auto=false){
  const el=$("paymentAdminStatus");if(!el)return;
  el.textContent=text;el.className=`notice ${type} status show`;
  if(auto)setTimeout(()=>el.classList.remove("show"),5000);
}

async function approvedAthleteIds(){
  const ids=new Set();
  for(const a of athletes){
    const regs=await getDocs(collection(db,"athletes",a.id,"registrations"));
    if(regs.docs.some(d=>d.data().status==="approved")) ids.add(a.id);
  }
  return ids;
}

async function ensureObligation(a){
  const ref=doc(db,"athletes",a.id,"payments",PAYMENT_ID);
  const snap=await getDoc(ref);
  if(!snap.exists()){
    await setDoc(ref,{
      label:"2026–27 Athletics Participation Fee",
      schoolYear:"2026-27",
      amountDue:FEE,
      amountPaid:0,
      status:"due",
      fundraiserRequired:true,
      fundraiserComplete:false,
      fundraiserLabel:"One fundraiser participation",
      createdAt:serverTimestamp(),
      updatedAt:serverTimestamp()
    });
    return {id:PAYMENT_ID,amountDue:FEE,amountPaid:0,status:"due",fundraiserRequired:true,fundraiserComplete:false};
  }
  const d=snap.data();
  // Normalize any older record to the correct family fee.
  const paid=Number(d.amountPaid||0);
  const normalized={
    ...d,
    id:PAYMENT_ID,
    amountDue:FEE,
    amountPaid:paid,
    status:paid>=FEE?"paid":paid>0?"partial":"due",
    fundraiserRequired:true,
    fundraiserComplete:Boolean(d.fundraiserComplete)
  };
  if(Number(d.amountDue||0)!==FEE || !d.fundraiserRequired){
    await setDoc(ref,{...normalized,updatedAt:serverTimestamp()},{merge:true});
  }
  return normalized;
}

async function load(){
  notice("Loading payments and fundraiser requirements…","info");
  try{
    const as=await getDocs(collection(db,"athletes"));
    athletes=as.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>name(a).localeCompare(name(b)));
    const approved=await approvedAthleteIds();
    rows=[];
    for(const a of athletes.filter(x=>approved.has(x.id))){
      const p=await ensureObligation(a);
      rows.push({athlete:a,payment:p});
    }
    fillAthleteSelect();
    render();
    updateOverview();
    notice(rows.length?`${rows.length} approved athlete obligation${rows.length===1?"":"s"} loaded.`:"No approved athletes have payment obligations yet.","success",true);
  }catch(e){
    console.error("Payment workflow failed",e);
    notice(`PAYMENT LOAD FAILED (${e?.code||"unknown"}): ${e?.message||e}`,"danger");
  }
}

function fillAthleteSelect(){
  const s=$("paymentAthlete");if(!s)return;
  s.innerHTML='<option value="">Choose athlete</option>'+rows.map(r=>`<option value="${esc(r.athlete.id)}">${esc(name(r.athlete))}</option>`).join("");
}

function updateOverview(){
  const outstanding=rows.reduce((s,r)=>s+Math.max(0,FEE-Number(r.payment.amountPaid||0)),0);
  const collected=rows.reduce((s,r)=>s+Math.min(FEE,Number(r.payment.amountPaid||0)),0);
  const owing=rows.filter(r=>Number(r.payment.amountPaid||0)<FEE).length;
  const fund=rows.filter(r=>r.payment.fundraiserComplete).length;

  if($("paymentAthletesOwing"))$("paymentAthletesOwing").textContent=owing;
  if($("paymentOutstandingMetric"))$("paymentOutstandingMetric").textContent=money(outstanding);
  if($("paymentCollectedMetric"))$("paymentCollectedMetric").textContent=money(collected);
  if($("fundraiserCompleteMetric"))$("fundraiserCompleteMetric").textContent=`${fund}/${rows.length}`;

  if($("paymentsDue"))$("paymentsDue").textContent=money(outstanding);
  if($("paymentsPaid"))$("paymentsPaid").textContent=money(collected);
}

function render(){
  const tbody=$("paymentRows");if(!tbody)return;
  const q=($("paymentSearch")?.value||"").toLowerCase().trim();
  const ps=$("paymentStatusFilter")?.value||"";
  const fs=$("fundraiserStatusFilter")?.value||"";
  const visible=rows.filter(r=>{
    const paid=Number(r.payment.amountPaid||0);
    const status=paid>=FEE?"paid":paid>0?"partial":"due";
    const fund=r.payment.fundraiserComplete?"complete":"needed";
    return (!q||name(r.athlete).toLowerCase().includes(q))&&(!ps||ps===status)&&(!fs||fs===fund);
  });

  tbody.innerHTML=visible.length?visible.map(r=>{
    const paid=Number(r.payment.amountPaid||0);
    const bal=Math.max(0,FEE-paid);
    const status=paid>=FEE?"paid":paid>0?"partial":"due";
    return `<tr>
      <td><strong>${esc(name(r.athlete))}</strong><br><small>Grade ${esc(r.athlete.grade||"—")}</small></td>
      <td>${money(FEE)}</td>
      <td>${money(paid)}</td>
      <td><strong>${money(bal)}</strong></td>
      <td><span class="badge ${status==="paid"?"badge-green":"badge-gold"}">${esc(status)}</span></td>
      <td><span class="badge ${r.payment.fundraiserComplete?"badge-green":"badge-gold"}">${r.payment.fundraiserComplete?"Complete":"Needed"}</span></td>
      <td>
        <button class="btn btn-secondary" data-fund="${esc(r.athlete.id)}">${r.payment.fundraiserComplete?"Undo Fundraiser":"Mark Fundraiser Complete"}</button>
        ${paid<FEE?`<button class="btn btn-primary" data-payfull="${esc(r.athlete.id)}">Mark $45 Paid</button>`:""}
      </td>
    </tr>`;
  }).join(""):'<tr><td colspan="7">No matching athlete obligations.</td></tr>';

  tbody.querySelectorAll("[data-fund]").forEach(b=>b.onclick=()=>toggleFundraiser(b.dataset.fund));
  tbody.querySelectorAll("[data-payfull]").forEach(b=>b.onclick=()=>markPaidFull(b.dataset.payfull));
}

async function toggleFundraiser(aid){
  const row=rows.find(r=>r.athlete.id===aid);if(!row)return;
  const next=!row.payment.fundraiserComplete;
  await setDoc(doc(db,"athletes",aid,"payments",PAYMENT_ID),{
    fundraiserComplete:next,
    fundraiserCompletedAt:next?serverTimestamp():null,
    fundraiserCompletedBy:next?user.email:"",
    updatedAt:serverTimestamp()
  },{merge:true});
  notice(`${name(row.athlete)} fundraiser marked ${next?"complete":"needed"}.`,"success",true);
  await load();
}

async function markPaidFull(aid){
  const row=rows.find(r=>r.athlete.id===aid);if(!row)return;
  await setDoc(doc(db,"athletes",aid,"payments",PAYMENT_ID),{
    amountDue:FEE,amountPaid:FEE,status:"paid",
    lastPaymentAmount:FEE,
    lastPaymentMethod:"Admin marked paid",
    lastPaymentAt:serverTimestamp(),
    updatedAt:serverTimestamp()
  },{merge:true});
  notice(`${name(row.athlete)} marked paid in full.`,"success",true);
  await load();
}

$("paymentForm")?.addEventListener("submit",async e=>{
  e.preventDefault();e.stopImmediatePropagation();
  const aid=$("paymentAthlete").value;
  const amount=Number($("paymentAmount").value||0);
  const row=rows.find(r=>r.athlete.id===aid);
  if(!row)return;
  if(amount<=0)return notice("Enter a payment amount greater than $0.","warning");
  try{
    const current=Number(row.payment.amountPaid||0);
    const next=Math.min(FEE,current+amount);
    await setDoc(doc(db,"athletes",aid,"payments",PAYMENT_ID),{
      amountDue:FEE,
      amountPaid:next,
      status:next>=FEE?"paid":"partial",
      lastPaymentAmount:amount,
      lastPaymentMethod:$("paymentMethod").value||"",
      lastPaymentReference:$("paymentReference").value.trim(),
      lastPaymentAt:serverTimestamp(),
      lastPaymentBy:user.email,
      updatedAt:serverTimestamp()
    },{merge:true});
    e.target.reset();
    notice(`${money(amount)} recorded for ${name(row.athlete)}.`,"success",true);
    await load();
  }catch(error){
    notice(`PAYMENT SAVE FAILED (${error?.code||"unknown"}): ${error?.message||error}`,"danger");
  }
},true);

$("paymentSearch")?.addEventListener("input",render);
$("paymentStatusFilter")?.addEventListener("change",render);
$("fundraiserStatusFilter")?.addEventListener("change",render);

await load();
