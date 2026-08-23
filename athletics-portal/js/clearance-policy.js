// Single source of truth for Explore Academy athletics clearance requirements.
// Core items apply to every athlete regardless of league. The NFHS concussion
// certificate is required only when the athlete has an active CAA sport.
// There is no insurance upload requirement.

export const CORE_DOCS = [
  ["medical-exam", "AIA Medical Examination Form"],
  ["medical-questionnaire", "AIA Medical Evaluation Questionnaire"],
  ["participation-agreement", "Explore Academy Participation Agreement"],
  ["code-of-conduct", "Explore Academy Code of Conduct"]
];

export const CAA_DOC = ["concussion-certificate", "NFHS Concussion Awareness Certificate"];

export const ALL_DOCS = [...CORE_DOCS, CAA_DOC];

export function isCAATeam(team){
  return String(team?.leagueLabel || team?.league || "").toUpperCase().includes("CAA");
}

export function athleteHasActiveCAASport(registrations, teams){
  return (registrations || [])
    .filter(r => !["declined", "withdrawn"].includes(r.status))
    .some(r => isCAATeam((teams || []).find(t => t.id === r.teamId)));
}

export function requiredDocsFor(registrations, teams){
  return athleteHasActiveCAASport(registrations, teams) ? ALL_DOCS : CORE_DOCS;
}

export function normalizeDocType(v){
  return v === "physical" ? "medical-exam" : v;
}

export function docLabel(type){
  const id = normalizeDocType(type);
  return ALL_DOCS.find(([docId]) => docId === id)?.[1] || "Document";
}
