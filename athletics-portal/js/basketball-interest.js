import { db } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const COLLECTION = "winterBasketballInterest2027";
const $ = id => document.getElementById(id);
const form = $("basketballForm");
const submitBtn = $("submitBtn");
const status = $("status");

function show(message, type = "error"){
  status.hidden = false;
  status.textContent = message;
  status.className = "status " + type;
  status.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if(!form.reportValidity()) return;
  if($("website").value) return; // Bot trap; this field is invisible to real families.

  const studentName = $("studentName").value.trim().replace(/\s+/g, " ");
  const grade = $("grade").value;
  const team = form.querySelector('input[name="team"]:checked')?.value || "";
  const parentName = $("parentName").value.trim().replace(/\s+/g, " ");
  const contact = $("contact").value.trim();
  const validTeam = team === "Boys Basketball" || team === "Girls Basketball";

  if(studentName.length < 2 || studentName.length > 100 ||
     !["6","7","8"].includes(grade) || !validTeam ||
     parentName.length < 2 || parentName.length > 100 ||
     contact.length < 5 || contact.length > 150){
    show("Please fill out the student, team, and parent contact fields.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Submitting…";
  status.hidden = true;

  try {
    await addDoc(collection(db, COLLECTION), {
      studentName,
      grade,
      team,
      parentName,
      contact,
      status: "interested",
      source: "basketball-2026-27",
      submittedAt: serverTimestamp()
    });
    form.reset();
    show("You're on the interest list! Your response was saved. Explore Academy Athletics will be in touch with details about the season.", "success");
  } catch (error) {
    console.error("Basketball interest form submission failed:", error);
    if(error?.code === "permission-denied"){
      show("The interest list is temporarily unable to accept responses. Please contact Explore Athletics directly.");
    } else {
      show("Your response could not be saved. Please try again, or contact Explore Athletics.");
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit Interest →";
  }
});
