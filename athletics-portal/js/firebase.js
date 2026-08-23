import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-storage.js";
import { firebaseConfig, APP_CHECK_SITE_KEY } from "./firebase-config.js";
export const app = initializeApp(firebaseConfig);
if(APP_CHECK_SITE_KEY){
  import("https://www.gstatic.com/firebasejs/12.2.1/firebase-app-check.js").then(({initializeAppCheck,ReCaptchaEnterpriseProvider})=>{
    initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),isTokenAutoRefreshEnabled:true});
  }).catch(err=>console.warn("App Check initialization failed",err));
}
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
