import { auth } from "./firebase.js";
import { ADMIN_EMAIL } from "./firebase-config.js";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, updateProfile } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const $=id=>document.getElementById(id); const status=$("status");
function msg(text,type="info"){status.textContent=text;status.className=`notice ${type} status show`;}
const params=new URLSearchParams(location.search); if(params.get('verify')) msg('Verify your email address before opening the athlete portal. Check your inbox, then sign in again.','warning');

$("loginForm").addEventListener("submit",async e=>{e.preventDefault();try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value);const u=auth.currentUser;if(!u.emailVerified){await sendEmailVerification(u);msg('Email verification required. A new verification email was sent.','warning');return;}location.replace(u.email?.toLowerCase()===ADMIN_EMAIL.toLowerCase()?"admin.html":"portal.html");}catch(err){msg(friendly(err),'danger')}});
$("googleBtn").addEventListener("click",async()=>{try{const p=new GoogleAuthProvider();const cred=await signInWithPopup(auth,p);location.replace(cred.user.email?.toLowerCase()===ADMIN_EMAIL.toLowerCase()?"admin.html":"portal.html");}catch(err){msg(friendly(err),'danger')}});
$("createBtn").addEventListener("click",async()=>{const email=$("email").value.trim(),password=$("password").value;if(password.length<8){msg('Use at least 8 characters for the password.','warning');return;}try{const cred=await createUserWithEmailAndPassword(auth,email,password);await updateProfile(cred.user,{displayName:email.split('@')[0]});await sendEmailVerification(cred.user);msg('Account created. Verify the email address, then return here to sign in.','success');}catch(err){msg(friendly(err),'danger')}});
$("resetBtn").addEventListener("click",async()=>{const email=$("email").value.trim();if(!email){msg('Enter your email first.','warning');return;}try{await sendPasswordResetEmail(auth,email);msg('Password reset email sent.','success');}catch(err){msg(friendly(err),'danger')}});
function friendly(e){const c=e.code||'';if(c.includes('invalid-credential'))return'Incorrect email or password.';if(c.includes('email-already'))return'An account already exists for that email.';if(c.includes('popup-closed'))return'Sign-in popup was closed.';return e.message||'Something went wrong.'}
