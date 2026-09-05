// Firebase Web App configuration for Explore Sports Interest.
// This config is intentionally client-side. Security is enforced by Firebase Auth,
// Firestore rules, and Storage rules.
export const firebaseConfig = {
  apiKey: "AIzaSyCkObP423XCbzHC-wkWqKlH9phDiZBz-BM",
  authDomain: "explore-sports-interest.firebaseapp.com",
  projectId: "explore-sports-interest",
  storageBucket: "explore-sports-interest.firebasestorage.app",
  messagingSenderId: "617847108980",
  appId: "1:617847108980:web:4efd00431740d1e03f2821",
  measurementId: "G-2HBGS7K1MC"
};

// Must match the administrator email authorized in firestore.rules.
export const ADMIN_EMAIL = "jacobicus@gmail.com";
export const SCHOOL_YEAR = "2026-27";

// Optional Firebase App Check / reCAPTCHA Enterprise site key. Leave blank until configured in Firebase Console.
export const APP_CHECK_SITE_KEY = "";
