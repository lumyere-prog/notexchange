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
   LOGIN CLICK
========================= */
loginBtn.addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    console.log("🔥 LOGIN SUCCESS:", user.email);

    const userRef = doc(db, "user", user.uid);
    const snap = await getDoc(userRef);

    let userData;

    if (snap.exists()) {
      // ✅ EXISTING USER → just update status
      await updateDoc(userRef, {
        status: "Active",
        lastLogin: serverTimestamp()
      });

      userData = snap.data();

    } else {
      // 🆕 NEW USER
      const newUser = {
        username: user.displayName,
        email: user.email,
        profilePic: user.photoURL,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        status: "Active",
        points: 0,
        bio: "",
        interest: ""
      };

      await setDoc(userRef, newUser);

      userData = newUser;
    }

    // 💾 SAVE SESSION
    localStorage.setItem("user", JSON.stringify({
      uid: user.uid,
      ...userData
    }));

    window.location.href = "home.html";

  } catch (err) {
    console.error("LOGIN ERROR:", err);
  }
});