import { auth, provider, db } from "/firebase/firebase-client.js";
import {
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginBtn = document.getElementById("googleLogin");

/* =========================
   PERSISTENCE CHECKER
========================= */
// This runs automatically whenever the page is opened/refreshed
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    console.log("🔄 Persistent Session Found:", firebaseUser.email);
    
    // Fetch fresh data from Firestore to ensure localStorage has current restrictions
    const userRef = doc(db, "user", firebaseUser.uid);
    const snap = await getDoc(userRef);
    
    if (snap.exists()) {
      const userData = snap.data();
      
      // Update localStorage with fresh data
      localStorage.setItem("user", JSON.stringify({
        uid: firebaseUser.uid,
        ...userData
      }));

      // If they are on the login page but already logged in, send them home
      if (window.location.pathname.includes("login.html")) {
        window.location.href = "home.html";
      }
    }
  } else {
    console.log("👤 No user session found.");
    localStorage.removeItem("user");
  }
});

/* =========================
   LOGIN CLICK logic
========================= */
loginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, "user", user.uid);
    const snap = await getDoc(userRef);

    let userData;

    if (snap.exists()) {
      await updateDoc(userRef, {
        lastLogin: serverTimestamp()
      });
      userData = snap.data();
    } else {
      const newUser = {
        username: user.displayName,
        email: user.email,
        profilePic: user.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        state: "active",
        restrictions: {
            appLock: false,
            postBlock: false,
            commentBlock: false
        },
        points: 0,
        bio: "",
        interests: []
      };
      await setDoc(userRef, newUser);
      userData = newUser;
    }

    localStorage.setItem("user", JSON.stringify({
      uid: user.uid,
      ...userData
    }));

    window.location.href = "home.html";

  } catch (err) {
    console.error("LOGIN ERROR:", err);
  }
});