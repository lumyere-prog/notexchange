import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { auth, db } from "/firebase/firebase-client.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.querySelector(".logout-btn").addEventListener("click", async () => {
  try {
    // 🔍 get current user from localStorage
    const user = JSON.parse(localStorage.getItem("user"));

    // 🔥 update Firestore status first


    // 🚪 logout from Firebase Auth
    await signOut(auth);

    // 🧹 clear local session
    localStorage.removeItem("user");

    // 🚀 redirect directly to the new index/login hybrid
    window.location.href = "index.html";

  } catch (err) {
    console.error("Logout error:", err);
  }
});