import { db } from "/firebase/firebase-client.js";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  where,
  writeBatch,
  getDocs,
  updateDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";






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
  const notifId = docSnap.id; // 🔥 NEW: Grab the ID to mark it as read

  if (!n.read) unreadCount++;

  let div = document.createElement("div");
  div.className = "notification";

  // 🔥 NEW: This is the click listener that was missing!
  div.onclick = () => {
    openPostFromNotif(n.postId, n.type, n.fromUsername);
    markRead(notifId); 
  };

  // 🔴 unread dot (Kept from your original)
  if (!n.read) {
    let dot = document.createElement("div");
    dot.className = "unread-dot";
    div.appendChild(dot);
  }

  // 🧠 ACTION TEXT (Kept from your original - DO NOT DELETE!)
  let actionText = "";

  if (n.type === "upvote") actionText = "upvoted your post";
  else if (n.type === "downvote") actionText = "downvoted your post";
  else if (n.type === "comment") actionText = "commented on your post";
  else if (n.type === "approve") actionText = "approved your post";
  else if (n.type === "reject") actionText = "rejected your post";
  else if (n.type === "archive") actionText = "archived your post";
  else if (n.type === "restore") actionText = "restored your post to pending";

  div.innerHTML += `
    <img class="avatar" src="${n.fromProfilePic || "/photos/logofinal.jpg"}">
    <div class="notif-text">
      <b>${n.fromUsername || "Admin"}</b> ${actionText}
      <div class="time">${formatTime(n.createdAt)}</div>
    </div>
  `;

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
  const ref = doc(db, "user", user.uid, "notifications", notifId);
  await updateDoc(ref, { read: true });
}

/* =========================
   OPEN POST (THE POP-UP)
========================= */
async function openPostFromNotif(postId, notifType, fromUsername) {
  const modal = document.getElementById("postModal");
  const modalContent = document.querySelector(".modal-content");

  try {
      // 1. SAFETY CHECK: Prevent silent crash if ID is missing
      if (!postId) {
          console.error("❌ No postId found for this notification.");
          return;
      }

      // 2. DYNAMIC ROUTING: Look in the correct database folder!
      let collectionName = "posts"; 
      if (notifType === "reject") collectionName = "rejectedPosts";
      if (notifType === "archive") collectionName = "archivedPosts";
      if (notifType === "restore") collectionName = "pendingPosts";

      const ref = doc(db, collectionName, postId);
      const snap = await getDoc(ref);
      
      // 3. POST NOT FOUND LOGIC
      if (!snap.exists()) {
          modalContent.innerHTML = `
            <span class="close" id="closeBtn">&times;</span>
            <h3 style="color: #DC2626;">Post Unavailable</h3>
            <p>This post has been deleted or moved.</p>
          `;
          document.getElementById("closeBtn").onclick = () => { modal.style.display = "none"; };
          modal.style.display = "flex";
          return;
      }
      
      const post = snap.data();

      // 4. BUILD THE UI CONTEXT BADGE
      const name = fromUsername || "Someone"; 
      let contextBadge = "";
      
      if (notifType === "upvote") {
          contextBadge = `<div style="color: #10B981; font-size: 12px; font-weight: bold; margin-bottom: 12px;">🚀 ${name} upvoted your post</div>`;
      } else if (notifType === "downvote") {
          contextBadge = `<div style="color: #EF4444; font-size: 12px; font-weight: bold; margin-bottom: 12px;">📉 ${name} downvoted your post</div>`;
      } else if (notifType === "comment") {
          contextBadge = `<div style="color: #3B82F6; font-size: 12px; font-weight: bold; margin-bottom: 12px; display: flex; align-items: center; gap: 4px;">
              <span class="material-icons" style="font-size: 14px;">chat_bubble</span> ${name} commented on your post
          </div>`;
      } else if (notifType === "approve") {
          contextBadge = `<div style="color: #10B981; font-size: 12px; font-weight: bold; margin-bottom: 12px;">✅ Your post was approved</div>`;
      } else if (notifType === "reject") {
          contextBadge = `<div style="color: #EF4444; font-size: 12px; font-weight: bold; margin-bottom: 12px;">❌ Your post was rejected</div>`;
      } else if (notifType === "archive") {
          contextBadge = `<div style="color: #6B7280; font-size: 12px; font-weight: bold; margin-bottom: 12px;">📦 Your post was archived</div>`;
      }
        else if (notifType === "restore") {
          contextBadge = `<div style="color: #F59E0B; font-size: 12px; font-weight: bold; margin-bottom: 12px;">🔄 Your post was restored for review</div>`;
      }
      // 5. BUILD COMMENTS (If any)
      let commentsHTML = "";
      if (notifType === "comment" && post.comments && post.comments.length > 0) {
          commentsHTML = `<div style="margin-top: 16px; border-top: 1px solid #F3F4F6; padding-top: 12px;">`;
          post.comments.forEach(c => {
              commentsHTML += `<div class="quote" style="margin-bottom: 8px;">
                      <strong style="color: #111827; font-style: normal; font-size: 12px;">${c.username}</strong><br>${c.text}
                  </div>`;
          });
          commentsHTML += `</div>`;
      }

      // 6. INJECT HTML
      modalContent.innerHTML = `
        <span class="close" id="closeBtn">&times;</span>
        ${contextBadge}
        <h3 style="margin-bottom: 4px;">${post.title || "Untitled"}</h3>
        <p style="font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; margin-bottom: 12px; margin-top: 0;">
            ${post.subject || "GENERAL"}
        </p>
        <p>${post.description || ""}</p>
        ${commentsHTML}
        <div style="display: flex; align-items: center; border-top: 1px solid #F3F4F6; margin-top: 20px; padding-top: 16px;">
            <div style="display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: 700; color: #4B5563;">
                <span class="material-icons" style="font-size: 18px; color: #10B981;">arrow_upward</span> ${post.upvotes || 0}
                <span style="color: #D1D5DB; margin: 0 4px;">|</span>
                <span class="material-icons" style="font-size: 18px; color: #EF4444;">arrow_downward</span> ${post.downvotes || 0}
            </div>
        </div>
      `;

      // 7. SAFELY ATTACH LISTENER & SHOW
      document.getElementById("closeBtn").onclick = () => {
          modal.style.display = "none";
      };

      modal.style.display = "flex";

  } catch (error) {
      console.error("❌ Crash in openPostFromNotif:", error);
  }
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

document.getElementById("markAllReadBtn").addEventListener("click", async () => {
  if (!user) return;

  const q = query(
    collection(db, "user", user.uid, "notifications"),
    where("read", "==", false)
  );

  const snapshot = await getDocs(q);

  const batch = writeBatch(db);

  snapshot.forEach(docSnap => {
    batch.update(docSnap.ref, { read: true });
  });

  await batch.commit();

  console.log("All notifications marked as read");
});

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