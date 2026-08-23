import { db } from "./firebase.js";
import { requireVerifiedUser, ensureUserDoc, logout } from "./auth.js";
import {
  programWindows,
  teams as fallbackTeams,
  windowMap,
  gradeCompatible,
  genderCompatible,
  athleteOpportunityConflict
} from "./seed-data.js";
import {
  requiredDocsFor,
  normalizeDocType
} from "./clearance-policy.js";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// OWNERSHIP BOUNDARY:
// This file owns Teams, Rosters, Schedules/Events, Overview attention items,
// and the team-catalog refresh button. It intentionally does NOT render
// Athletes, Registrations, Documents/Compliance, or Payments tables.

const $ = id => document.getElementById(id);
const user = await requireVerifiedUser({admin:true});

$("adminEmail").textContent = user.email;
$("logoutBtn").onclick = logout;

let athletes = [];
let teams = fallbackTeams;
let regs = [];
let documents = [];
let payments = [];
let rosters = {};
let events = [];
let selectedTeamId = "";

for (const t of teams) rosters[t.id] = [];

try {
  await ensureUserDoc(user);
} catch (e) {
  console.error("User doc setup failed", e);
  toast(`Account setup warning: ${e.code || e.message || e}`, "danger");
}

buildTeamsPanel();
buildSchedulePanel();
installCatalogRefresh();

try {
  await refresh();
} catch (e) {
  console.error("Initial admin refresh failed", e);
  toast(`Admin data load failed: ${e.code || e.message || e}`, "danger");
}

