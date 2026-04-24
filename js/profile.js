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

window.openEditProfile = function() {
    const modal = document.getElementById("editProfileModal");
    if (modal) {
        // This triggers the CSS 'transform: translateX(0)'
        modal.classList.add("active");
    }

    // Close the dropdown menu automatically so it isn't open behind the modal
    const dropdown = document.getElementById("dropdownMenu");
    if (dropdown) {
        dropdown.style.display = "none";
    }
};

window.closeEditProfile = function() {
    const modal = document.getElementById("editProfileModal");
    if (modal) {
        // This triggers the CSS 'transform: translateX(100%)' to slide it back out
        modal.classList.remove("active");
    }
};

window.saveProfileChanges = function() {
    // Placeholder for your database logic
    console.log("Profile changes saved to database.");
    
    // Smoothly slide back to the main profile page
    window.closeEditProfile();
};

window.addNewInterest = function() {
    // Placeholder logic for adding a new interest tag
    const newInterest = prompt("What interest would you like to add?");
    if (newInterest) {
        console.log("New interest added: " + newInterest);
    }
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