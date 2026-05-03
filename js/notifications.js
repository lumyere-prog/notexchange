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

  // 🔥 This is the missing listener that fetches the data!
  onSnapshot(q, (snapshot) => {
    container.querySelectorAll('.notification').forEach(el => el.remove());
    
    const emptyState = document.getElementById("emptyState");
    if (emptyState) {
        emptyState.style.display = snapshot.empty ? "block" : "none";
    }

    let unreadCount = 0;

    snapshot.forEach((docSnap) => {
      const n = docSnap.data();
      const notifId = docSnap.id; 

      if (!n.read) unreadCount++;

      let div = document.createElement("div");
      div.className = "notification";

      // 1. Identify if this is a System/Admin message
      const isSystemNotif = n.type === "suspension" || n.type === "alert" || !n.postId;

      // 2. Set Click Behavior
      div.onclick = () => {
        markRead(notifId);
        if (isSystemNotif) {
          openSystemAlert(n.title, n.message); 
        } else {
          openPostFromNotif(n.postId, n.type, n.fromUsername);
        }
      };

      // 🔴 unread dot
      if (!n.read) {
        let dot = document.createElement("div");
        dot.className = "unread-dot";
        div.appendChild(dot);
      }

      // 🧠 Determine Text to Display
      let displayHTML = "";

      if (isSystemNotif) {
        const msgText = n.message || ""; 
        displayHTML = `
          <img class="avatar" src="/photos/logofinal.jpg">
          <div class="notif-text">
            <b style="color: #DC2626;">System Alert:</b> ${n.title || "New Message"}
            <div class="time" style="margin-top: 4px; font-size: 12px; color: #4B5563;">${msgText.substring(0, 40)}...</div>
            <div class="time">${formatTime(n.createdAt)}</div>
          </div>
        `;
      } else {
        let actionText = "interacted with your post";
        if (n.type === "upvote") actionText = "upvoted your post";
        else if (n.type === "downvote") actionText = "downvoted your post";
        else if (n.type === "comment") actionText = "commented on your post";
        else if (n.type === "approve") actionText = "approved your post";
        else if (n.type === "reject") actionText = "rejected your post";
        else if (n.type === "archive") actionText = "archived your post";
        else if (n.type === "restore") actionText = "restored your post to pending";

        displayHTML = `
          <img class="avatar" src="${n.fromProfilePic || "/photos/logofinal.jpg"}">
          <div class="notif-text">
            <b>${n.fromUsername || "Admin"}</b> ${actionText}
            <div class="time">${formatTime(n.createdAt)}</div>
          </div>
        `;
      }

      div.innerHTML += displayHTML;
      container.appendChild(div);
    });

    const badge = document.getElementById("badgeCount");
    if (badge) {
        badge.innerText = unreadCount;
        badge.style.display = unreadCount > 0 ? "block" : "none";
    }
  });
}


/* =========================
   OPEN SYSTEM ALERT (ADMIN MESSAGES)
========================= */
function openSystemAlert(title, message) {
    const modal = document.getElementById("postModal");
    const modalContent = document.querySelector(".modal-content");

    modalContent.innerHTML = `
        <span class="close" id="closeBtn">&times;</span>
        <div style="text-align: center; padding: 20px 10px;">
            <span class="material-icons" style="font-size: 48px; color: #DC2626; margin-bottom: 12px;">gavel</span>
            <h3 style="color: #111827; margin-bottom: 12px;">${title || "System Alert"}</h3>
            <p style="color: #4B5563; font-size: 14px; line-height: 1.6;">${message || "No further details provided."}</p>
        </div>
    `;

    document.getElementById("closeBtn").onclick = () => {
        modal.style.display = "none";
    };

    modal.style.display = "flex";
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
          // 🔥 NEW: Added max-height: 25vh and overflow-y: auto to make comments scrollable!
          commentsHTML = `<div style="margin-top: 16px; border-top: 1px solid #F3F4F6; padding-top: 12px; max-height: 25vh; overflow-y: auto; padding-right: 4px;">`;
          post.comments.forEach(c => {
              commentsHTML += `<div class="quote" style="background: #F9FAFB; padding: 10px; border-radius: 8px; margin-bottom: 8px; border: 1px solid #E5E7EB;">
                      <strong style="color: #111827; font-style: normal; font-size: 12px;">${c.username}</strong><br>
                      <span style="font-size: 14px; color: #4B5563;">${c.text}</span>
                  </div>`;
          });
          commentsHTML += `</div>`;
      }

      // 6. INJECT HTML
      modalContent.innerHTML = `
        <span class="close" id="closeBtn">&times;</span>
        ${contextBadge}
        <h3 style="margin-bottom: 4px; color: #111827; font-weight: 800;">${post.title || "Untitled"}</h3>
        <p style="font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; margin-bottom: 12px; margin-top: 0;">
            ${post.subject || "GENERAL"}
        </p>
        
        <!-- 🔥 NEW: Added pre-wrap and max-height: 35vh so the description scrolls perfectly -->
        <div style="white-space: pre-wrap; overflow-wrap: anywhere; word-break: normal; max-height: 35vh; overflow-y: auto; padding-right: 4px; font-size: 14px; line-height: 1.6; color: #4B5563;">${(post.description || "").trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        
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