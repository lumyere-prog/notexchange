import { db, storage } from "/firebase/firebase-client.js";
import { addPoints } from "/js/points.js";

import {
  collection,
  addDoc,
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

        if (state === "suspended") {
            console.log("🚫 USER BLOCKED");

            // 🔥 USE CENTRAL MODAL (NO DUPLICATION)
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

if (window.userState === "suspended") {
  alert("🚫 Your account is suspended. You cannot upload posts.");
  return;
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
      async () => {
        const fileURL = await getDownloadURL(uploadTask.snapshot.ref);

        console.log("🔥 FILE URL:", fileURL);

        // 📝 SAVE POST
        const postData = {
          title: document.getElementById("title").value,
          subject: document.getElementById("subject").value,
          description: document.getElementById("description").value,
          fileURL: fileURL,
          fileName: file.name,
          profilePic: user.profilePic || user.photo || "",
          upvotes: 0,
          downvotes: 0,
          userId: user.uid,
          username: user.username || user.name,
          timestamp: serverTimestamp(),
          userVotes: {},
          voteRewards: {} // 🔥 future-proof (anti farming)
        };

        const refDoc = await addDoc(collection(db, "pendingPosts"), postData);
        console.log("UPLOADED TO pendingPosts:", postData);


        // 💰 ADD POINTS (only after success)
        await addPoints(user.uid, 10);

        // 🔓 RESET BUTTON
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
