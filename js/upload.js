import { db, storage } from "/firebase/firebase-client.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

document.getElementById("postForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const user = JSON.parse(localStorage.getItem("user"));
  const file = document.getElementById("fileInput").files[0];

  if (!user?.uid) {
    alert("Login first");
    return;
  }

  if (!file) {
    alert("Select a file first");
    return;
  }

  try {
    console.log("🔥 UPLOADING FILE...");

    // 📁 CREATE STORAGE REF
    const fileRef = ref(storage, `posts/${user.uid}/${Date.now()}_${file.name}`);

    // 📤 UPLOAD FILE
    await uploadBytes(fileRef, file);

    // 🔗 GET DOWNLOAD URL
    const fileURL = await getDownloadURL(fileRef);

    console.log("🔥 FILE URL:", fileURL);

    // 📝 SAVE POST WITH FILE LINK
    const postData = {
      title: document.getElementById("title").value,
      subject: document.getElementById("subject").value,
      description: document.getElementById("description").value,
      fileURL: fileURL, // 🔥 THIS IS THE IMPORTANT PART
      upvotes: 0,
      downvotes: 0,
      userID: user.uid,
      username: user.username || user.name,
      profilePic: user.profilePic || user.photo,
      timestamp: serverTimestamp()
    };

    const refDoc = await addDoc(collection(db, "posts"), postData);

    console.log("🔥 POST CREATED:", refDoc.id);

    alert("Upload complete!");

  } catch (err) {
    console.error("Upload error:", err);
  }
});