function buildTeamsPanel(){
  const panel = $("teamsPanel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="section-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap">
      <div>
        <h2>Teams & Rosters</h2>
        <p>Manage rosters, capacity, jersey numbers, positions, clearance, fees, and fundraiser status in one place.</p>
      </div>
      <button id="teamRefreshBtn" class="btn btn-secondary" type="button">Refresh Teams</button>
    </div>

    <div class="grid grid-4" style="margin-bottom:15px">
      <div class="card">
        <span class="metric-label">Active / Forming Teams</span>
        <div id="teamActiveMetric" class="metric">0</div>
      </div>
      <div class="card">
        <span class="metric-label">Rostered Athletes</span>
        <div id="teamRosteredMetric" class="metric">0</div>
      </div>
      <div class="card">
        <span class="metric-label">Cleared Roster Spots</span>
        <div id="teamClearedMetric" class="metric">0</div>
      </div>
      <div class="card">
        <span class="metric-label">Open Target Spots</span>
        <div id="teamOpenMetric" class="metric">0</div>
      </div>
    </div>

    <div class="filters">
      <input id="teamSearch" placeholder="Search team, league, or coach...">
      <select id="teamLeagueFilter">
        <option value="">All leagues</option>
      </select>
      <select id="teamStatusFilter">
        <option value="">All statuses</option>
        <option value="interest">Interest</option>
        <option value="viability">Viability</option>
        <option value="forming">Forming</option>
        <option value="active">Active</option>
        <option value="official">Official</option>
        <option value="planned">Planned</option>
        <option value="complete">Complete</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>League</th>
            <th>Season</th>
            <th>Roster</th>
            <th>Clearance</th>
            <th>Coach</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="teamRows"></tbody>
      </table>
    </div>

    <div id="teamEditor" class="form-card hidden" style="margin-top:15px">
      <input id="selectedTeamId" type="hidden">

      <div style="display:flex;justify-content:space-between;gap:14px;align-items:flex-start;flex-wrap:wrap">
        <div>
          <h2 id="selectedTeamName" style="margin-bottom:4px"></h2>
          <p id="selectedTeamMeta" style="margin:0;color:#65758b"></p>
        </div>
        <button id="closeTeamEditor" class="btn btn-secondary" type="button">Close</button>
      </div>

      <div class="grid grid-4" style="margin-top:15px">
        <div class="card">
          <span class="metric-label">Roster</span>
          <div id="selectedTeamRosterMetric" class="metric">0</div>
        </div>
        <div class="card">
          <span class="metric-label">Cleared</span>
          <div id="selectedTeamClearedMetric" class="metric">0</div>
        </div>
        <div class="card">
          <span class="metric-label">Fee Paid</span>
          <div id="selectedTeamPaidMetric" class="metric">0</div>
        </div>
        <div class="card">
          <span class="metric-label">Fundraiser Complete</span>
          <div id="selectedTeamFundraiserMetric" class="metric">0</div>
        </div>
      </div>

      <div class="grid grid-2" style="margin-top:16px">
        <form id="teamSettingsForm" class="fields" style="grid-template-columns:1fr 1fr">
          <h3 class="field full">Team Settings</h3>

          <label class="field">
            Status
            <select id="teamStatus">
              <option value="interest">Interest</option>
              <option value="viability">Viability</option>
              <option value="forming">Forming</option>
              <option value="active">Active</option>
              <option value="official">Official</option>
              <option value="planned">Planned</option>
              <option value="complete">Complete</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label class="field">
            Coach
            <input id="teamCoach">
          </label>

          <label class="field">
            Coach Email
            <input id="teamCoachEmail" type="email">
          </label>

          <label class="field">
            Team-specific Fee
            <input id="teamFee" type="number" min="0" step="0.01">
            <small>Usually $0. The annual athletics fee is managed separately.</small>
          </label>

          <label class="field">
            Minimum Roster
            <input id="teamMinRoster" type="number" min="0">
          </label>

          <label class="field">
            Target Roster
            <input id="teamTargetRoster" type="number" min="0">
          </label>

          <label class="field">
            Schedule Source
            <select id="teamScheduleSource">
              <option value="manual">Explore / Manual</option>
              <option value="bound">CAA / Bound</option>
            </select>
            <small>CAA competition schedules can point to Bound. IYAC/Internal stay managed here.</small>
          </label>

          <label class="field">
            Bound Schedule URL
            <input id="teamBoundScheduleUrl" type="url" placeholder="https://www.gobound.com/.../schedule">
          </label>

          <label class="field full">
            Bound Standings URL
            <input id="teamBoundStandingsUrl" type="url" placeholder="https://www.gobound.com/.../standings">
          </label>

          <button class="btn btn-navy field full" type="submit">Save Team Settings</button>
        </form>

        <div>
          <h3>Add Approved Athlete</h3>
          <p style="color:#65758b;margin-top:0">
            Only athletes with an approved registration for this team appear here.
          </p>

          <label class="field">
            Athlete
            <select id="teamAddAthlete">
              <option value="">Choose approved athlete</option>
            </select>
          </label>

          <div class="grid grid-2">
            <label class="field">
              Jersey #
              <input id="teamAddNumber" maxlength="8">
            </label>
            <label class="field">
              Position
              <input id="teamAddPosition" placeholder="Setter, OH, Middle, Swing...">
            </label>
          </div>

          <label class="field" style="margin-top:8px">
            <span><input id="teamAddSwing" type="checkbox"> Swing player / dual-roster role</span>
          </label>

          <button id="teamAddAthleteBtn" class="btn btn-primary" type="button" style="margin-top:10px">
            Add to Roster
          </button>
        </div>
      </div>

      <hr style="margin:22px 0">

      <div style="display:flex;justify-content:space-between;gap:12px;align-items:end;flex-wrap:wrap">
        <div>
          <h3 style="margin-bottom:4px">Current Roster</h3>
          <p id="teamRosterStatusText" style="margin:0;color:#65758b"></p>
        </div>
        <input id="rosterSearch" placeholder="Search this roster..." style="max-width:280px">
      </div>

      <div class="table-wrap" style="margin-top:12px">
        <table class="data-table">
          <thead>
            <tr>
              <th>Athlete</th>
              <th>Jersey</th>
              <th>Position</th>
              <th>Swing</th>
              <th>Clearance</th>
              <th>Fee</th>
              <th>Fundraiser</th>
              <th>Registration</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody id="teamRosterRows"></tbody>
        </table>
      </div>

      <div id="teamRosterList" style="display:none"></div>
    </div>
  `;

  $("teamRefreshBtn").onclick = async () => {
    const btn = $("teamRefreshBtn");
    const old = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Refreshing...";
    try {
      await refresh();
      if (selectedTeamId) openTeam(selectedTeamId);
      toast("Teams and rosters refreshed.", "success");
    } finally {
      btn.disabled = false;
      btn.textContent = old;
    }
  };

  $("teamSearch").oninput = renderTeams;
  $("teamLeagueFilter").onchange = renderTeams;
  $("teamStatusFilter").onchange = renderTeams;
  $("rosterSearch").oninput = () => {
    const t = teams.find(x => x.id === selectedTeamId);
    if (t) renderRoster(t);
  };
  $("closeTeamEditor").onclick = () => {
    selectedTeamId = "";
    $("teamEditor").classList.add("hidden");
  };

  $("teamSettingsForm").onsubmit = saveTeamSettings;
  $("teamScheduleSource").onchange = toggleBoundTeamFields;
  $("teamAddAthleteBtn").onclick = addAthleteToRoster;
}

function installCatalogRefresh(){
  // admin.html historically attached a second catalog renderer to this button.
  // Replacing the node drops those stale listeners so admin.js is the only owner.
  const old = $("seedBtn");
  if (!old) return;

  const clean = old.cloneNode(true);
  old.replaceWith(clean);

  clean.onclick = async () => {
    const btn = clean;
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Refreshing...";

    try {
      persistentStatus(
        `Saving ${fallbackTeams.length} approved programs to Firebase...`,
        "info"
      );

      for (const w of programWindows) {
        await setDoc(
          doc(db, "seasons", w.id),
          {...w, updatedAt: serverTimestamp()},
          {merge:true}
        );
      }

      for (const t of fallbackTeams) {
        await setDoc(
          doc(db, "teams", t.id),
          {...t, updatedAt: serverTimestamp()},
          {merge:true}
        );
      }

      persistentStatus(
        `SUCCESS: Firebase catalog saved. ${programWindows.length} season windows and ${fallbackTeams.length} programs are live.`,
        "success"
      );

      await refresh();
    } catch (e) {
      console.error("Team catalog Firebase save failed", e);
      persistentStatus(
        `FIREBASE SAVE FAILED (${e?.code || "unknown"}): ${e?.message || e}`,
        "danger"
      );
    } finally {
      btn.disabled = false;
      btn.textContent = oldText;
    }
  };
}

async function refresh(){
  await loadTeams();
  await loadAthletes();
  await Promise.all([
    loadRegs(),
    loadDocs(),
    loadPayments(),
    loadEvents()
  ]);

  renderTeams();
  renderAttention();

  if (selectedTeamId && teams.some(t => t.id === selectedTeamId)) {
    openTeam(selectedTeamId, {switchPanel:false});
  }
}

async function loadTeams(){
  const snap = await getDocs(collection(db, "teams"));
  teams = snap.empty
    ? [...fallbackTeams]
    : snap.docs.map(d => ({id:d.id, ...d.data()}));

  rosters = {};

  for (const t of teams) {
    const r = await getDocs(collection(db, "teams", t.id, "roster"));
    rosters[t.id] = r.docs.map(d => ({athleteId:d.id, ...d.data()}));
  }

  if ($("teamCount")) $("teamCount").textContent = teams.length;

  fillTeamFilters();
  fillTeamSelects();
  fillScheduleControls();
}

async function loadAthletes(){
  const snap = await getDocs(collection(db, "athletes"));
  athletes = snap.docs.map(d => ({id:d.id, ...d.data()}));
}

async function loadRegs(){
  regs = [];

  for (const a of athletes) {
    const snap = await getDocs(collection(db, "athletes", a.id, "registrations"));

    snap.forEach(d => {
      regs.push({
        id:d.id,
        athleteId:a.id,
        athlete:name(a),
        grade:a.grade || "",
        ...d.data()
      });
    });
  }
}

async function loadDocs(){
  documents = [];

  for (const a of athletes) {
    const snap = await getDocs(collection(db, "athletes", a.id, "documents"));

    snap.forEach(d => {
      documents.push({
        id:d.id,
        athleteId:a.id,
        athlete:name(a),
        ...d.data()
      });
    });
  }
}

async function loadPayments(){
  payments = [];

  for (const a of athletes) {
    const snap = await getDocs(collection(db, "athletes", a.id, "payments"));

    snap.forEach(d => {
      payments.push({
        id:d.id,
        athleteId:a.id,
        athlete:name(a),
        ...d.data()
      });
    });
  }
}

async function loadEvents(){
  events = [];

  for (const t of teams) {
    const snap = await getDocs(collection(db, "teams", t.id, "events"));

    snap.forEach(d => {
      events.push({
        id:d.id,
        teamId:t.id,
        teamName:t.name,
        ...d.data()
      });
    });
  }

  renderEvents();
}

function fillTeamFilters(){
  const select = $("teamLeagueFilter");
  if (!select) return;

  const current = select.value;
  const leagues = [...new Set(
    teams.map(t => String(t.leagueLabel || t.league || "").trim()).filter(Boolean)
  )].sort();

  select.innerHTML =
    '<option value="">All leagues</option>' +
    leagues.map(x => `<option value="${escAttr(x)}">${esc(x)}</option>`).join("");

  if (leagues.includes(current)) select.value = current;
}

function teamRosterStats(t){
  const roster = rosters[t.id] || [];
  const target = Number(t.targetRoster || 0);
  const min = Number(t.minRoster || 0);
  const cleared = roster.filter(r => clearanceFor(r.athleteId).cleared).length;
  const paid = roster.filter(r => paymentFor(r.athleteId).paid).length;
  const fundraiser = roster.filter(r => paymentFor(r.athleteId).fundraiserComplete).length;

  return {
    count:roster.length,
    target,
    min,
    cleared,
    paid,
    fundraiser,
    open:target > 0 ? Math.max(0, target - roster.length) : 0,
    over:target > 0 ? Math.max(0, roster.length - target) : 0
  };
}

function renderTeams(){
  const tbody = $("teamRows");
  if (!tbody) return;

  const q = ($("teamSearch")?.value || "").trim().toLowerCase();
  const league = $("teamLeagueFilter")?.value || "";
  const status = $("teamStatusFilter")?.value || "";

  const visible = teams.filter(t => {
    const hay = [
      t.name,
      t.displayName,
      t.league,
      t.leagueLabel,
      t.coach,
      t.grades,
      windowMap[t.windowId]?.label
    ].join(" ").toLowerCase();

    if (q && !hay.includes(q)) return false;
    if (league && String(t.leagueLabel || t.league || "") !== league) return false;
    if (status && String(t.status || "") !== status) return false;

    return true;
  });

  tbody.innerHTML = visible.map(t => {
    const s = teamRosterStats(t);
    const rosterText = s.target > 0
      ? `${s.count}/${s.target}`
      : String(s.count);

    let rosterBadge = "";
    if (s.over > 0) {
      rosterBadge = `<span class="badge badge-gold">+${s.over} over target</span>`;
    } else if (s.target > 0 && s.count >= s.target) {
      rosterBadge = '<span class="badge badge-green">Target met</span>';
    } else if (s.min > 0 && s.count < s.min) {
      rosterBadge = `<span class="badge badge-gold">${s.min - s.count} to minimum</span>`;
    }

    return `<tr>
      <td>
        <strong>${esc(t.displayName || t.name)}</strong>
        <br><small>Grades ${esc(t.grades || "—")}</small>
      </td>
      <td>${esc(t.leagueLabel || t.league || "—")}</td>
      <td>${esc(windowMap[t.windowId]?.label || "—")}</td>
      <td>
        <strong>${rosterText}</strong>
        ${rosterBadge ? `<br>${rosterBadge}` : ""}
      </td>
      <td>
        <strong>${s.cleared}/${s.count || 0}</strong>
        ${s.count && s.cleared === s.count
          ? '<br><span class="badge badge-green">All cleared</span>'
          : s.count
            ? '<br><span class="badge badge-gold">Needs attention</span>'
            : ""
        }
      </td>
      <td>${esc(t.coach || "Unassigned")}</td>
      <td>${statusBadge(t.status || "interest")}</td>
      <td>
        <button class="btn btn-secondary" data-team="${escAttr(t.id)}">Manage</button>
      </td>
    </tr>`;
  }).join("") || '<tr><td colspan="8">No matching teams.</td></tr>';

  tbody.querySelectorAll("[data-team]").forEach(b => {
    b.onclick = () => openTeam(b.dataset.team);
  });

  renderTeamMetrics();
}

function renderTeamMetrics(){
  if (!$("teamActiveMetric")) return;

  const active = teams.filter(t =>
    ["forming","active","official"].includes(String(t.status || ""))
  ).length;

  const rosteredIds = new Set();
  let cleared = 0;
  let totalRosterEntries = 0;
  let open = 0;

  for (const t of teams) {
    const s = teamRosterStats(t);
    totalRosterEntries += s.count;
    cleared += s.cleared;
    open += s.open;

    for (const r of (rosters[t.id] || [])) rosteredIds.add(r.athleteId);
  }

  $("teamActiveMetric").textContent = active;
  $("teamRosteredMetric").textContent = rosteredIds.size;
  $("teamClearedMetric").textContent = `${cleared}/${totalRosterEntries}`;
  $("teamOpenMetric").textContent = open;
}

function openTeam(id, {switchPanel=true} = {}){
  const t = teams.find(x => x.id === id);
  if (!t) return;

  selectedTeamId = id;
  $("selectedTeamId").value = id;
  $("selectedTeamName").textContent = t.displayName || t.name;
  $("selectedTeamMeta").textContent =
    `${t.leagueLabel || t.league || "League"} • Grades ${t.grades || "—"} • ${windowMap[t.windowId]?.label || "Season"}`;

  $("teamStatus").value = t.status || "interest";
  $("teamCoach").value = t.coach || "";
  $("teamCoachEmail").value = t.coachEmail || "";
  $("teamFee").value = t.sportsFee || "";
  $("teamMinRoster").value = t.minRoster || "";
  $("teamTargetRoster").value = t.targetRoster || "";
  $("teamScheduleSource").value = t.scheduleSource || (String(t.leagueLabel || t.league || "").toUpperCase().includes("CAA") ? "bound" : "manual");
  $("teamBoundScheduleUrl").value = t.boundScheduleUrl || "";
  $("teamBoundStandingsUrl").value = t.boundStandingsUrl || "";
  toggleBoundTeamFields();

  fillApprovedRosterAdds(t);
  renderRoster(t);
  renderSelectedTeamMetrics(t);

  $("teamEditor").classList.remove("hidden");

  if (switchPanel) {
    document.querySelector('[data-panel="teamsPanel"]')?.click();
  }
}

function fillApprovedRosterAdds(t){
  const select = $("teamAddAthlete");
  if (!select) return;

  const existing = new Set((rosters[t.id] || []).map(r => r.athleteId));

  const approved = athletes
    .filter(a => !existing.has(a.id))
    .filter(a => gradeCompatible(t, a.grade, {adminOverride:true}) && genderCompatible(t, a.gender))
    .map(a => ({
      athlete:a,
      registration:regs.find(r =>
        r.athleteId === a.id &&
        r.teamId === t.id &&
        r.status === "approved"
      )
    }))
    .filter(x => x.registration)
    .sort((a,b) => name(a.athlete).localeCompare(name(b.athlete)));

  select.innerHTML =
    '<option value="">Choose approved athlete</option>' +
    approved.map(({athlete}) =>
      `<option value="${escAttr(athlete.id)}">${esc(name(athlete))} • Grade ${esc(athlete.grade || "—")}</option>`
    ).join("");

  $("teamAddAthleteBtn").disabled = approved.length === 0;
}

function renderSelectedTeamMetrics(t){
  const s = teamRosterStats(t);

  $("selectedTeamRosterMetric").textContent =
    s.target > 0 ? `${s.count}/${s.target}` : String(s.count);

  $("selectedTeamClearedMetric").textContent = `${s.cleared}/${s.count}`;
  $("selectedTeamPaidMetric").textContent = `${s.paid}/${s.count}`;
  $("selectedTeamFundraiserMetric").textContent = `${s.fundraiser}/${s.count}`;

  let text = `${s.count} athlete${s.count === 1 ? "" : "s"} rostered.`;

  if (s.target > 0) {
    if (s.count < s.target) text += ` ${s.target - s.count} spot${s.target - s.count === 1 ? "" : "s"} remain to target.`;
    if (s.count === s.target) text += " Target roster reached.";
    if (s.count > s.target) text += ` ${s.count - s.target} above target roster.`;
  }

  if (s.min > 0 && s.count < s.min) {
    text += ` Needs ${s.min - s.count} more to reach the minimum roster.`;
  }

  $("teamRosterStatusText").textContent = text;
}

function renderRoster(t){
  const tbody = $("teamRosterRows");
  if (!tbody) return;

  const q = ($("rosterSearch")?.value || "").trim().toLowerCase();

  const rows = (rosters[t.id] || [])
    .filter(r => {
      const a = athleteById(r.athleteId);
      const hay = `${r.athleteName || name(a)} ${r.jerseyNumber || ""} ${r.position || ""}`.toLowerCase();
      return !q || hay.includes(q);
    })
    .sort((a,b) =>
      String(a.jerseyNumber || "").localeCompare(
        String(b.jerseyNumber || ""),
        undefined,
        {numeric:true}
      ) || athleteName(a.athleteId).localeCompare(athleteName(b.athleteId))
    );

  tbody.innerHTML = rows.map(r => {
    const a = athleteById(r.athleteId);
    const c = clearanceFor(r.athleteId);
    const p = paymentFor(r.athleteId);
    const reg = regs.find(x => x.athleteId === r.athleteId && x.teamId === t.id);

    return `<tr>
      <td>
        <strong>${esc(r.athleteName || name(a))}</strong>
        <br><small>Grade ${esc(a?.grade || r.grade || "—")}</small>
      </td>

      <td>
        <input
          data-roster-number="${escAttr(r.athleteId)}"
          value="${escAttr(r.jerseyNumber || "")}"
          style="width:68px"
          aria-label="Jersey number for ${escAttr(r.athleteName || name(a))}">
      </td>

      <td>
        <input
          data-roster-position="${escAttr(r.athleteId)}"
          value="${escAttr(r.position || "")}"
          placeholder="Position"
          style="min-width:120px"
          aria-label="Position for ${escAttr(r.athleteName || name(a))}">
      </td>

      <td style="text-align:center">
        <input
          data-roster-swing="${escAttr(r.athleteId)}"
          type="checkbox"
          ${r.swing ? "checked" : ""}
          aria-label="Swing player">
      </td>

      <td>
        ${c.cleared
          ? `<span class="badge badge-green">CLEARED ${c.approved}/${c.required}</span>`
          : `<span class="badge badge-gold">NOT CLEARED ${c.approved}/${c.required}</span>`
        }
      </td>

      <td>
        ${p.paid
          ? '<span class="badge badge-green">PAID</span>'
          : `<span class="badge badge-gold">${money(p.balance)} DUE</span>`
        }
      </td>

      <td>
        ${p.fundraiserComplete
          ? '<span class="badge badge-green">COMPLETE</span>'
          : '<span class="badge badge-gold">NEEDED</span>'
        }
      </td>

      <td>
        ${reg
          ? statusBadge(reg.status || "submitted")
          : '<span class="badge badge-gold">No registration</span>'
        }
      </td>

      <td style="white-space:nowrap">
        <button
          class="btn btn-secondary"
          data-roster-save="${escAttr(r.athleteId)}"
          type="button">Save</button>
        <button
          class="btn btn-danger"
          data-roster-remove="${escAttr(r.athleteId)}"
          type="button">Remove</button>
      </td>
    </tr>`;
  }).join("") || '<tr><td colspan="9">No athletes on this roster.</td></tr>';

  tbody.querySelectorAll("[data-roster-save]").forEach(b => {
    b.onclick = () => saveRosterAthlete(t.id, b.dataset.rosterSave);
  });

  tbody.querySelectorAll("[data-roster-remove]").forEach(b => {
    b.onclick = () => removeRosterAthlete(t.id, b.dataset.rosterRemove);
  });

  // Keep this hidden legacy container populated so admin-compliance.js can
  // still annotate it if that module looks for roster nodes.
  const legacy = $("teamRosterList");
  if (legacy) {
    legacy.innerHTML = (rosters[t.id] || []).map(r =>
      `<div class="check">
        <span>${esc(r.athleteName || athleteName(r.athleteId))}</span>
        <button data-remove="${escAttr(t.id)}|${escAttr(r.athleteId)}" type="button">Remove</button>
      </div>`
    ).join("");
  }
}

async function saveRosterAthlete(teamId, athleteId){
  const jersey = document.querySelector(`[data-roster-number="${cssEscape(athleteId)}"]`)?.value.trim() || "";
  const position = document.querySelector(`[data-roster-position="${cssEscape(athleteId)}"]`)?.value.trim() || "";
  const swing = Boolean(document.querySelector(`[data-roster-swing="${cssEscape(athleteId)}"]`)?.checked);

  try {
    await setDoc(
      doc(db, "teams", teamId, "roster", athleteId),
      {
        jerseyNumber:jersey,
        position,
        swing,
        updatedAt:serverTimestamp(),
        updatedBy:user.email
      },
      {merge:true}
    );

    toast("Roster assignment saved.", "success");
    await refresh();
    openTeam(teamId);
  } catch (e) {
    console.error("Roster save failed", e);
    toast(`Roster save failed: ${e?.message || e}`, "danger");
  }
}

async function removeRosterAthlete(teamId, athleteId){
  const athlete = athleteById(athleteId);
  if (!confirm(`Remove ${name(athlete)} from this roster?`)) return;

  try {
    await deleteDoc(doc(db, "teams", teamId, "roster", athleteId));

    const regRef = doc(db, "athletes", athleteId, "registrations", teamId);
    const regSnap = await getDoc(regRef);

    if (regSnap.exists() && regSnap.data().status === "approved") {
      await updateDoc(regRef, {
        status:"waitlist",
        reviewedAt:serverTimestamp(),
        reviewedBy:user.email
      });
    }

    toast(`${name(athlete)} removed from roster and moved to waitlist.`, "success");
    await refresh();
    openTeam(teamId);
  } catch (e) {
    console.error("Roster removal failed", e);
    toast(`Roster removal failed: ${e?.message || e}`, "danger");
  }
}

async function saveTeamSettings(e){
  e.preventDefault();

  const id = $("selectedTeamId").value;
  if (!id) return;

  try {
    await setDoc(
      doc(db, "teams", id),
      {
        status:$("teamStatus").value,
        coach:$("teamCoach").value.trim(),
        coachEmail:$("teamCoachEmail").value.trim(),
        sportsFee:Number($("teamFee").value || 0),
        minRoster:Number($("teamMinRoster").value || 0),
        targetRoster:Number($("teamTargetRoster").value || 0),
        scheduleSource:$("teamScheduleSource").value || "manual",
        boundScheduleUrl:$("teamBoundScheduleUrl").value.trim(),
        boundStandingsUrl:$("teamBoundStandingsUrl").value.trim(),
        updatedAt:serverTimestamp(),
        updatedBy:user.email
      },
      {merge:true}
    );

    toast("Team settings saved.", "success");
    await refresh();
    openTeam(id);
  } catch (e) {
    console.error("Team settings save failed", e);
    toast(`Team save failed: ${e?.message || e}`, "danger");
  }
}

async function addAthleteToRoster(){
  const tid = $("selectedTeamId").value;
  const aid = $("teamAddAthlete").value;

  if (!tid || !aid) return;

  const t = teams.find(x => x.id === tid);
  const a = athleteById(aid);
  if (!t || !a) return;

  const reg = regs.find(r =>
    r.athleteId === aid &&
    r.teamId === tid &&
    r.status === "approved"
  );

  if (!reg) {
    return toast(
      "This athlete must have an approved registration before being added to the roster.",
      "warning"
    );
  }

  const stats = teamRosterStats(t);

  if (stats.target > 0 && stats.count >= stats.target) {
    const ok = confirm(
      `${t.name} is already at its target roster of ${stats.target}. Add ${name(a)} anyway?`
    );
    if (!ok) return;
  }

  try {
    await setDoc(
      doc(db, "teams", tid, "roster", aid),
      {
        athleteId:aid,
        athleteName:name(a),
        grade:a.grade || "",
        gender:a.gender || "",
        jerseyNumber:$("teamAddNumber").value.trim(),
        position:$("teamAddPosition").value.trim(),
        swing:Boolean($("teamAddSwing").checked),
        sourceRegistrationId:reg.id,
        addedAt:serverTimestamp(),
        addedBy:user.email
      },
      {merge:true}
    );

    $("teamAddNumber").value = "";
    $("teamAddPosition").value = "";
    $("teamAddSwing").checked = false;

    toast(`${name(a)} added to ${t.name}.`, "success");
    await refresh();
    openTeam(tid);
  } catch (e) {
    console.error("Roster add failed", e);
    toast(`Roster add failed: ${e?.message || e}`, "danger");
  }
}

function clearanceFor(athleteId){
  const a = athleteById(athleteId);
  const athleteRegs = regs.filter(r => r.athleteId === athleteId);
  const required = requiredDocsFor(athleteRegs, teams);
  const approvedTypes = new Set(
    documents
      .filter(d => d.athleteId === athleteId && d.reviewStatus === "approved")
      .map(d => normalizeDocType(d.type))
  );

  const approved = required.filter(([id]) => approvedTypes.has(id)).length;
  const override = Boolean(a?.clearanceOverride);

  return {
    approved,
    required:required.length,
    override,
    cleared:override || approved === required.length
  };
}

function paymentFor(athleteId){
  const athletePayments = payments.filter(p => p.athleteId === athleteId);

  const annual =
    athletePayments.find(p => p.id === "athletics-2026-27") ||
    athletePayments.find(p => p.fundraiserRequired);

  const due = athletePayments.reduce(
    (n,p) => n + Math.max(0, Number(p.amountDue || 0) - Number(p.amountPaid || 0)),
    0
  );

  return {
    balance:due,
    paid:athletePayments.length > 0 && due <= 0,
    fundraiserComplete:Boolean(annual?.fundraiserComplete)
  };
}

function fillTeamSelects(){
  const select = $("eventTeamId");
  if (!select) return;

  const current = select.value;

  select.innerHTML =
    '<option value="">Choose team</option>' +
    teams.map(t =>
      `<option value="${escAttr(t.id)}">${esc(t.name)} • ${esc(t.leagueLabel || t.league || t.audience || "")}</option>`
    ).join("");

  if (teams.some(t => t.id === current)) select.value = current;
}

function buildSchedulePanel(){
  const panel = $("schedulePanel");
  if (!panel) return;

  panel.innerHTML = `
    <div class="section-head" style="display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap">
      <div>
        <h2>Schedules & Games</h2>
        <p>CAA competition schedules can use Bound as the official source. IYAC, Internal, practices, meetings, travel notes, and local updates are managed here.</p>
      </div>
      <button id="scheduleRefreshBtn" class="btn btn-secondary" type="button">Refresh Schedule</button>
    </div>

    <div class="grid grid-4" style="margin-bottom:15px">
      <div class="card"><span class="metric-label">Upcoming Events</span><div id="scheduleUpcomingMetric" class="metric">0</div></div>
      <div class="card"><span class="metric-label">Games</span><div id="scheduleGamesMetric" class="metric">0</div></div>
      <div class="card"><span class="metric-label">Practices</span><div id="schedulePracticesMetric" class="metric">0</div></div>
      <div class="card"><span class="metric-label">CAA / Bound Teams</span><div id="scheduleBoundMetric" class="metric">0</div></div>
    </div>

    <div class="filters">
      <input id="scheduleSearch" placeholder="Search opponent, team, location...">
      <select id="scheduleTeamFilter"><option value="">All teams</option></select>
      <select id="scheduleTypeFilter">
        <option value="">All event types</option>
        <option value="game">Games</option>
        <option value="practice">Practices</option>
        <option value="tournament">Tournaments</option>
        <option value="meeting">Meetings</option>
        <option value="scrimmage">Scrimmages</option>
      </select>
      <select id="scheduleTimeFilter">
        <option value="upcoming">Upcoming</option>
        <option value="all">All events</option>
        <option value="past">Past</option>
      </select>
    </div>

    <div class="grid grid-2" style="margin-top:15px;align-items:start">
      <div>
        <div id="boundScheduleCards" class="grid" style="margin-bottom:15px"></div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Team</th><th>Event</th><th>Opponent / Details</th>
                <th>Time</th><th>Location</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody id="scheduleRows"></tbody>
          </table>
        </div>
      </div>

      <div class="form-card">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
          <div>
            <h2 id="eventFormHeading" style="margin-bottom:4px">Add Practice / Game</h2>
            <p style="margin:0;color:#65758b">Use this for IYAC/Internal games and all Explore-managed practices, meetings, travel details, and local updates.</p>
          </div>
          <button id="eventCancelEdit" type="button" class="btn btn-secondary hidden">Cancel Edit</button>
        </div>

        <form id="eventForm" class="fields" style="grid-template-columns:1fr;margin-top:14px">
          <input id="eventId" type="hidden">

          <label class="field">Team<select id="eventTeamId" required></select></label>

          <label class="field">Type
            <select id="eventType">
              <option value="game">Game</option>
              <option value="practice">Practice</option>
              <option value="tournament">Tournament</option>
              <option value="scrimmage">Scrimmage</option>
              <option value="meeting">Meeting</option>
            </select>
          </label>

          <label class="field">Title<input id="eventTitle" required placeholder="Girls Volleyball vs South Valley Prep"></label>
          <label class="field">Opponent<input id="eventOpponent" placeholder="Leave blank for practice/meeting"></label>

          <div class="grid grid-2">
            <label class="field">Home / Away
              <select id="eventHomeAway">
                <option value="">N/A</option>
                <option value="Home">Home</option>
                <option value="Away">Away</option>
                <option value="Neutral">Neutral</option>
              </select>
            </label>
            <label class="field">Status
              <select id="eventStatus">
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="postponed">Postponed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
          </div>

          <label class="field">Date<input id="eventDate" type="date" required></label>

          <div class="grid grid-3">
            <label class="field">Arrival<input id="eventArrival" type="time"></label>
            <label class="field">Start<input id="eventStart" type="time"></label>
            <label class="field">End<input id="eventEnd" type="time"></label>
          </div>

          <label class="field">Location / Venue<input id="eventLocation" placeholder="School or gym name"></label>
          <label class="field">Street Address<input id="eventAddress" placeholder="Used for family directions"></label>

          <div class="grid grid-2">
            <label class="field">Leave By<input id="eventLeaveBy" type="time"></label>
            <label class="field">Drive Estimate<input id="eventDriveEstimate" placeholder="45–60 min"></label>
          </div>

          <label class="field">Transportation<input id="eventTransportation" placeholder="Family transport, school van, meet there..."></label>

          <div class="grid grid-2">
            <label class="field">Our Score<input id="eventOurScore" type="number" min="0"></label>
            <label class="field">Opponent Score<input id="eventOpponentScore" type="number" min="0"></label>
          </div>

          <label class="field">Result / Set Scores<input id="eventResult" placeholder="Final 2–0 • 15–13, 15–11"></label>
          <label class="field">Notes<textarea id="eventNotes" placeholder="Arrival instructions, uniforms, special notes..."></textarea></label>

          <button id="eventSubmitBtn" class="btn btn-primary">Add Event</button>
        </form>
      </div>
    </div>
  `;

  $("scheduleRefreshBtn").onclick = async () => {
    const b = $("scheduleRefreshBtn");
    const old = b.textContent;
    b.disabled = true;
    b.textContent = "Refreshing...";
    try {
      await loadEvents();
      renderScheduleManager();
      toast("Schedule refreshed.", "success");
    } finally {
      b.disabled = false;
      b.textContent = old;
    }
  };

  $("scheduleSearch").oninput = renderScheduleManager;
  $("scheduleTeamFilter").onchange = renderScheduleManager;
  $("scheduleTypeFilter").onchange = renderScheduleManager;
  $("scheduleTimeFilter").onchange = renderScheduleManager;
  $("eventCancelEdit").onclick = resetEventForm;
  $("eventForm").onsubmit = saveEvent;
}

function fillScheduleControls(){
  const filter = $("scheduleTeamFilter");
  const eventSelect = $("eventTeamId");

  const options = teams.map(t =>
    `<option value="${escAttr(t.id)}">${esc(t.name)} • ${esc(t.leagueLabel || t.league || t.audience || "")}</option>`
  ).join("");

  if (filter) {
    const current = filter.value;
    filter.innerHTML = '<option value="">All teams</option>' + options;
    if (teams.some(t => t.id === current)) filter.value = current;
  }

  if (eventSelect) {
    const current = eventSelect.value;
    eventSelect.innerHTML = '<option value="">Choose team</option>' + options;
    if (teams.some(t => t.id === current)) eventSelect.value = current;
  }
}

function toggleBoundTeamFields(){
  const isBound = $("teamScheduleSource")?.value === "bound";
  if ($("teamBoundScheduleUrl")) {
    $("teamBoundScheduleUrl").disabled = !isBound;
    $("teamBoundScheduleUrl").parentElement.style.opacity = isBound ? "1" : ".55";
  }
  if ($("teamBoundStandingsUrl")) {
    $("teamBoundStandingsUrl").disabled = !isBound;
    $("teamBoundStandingsUrl").parentElement.style.opacity = isBound ? "1" : ".55";
  }
}

function renderEvents(){
  renderScheduleManager();
}

function renderScheduleManager(){
  if (!$("scheduleRows")) return;

  fillScheduleControls();

  const q = ($("scheduleSearch")?.value || "").trim().toLowerCase();
  const teamFilter = $("scheduleTeamFilter")?.value || "";
  const typeFilter = $("scheduleTypeFilter")?.value || "";
  const timeFilter = $("scheduleTimeFilter")?.value || "upcoming";
  const today = new Date().toISOString().slice(0,10);

  let visible = events.filter(e => {
    const hay = `${e.teamName || ""} ${e.title || ""} ${e.opponent || ""} ${e.location || ""} ${e.address || ""}`.toLowerCase();
    if (q && !hay.includes(q)) return false;
    if (teamFilter && e.teamId !== teamFilter) return false;
    if (typeFilter && e.type !== typeFilter) return false;
    if (timeFilter === "upcoming" && String(e.date || "") < today && e.status !== "postponed") return false;
    if (timeFilter === "past" && String(e.date || "") >= today) return false;
    return true;
  });

  visible.sort((a,b) =>
    String(a.date || "").localeCompare(String(b.date || "")) ||
    String(a.start || "").localeCompare(String(b.start || ""))
  );

  $("scheduleRows").innerHTML = visible.map(e => {
    const maps = e.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.address)}`
      : "";

    const score = e.status === "completed"
      ? (e.result || (e.ourScore !== "" && e.ourScore != null
        ? `${e.ourScore}–${e.opponentScore ?? "?"}`
        : "Completed"))
      : "";

    return `<tr>
      <td><strong>${esc(prettyDate(e.date))}</strong></td>
      <td><strong>${esc(e.teamName || "")}</strong></td>
      <td>
        <strong>${esc(e.title || titleForEvent(e))}</strong>
        <br><small>${esc((e.type || "event").toUpperCase())}${e.homeAway ? " • " + esc(e.homeAway) : ""}</small>
      </td>
      <td>
        ${e.opponent ? `<strong>${esc(e.opponent)}</strong>` : "—"}
        ${score ? `<br><span class="badge badge-green">${esc(score)}</span>` : ""}
      </td>
      <td>
        ${e.start ? esc(formatTime(e.start)) : "TBA"}
        ${e.arrival ? `<br><small>Arrive ${esc(formatTime(e.arrival))}</small>` : ""}
      </td>
      <td>
        ${esc(e.location || "TBA")}
        ${maps ? `<br><a href="${escAttr(maps)}" target="_blank" rel="noopener">Directions</a>` : ""}
      </td>
      <td>${statusBadge(e.status || "scheduled")}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-secondary" data-event-edit="${escAttr(e.teamId)}|${escAttr(e.id)}" type="button">Edit</button>
        <button class="btn btn-danger" data-event-delete="${escAttr(e.teamId)}|${escAttr(e.id)}" type="button">Delete</button>
      </td>
    </tr>`;
  }).join("") || '<tr><td colspan="8">No matching events.</td></tr>';

  $("scheduleRows").querySelectorAll("[data-event-edit]").forEach(b => {
    b.onclick = () => editEvent(...b.dataset.eventEdit.split("|"));
  });

  $("scheduleRows").querySelectorAll("[data-event-delete]").forEach(b => {
    b.onclick = () => deleteEvent(...b.dataset.eventDelete.split("|"));
  });

  renderBoundScheduleCards();
  renderScheduleMetrics();
}

