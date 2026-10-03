import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { firebaseConfig } from "../js/firebase-config.js?v=7";

const ADMIN_EMAIL = "jacobicusjax@gmail.com";
const app=initializeApp(firebaseConfig),db=getFirestore(app),auth=getAuth(app),provider=new GoogleAuthProvider();
const loginCard=document.getElementById("loginCard"),dashboard=document.getElementById("dashboard"),loginStatus=document.getElementById("loginStatus"),statusEl=document.getElementById("status"),refreshBtn=document.getElementById("refreshBtn"),exportBtn=document.getElementById("exportBtn"),signOutBtn=document.getElementById("signOutBtn"),rowsEl=document.getElementById("rows"),searchBox=document.getElementById("searchBox");
let signups=[];

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function show(el,msg,type="info"){el.textContent=msg;el.className=`status ${type}`;}
function activeRows(){
  const seen=new Set();
  return signups.filter(r=>r.status!=="cancelled").map(r=>{
    const identity=String(r.guardianEmail||r.guardianPhone||r.playerName).trim().toLowerCase();
    const games={};
    for(const key of ["temple","hawaii","sjsu"]){
      if(!Object.prototype.hasOwnProperty.call(r.games||{},key)) continue;
      const token=identity+":"+key;
      if(!seen.has(token)){games[key]=r.games[key];seen.add(token);}
    }
    return {...r,games};
  }).filter(r=>Object.keys(r.games).length);
}
function ticketEditor(r,key){
  if(!Object.prototype.hasOwnProperty.call(r.games,key)) return "—";
  return `<input aria-label="${esc(r.playerName)} ${key} tickets" type="number" min="0" max="50" value="${Number(r.games[key])||0}" data-id="${esc(r.id)}" data-game="${key}" style="width:65px;padding:7px"><button class="btn secondary" data-save="${esc(r.id)}" data-key="${key}" style="padding:7px">Save</button>`;
}
function countFor(key){return activeRows().reduce((n,r)=>n+Number(r.games?.[key]||0),0);}

async function load(){
  show(statusEl,"Loading reservations…","info");
  try{
    const snap=await getDocs(query(collection(db,"youthDaySignups"),orderBy("submittedAt","desc")));
    signups=snap.docs.map(d=>({id:d.id,...d.data()}));
    statusEl.className="status";
    document.getElementById("lastUpdated").textContent=`Updated ${new Date().toLocaleString()}`;
    render();
  }catch(err){console.error(err);show(statusEl,"Signed in correctly, but Firestore denied access to reservations. The Firebase admin email in the published rules must be jacobicusjax@gmail.com.","error");}
}

function render(){
  document.getElementById("reservationCount").textContent=activeRows().length;
  document.getElementById("templeCount").textContent=countFor("temple");
  document.getElementById("hawaiiCount").textContent=countFor("hawaii");
  document.getElementById("sjsuCount").textContent=countFor("sjsu");
  const q=searchBox.value.trim().toLowerCase();
  const filtered=activeRows().filter(r=>!q||[r.playerName,r.team,r.guardianName,r.guardianEmail,r.guardianPhone,r.guestNames,r.notes].join(" ").toLowerCase().includes(q));
  rowsEl.innerHTML=filtered.length?filtered.map(r=>{
    const submitted=r.submittedAt?.toDate?r.submittedAt.toDate().toLocaleString():"Pending timestamp";
    return `<tr>
      <td><strong>${esc(r.playerName)}</strong></td>
      <td><span class="tag">${esc(r.team)}</span></td>
      <td><strong>${esc(r.guardianName)}</strong><br>${esc(r.guardianEmail)}${r.guardianPhone?`<br>${esc(r.guardianPhone)}`:""}</td>
      <td>${ticketEditor(r,"temple")}</td>
      <td>${ticketEditor(r,"hawaii")}</td>
      <td>${ticketEditor(r,"sjsu")}</td>
      <td>${r.guestNames?`Guests: ${esc(r.guestNames)}<br>`:""}${r.notes?`Notes: ${esc(r.notes)}`:""}</td>
      <td>${esc(submitted)}</td>
      <td>${r.status==="cancelled"?'<span class="tag" style="background:#fff0f0;color:#8d3535">Cancelled</span>':'<span class="tag">Requested</span>'}</td>
    </tr>`;
  }).join(""):'<tr><td colspan="9" style="text-align:center;padding:28px;color:#66778a">No reservations match this search.</td></tr>';
}

rowsEl.addEventListener("click",async ev=>{
  const button=ev.target.closest("button[data-save]");if(!button)return;
  const id=button.dataset.save,key=button.dataset.key;
  const input=[...rowsEl.querySelectorAll("input[data-id]")].find(el=>el.dataset.id===id&&el.dataset.game===key);
  const count=Number(input.value);
  if(!Number.isInteger(count)||count<0||count>50){show(statusEl,"Enter a whole number from 0 to 50.","error");return;}
  button.disabled=true;
  try{
    const original=signups.find(r=>r.id===id),games={...original.games,[key]:count};
    await updateDoc(doc(db,"youthDaySignups",id),{games,totalTickets:Object.values(games).reduce((a,b)=>a+Number(b||0),0)});
    await load();show(statusEl,"Ticket count saved.","ok");
  }catch(err){console.error(err);button.disabled=false;show(statusEl,"Could not save ticket count: "+err.message,"error");}
});

function csvCell(v){const s=String(v??"").replace(/"/g,'""');return `"${s}"`;}
function exportCSV(){
  const header=["Player","Team","Contact Name","Contact Email","Contact Phone","Temple Tickets","Hawaii Tickets","San Jose State Tickets","Guest Names","Notes","Status","Submitted"];
  const lines=[header.map(csvCell).join(",")];
  for(const r of activeRows()){
    const submitted=r.submittedAt?.toDate?r.submittedAt.toDate().toISOString():"";
    lines.push([r.playerName,r.team,r.guardianName,r.guardianEmail,r.guardianPhone,r.games?.temple||0,r.games?.hawaii||0,r.games?.sjsu||0,r.guestNames,r.notes,r.status||"requested",submitted].map(csvCell).join(","));
  }
  const blob=new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`explore-gcu-youth-team-day-${new Date().toISOString().slice(0,10)}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

document.getElementById("googleSignIn").addEventListener("click",async()=>{loginStatus.className="status";try{await signInWithPopup(auth,provider)}catch(err){console.error(err);show(loginStatus,"Google sign-in failed. Confirm GitHub Pages is an authorized Firebase Auth domain.","error");}});
refreshBtn.addEventListener("click",load);exportBtn.addEventListener("click",exportCSV);signOutBtn.addEventListener("click",()=>signOut(auth));searchBox.addEventListener("input",render);

onAuthStateChanged(auth,async user=>{
  const email=String(user?.email||"").trim().toLowerCase();
  const allowed=Boolean(user)&&email===ADMIN_EMAIL;
  if(allowed){
    loginStatus.className="status";
    loginCard.classList.add("hidden");dashboard.classList.remove("hidden");refreshBtn.classList.remove("hidden");exportBtn.classList.remove("hidden");signOutBtn.classList.remove("hidden");
    await load();return;
  }
  dashboard.classList.add("hidden");refreshBtn.classList.add("hidden");exportBtn.classList.add("hidden");signOutBtn.classList.add("hidden");loginCard.classList.remove("hidden");
  if(user&&!allowed){show(loginStatus,`Signed in as ${user.email}. This page only accepts ${ADMIN_EMAIL}.`,"error");}
});
