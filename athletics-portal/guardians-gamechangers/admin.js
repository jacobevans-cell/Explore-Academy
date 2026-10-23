import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { firebaseConfig, ADMIN_EMAIL } from "../js/firebase-config.js";

const COLLECTION = "guardianGamechangerSignups";
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const $ = id => document.getElementById(id);
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const skillName = {new:"New",school:"School / recreational",club:"Club / competitive",recreational:"Recreational",experienced:"Experienced"};
let registrations = [];

function show(id, message, type = "error") {
  const el = $(id); el.textContent = message; el.className = `status ${type}`;
}
function option(value, current, label) { return `<option value="${value}"${value === current ? " selected" : ""}>${label}</option>`; }
function rowsToShow() {
  const search = $("searchBox").value.trim().toLowerCase();
  return registrations.filter(r => !search || [r.playerName,r.parentName,r.contactEmail,r.contactPhone,r.notes].join(" ").toLowerCase().includes(search));
}
function render() {
  const active = registrations.filter(r => r.status !== "cancelled");
  $("activeCount").textContent = active.length;
  $("dueCount").textContent = active.filter(r => r.feeStatus !== "paid").length;
  $("paidCount").textContent = active.filter(r => r.feeStatus === "paid").length;
  const rows = rowsToShow();
  $("rows").innerHTML = rows.length ? rows.map(r => {
    const submitted = r.submittedAt?.toDate ? r.submittedAt.toDate().toLocaleString() : "Pending";
    return `<tr data-row="${esc(r.id)}">
      <td><strong>${esc(r.playerName)}</strong><br><small>Age ${esc(r.playerAge)}</small></td>
      <td>Player: ${esc(skillName[r.playerSkill] || r.playerSkill)}<br><small>Parent: ${esc(skillName[r.parentSkill] || r.parentSkill)}</small></td>
      <td>${esc(r.parentName)}</td>
      <td>${esc(r.contactEmail)}${r.contactPhone ? `<br><small>${esc(r.contactPhone)}</small>` : ""}</td>
      <td><div class="cell-stack"><input data-field="wave" aria-label="Wave for ${esc(r.playerName)}" maxlength="30" placeholder="Wave" value="${esc(r.wave || "")}"><input data-field="playTime" aria-label="Play time for ${esc(r.playerName)}" maxlength="50" placeholder="Play time" value="${esc(r.playTime || "")}"></div></td>
      <td><select data-field="feeStatus" aria-label="Fee for ${esc(r.playerName)}">${option("due",r.feeStatus,"Due")}${option("paid",r.feeStatus,"Paid")}</select></td>
      <td><select data-field="status" aria-label="Status for ${esc(r.playerName)}">${option("registered",r.status,"Registered")}${option("cancelled",r.status,"Cancelled")}</select></td>
      <td>${esc(r.notes || "—")}</td>
      <td>${esc(submitted)}</td>
      <td><button class="admin-btn" data-save="${esc(r.id)}">Save</button></td>
    </tr>`;
  }).join("") : '<tr><td colspan="10" class="muted">No registrations match.</td></tr>';
}
async function load() {
  show("adminStatus", "Loading registrations…", "ok");
  try {
    const snapshot = await getDocs(query(collection(db, COLLECTION), orderBy("submittedAt", "desc")));
    registrations = snapshot.docs.map(d => ({id:d.id, ...d.data()}));
    $("adminStatus").className = "status";
    $("updatedAt").textContent = `Updated ${new Date().toLocaleString()}`;
    render();
  } catch (error) {
    console.error("Could not load tournament registrations", error);
    show("adminStatus", "Could not load registrations. Check the Firestore rules and this account's administrator access.");
  }
}
$("rows").addEventListener("click", async event => {
  const button = event.target.closest("button[data-save]"); if (!button) return;
  const row = button.closest("tr");
  const id = button.dataset.save;
  const wave = row.querySelector('[data-field="wave"]').value.trim();
  const playTime = row.querySelector('[data-field="playTime"]').value.trim();
  const feeStatus = row.querySelector('[data-field="feeStatus"]').value;
  const status = row.querySelector('[data-field="status"]').value;
  if (wave.length > 30 || playTime.length > 50 || !["due","paid"].includes(feeStatus) || !["registered","cancelled"].includes(status)) {
    show("adminStatus", "Check the wave, time, fee, and status values."); return;
  }
  button.disabled = true;
  try {
    await updateDoc(doc(db, COLLECTION, id), {wave, playTime, feeStatus, status});
    await load();
    show("adminStatus", "Registration updated.", "ok");
  } catch (error) {
    console.error("Could not update registration", error);
    button.disabled = false;
    show("adminStatus", "Could not save this registration.");
  }
});
function csvCell(value) {
  const text = String(value ?? "").replace(/^[\t\r\n ]*[=+\-@]/, match => `'${match}`);
  return `"${text.replace(/"/g, '""')}"`;
}
function exportCsv() {
  const columns = ["Player","Player Age","Player Skill","Playing Parent","Parent Skill","Email","Phone","Wave","Play Time","Fee Status","Registration Status","Notes","Submitted"];
  const lines = [columns.map(csvCell).join(",")];
  for (const r of registrations) {
    const submitted = r.submittedAt?.toDate ? r.submittedAt.toDate().toISOString() : "";
    lines.push([r.playerName,r.playerAge,r.playerSkill,r.parentName,r.parentSkill,r.contactEmail,r.contactPhone,r.wave,r.playTime,r.feeStatus,r.status,r.notes,submitted].map(csvCell).join(","));
  }
  const url = URL.createObjectURL(new Blob([lines.join("\r\n")], {type:"text/csv;charset=utf-8"}));
  const link = document.createElement("a"); link.href = url; link.download = `guardians-gamechangers-signups-${new Date().toISOString().slice(0,10)}.csv`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("googleSignIn").addEventListener("click", async () => {
  try { await signInWithPopup(auth, provider); }
  catch (error) { console.error("Admin sign-in failed", error); show("loginStatus", "Google sign-in failed. Try the authorized Explore Athletics account."); }
});
$("refreshBtn").addEventListener("click", load);
$("exportBtn").addEventListener("click", exportCsv);
$("signOutBtn").addEventListener("click", () => signOut(auth));
$("searchBox").addEventListener("input", render);
onAuthStateChanged(auth, async user => {
  const allowed = user?.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  $("loginCard").classList.toggle("hidden", Boolean(allowed));
  $("dashboard").classList.toggle("hidden", !allowed);
  for (const id of ["refreshBtn","exportBtn","signOutBtn"]) $(id).classList.toggle("hidden", !allowed);
  if (allowed) await load();
  else if (user) show("loginStatus", "This Google account is not authorized to view tournament registrations.");
});