function renderBoundScheduleCards(){
  const box = $("boundScheduleCards");
  if (!box) return;

  const boundTeams = teams.filter(t =>
    (t.scheduleSource === "bound" || String(t.leagueLabel || t.league || "").toUpperCase().includes("CAA")) &&
    (t.boundScheduleUrl || t.boundStandingsUrl)
  );

  box.innerHTML = boundTeams.map(t => `
    <div class="card">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start">
        <div>
          <span class="badge badge-blue">CAA / BOUND</span>
          <h3 style="margin:8px 0 4px">${esc(t.name)}</h3>
          <small>${esc(windowMap[t.windowId]?.label || "")} • Grades ${esc(t.grades || "")}</small>
        </div>
        <div class="actions" style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
          ${t.boundScheduleUrl ? `<a class="btn btn-primary" href="${escAttr(t.boundScheduleUrl)}" target="_blank" rel="noopener">Official Schedule</a>` : ""}
          ${t.boundStandingsUrl ? `<a class="btn btn-secondary" href="${escAttr(t.boundStandingsUrl)}" target="_blank" rel="noopener">Standings</a>` : ""}
        </div>
      </div>
      <p style="margin:10px 0 0;color:#65758b">Bound is the official competition source. Add Explore-managed practices, arrival instructions, travel details, meetings, or corrections below without duplicating every CAA game.</p>
    </div>
  `).join("");
}

