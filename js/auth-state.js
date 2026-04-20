import { onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth } from "/firebase/firebase-client.js";

let currentUser = null;

// 🔥 GLOBAL AUTH CHECK
onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (!user) {
    // ❌ NOT LOGGED IN → redirect
    window.location.href = "login.html";
  } else {
    // ✅ LOGGED IN
    console.log("Logged in as:", user.displayName);

    localStorage.setItem("user", JSON.stringify({
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photo: user.photoURL
    }));
  }
});

// 🔥 GET USER ANYWHERE
export function getUser() {
  return currentUser;
}

// 🚪 LOGOUT
export async function logout() {
  await signOut(auth);
  localStorage.removeItem("user");
  window.location.href = "login.html";
}