import { db } from "/firebase/firebase-client.js";
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Get user from localStorage (you already store this)
const user = JSON.parse(localStorage.getItem("user"));

if (user) {
  const ref = doc(db, "user", user.uid);

  // LOAD SETTINGS
  getDoc(ref).then((snap) => {
    if (!snap.exists()) return;

    const data = snap.data().notifications || {};

    if (document.getElementById("systemUpdates")) {
      document.getElementById("systemUpdates").checked = data.systemUpdates ?? true;
      document.getElementById("noteApprovals").checked = data.noteApprovals ?? true;
      document.getElementById("noteInteractions").checked = data.noteInteractions ?? true;
    }
  });

  // SAVE SETTINGS
  document.querySelectorAll("input[type=checkbox]").forEach(input => {
    input.addEventListener("change", async (e) => {
      const key = e.target.id;

      await updateDoc(ref, {
        [`notifications.${key}`]: e.target.checked
      });

      console.log("Updated:", key, e.target.checked);
    });
  });
}