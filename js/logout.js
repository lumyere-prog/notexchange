import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth, db } from "/firebase/firebase-client.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.querySelector(".logout-btn").addEventListener("click", async () => {
  try {
    // 🔍 get current user from localStorage
    const user = JSON.parse(localStorage.getItem("user"));

    // 🔥 update Firestore status first
    if (user?.uid) {
      const userRef = doc(db, "user", user.uid);

      await updateDoc(userRef, {
        status: "Offline"
      });

      console.log("👋 User set to Offline");
    }

    // 🚪 logout from Firebase Auth
    await signOut(auth);

    // 🧹 clear local session
    localStorage.removeItem("user");

    // 🚀 redirect to login
    window.location.href = "login.html";

  } catch (err) {
    console.error("Logout error:", err);
  }
});