function renderScheduleMetrics(){
  const today = new Date().toISOString().slice(0,10);
  const upcoming = events.filter(e => String(e.date || "") >= today && e.status !== "cancelled").length;
  const games = events.filter(e => ["game","tournament","scrimmage"].includes(e.type)).length;
  const practices = events.filter(e => e.type === "practice").length;
  const boundTeams = teams.filter(t => t.scheduleSource === "bound" || String(t.leagueLabel || t.league || "").toUpperCase().includes("CAA")).length;

  $("scheduleUpcomingMetric").textContent = upcoming;
  $("scheduleGamesMetric").textContent = games;
  $("schedulePracticesMetric").textContent = practices;
  $("scheduleBoundMetric").textContent = boundTeams;
}

async function saveEvent(e){
  e.preventDefault();

  const tid = $("eventTeamId").value;
  if (!tid) return;

  const id = $("eventId").value || crypto.randomUUID();
  const payload = {
    type:$("eventType").value,
    title:$("eventTitle").value.trim(),
    opponent:$("eventOpponent").value.trim(),
    homeAway:$("eventHomeAway").value,
    status:$("eventStatus").value || "scheduled",
    date:$("eventDate").value,
    arrival:$("eventArrival").value,
    start:$("eventStart").value,
    end:$("eventEnd").value,
    location:$("eventLocation").value.trim(),
    address:$("eventAddress").value.trim(),
    leaveBy:$("eventLeaveBy").value,
    driveEstimate:$("eventDriveEstimate").value.trim(),
    transportation:$("eventTransportation").value.trim(),
    ourScore:$("eventOurScore").value === "" ? "" : Number($("eventOurScore").value),
    opponentScore:$("eventOpponentScore").value === "" ? "" : Number($("eventOpponentScore").value),
    result:$("eventResult").value.trim(),
    notes:$("eventNotes").value.trim(),
    updatedAt:serverTimestamp(),
    updatedBy:user.email
  };

  if (!$("eventId").value) {
    payload.createdAt = serverTimestamp();
    payload.createdBy = user.email;
  }

  await setDoc(doc(db, "teams", tid, "events", id), payload, {merge:true});

  resetEventForm();
  toast($("eventId").value ? "Event updated." : "Event saved.", "success");
  await loadEvents();
}

