import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { firebaseConfig, ADMIN_EMAIL } from "../js/firebase-config.js?v=3";

const app=initializeApp(firebaseConfig),db=getFirestore(app),auth=getAuth(app),provider=new GoogleAuthProvider();
const loginCard=document.getElementById("loginCard"),dashboard=document.getElementById("dashboard"),loginStatus=document.getElementById("loginStatus"),statusEl=document.getElementById("status"),refreshBtn=document.getElementById("refreshBtn"),exportBtn=document.getElementById("exportBtn"),signOutBtn=document.getElementById("signOutBtn"),rowsEl=document.getElementById("rows"),searchBox=document.getElementById("searchBox");
let signups=[];

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function show(el,msg,type="info"){el.textContent=msg;el.className=`status ${type}`;}
function activeRows(){return signups.filter(r=>r.status!=="cancelled");}
function countFor(key){return activeRows().reduce((n,r)=>n+Number(r.games?.[key]||0),0);}

async function load(){
  show(statusEl,"Loading reservations…","info");
  try{
    const snap=await getDocs(query(collection(db,"youthDaySignups"),orderBy("submittedAt","desc")));
    signups=snap.docs.map(d=>({id:d.id,...d.data()}));
    statusEl.className="status";
    document.getElementById("lastUpdated").textContent=`Updated ${new Date().toLocaleString()}`;
    render();
  }catch(err){console.error(err);show(statusEl,"Could not read Youth Team Day reservations. Confirm this Google account has administrator access in Firestore.","error");}
}

function render(){
  document.getElementById("reservationCount").textContent=activeRows().length;
  document.getElementById("templeCount").textContent=countFor("temple");
  document.getElementById("hawaiiCount").textContent=countFor("hawaii");
  document.getElementById("sjsuCount").textContent=countFor("sjsu");
  const q=searchBox.value.trim().toLowerCase();
  const filtered=signups.filter(r=>!q||[r.playerName,r.team,r.guardianName,r.guardianEmail,r.guardianPhone,r.guestNames,r.notes].join(" ").toLowerCase().includes(q));
  rowsEl.innerHTML=filtered.length?filtered.map(r=>{
    const submitted=r.submittedAt?.toDate?r.submittedAt.toDate().toLocaleString():"Pending timestamp";
    return `<tr>
      <td><strong>${esc(r.playerName)}</strong></td>
      <td><span class="tag">${esc(r.team)}</span></td>
      <td><strong>${esc(r.guardianName)}</strong><br>${esc(r.guardianEmail)}${r.guardianPhone?`<br>${esc(r.guardianPhone)}`:""}</td>
      <td>${r.games?.temple?`<strong>${r.games.temple}</strong> tickets`:"—"}</td>
      <td>${r.games?.hawaii?`<strong>${r.games.hawaii}</strong> tickets`:"—"}</td>
      <td>${r.games?.sjsu?`<strong>${r.games.sjsu}</strong> tickets`:"—"}</td>
      <td>${r.guestNames?`Guests: ${esc(r.guestNames)}<br>`:""}${r.notes?`Notes: ${esc(r.notes)}`:""}</td>
      <td>${esc(submitted)}</td>
      <td>${r.status==="cancelled"?'<span class="tag" style="background:#fff0f0;color:#8d3535">Cancelled</span>':'<span class="tag">Requested</span>'}</td>
    </tr>`;
  }).join(""):'<tr><td colspan="9" style="text-align:center;padding:28px;color:#66778a">No reservations match this search.</td></tr>';
}

function csvCell(v){const s=String(v??"").replace(/"/g,'""');return `"${s}"`;}
function exportCSV(){
  const header=["Player","Team","Contact Name","Contact Email","Contact Phone","Temple Tickets","Hawaii Tickets","San Jose State Tickets","Guest Names","Notes","Status","Submitted"];
  const lines=[header.map(csvCell).join(",")];
  for(const r of signups){
    const submitted=r.submittedAt?.toDate?r.submittedAt.toDate().toISOString():"";
    lines.push([r.playerName,r.team,r.guardianName,r.guardianEmail,r.guardianPhone,r.games?.temple||0,r.games?.hawaii||0,r.games?.sjsu||0,r.guestNames,r.notes,r.status||"requested",submitted].map(csvCell).join(","));
  }
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`explore-gcu-youth-team-day-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

document.getElementById("googleSignIn").addEventListener("click",async()=>{loginStatus.className="status";try{await signInWithPopup(auth,provider)}catch(err){console.error(err);show(loginStatus,"Google sign-in failed. Confirm GitHub Pages is an authorized Firebase Auth domain.","error");}});
refreshBtn.addEventListener("click",load);exportBtn.addEventListener("click",exportCSV);signOutBtn.addEventListener("click",()=>signOut(auth));searchBox.addEventListener("input",render);

onAuthStateChanged(auth,async user=>{
  const allowed=user&&String(user.email||"").toLowerCase()===String(ADMIN_EMAIL||"").toLowerCase();
  if(allowed){loginCard.classList.add("hidden");dashboard.classList.remove("hidden");refreshBtn.classList.remove("hidden");exportBtn.classList.remove("hidden");signOutBtn.classList.remove("hidden");await load();return;}
  dashboard.classList.add("hidden");refreshBtn.classList.add("hidden");exportBtn.classList.add("hidden");signOutBtn.classList.add("hidden");loginCard.classList.remove("hidden");
  if(user&&!allowed){show(loginStatus,`Signed in as ${user.email}, but this account is not the configured Athletics administrator.`,"error");}
});
