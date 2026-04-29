import { onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth } from "/firebase/firebase-client.js";

let currentUser = null;

// 🔥 GLOBAL AUTH CHECK
onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (!user) {
    // 🚀 Redirect to the index page instead of login.html
    window.location.href = "index.html";
    return;
  }

  console.log("Logged in as:", user.displayName);

  // 🔥 PRIORITY SYSTEM:
  // 1. Firestore (you should fetch separately)
  // 2. Google Auth photo
  // 3. fallback

  localStorage.setItem("user", JSON.stringify({
    uid: user.uid,
    name: user.displayName,
    email: user.email,
    photo: user.photoURL // fallback only
  }));
});

// 🔥 GET USER ANYWHERE
export function getUser() {
  return currentUser;
}

// 🚪 LOGOUT
export async function logout() {
  await signOut(auth);
  localStorage.removeItem("user");
  // 🚀 Redirect to the index page
  window.location.href = "index.html";
}