function editEvent(teamId, eventId){
  const e = events.find(x => x.teamId === teamId && x.id === eventId);
  if (!e) return;

  $("eventId").value = e.id;
  $("eventTeamId").value = e.teamId;
  $("eventType").value = e.type || "game";
  $("eventTitle").value = e.title || "";
  $("eventOpponent").value = e.opponent || "";
  $("eventHomeAway").value = e.homeAway || "";
  $("eventStatus").value = e.status || "scheduled";
  $("eventDate").value = e.date || "";
  $("eventArrival").value = e.arrival || "";
  $("eventStart").value = e.start || "";
  $("eventEnd").value = e.end || "";
  $("eventLocation").value = e.location || "";
  $("eventAddress").value = e.address || "";
  $("eventLeaveBy").value = e.leaveBy || "";
  $("eventDriveEstimate").value = e.driveEstimate || "";
  $("eventTransportation").value = e.transportation || "";
  $("eventOurScore").value = e.ourScore ?? "";
  $("eventOpponentScore").value = e.opponentScore ?? "";
  $("eventResult").value = e.result || "";
  $("eventNotes").value = e.notes || "";

  $("eventFormHeading").textContent = "Edit Event";
  $("eventSubmitBtn").textContent = "Save Changes";
  $("eventCancelEdit").classList.remove("hidden");
  $("eventForm").scrollIntoView({behavior:"smooth", block:"start"});
}

