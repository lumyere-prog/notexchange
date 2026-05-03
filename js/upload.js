import { db, storage } from "/firebase/firebase-client.js";
import { addPoints } from "/js/points.js";

import {
  collection,
  addDoc,
  doc, 
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadBytesResumable,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

import { checkUserState } 
from "/js/profile-stats.js";

import { onAuthStateChanged } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { auth } from "/firebase/firebase-client.js";



export function initAuthGuard(callback) {
    onAuthStateChanged(auth, async (user) => {
        console.log("🔥 AUTH USER:", user);

        if (!user) {
            console.log("❌ No user logged in");
            return;
        }

        const state = await checkUserState(user);
        console.log("🧠 USER STATE:", state);

        // We fetch the full user data to check granular restrictions
        const userDoc = await getDoc(doc(db, "user", user.uid));
        const userData = userDoc.exists() ? userDoc.data() : {};

        // Only trigger the full page block if the state is "suspended" AND it's a full App Lockdown.
        if (state === "suspended" && userData.restrictions?.appLock !== false) {
            console.log("🚫 USER BLOCKED (Full Lockdown)");
            // 🔥 USE CENTRAL MODAL
            showSuspendedModal("Your account is suspended");
            return;
        }

        // ✅ allow page logic
        if (callback) callback(user, state);
    });
}
// ===============================
// FILE NAME DISPLAY
// ===============================
document.addEventListener("DOMContentLoaded", () => {

  const fileInput = document.getElementById("fileInput");
  const fileNameText = document.getElementById("fileName");
  const subjectInput = document.getElementById("subject");
  const subjectBtn = document.getElementById("subjectBtn");
  const subjectValue = document.getElementById("subjectValue");
  const subjectOptions = document.getElementById("subjectOptions");
  const uploadModal = document.getElementById("uploadModal");
  const modalCloseBtn = document.getElementById("modalCloseBtn");
  const uploadAgainBtn = document.getElementById("uploadAgainBtn");

  const categories = [
    "Mathematics",
    "Science",
    "Computer Science",
    "Engineering",
    "Health & Medicine",
    "Social Science",
    "Business & Economics",
    "Arts & Humanities",
    "General Studies"
  ];

  const renderSubjectOptions = () => {
    if (!subjectOptions) return;
    categories.forEach(category => {
      const option = document.createElement("button");
      option.type = "button";
      option.className = "subject-option";
      option.textContent = category;
      option.addEventListener("click", () => {
        if (!subjectInput || !subjectValue) return;
        subjectInput.value = category;
        subjectValue.textContent = category;
        subjectOptions.classList.add("hidden");
        subjectBtn.setAttribute("aria-expanded", "false");
      });
      subjectOptions.appendChild(option);
    });
  };

  renderSubjectOptions();

  const closeSubjectDropdown = () => {
    if (!subjectOptions || !subjectBtn) return;
    subjectOptions.classList.add("hidden");
    subjectBtn.setAttribute("aria-expanded", "false");
  };

  if (subjectBtn && subjectOptions) {
    subjectBtn.addEventListener("click", () => {
      subjectOptions.classList.toggle("hidden");
      const expanded = subjectOptions.classList.contains("hidden") ? "false" : "true";
      subjectBtn.setAttribute("aria-expanded", expanded);
    });
  }

  document.addEventListener("click", (event) => {
    const dropdown = document.getElementById("subjectDropdown");
    if (dropdown && !dropdown.contains(event.target)) {
      closeSubjectDropdown();
    }
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    fileNameText.textContent = file ? file.name : "";
  });

  const showUploadModal = () => {
    if (!uploadModal) return;
    uploadModal.classList.remove("hidden");
    uploadModal.classList.add("show");
  };

  if (modalCloseBtn && uploadModal) {
    modalCloseBtn.addEventListener("click", () => {
      // Send them back to the home page instead of just hiding the modal
      window.location.href = "home.html"; 
    });
  }

if (uploadAgainBtn && uploadModal) {
  uploadAgainBtn.addEventListener("click", () => {
    
    // reset form
    const form = document.getElementById("postForm");
    if (form) form.reset();

    // clear file name display
    const fileName = document.getElementById("fileName");
    if (fileName) fileName.textContent = "";

    // reset subject display (if you use custom dropdown)
    const subjectValue = document.getElementById("subjectValue");
    if (subjectValue) subjectValue.textContent = "Select a subject";

    const subjectInput = document.getElementById("subject");
    if (subjectInput) subjectInput.value = "";

    // hide modal
    uploadModal.classList.add("hidden");
  });
}

  window.showUploadModal = showUploadModal;

});

// ===============================
// UPLOAD FORM
// ===============================
const form = document.getElementById("postForm");
const uploadBtn = document.querySelector(".upload-btn");

form.addEventListener("submit", async (e) => {

  
  e.preventDefault();
  
  const user = JSON.parse(localStorage.getItem("user"));
  const file = document.getElementById("fileInput").files[0];

if (!user?.uid) return alert("Login first");
if (!file) return alert("Select a file first");

// 🔥 ADMIN RESTRICTION CHECK (Gets fresh data from Firestore)
const userRef = doc(db, "user", user.uid);
const userSnap = await getDoc(userRef);
if (userSnap.exists()) {
    const userData = userSnap.data();
    
   // Check Full Lockdown OR specific Post Block
    if (userData.state === "suspended" || userData.restrictions?.postBlock === true) {
        
        // Show the custom mobile modal
        const restrictionMsg = document.getElementById("restrictionMessage");
        const restrictionModalWrapper = document.getElementById("restrictionModalWrapper");

        if (restrictionMsg && restrictionModalWrapper) {
            restrictionMsg.textContent = "Your account is restricted from uploading posts. Reason: " + (userData.suspendReason || "Admin action.");
            restrictionModalWrapper.style.display = "flex"; // 🔥 Changed to flex to center it
        }
        
        return; // Stop the upload
    }
}

// 🔒 PDF ONLY VALIDATION
if (file.type !== "application/pdf") {
  alert("Only PDF files are allowed!");
  return;
}

// (extra safety fallback)
if (!file.name.toLowerCase().endsWith(".pdf")) {
  alert("Only PDF files are allowed!");
  return;
}

// 📦 FILE SIZE LIMIT (10MB)
const MAX_SIZE = 10 * 1024 * 1024;

if (file.size > MAX_SIZE) {
  alert("File is too large! Max size is 10MB.");
  return;
}
  try {
    console.log("🔥 UPLOADING FILE...");


    // 🔒 DISABLE BUTTON
    uploadBtn.disabled = true;
    uploadBtn.innerText = "Uploading 0%";

    // 📁 STORAGE REF
    const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);

    // 🔥 RESUMABLE UPLOAD (for progress)
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      "state_changed",

      // 📊 PROGRESS
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );

        uploadBtn.innerText = `Uploading ${progress}%`;
      },

      // ❌ ERROR
      (error) => {
        console.error("Upload error:", error);
        uploadBtn.disabled = false;
        uploadBtn.innerText = "Upload";
      },

      // ✅ COMPLETE
      // ... inside the uploadTask.on "complete" callback
async () => {
    const fileURL = await getDownloadURL(uploadTask.snapshot.ref);

    const userRef = doc(db, "user", user.uid);
    const userSnap = await getDoc(userRef);
    
    // 🔥 DEBUG LOGS
    console.log("Looking for UID:", user.uid);
    console.log("Does Profile Exist?:", userSnap.exists());
    
    const userData = userSnap.exists() ? userSnap.data() : {};
    console.log("Fresh Profile Data found:", userData);

    const postData = {
        title: document.getElementById("title").value,
        subject: document.getElementById("subject").value,
        description: document.getElementById("description").value,
        fileURL: fileURL,
        fileName: file.name,
        
        // Use the alias from Firestore, or fallback if NOT found
        alias: userData.alias || user.name || "Anonymous Student",
        interests: userData.interests || [],
        profilePic: userData.profilePic || user.photo || "/photos/profile.jpg",
        
        upvotes: 0,
        downvotes: 0,
        userId: user.uid,
        username: user.username || user.name,
        timestamp: serverTimestamp(),
        userVotes: {},
        voteRewards: {}
    };

    const refDoc = await addDoc(collection(db, "pendingPosts"), postData);
    console.log("UPLOADED WITH PROFILE DATA:", postData);

    // 💰 ADD POINTS
    await addPoints(user.uid, 10);

    // 🔓 RESET UI
    uploadBtn.disabled = false;
    uploadBtn.innerText = "Upload";
    document.getElementById("postForm").reset();
    document.getElementById("fileName").textContent = "";
    showUploadModal();
}
    );

  } catch (err) {
    console.error("Upload error:", err);
    uploadBtn.disabled = false;
    uploadBtn.innerText = "Upload";
  }
});
