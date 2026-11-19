import { auth, db } from "./firebase.js";
import { ADMIN_EMAIL } from "./firebase-config.js";
import {
  onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  collection, getDocs
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const COLLECTION = "winterBasketballInterest2027";
const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
})[char]);
let rows = [];

function status(id, message, error=false){
  const e=$(id);
  e.hidden=!message;
  e.textContent=message;
  e.className="status"+(error?" error":"");
}
function authorized(user){
  return !!user?.emailVerified &&
    String(user.email||"").toLowerCase()===ADMIN_EMAIL.toLowerCase();
}
function displayDate(value){
  try { return value?.toDate?.().toLocaleString("en-US") || "Pending"; }
  catch { return "Unknown"; }
}
function filtered(){
  const q=$("search").value.trim().toLowerCase();
  return rows.filter(r=> !q ||
    [r.studentName,r.grade,r.team,r.parentName,r.contact].join(" ").toLowerCase().includes(q));
}
function render(){
  $("total").textContent=rows.length;
  $("boys").textContent=rows.filter(x=>x.team==="Boys Basketball").length;
  $("girls").textContent=rows.filter(x=>x.team==="Girls Basketball").length;
  const list=filtered();
  $("responses").innerHTML=list.length?list.map(r=>`<tr>
    <td><strong>${esc(r.studentName)}</strong></td>
    <td>${esc(r.grade)}</td>
    <td>${esc(r.team)}</td>
    <td class="wrap">${esc(r.parentName)}</td>
    <td>${esc(r.contact)}</td>
    <td>${esc(displayDate(r.submittedAt))}</td>
  </tr>`).join(""):'<tr><td colspan="6">No matching responses yet.</td></tr>';
}
async function load(){
  status("listStatus","Loading interest list…");
  try{
    const results=await getDocs(collection(db,COLLECTION));
    rows=results.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(b.submittedAt?.seconds||0)-(a.submittedAt?.seconds||0));
    render();
    $("lastLoaded").textContent="Last refreshed: "+new Date().toLocaleString("en-US");
    status("listStatus","");
  }catch(err){
    console.error("Unable to load basketball interest list:",err);
    status("listStatus","Could not load the private response list. Check Firebase access rules.",true);
  }
}
onAuthStateChanged(auth, async user=>{
  const allowed=authorized(user);
  $("responsesPanel").hidden=!allowed;
  $("signInPanel").hidden=allowed;
  if(allowed){
    await load();
  }else if(user){
    status("loginStatus","This account is not authorized to read student information. Sign in with the Explore Athletics administrator account.",true);
  }
});
$("signIn").addEventListener("click",async()=>{
  try{await signInWithPopup(auth,new GoogleAuthProvider());}
  catch(err){status("loginStatus","Unable to sign in: "+(err.message||"Please retry."),true);}
});
$("signOut").addEventListener("click",()=>signOut(auth));
$("refresh").addEventListener("click",load);
$("search").addEventListener("input",render);
$("export").addEventListener("click",()=>{
  const headers=["Student","Grade","Team","Parent/Guardian","Contact","Submitted"];
  const record=[headers,...filtered().map(r=>[
    r.studentName,r.grade,r.team,r.parentName,r.contact,displayDate(r.submittedAt)
  ])];
  const cell=v=>'"'+String(v??"").replaceAll('"','""')+'"';
  const csv="\ufeff"+record.map(line=>line.map(cell).join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const anchor=document.createElement("a");
  anchor.href=url;
  anchor.download="Explore-Basketball-Interest-2026-27.csv";
  anchor.click();
  URL.revokeObjectURL(url);
});
