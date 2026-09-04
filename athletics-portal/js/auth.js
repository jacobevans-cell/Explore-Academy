import { auth, db } from "./firebase.js";
import { ADMIN_EMAIL } from "./firebase-config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { doc,getDoc,setDoc,serverTimestamp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
export const isAdminUser=u=>!!u?.email && u.email.toLowerCase()===ADMIN_EMAIL.toLowerCase() && u.emailVerified;
export function requireVerifiedUser({admin=false}={}){ return new Promise(resolve=>{ const off=onAuthStateChanged(auth,async u=>{ off(); if(!u){location.replace('login.html');return;} if(!u.emailVerified){location.replace('login.html?verify=1');return;} if(admin&&!isAdminUser(u)){location.replace('portal.html');return;} resolve(u); }); }); }
export async function ensureUserDoc(u){ const r=doc(db,'users',u.uid),s=await getDoc(r); if(!s.exists()) await setDoc(r,{uid:u.uid,email:u.email||'',displayName:u.displayName||'',role:isAdminUser(u)?'admin':'family',createdAt:serverTimestamp(),lastLoginAt:serverTimestamp()}); else await setDoc(r,{displayName:u.displayName||s.data().displayName||'',lastLoginAt:serverTimestamp()},{merge:true}); }
export async function logout(){ await signOut(auth); location.replace('login.html'); }

// Keep athletics admin utilities one click away from the current admin.
if (location.pathname.endsWith('/admin.html')) {
  window.addEventListener('DOMContentLoaded', () => {
    const sideLinks = document.querySelector('.side-links');
    if (!sideLinks) return;

    if (!sideLinks.querySelector('[data-admin-calendar]')) {
      const calendarButton = document.createElement('button');
      calendarButton.type = 'button';
      calendarButton.textContent = 'Master Calendar';
      calendarButton.dataset.adminCalendar = 'true';
      calendarButton.addEventListener('click', () => {
        location.href = 'admin-calendar.html';
      });
      sideLinks.appendChild(calendarButton);
    }

    if (!sideLinks.querySelector('[data-legacy-interest]')) {
      const interestButton = document.createElement('button');
      interestButton.type = 'button';
      interestButton.textContent = 'Interest';
      interestButton.dataset.legacyInterest = 'true';
      interestButton.addEventListener('click', () => {
        location.href = 'legacy-interest.html';
      });
      sideLinks.appendChild(interestButton);
    }
  });
}
