import { 
  onAuthStateChanged, 
  signOut,
  setPersistence, 
  browserLocalPersistence 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth } from "/firebase/firebase-client.js";

// 1. Force Firebase to remember the user session even after the app is closed
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Auth persistence set to LOCAL");
  })
  .catch((error) => console.error("Persistence error:", error));

let currentUser = null;

// 2. GLOBAL AUTH CHECK
onAuthStateChanged(auth, (user) => {
  if (user === undefined) return;

  currentUser = user;

  if (!user) {
    console.log("No user detected");

    if (!window.location.pathname.includes("login.html")) {
      window.location.href = "login.html";
    }
    return;
  }

  // 3. User is successfully logged in
  console.log("Logged in as:", user.displayName);

  // Sync with localStorage exactly as they are in Firebase
  localStorage.setItem("user", JSON.stringify({
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photo: user.photoURL
  }));
});