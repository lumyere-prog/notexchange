import { db } from "/firebase/firebase-client.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   GLOBAL ELEMENTS
========================= */
const container = document.getElementById("notificationsContainer");
const badge = document.getElementById("badgeCount");
const modal = document.getElementById("postModal");

/* =========================
   GET CURRENT USER
========================= */
const user = JSON.parse(localStorage.getItem("user"));

if (!user) {
  alert("Not logged in");
}

/* =========================
   LOAD NOTIFICATIONS (REALTIME)
========================= */
function loadNotifications() {
  const q = query(
    collection(db, "user", user.uid, "notifications"),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";

    const emptyState = document.getElementById("emptyState");

if (snapshot.empty) {
  emptyState.style.display = "block";
} else {
  emptyState.style.display = "none";
}


    let unreadCount = 0;

    snapshot.forEach((docSnap) => {
      const n = docSnap.data();

      if (!n.read) unreadCount++;

      let div = document.createElement("div");
      div.className = "notification";

      // 🔴 unread dot
      if (!n.read) {
        let dot = document.createElement("div");
        dot.className = "unread-dot";
        div.appendChild(dot);
      }

      // 🧠 ACTION TEXT
      let actionText = "";
      if (n.type === "upvote") actionText = "upvoted your post";
      else if (n.type === "downvote") actionText = "downvoted your post";
      else if (n.type === "comment") actionText = "commented on your post";

      div.innerHTML += `
        <img class="avatar" src="${n.fromProfilePic || "/photos/profile.jpg"}">
        <div class="notif-text">
          <b>${n.fromUsername || "Unknown"}</b> ${actionText}
          <div class="time">${formatTime(n.createdAt)}</div>
        </div>
      `;

      // 🔥 CLICK ACTION
      div.onclick = async () => {
        await markRead(docSnap.id);
        openPostFromNotif(n.postId);
      };

      container.appendChild(div);
    });

    badge.innerText = unreadCount;
    badge.style.display = unreadCount > 0 ? "block" : "none";
  });
}

/* =========================
   MARK AS READ
========================= */
async function markRead(notifId) {
  const ref = doc(db, "users", user.uid, "notifications", notifId);
  await updateDoc(ref, { read: true });
}

/* =========================
   OPEN POST
========================= */
function openPostFromNotif(postId) {
  // OPTION 1: redirect
  window.location.href = `/home.html?post=${postId}`;

  // OPTION 2 (if using modal):
  // openPost(postId);
}

/* =========================
   TIME FORMAT
========================= */
function formatTime(timestamp) {
  if (!timestamp) return "";

  const date = timestamp.toDate();
  const now = new Date();
  const diff = (now - date) / 1000;

  if (diff < 60) return "Just now";
  if (diff < 3600) return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";

  return Math.floor(diff / 86400) + "d";
}

/* =========================
   MODAL CLOSE (KEEP YOUR UI)
========================= */
document.querySelector(".close").onclick = () => {
  modal.style.display = "none";
};

window.onclick = function (e) {
  if (e.target === modal) {
    modal.style.display = "none";
  }
};
window.goBack = function () {
  window.history.back();
};
/* =========================
   INIT
========================= */
loadNotifications();