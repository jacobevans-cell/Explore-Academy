import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig } from "../js/firebase-config.js";

const EVENTS = [
  { id:"2026-09-06-temple", key:"temple", opponent:"Temple", date:"Sunday, September 6, 2026", time:"2:00 PM", venue:"Global Credit Union Arena", capacity:45 },
  { id:"2026-10-03-hawaii", key:"hawaii", opponent:"Hawai‘i", date:"Saturday, October 3, 2026", time:"6:00 PM", venue:"Global Credit Union Arena", capacity:45 },
  { id:"2026-11-07-sjsu", key:"sjsu", opponent:"San José State", date:"Saturday, November 7, 2026", time:"11:30 AM", venue:"Global Credit Union Arena", capacity:50 }
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const form = document.getElementById("signupForm");
const eventsEl = document.getElementById("events");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

function renderEvents(){
  eventsEl.innerHTML = EVENTS.map(e=>`
    <label class="event" id="card-${e.id}">
      <input class="event-check" type="checkbox" data-event="${e.id}">
      <div>
        <div class="event-title">GCU vs. ${esc(e.opponent)}</div>
        <div class="event-meta">${esc(e.date)} • ${esc(e.time)}<br>${esc(e.venue)}</div>
        <div class="remaining">Explore allotment: ${e.capacity} complimentary tickets</div>
      </div>
      <div class="ticket-box">
        <label for="tickets-${e.id}">Tickets needed</label>
        <input id="tickets-${e.id}" class="ticket-count" data-event="${e.id}" type="number" min="0" max="20" value="0" disabled inputmode="numeric">
      </div>
    </label>`).join("");

  document.querySelectorAll(".event-check").forEach(chk=>chk.addEventListener("change",()=>{
    const id=chk.dataset.event;
    const card=document.getElementById(`card-${id}`);
    const count=document.querySelector(`.ticket-count[data-event="${id}"]`);
    count.disabled=!chk.checked;
    card.classList.toggle("selected",chk.checked);
    if(chk.checked) count.focus();
    else count.value=0;
  }));
}

function getGames(){
  const games={};
  for(const e of EVENTS){
    const checked=document.querySelector(`.event-check[data-event="${e.id}"]`)?.checked;
    if(!checked) continue;
    const count=Number(document.querySelector(`.ticket-count[data-event="${e.id}"]`)?.value||0);
    if(!Number.isInteger(count)||count<1||count>20) throw new Error(`Enter between 1 and 20 tickets for GCU vs. ${e.opponent}.`);
    games[e.key]=count;
  }
  return games;
}

function show(message,type="info"){
  statusEl.textContent=message;
  statusEl.className=`status ${type}`;
  statusEl.scrollIntoView({behavior:"smooth",block:"nearest"});
}

form.addEventListener("submit",async ev=>{
  ev.preventDefault();
  statusEl.className="status";

  let games;
  try{ games=getGames(); }
  catch(err){ show(err.message,"error"); return; }

  if(!Object.keys(games).length){ show("Choose at least one GCU match before reserving tickets.","error"); return; }

  const playerName=document.getElementById("playerName").value.trim();
  const teamRaw=document.getElementById("team").value.trim();
  const team=teamRaw.replace(" Volleyball","");
  const guardianName=document.getElementById("contactName").value.trim();
  const guardianEmail=document.getElementById("contactEmail").value.trim().toLowerCase();
  const guardianPhone=document.getElementById("contactPhone").value.trim();
  const guestNames=document.getElementById("guestNames").value.trim();
  const notes=document.getElementById("notes").value.trim();

  if(!playerName||!team||!guardianName||!guardianEmail){
    show("Please complete the required player, team, and contact fields.","error");
    return;
  }

  const totalTickets=Object.values(games).reduce((n,v)=>n+v,0);

  submitBtn.disabled=true;
  submitBtn.textContent="Reserving…";

  try{
    const payload={
      playerName,
      team,
      guardianName,
      guardianEmail,
      games,
      totalTickets,
      status:"requested",
      submittedAt:serverTimestamp()
    };
    if(guardianPhone) payload.guardianPhone=guardianPhone;
    if(guestNames) payload.guestNames=guestNames;
    if(notes) payload.notes=notes;

    await addDoc(collection(db,"youthDaySignups"),payload);

    form.reset();
    document.querySelectorAll(".event").forEach(x=>x.classList.remove("selected"));
    document.querySelectorAll(".ticket-count").forEach(x=>{x.disabled=true;x.value=0;});
    show("You’re on the list! Your reservation request was recorded. Coach Evans will share final ticket and arrival details before the match.","ok");
  }catch(err){
    console.error(err);
    const permission=String(err?.code||"").includes("permission-denied");
    show(permission?"Your reservation could not be accepted by Firebase yet. Please contact Coach Evans so your tickets can be recorded.":"Your reservation could not be saved. Please try again or contact Coach Evans.","error");
  }finally{
    submitBtn.disabled=false;
    submitBtn.textContent="Reserve My Tickets";
  }
});

renderEvents();