async function deleteEvent(teamId, eventId){
  const e = events.find(x => x.teamId === teamId && x.id === eventId);
  if (!e) return;
  if (!confirm(`Delete ${e.title || "this event"}?`)) return;

  await deleteDoc(doc(db, "teams", teamId, "events", eventId));
  toast("Event deleted.", "success");
  await loadEvents();
}

function resetEventForm(){
  $("eventForm").reset();
  $("eventId").value = "";
  $("eventFormHeading").textContent = "Add Practice / Game";
  $("eventSubmitBtn").textContent = "Add Event";
  $("eventCancelEdit").classList.add("hidden");
  fillScheduleControls();
}

function prettyDate(v){
  if (!v) return "TBA";
  const [y,m,d] = String(v).split("-").map(Number);
  if (!y || !m || !d) return v;
  return new Intl.DateTimeFormat("en-US", {month:"short", day:"numeric", year:"numeric"}).format(new Date(y,m-1,d));
}

function formatTime(v){
  if (!v) return "";
  const [h,m] = v.split(":").map(Number);
  const d = new Date(2000,0,1,h,m||0);
  return new Intl.DateTimeFormat("en-US",{hour:"numeric",minute:"2-digit"}).format(d);
}

function titleForEvent(e){
  if (e.type === "practice") return "Practice";
  if (e.type === "meeting") return "Team Meeting";
  if (e.opponent) return `vs ${e.opponent}`;
  return e.type || "Event";
}

