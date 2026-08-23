export const programWindows = [
  {
    id: "elem-early-fall",
    audience: "Elementary",
    grades: "4–5",
    label: "Early Fall",
    start: "2026-08-11",
    end: "2026-09-25",
    purpose: "Elementary girls volleyball"
  },
  {
    id: "ms-fall",
    audience: "Middle School",
    grades: "6–8",
    label: "Fall",
    start: "2026-09-21",
    end: "2026-11-19",
    purpose: "Middle-school fall athletics"
  },
  {
    id: "elem-late-fall",
    audience: "Elementary",
    grades: "4–5",
    label: "Late Fall",
    start: "2026-10-14",
    end: "2026-12-04",
    purpose: "Elementary boys volleyball and girls flag football"
  },
  {
    id: "ms-winter",
    audience: "Middle School",
    grades: "6–8",
    label: "Winter",
    start: "2027-01-04",
    end: "2027-02-25",
    purpose: "Middle-school basketball"
  },
  {
    id: "elem-winter",
    audience: "Elementary",
    grades: "4–5",
    label: "Winter",
    start: "2027-01-05",
    end: "2027-02-26",
    purpose: "Elementary girls basketball and boys flag football"
  },
  {
    id: "ms-spring",
    audience: "Middle School",
    grades: "6–8",
    label: "Spring",
    start: "2027-03-15",
    end: "2027-05-04",
    purpose: "Middle-school coed soccer"
  },
  {
    id: "elem-spring",
    audience: "Elementary",
    grades: "4–5",
    label: "Spring",
    start: "2027-03-16",
    end: "2027-04-30",
    purpose: "Elementary boys basketball and coed soccer"
  }
];

