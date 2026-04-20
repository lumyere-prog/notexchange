import { db } from "/firebase/firebase-client.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  const localUser = JSON.parse(localStorage.getItem("user"));

  // 🚨 not logged in
  if (!localUser?.uid) {
    window.location.href = "login.html";
    return;
  }

  try {
    // 🔥 fetch fresh Firestore data
    const userRef = doc(db, "user", localUser.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      console.log("User not found");
      return;
    }

    const user = snap.data();

    // 👤 NAME
    const nameEl = document.querySelector(".name");
    if (nameEl) nameEl.textContent = user.username || "No Name";

    // 🧾 USERNAME (@handle style)
    const usernameEl = document.querySelector(".username");
    if (usernameEl) {
      usernameEl.textContent = "@" + (user.username?.toLowerCase().replace(/\s/g, "") || "user");
    }

    // 🖼 PROFILE IMAGE
    const imgEl = document.querySelector(".profile-img");
    if (imgEl) {
      imgEl.src = user.profilePic || "/photos/profile.jpg";
    }

    // 📝 BIO
    const bioEl = document.querySelector(".bio");
    if (bioEl) {
      bioEl.innerHTML = `
        <p><strong>BIO:</strong> ${user.bio || "No bio yet"}</p>
        <p><strong>INTEREST:</strong> ${user.interest || "Not set"}</p>
      `;
    }

    // ⭐ STATS (example)
    const stats = document.querySelectorAll(".stats div strong");

    if (stats.length >= 2) {
      stats[1].textContent = user.points || 0;
    }

  } catch (err) {
    console.error("Profile load error:", err);
  }
});
function toggleMenu() {
  const menu = document.getElementById("dropdownMenu");

  menu.style.display =
    menu.style.display === "block" ? "none" : "block";
}

// 🔥 make it global so HTML can access it
window.toggleMenu = toggleMenu;