function renderAttention(){
  const out = [];

  const pending = regs.filter(r => r.status === "submitted");
  if (pending.length) {
    out.push(`${pending.length} sports interest${pending.length === 1 ? "" : "s"} awaiting review`);
  }

  const pendingDocs = documents.filter(d => (d.reviewStatus || "pending") === "pending");
  if (pendingDocs.length) {
    out.push(`${pendingDocs.length} document${pendingDocs.length === 1 ? "" : "s"} awaiting review`);
  }

  const balances = athletes.filter(a => balance(a.id) > 0);
  if (balances.length) {
    out.push(`${balances.length} athlete${balances.length === 1 ? "" : "s"} with balance due`);
  }

  const fundraiserNeeded = athletes.filter(a => {
    const p = paymentFor(a.id);
    return payments.some(x => x.athleteId === a.id && x.fundraiserRequired) && !p.fundraiserComplete;
  });

  if (fundraiserNeeded.length) {
    out.push(`${fundraiserNeeded.length} athlete${fundraiserNeeded.length === 1 ? "" : "s"} still need fundraiser completion`);
  }

  const soon = new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10);

  const expiring = documents.filter(d =>
    normalizeDocType(d.type) === "medical-exam" &&
    d.reviewStatus === "approved" &&
    d.physicalExpirationDate &&
    d.physicalExpirationDate <= soon
  );

  if (expiring.length) {
    out.push(`${expiring.length} physical${expiring.length === 1 ? "" : "s"} expired or expiring within 30 days`);
  }

  for (const t of teams) {
    const s = teamRosterStats(t);
    const meaningful = ["forming","active","official"].includes(String(t.status || ""));

    if (meaningful && s.min > 0 && s.count < s.min) {
      out.push(`${t.name}: ${s.min - s.count} athlete${s.min - s.count === 1 ? "" : "s"} short of minimum roster`);
    }

    if (s.over > 0) {
      out.push(`${t.name}: ${s.over} athlete${s.over === 1 ? "" : "s"} above target roster`);
    }

    const notCleared = (rosters[t.id] || []).filter(r => !clearanceFor(r.athleteId).cleared);
    if (notCleared.length) {
      out.push(`${t.name}: ${notCleared.length} rostered athlete${notCleared.length === 1 ? "" : "s"} not cleared`);
    }
  }

  for (const a of athletes) {
    const rosterTeams = teams.filter(t =>
      (rosters[t.id] || []).some(r => r.athleteId === a.id)
    );

    for (let i = 0; i < rosterTeams.length; i++) {
      for (let j = i + 1; j < rosterTeams.length; j++) {
        if (athleteOpportunityConflict(rosterTeams[i], rosterTeams[j])) {
          out.push(`${name(a)}: athlete conflict — ${rosterTeams[i].name} / ${rosterTeams[j].name}`);
        }
      }
    }
  }

  $("attentionList").innerHTML = out.length
    ? out.map(x => `<div class="check"><span>⚠️</span><strong>${esc(x)}</strong></div>`).join("")
    : '<div class="notice success">Nothing currently needs attention.</div>';
}

