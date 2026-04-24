import { db } from "/firebase/firebase-client.js"; 
import { getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onSnapshot, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { addPoints } from "/js/points.js";
import {
  collection,
  query,
  limit,    
  updateDoc,
  increment,
  runTransaction,
  where,
  serverTimestamp,
  orderBy,
  arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";   


document.addEventListener("DOMContentLoaded", () => {
  const localUser = JSON.parse(localStorage.getItem("user"));

  if (!localUser?.uid) {
    window.location.href = "login.html";
    return;
  }

  const userRef = doc(db, "user", localUser.uid);

  
  // 🔥 REAL-TIME LISTENER
  onSnapshot(userRef, (snap) => {
    if (!snap.exists()) {
      console.log("User not found");
      return;
    }

    const user = snap.data();

    // 👤 NAME
    const nameEl = document.querySelector(".name");
    if (nameEl) nameEl.textContent = user.username || "No Name";

    // 🧾 USERNAME
    const usernameEl = document.querySelector(".username");
    if (usernameEl) {
      usernameEl.textContent =
        "@" + (user.username?.toLowerCase().replace(/\s/g, "") || "user");
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

    // ⭐ STATS
    const stats = document.querySelectorAll(".stats div strong");
    if (stats.length >= 2) {
      stats[1].textContent = user.points || 0;
    }
  });
});
function toggleMenu() {
  const menu = document.getElementById("dropdownMenu");

  menu.style.display =
    menu.style.display === "block" ? "none" : "block";
}

// 🔥 make it global so HTML can access it
window.toggleMenu = toggleMenu;



// 1. Toggle the Dropdown Menu
window.toggleMenu = function() {
    const menu = document.getElementById("dropdownMenu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
};

// Close dropdown if clicking anywhere else on the screen
window.onclick = function(event) {
    if (!event.target.matches('.menu-btn')) {
        const dropdowns = document.getElementsByClassName("dropdown");
        for (let i = 0; i < dropdowns.length; i++) {
            let openDropdown = dropdowns[i];
            if (openDropdown.style.display === "block") {
                openDropdown.style.display = "none";
            }
        }
    }
};

// =========================================
// EDIT PROFILE: SLIDE ANIMATION LOGIC
// =========================================

// ===============================
// OPEN EDIT PROFILE
// ===============================


window.openEditProfile = async function () {
    const modal = document.getElementById("editProfileModal");
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user?.uid) return;

    try {
        const ref = doc(db, "user", user.uid);
        const snap = await getDoc(ref);

        if (!snap.exists()) return;

        const data = snap.data();

        // Fill inputs
        document.getElementById("editBio").value = data.bio || "";
        document.getElementById("editLink").value = data.link || "";

        // Profile image
        const img = document.getElementById("editProfileImage");
        if (img) img.src = data.profilePic || "/photos/guest.jpg";

    } catch (err) {
        console.error("Load profile error:", err);
    }

    if (modal) modal.classList.add("active");

    const dropdown = document.getElementById("dropdownMenu");
    if (dropdown) dropdown.style.display = "none";
};

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ===============================
// INIT STORAGE
// ===============================
const storage = getStorage();

// ===============================
// PROFILE PICTURE UPLOAD
// ===============================
window.handleProfilePicChange = async function (event) {
    const file = event.target.files[0];
    const user = JSON.parse(localStorage.getItem("user"));

    if (!file || !user?.uid) return;

    try {
        // 📦 storage reference
        const storageRef = ref(storage, `profilePictures/${user.uid}`);

        // ⬆️ upload file
        await uploadBytes(storageRef, file);

        // 🔗 get download URL
        const downloadURL = await getDownloadURL(storageRef);

        // 🖼 update UI immediately
        const img = document.getElementById("editProfileImage");
        if (img) img.src = downloadURL;

        // 💾 save to Firestore
        const userRef = doc(db, "user", user.uid);
        await updateDoc(userRef, {
            profilePic: downloadURL
        });

        console.log("Profile picture updated successfully!");

    } catch (err) {
        console.error("Upload failed:", err);
    }
};

// ===============================
// BIND FILE INPUT EVENT
// ===============================
window.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("profilePicInput");

    if (input) {
        input.addEventListener("change", handleProfilePicChange);
    }
});
// ===============================
// CLOSE MODAL
// ===============================
window.closeEditProfile = function () {
    const modal = document.getElementById("editProfileModal");
    if (modal) modal.classList.remove("active");
};

// ===============================
// SAVE PROFILE
// ===============================
window.saveProfileChanges = async function () {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.uid) return;

    const updatedData = {
        bio: document.getElementById("editBio").value,
        link: document.getElementById("editLink").value,
    };

    try {
        const ref = doc(db, "user", user.uid);
        await updateDoc(ref, updatedData);

        console.log("Profile updated successfully");

        window.closeEditProfile();

    } catch (err) {
        console.error("Save error:", err);
    }
};

// ===============================
// ADD INTEREST (temporary local UI only)
// ===============================
window.addNewInterest = function () {
    const value = prompt("Enter new interest:");
    if (!value) return;

    const container = document.getElementById("editInterestsContainer");

    const tag = document.createElement("span");
    tag.className = "interest-tag";
    tag.innerHTML = `<span class="material-icons">star</span> ${value}`;

    container.insertBefore(tag, container.querySelector(".add-interest"));
};

// =========================================
// SETTINGS: SLIDE ANIMATION LOGIC
// =========================================

window.openSettings = function() {
    const modal = document.getElementById("editSettingsModal");
    if (modal) {
        modal.classList.add("active");
    }
    // Close dropdown
    const dropdown = document.getElementById("dropdownMenu");
    if (dropdown) dropdown.style.display = "none";
};

window.closeSettings = function() {
    const modal = document.getElementById("editSettingsModal");
    if (modal) {
        modal.classList.remove("active");
    }
};

window.handleLogout = function() {
    if(confirm("Are you sure you want to log out?")) {
        // Your existing logout logic here
        localStorage.removeItem("user");
        window.location.href = "login.html";
    }
};

// =========================================
// LEGAL MODAL: BOTTOM-TO-TOP LOGIC
// =========================================

window.openTerms = function() {
    const modal = document.getElementById("legalModal");
    const iframe = document.getElementById("legalPdfFrame");

    // 1. Set the source of the PDF
    iframe.src = "/assets/terms.pdf";

    // 2. Show the modal
    modal.classList.add("active");
};

window.closeTerms = function() {
    const modal = document.getElementById("legalModal");
    const iframe = document.getElementById("legalPdfFrame");

    // 1. Hide the modal
    modal.classList.remove("active");

    // 2. Clear the iframe source after animation to save memory
    setTimeout(() => {
        iframe.src = "";
    }, 400);
};

// =========================================
// PERSONAL INFO: SLIDE ANIMATION LOGIC
// =========================================

window.openPersonalInfo = function() {
    const modal = document.getElementById("personalInfoModal");
    if (modal) {
        modal.classList.add("active");
    }
};

window.closePersonalInfo = function() {
    const modal = document.getElementById("personalInfoModal");
    if (modal) {
        modal.classList.remove("active");
    }
};

// =========================================
// NOTIFICATIONS: SLIDE ANIMATION LOGIC
// =========================================

window.openNotifications = function() {
    const modal = document.getElementById("notificationsModal");
    if (modal) {
        modal.classList.add("active");
    }
};

window.closeNotifications = function() {
    const modal = document.getElementById("notificationsModal");
    if (modal) {
        modal.classList.remove("active");
    }
};

















/* =========================
   LOAD POSTS FROM FIRESTORE
========================= */
