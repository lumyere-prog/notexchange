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

// ===============================
// FILE NAME DISPLAY
// ===============================
document.addEventListener("DOMContentLoaded", () => {

  const fileInput = document.getElementById("fileInput");
  const fileNameText = document.getElementById("fileName");

  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    fileNameText.textContent = file ? file.name : "";
  });

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
          upvotes: 0,
          downvotes: 0,
          userID: user.uid,
          username: user.username || user.name,
          timestamp: serverTimestamp(),
          userVotes: {},
          voteRewards: {} // 🔥 future-proof (anti farming)
        };

        const refDoc = await addDoc(collection(db, "posts"), postData);

        console.log("🔥 POST CREATED:", refDoc.id);

        // 💰 ADD POINTS (only after success)
        await addPoints(user.uid, 10);

        // 🔓 RESET BUTTON
        uploadBtn.disabled = false;
        uploadBtn.innerText = "Upload";

        alert("Upload complete!");
      }
    );

  } catch (err) {
    console.error("Upload error:", err);
    uploadBtn.disabled = false;
    uploadBtn.innerText = "Upload";
  }
});