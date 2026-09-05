import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig, SCHOOL_YEAR } from "../js/firebase-config.js";

const EVENTS = [
  { id:"2026-09-06-temple", opponent:"Temple", date:"Sunday, September 6, 2026", time:"2:00 PM", venue:"Global Credit Union Arena", capacity:45 },
  { id:"2026-10-03-hawaii", opponent:"Hawai‘i", date:"Saturday, October 3, 2026", time:"6:00 PM", venue:"Global Credit Union Arena", capacity:45 },
  { id:"2026-11-07-sjsu", opponent:"San José State", date:"Saturday, November 7, 2026", time:"11:30 AM", venue:"Global Credit Union Arena", capacity:50 }
];

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const form = document.getElementById("signupForm");
const eventsEl = document.getElementById("events");
const statusEl = document.getElementById("status");
const submitBtn = document.getElementById("submitBtn");

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

function renderEvents(){
  eventsEl.innerHTML = EVENTS.map((e,i)=>`
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

function selectedEvents(){
  const selected=[];
  for(const e of EVENTS){
    const checked=document.querySelector(`.event-check[data-event="${e.id}"]`)?.checked;
    if(!checked) continue;
    const count=Number(document.querySelector(`.ticket-count[data-event="${e.id}"]`)?.value||0);
    if(!Number.isInteger(count)||count<1||count>20) throw new Error(`Enter between 1 and 20 tickets for GCU vs. ${e.opponent}.`);
    selected.push({eventId:e.id,opponent:e.opponent,date:e.date,time:e.time,venue:e.venue,tickets:count});
  }
  return selected;
}

function show(message,type="info"){
  statusEl.textContent=message;
  statusEl.className=`status ${type}`;
  statusEl.scrollIntoView({behavior:"smooth",block:"nearest"});
}

form.addEventListener("submit",async ev=>{
  ev.preventDefault();
  statusEl.className="status";
  let selections;
  try{ selections=selectedEvents(); }
  catch(err){ show(err.message,"error"); return; }
  if(!selections.length){ show("Choose at least one GCU match before reserving tickets.","error"); return; }

  const playerName=document.getElementById("playerName").value.trim();
  const team=document.getElementById("team").value;
  const contactName=document.getElementById("contactName").value.trim();
  const contactEmail=document.getElementById("contactEmail").value.trim().toLowerCase();
  const contactPhone=document.getElementById("contactPhone").value.trim();
  const guestNames=document.getElementById("guestNames").value.trim();
  const notes=document.getElementById("notes").value.trim();
  if(!playerName||!team||!contactName||!contactEmail){ show("Please complete the required player, team, and contact fields.","error"); return; }

  submitBtn.disabled=true;
  submitBtn.textContent="Reserving…";
  try{
    await addDoc(collection(db,"youthDaySignups"),{
      schoolYear:SCHOOL_YEAR,
      playerName,team,contactName,contactEmail,contactPhone,guestNames,notes,
      selections,
      totalTicketsAcrossSelections:selections.reduce((n,s)=>n+s.tickets,0),
      status:"active",
      source:"explore-athletics-youth-day",
      submittedAt:serverTimestamp(),
      userAgent:navigator.userAgent.slice(0,300)
    });
    form.reset();
    document.querySelectorAll(".event").forEach(x=>x.classList.remove("selected"));
    document.querySelectorAll(".ticket-count").forEach(x=>{x.disabled=true;x.value=0;});
    show("You’re on the list! Your reservation request was recorded. Coach Evans will share final ticket and arrival details before the match.","ok");
  }catch(err){
    console.error(err);
    const permission=String(err?.code||"").includes("permission-denied");
    show(permission?"The signup page is live, but Firebase is not yet allowing public reservation submissions. Please contact Coach Evans so your tickets can be recorded.":"Your reservation could not be saved. Please try again or contact Coach Evans.","error");
  }finally{
    submitBtn.disabled=false;
    submitBtn.textContent="Reserve My Tickets";
  }
});

renderEvents();