export const teams = [
  {
    id:"elem-girls-vb",
    audience:"Elementary",
    grades:"4–5",
    gender:"Girls",
    sport:"Volleyball",
    name:"Girls Volleyball",
    displayName:"Girls Volleyball",
    windowId:"elem-early-fall",
    league:"CAA",
    leagueLabel:"CAA",
    status:"official",
    priority:"core",
    competitionStart:"2026-08-11",
    regularSeasonEnd:"2026-09-25",
    playoffStart:"",
    championshipDate:"",
    costEstimate:1000,
    athleteConflictGroup:"elem-girls"
  },
  {
    id:"ms-girls-vb",
    audience:"Middle School",
    grades:"6–8",
    gender:"Girls",
    sport:"Volleyball",
    name:"Girls Volleyball",
    displayName:"Girls Volleyball",
    windowId:"ms-fall",
    league:"IYAC",
    leagueLabel:"IYAC",
    status:"official",
    priority:"core",
    competitionStart:"2026-09-21",
    regularSeasonEnd:"2026-11-12",
    playoffStart:"2026-11-16",
    championshipDate:"2026-11-19",
    costEstimate:0,
    athleteConflictGroup:"ms-fall-girls"
  },
  {
    id:"ms-coed-flag",
    audience:"Middle School",
    grades:"6–8",
    gender:"Coed",
    sport:"Flag Football",
    name:"Coed Flag Football",
    displayName:"Coed Flag Football",
    windowId:"ms-fall",
    league:"IYAC",
    leagueLabel:"IYAC",
    status:"official",
    priority:"core",
    competitionStart:"2026-09-21",
    regularSeasonEnd:"2026-11-12",
    playoffStart:"2026-11-16",
    championshipDate:"2026-11-19",
    costEstimate:0,
    athleteConflictGroup:"ms-fall"
  },
  {
    id:"elem-boys-vb",
    audience:"Elementary",
    grades:"4–6",
    defaultGrades:"4–5",
    bridgeGrade:"6",
    gender:"Boys",
    sport:"Volleyball",
    name:"Boys Volleyball",
    displayName:"Boys Volleyball",
    windowId:"elem-late-fall",
    league:"CAA",
    leagueLabel:"CAA",
    status:"official",
    priority:"core",
    competitionStart:"2026-10-14",
    regularSeasonEnd:"2026-12-04",
    playoffStart:"",
    championshipDate:"",
    costEstimate:1000,
    athleteConflictGroup:"elem-boys"
  },
  {
    id:"elem-girls-flag",
    audience:"Elementary",
    grades:"4–5",
    bridgeEligible:"6",
    gender:"Girls",
    sport:"Flag Football",
    name:"Girls Flag Football",
    displayName:"Girls Flag Football",
    windowId:"elem-late-fall",
    league:"CAA",
    leagueLabel:"CAA",
    status:"interest",
    priority:"maximize",
    competitionStart:"2026-10-14",
    regularSeasonEnd:"2026-12-04",
    playoffStart:"",
    championshipDate:"",
    costEstimate:1000,
    athleteConflictGroup:"elem-girls"
  },
  {
    id:"internal-esports",
    audience:"All",
    grades:"4–8",
    gender:"Coed",
    sport:"Esports",
    name:"Esports",
    displayName:"Esports",
    windowId:"elem-late-fall",
    league:"Internal",
    leagueLabel:"Internal",
    status:"interest",
    priority:"internal",
    competitionStart:"",
    regularSeasonEnd:"",
    playoffStart:"",
    championshipDate:"",
    costEstimate:0,
    athleteConflictGroup:"internal"
  },
  {
    id:"internal-chess",
    audience:"All",
    grades:"4–8",
    gender:"Coed",
    sport:"Chess",
    name:"Chess",
    displayName:"Chess",
    windowId:"elem-late-fall",
    league:"Internal",
    leagueLabel:"Internal",
    status:"interest",
    priority:"internal",
    competitionStart:"",
    regularSeasonEnd:"",
    playoffStart:"",
    championshipDate:"",
    costEstimate:0,
    athleteConflictGroup:"internal"
  },
  {
    id:"ms-boys-bball",
    audience:"Middle School",
    grades:"6–8",
    gender:"Boys",
    sport:"Basketball",
    name:"Boys Basketball",
    displayName:"Boys Basketball",
    windowId:"ms-winter",
    league:"IYAC",
    leagueLabel:"IYAC",
    status:"official",
    priority:"core",
    competitionStart:"2027-01-04",
    regularSeasonEnd:"2027-02-18",
    playoffStart:"2027-02-22",
    championshipDate:"2027-02-25",
    costEstimate:0,
    athleteConflictGroup:"ms-winter-boys"
  },
  {
    id:"ms-girls-bball",
    audience:"Middle School",
    grades:"6–8",
    gender:"Girls",
    sport:"Basketball",
    name:"Girls Basketball",
    displayName:"Girls Basketball",
    windowId:"ms-winter",
    league:"IYAC",
    leagueLabel:"IYAC",
    status:"official",
    priority:"core",
    competitionStart:"2027-01-04",
    regularSeasonEnd:"2027-02-18",
    playoffStart:"2027-02-22",
    championshipDate:"2027-02-25",
    costEstimate:0,
    athleteConflictGroup:"ms-winter-girls"
  },
  {
    id:"elem-girls-bball",
    audience:"Elementary",
    grades:"4–5",
    gender:"Girls",
    sport:"Basketball",
    name:"Girls Basketball",
    displayName:"Girls Basketball",
    windowId:"elem-winter",
    league:"CAA",
    leagueLabel:"CAA",
    status:"viability",
    priority:"maximize",
    competitionStart:"2027-01-05",
    regularSeasonEnd:"2027-02-26",
    playoffStart:"",
    championshipDate:"",
    costEstimate:1000,
    athleteConflictGroup:"elem-girls"
  },
  {
    id:"elem-boys-flag",
    audience:"Elementary",
    grades:"4–5",
    gender:"Boys",
    sport:"Flag Football",
    name:"Boys Flag Football",
    displayName:"Boys Flag Football",
    windowId:"elem-winter",
    league:"CAA",
    leagueLabel:"CAA",
    status:"interest",
    priority:"maximize",
    competitionStart:"2027-01-05",
    regularSeasonEnd:"2027-02-26",
    playoffStart:"",
    championshipDate:"",
    costEstimate:1000,
    athleteConflictGroup:"elem-boys"
  },
  {
    id:"ms-coed-soccer",
    audience:"Middle School",
    grades:"6–8",
    gender:"Coed",
    sport:"Soccer",
    name:"Coed Soccer",
    displayName:"Coed Soccer",
    windowId:"ms-spring",
    league:"IYAC",
    leagueLabel:"IYAC",
    status:"official",
    priority:"core",
    competitionStart:"2027-03-15",
    regularSeasonEnd:"2027-04-29",
    playoffStart:"",
    championshipDate:"2027-05-04",
    costEstimate:0,
    athleteConflictGroup:"ms-spring"
  },
  {
    id:"elem-boys-bball",
    audience:"Elementary",
    grades:"4–5",
    gender:"Boys",
    sport:"Basketball",
    name:"Boys Basketball",
    displayName:"Boys Basketball",
    windowId:"elem-spring",
    league:"CAA",
    leagueLabel:"CAA",
    status:"interest",
    priority:"maximize",
    competitionStart:"2027-03-16",
    regularSeasonEnd:"2027-04-30",
    playoffStart:"",
    championshipDate:"",
    costEstimate:1000,
    athleteConflictGroup:"elem-boys"
  },
  {
    id:"elem-coed-soccer",
    audience:"Elementary",
    grades:"4–5",
    gender:"Coed",
    sport:"Soccer",
    name:"Coed Soccer",
    displayName:"Coed Soccer",
    windowId:"elem-spring",
    league:"CAA",
    leagueLabel:"CAA",
    status:"interest",
    priority:"maximize",
    competitionStart:"2027-03-16",
    regularSeasonEnd:"2027-04-30",
    playoffStart:"",
    championshipDate:"",
    costEstimate:1000,
    athleteConflictGroup:"elem-all"
  }
];

