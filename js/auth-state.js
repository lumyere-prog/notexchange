import { onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth } from "/firebase/firebase-client.js";

let currentUser = null;
let authReady = false;

// 🔥 GLOBAL AUTH CHECK
onAuthStateChanged(auth, (user) => {

  currentUser = user;
  authReady = true;

  // ❗ WAIT FOR INITIALIZATION ONLY
  if (!authReady) return;

  if (!user) {
    console.log("No user detected AFTER auth init");

    // prevent redirect loop in PWA
    if (window.location.pathname !== "/index.html") {
      window.location.href = "index.html";
    }
    return;
  }

  console.log("Logged in as:", user.displayName);

  localStorage.setItem("user", JSON.stringify({
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photo: user.photoURL
  }));
});