function balance(id){
  return payments
    .filter(p => p.athleteId === id)
    .reduce(
      (n,p) => n + Math.max(0, Number(p.amountDue || 0) - Number(p.amountPaid || 0)),
      0
    );
}

function statusBadge(status){
  const s = String(status || "").toLowerCase();

  if (["active","official","approved","complete","paid"].includes(s)) {
    return `<span class="badge badge-green">${esc(status || "active")}</span>`;
  }

  if (["forming","viability","submitted","waitlist","interest","planned"].includes(s)) {
    return `<span class="badge badge-gold">${esc(status || "pending")}</span>`;
  }

  return `<span class="badge">${esc(status || "—")}</span>`;
}

function athleteById(id){
  return athletes.find(a => a.id === id);
}

function athleteName(id){
  return name(athleteById(id) || {});
}

function name(a){
  return `${a?.firstName || ""} ${a?.lastName || ""}`.trim() || "Unnamed Athlete";
}

function money(n){
  return new Intl.NumberFormat(
    "en-US",
    {style:"currency", currency:"USD"}
  ).format(Number(n || 0));
}

function toast(text, type="info"){
  const e = $("adminStatus");
  if (!e) return;

  e.textContent = text;
  e.className = `notice ${type} status show`;
  setTimeout(() => e.classList.remove("show"), 5500);
}

function persistentStatus(text, type="info"){
  const e = $("adminStatus");
  if (!e) return;

  e.textContent = text;
  e.className = `notice ${type} status show`;
}

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[m]));
}

function escAttr(v){
  return esc(v);
}

function cssEscape(v){
  if (globalThis.CSS?.escape) return CSS.escape(String(v));
  return String(v).replace(/["\\]/g, "\\$&");
}
