
import { auth, db } from "./firebase.js";
import { ensureUserDoc } from "./auth.js";
import { teams as fallbackTeams } from "./seed-data.js";
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, reload, signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import {
  collection, doc, query, where, getDocs, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const $ = id => document.getElementById(id);
const teamIds = { boys: "ms-boys-bball", girls: "ms-girls-bball" };
const validGrades = ["6","7","8"];
let currentUser = null;
let athletes = [];
let teams = fallbackTeams;

function message(id, value, kind="info"){
  const el = $(id);
  el.textContent = value;
  el.className = "message " + kind;
  el.hidden = !value;
}
function readableError(err){
  const code = String(err && err.code || "");
  if(code.includes("invalid-credential") || code.includes("wrong-password")) return "Email or password not recognized.";
  if(code.includes("email-already-in-use")) return "An account already uses that email. Sign in instead.";
  if(code.includes("popup-closed")) return "Google sign-in was closed before completion.";
  if(code.includes("unauthorized-domain")) return "This website needs to be authorized in Firebase Authentication. Contact Explore Athletics.";
  if(code.includes("permission-denied")) return "The secure database did not authorize this request. Contact Explore Athletics.";
  if(code.includes("network-request-failed") || code.includes("unavailable")) return "Connection interrupted. Please try again.";
  return "Something went wrong. Please try again, or contact Explore Athletics.";
}
const getTeamSelection = () => document.querySelector('input[name="team"]:checked')?.value || "";

async function refreshAthletes(){
  const snapshot = await getDocs(query(collection(db,"athletes"),where("familyUid","==",currentUser.uid)));
  athletes = snapshot.docs.map(d=>({id:d.id,...d.data()}))
    .filter(a=>validGrades.includes(String(a.grade)) && ["Boy","Girl"].includes(a.gender))
    .sort((a,b)=>(String(a.firstName||"")+" "+String(a.lastName||"")).localeCompare(String(b.firstName||"")+" "+String(b.lastName||"")));
  const select = $("savedAthlete");
  select.replaceChildren(new Option("Add a new athlete", "new"));
  athletes.forEach(a=>select.add(new Option((a.firstName||"")+" "+(a.lastName||"")+" • Grade "+a.grade, a.id)));
  select.value="new";
  setAthleteMode();
}

function setAthleteMode(){
  const a = athletes.find(x=>x.id===$("savedAthlete").value);
  $("firstName").value = a ? a.firstName||"" : "";
  $("lastName").value = a ? a.lastName||"" : "";
  $("grade").value = a ? String(a.grade) : "";
  const chosen = a ? (a.gender==="Boy"?"boys":"girls") : "";
  document.querySelectorAll('input[name="team"]').forEach(r=>{
    r.checked = r.value===chosen;
    r.disabled = !!a;
    r.closest(".team-option").classList.toggle("is-selected",r.checked);
  });
  for(const id of ["firstName","lastName","grade"]) $(id).disabled=!!a;
  $("savedAthleteNote").textContent = a
    ? "Using this student’s existing secure athletics profile. For profile corrections, use the family portal."
    : "Create a basic student profile here. Full athletics clearance is handled separately after selection.";
  message("formStatus","");
}

function showSignedIn(user){
  $("authPanel").hidden=true;
  $("interestPanel").hidden=false;
  $("loggedInEmail").textContent=user.email||"Signed in";
  $("contactEmail").value=user.email||"";
  if(!$("guardianName").value && user.displayName) $("guardianName").value=user.displayName;
}

async function handleAuth(user){
  if(!user){
    currentUser=null;
    $("authPanel").hidden=false;
    $("interestPanel").hidden=true;
    $("verifyPanel").hidden=true;
    return;
  }
  if(!user.emailVerified){
    currentUser=null;
    $("authPanel").hidden=false;
    $("interestPanel").hidden=true;
    $("verifyPanel").hidden=false;
    message("authStatus","Please verify your email, then select ‘I verified my email’.","warning");
    return;
  }
  currentUser=user;
  $("verifyPanel").hidden=true;
  showSignedIn(user);
  try{
    await ensureUserDoc(user);
    const teamsSnapshot=await getDocs(collection(db,"teams"));
    if(!teamsSnapshot.empty) teams=teamsSnapshot.docs.map(d=>({id:d.id,...d.data()}));
    await refreshAthletes();
    message("formStatus","");
  }catch(err){
    console.error("Basketball interest initialization:",err);
    message("formStatus","Could not load your secure athletics profile. "+readableError(err),"error");
  }
}

onAuthStateChanged(auth, user => { handleAuth(user).catch(e=>{
  console.error(e);
  message("authStatus",readableError(e),"error");
}); });

$("googleBtn").addEventListener("click",async()=>{
  message("authStatus","");
  try{await signInWithPopup(auth,new GoogleAuthProvider());}
  catch(err){message("authStatus",readableError(err),"error");}
});
$("emailLogin").addEventListener("submit",async ev=>{
  ev.preventDefault();
  const email=$("email").value.trim(), password=$("password").value;
  message("authStatus","");
  try{await signInWithEmailAndPassword(auth,email,password);}
  catch(err){message("authStatus",readableError(err),"error");}
});
$("createAccount").addEventListener("click",async()=>{
  const email=$("email").value.trim(), password=$("password").value;
  if(!email || password.length<8){message("authStatus","Enter your email and a password of at least 8 characters.","warning");return;}
  try{
    const result=await createUserWithEmailAndPassword(auth,email,password);
    await sendEmailVerification(result.user);
    message("authStatus","Account created! Check your email for the verification link, then return to finish signing up.","success");
  }catch(err){message("authStatus",readableError(err),"error");}
});
$("resetPassword").addEventListener("click",async()=>{
  const email=$("email").value.trim();
  if(!email){message("authStatus","Enter your email first.","warning");return;}
  try{await sendPasswordResetEmail(auth,email);message("authStatus","Password reset email sent.","success");}
  catch(err){message("authStatus",readableError(err),"error");}
});
$("checkVerified").addEventListener("click",async()=>{
  try{
    if(auth.currentUser) await reload(auth.currentUser);
    await handleAuth(auth.currentUser);
  }catch(err){message("authStatus",readableError(err),"error");}
});
$("signOut").addEventListener("click",()=>signOut(auth));
$("savedAthlete").addEventListener("change",setAthleteMode);
document.querySelectorAll('input[name="team"]').forEach(input=>{
  input.addEventListener("change",()=>{
    document.querySelectorAll(".team-option").forEach(el=>el.classList.toggle("is-selected",el.querySelector("input").checked));
  });
});

$("interestForm").addEventListener("submit",async ev=>{
  ev.preventDefault();
  if(!currentUser){message("formStatus","Sign in first to save interest.","warning");return;}
  if(!$("interestForm").reportValidity())return;
  const saved=athletes.find(a=>a.id===$("savedAthlete").value);
  const first=(saved?.firstName||$("firstName").value).trim();
  const last=(saved?.lastName||$("lastName").value).trim();
  const grade=String(saved?.grade||$("grade").value);
  const teamChoice=saved?(saved.gender==="Boy"?"boys":"girls"):getTeamSelection();
  const guardianName=$("guardianName").value.trim();
  const guardianPhone=$("guardianPhone").value.trim();
  const teamId=teamIds[teamChoice];
  const team=teams.find(t=>t.id===teamId) || fallbackTeams.find(t=>t.id===teamId);
  if(!first||!last||!validGrades.includes(grade)||!teamId||!team){
    message("formStatus","Complete the student name, grade, and basketball team.","error");return;
  }
  if(team.status==="cancelled" || team.status==="complete"){
    message("formStatus","This program is not currently accepting new interest submissions.","error");return;
  }
  if(!guardianName || !guardianPhone){
    message("formStatus","Please provide a parent/guardian name and phone number.","error");return;
  }
  const button=$("submitInterest");
  button.disabled=true;
  button.textContent="Saving securely…";
  message("formStatus","");
  let athleteId=saved?.id;
  let athleteCreated=false;
  try{
    if(!athleteId){
      const duplicate=athletes.find(a=>
        String(a.firstName||"").trim().toLowerCase()===first.toLowerCase() &&
        String(a.lastName||"").trim().toLowerCase()===last.toLowerCase() &&
        String(a.grade)===grade &&
        a.gender===(teamChoice==="boys"?"Boy":"Girl"));
      if(duplicate){
        athleteId=duplicate.id;
      }else{
        athleteId=crypto.randomUUID();
        await setDoc(doc(db,"athletes",athleteId),{
          familyUid:currentUser.uid,
          email:currentUser.email,
          firstName:first,lastName:last,grade:grade,
          gender:teamChoice==="boys"?"Boy":"Girl",
          guardianName,guardianEmail:currentUser.email,guardianPhone,
          adminEligibility:"eligible",
          createdAt:serverTimestamp(),updatedAt:serverTimestamp()
        });
        athleteCreated=true;
      }
    }
    const registrationRef=doc(db,"athletes",athleteId,"registrations",teamId);
    const existing=await getDoc(registrationRef);
    if(existing.exists() && existing.data().status!=="declined"){
      message("formStatus",first+" is already on the "+team.displayName+" interest list. No duplicate was added.","success");
      return;
    }
    if(existing.exists()){
      message("formStatus","This athlete has a previous registration decision. Please contact Explore Athletics instead of submitting again.","warning");
      return;
    }
    if(!athleteCreated){
      await updateDoc(doc(db,"athletes",athleteId),{
        guardianName, guardianPhone, guardianEmail:currentUser.email, updatedAt:serverTimestamp()
      });
    }
    await setDoc(registrationRef,{
      athleteId, familyUid:currentUser.uid, teamId,
      teamName:team.displayName||team.name,
      windowId:team.windowId||"ms-winter",
      status:"submitted", conflictTeamIds:[], submittedAt:serverTimestamp()
    });
    // The database write above is the source of truth. A later UI refresh failure
    // must never misreport a successfully saved registration as a failed submission.
    try{
      await refreshAthletes();
      if(athletes.some(a=>a.id===athleteId)){
        $("savedAthlete").value=athleteId;
        setAthleteMode();
      }
    }catch(refreshError){console.warn("Registration saved, but student list refresh failed:",refreshError);}
    message("formStatus","Interest saved! "+first+" has been added to the "+team.displayName+" interest list. This is not a guaranteed roster spot. You can view the submission in the family athletics portal.","success");
    $("interestForm").querySelector('input[name="guardianConsent"]').checked=false;
  }catch(err){
    console.error("Basketball signup failed:",err);
    message("formStatus",(athleteCreated?"The athlete profile was created, but basketball interest was not confirmed. Please retry the form. ":"We could not save your interest. ")+readableError(err),"error");
    if(athleteCreated) await refreshAthletes().catch(()=>{});
  }finally{
    button.disabled=false;
    button.textContent="Save Basketball Interest";
  }
});