export const windowMap = Object.fromEntries(programWindows.map(w=>[w.id,w]));
export const teamMap = Object.fromEntries(teams.map(t=>[t.id,t]));

export function gradeNumbers(team){
  const nums = String(team.grades||"").match(/\d+/g)?.map(Number)||[];
  if(!nums.length) return [];
  if(nums.length===1) return nums;
  const [a,b] = [Math.min(...nums),Math.max(...nums)];
  return Array.from({length:b-a+1},(_,i)=>a+i);
}

export function genderCompatible(team, gender){
  if(!gender) return true;
  if(String(team.gender).toLowerCase()==="coed") return true;
  return gender==="Boy"
    ? String(team.gender).toLowerCase().startsWith("boy")
    : String(team.gender).toLowerCase().startsWith("girl");
}

export function gradeCompatible(team, grade, {adminOverride=false}={}){
  const g=Number(grade||0);
  if(!g) return true;
  if(gradeNumbers(team).includes(g)) return true;
  if(adminOverride && g===6 && String(team.bridgeEligible||team.bridgeGrade||"")==="6") return true;
  return false;
}

export function datesOverlap(a,b){
  if(!a?.competitionStart || !a?.regularSeasonEnd || !b?.competitionStart || !b?.regularSeasonEnd) return false;
  return a.competitionStart <= b.regularSeasonEnd && b.competitionStart <= a.regularSeasonEnd;
}

export function athleteOpportunityConflict(a,b){
  if(a.id===b.id || !datesOverlap(a,b)) return false;
  const gradesA=new Set(gradeNumbers(a)), gradesB=new Set(gradeNumbers(b));
  const gradeOverlap=[...gradesA].some(g=>gradesB.has(g));
  if(!gradeOverlap) return false;

  const genders=["Boy","Girl"];
  return genders.some(g=>genderCompatible(a,g)&&genderCompatible(b,g));
}
