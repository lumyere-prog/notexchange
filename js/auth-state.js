import { 
  onAuthStateChanged, 
  setPersistence, 
  browserLocalPersistence,
  signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth } from "/firebase/firebase-client.js";

// 1. Force the browser/phone to save the session to the disk
setPersistence(auth, browserLocalPersistence)
  .catch((err) => console.error("Persistence error:", err));

// 2. The Auth Listener
onAuthStateChanged(auth, (user) => {
  // If undefined, Firebase is still booting up—do nothing yet
  if (user === undefined) return; 

  if (user) {
    console.log("User detected:", user.displayName);
    
    // Save to Local Storage so other pages/reloads know the user is here instantly
    localStorage.setItem("user", JSON.stringify({
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      photo: user.photoURL
    }));
  } else {
    console.log("No active session found.");
    
    // Clear the local record since the session is gone
    localStorage.removeItem("user");

    // Only redirect if we aren't already trying to log in
    if (!window.location.pathname.includes("login.html")) {
      window.location.href = "login.html";
    }
  }
});

// 3. Export for use in your logout button
export const logoutUser = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem("user");
    window.location.href = "login.html";
  } catch (err) {
    console.error("Logout failed:", err);
  }
};