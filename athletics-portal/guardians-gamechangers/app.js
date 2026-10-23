import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig } from "../js/firebase-config.js";

const EVENT_ID = "guardians-gamechangers-2026-11-07";
const COLLECTION = "guardianGamechangerSignups";
const playerSkills = new Set(["new", "school", "club"]);
const parentSkills = new Set(["new", "recreational", "experienced"]);
const db = getFirestore(initializeApp(firebaseConfig));
const form = document.getElementById("signupForm");
const button = document.getElementById("submitBtn");
const status = document.getElementById("status");
const field = id => document.getElementById(id).value.trim();

function show(message, type) {
  status.textContent = message;
  status.className = `status ${type}`;
  status.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (field("website")) return;
  if (!form.reportValidity()) return;

  const playerName = field("playerName");
  const playerAge = Number(field("playerAge"));
  const playerSkill = field("playerSkill");
  const parentName = field("parentName");
  const parentSkill = field("parentSkill");
  const contactEmail = field("contactEmail").toLowerCase();
  const contactPhone = field("contactPhone");
  const notes = field("notes");

  if (playerName.length < 2 || parentName.length < 2 ||
      !Number.isInteger(playerAge) || playerAge < 5 || playerAge > 19 ||
      !playerSkills.has(playerSkill) || !parentSkills.has(parentSkill) ||
      contactEmail.length < 5 || contactEmail.length > 150) {
    show("Please check the required names, player age, experience levels, and email.", "error");
    return;
  }

  button.disabled = true;
  button.textContent = "Saving registration…";
  try {
    const saved = await addDoc(collection(db, COLLECTION), {
      eventId: EVENT_ID,
      playerName, playerAge, playerSkill,
      parentName, parentSkill,
      contactEmail, contactPhone, notes,
      status: "registered",
      feeStatus: "due",
      submittedAt: serverTimestamp()
    });
    form.reset();
    show(`Your team is registered! Reference ${saved.id.slice(0, 8).toUpperCase()}. Wave assignments and play times will be announced before November 7. The $10 fee is collected separately.`, "ok");
  } catch (error) {
    console.error("Tournament signup failed", error);
    show("We could not save your registration right now. Please try again in a moment or contact Explore Athletics.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Register our team →";
  }
});

