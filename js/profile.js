import { db } from "/firebase/firebase-client.js";
import { getDoc, getDocs, onSnapshot,collection, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { addPoints } from "/js/points.js";
import {
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

const currentUser = JSON.parse(localStorage.getItem("user"));
let pendingDeletePostId = null;


document.addEventListener("DOMContentLoaded", () => {
  const localUser = JSON.parse(localStorage.getItem("user"));

  if (!localUser?.uid) {
    window.location.href = "login.html";
    return;
  }

  const userRef = doc(db, "user", localUser.uid);
  loadUserNotesRealtime(localUser.uid);

  
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
    const photoSection = document.querySelector(".edit-photo-section");

let tooltipTimeout;


    // 📝 BIO
    const bioEl = document.querySelector(".bio");
    if (bioEl) {
      bioEl.innerHTML = `
        <p><strong>BIO:</strong> ${user.bio || "No bio yet"}</p>
        <p><strong>INTEREST:</strong> ${user.interest || "Not set"}</p>
      `;
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

function loadUserNotesRealtime(userId) {
    const container = document.getElementById("notesFeed");
    if (!container) return;

    const postsQuery = query(
        collection(db, "posts"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
    );

    onSnapshot(postsQuery, (snapshot) => {
        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 20px; color: #6B7280;">
                    You haven't posted any notes yet.
                </div>
            `;
            return;
        }

        snapshot.forEach((docSnap) => {
            container.appendChild(createProfileNoteCard(docSnap));
        });
    }, (error) => {
        console.error("Failed to load user notes:", error);
    });
}

function createProfileNoteCard(docSnap) {
    const post = docSnap.data();
    const postId = docSnap.id;
    const userVote = post.userVotes?.[currentUser?.uid] || 0;
    const upClass = userVote === 1 ? "upvoted" : "";
    const downClass = userVote === -1 ? "downvoted" : "";

    const card = document.createElement("div");
    card.className = "note-card";
    card.dataset.postid = postId;
    card.innerHTML = `
        <div class="note-preview">
            <div class="note-preview-text">${post.description || "No description"}</div>
            <p class="note-code">${post.subject || ""}</p>
            <h3 class="note-title">${post.title || "Untitled"}</h3>
            <div class="note-author">
                <img src="${post.profilePic || "/photos/profile.jpg"}" class="author-pic">
                <span>${post.username || "Unknown"}</span>
            </div>
            <div class="note-footer">
                <div class="vote-box">
                    <button class="vote-btn upvote-btn ${upClass}" type="button"><span class="material-icons">arrow_upward</span></button>
                    <span class="vote-count">${post.upvotes || 0} | ${post.downvotes || 0}</span>
                    <button class="vote-btn downvote-btn ${downClass}" type="button"><span class="material-icons">arrow_downward</span></button>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="comment-icon-btn" type="button"><span class="material-icons">chat_bubble_outline</span></button>
                    <button class="delete-btn" type="button">Delete</button>
                </div>
            </div>
        </div>
    `;

    card.addEventListener("click", () => openPost(postId));

    const commentBtn = card.querySelector(".comment-icon-btn");
    if (commentBtn) {
        commentBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openPost(postId, true);
        });
    }

    const deleteBtn = card.querySelector(".delete-btn");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openDeleteModal(postId);
        });
    }

    const upBtn = card.querySelector(".upvote-btn");
    if (upBtn) {
        upBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await vote(e, postId, 1);
        });
    }

    const downBtn = card.querySelector(".downvote-btn");
    if (downBtn) {
        downBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await vote(e, postId, -1);
        });
    }

    return card;
}

let votingInProgress = false;
async function vote(event, postId, value) {
    event.stopPropagation();
    if (votingInProgress) return;
    votingInProgress = true;
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        votingInProgress = false;
        return alert("Login first");
    }

    const postRef = doc(db, "posts", postId);
    try {
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(postRef);
            if (!snap.exists()) return;
            const post = snap.data();
            let userVotes = post.userVotes || {};
            let voteRewards = post.voteRewards || {};
            let currentVote = userVotes[user.uid] || 0;
            let alreadyRewarded = voteRewards[user.uid] || false;
            let givePoints = false;
            let updates = {};

            if (currentVote === value) {
                delete userVotes[user.uid];
                if (value === 1) updates.upvotes = increment(-1);
                else updates.downvotes = increment(-1);
            } else {
                userVotes[user.uid] = value;
                if (!alreadyRewarded) {
                    givePoints = true;
                    voteRewards[user.uid] = true;
                }
                if (value === 1) {
                    updates.upvotes = increment(1);
                    if (currentVote === -1) updates.downvotes = increment(-1);
                }
                if (value === -1) {
                    updates.downvotes = increment(1);
                    if (currentVote === 1) updates.upvotes = increment(-1);
                }
            }

            updates.userVotes = userVotes;
            updates.voteRewards = voteRewards;
            transaction.update(postRef, updates);
            if (givePoints) await addPoints(user.uid, 1);
        });
    } catch (err) {
        console.error("Vote error:", err);
    }
    votingInProgress = false;
}

const openComments = new Set();

async function openPost(postId, showComments = false) {
    if (showComments) openComments.add(postId);
    const modal = document.getElementById("postModal");
    const body = document.getElementById("modalBody");

    const ref = doc(db, "posts", postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const post = snap.data();

    const userId = currentUser ? currentUser.uid : null;
    let upClass = "";
    let downClass = "";
    if (userId && post.userVotes && post.userVotes[userId] === 1) upClass = "upvoted";
    else if (userId && post.userVotes && post.userVotes[userId] === -1) downClass = "downvoted";

    const commentsHTML = (post.comments || [])
        .map((c) => `
            <div class="comment">
                <strong style="font-size: 12px; color: #9D182B;">${c.username}</strong>
                <div style="font-size: 14px; margin-top: 2px;">${c.text}</div>
            </div>
        `)
        .join("");

    body.innerHTML = `
        <h3>${post.title}</h3>
        <p style="font-size:12px; color:#6B7280;">${post.subject || ""}</p>
        <div class="modal-text">${post.description || ""}</div>
        <div class="note-footer" style="margin-top: 24px;">
            <div class="vote-box">
                <button class="vote-btn upvote-btn ${upClass}" type="button"><span class="material-icons">arrow_upward</span></button>
                <span class="vote-count">${post.upvotes || 0} | ${post.downvotes || 0}</span>
                <button class="vote-btn downvote-btn ${downClass}" type="button"><span class="material-icons">arrow_downward</span></button>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button class="comment-icon-btn" type="button"><span class="material-icons">chat_bubble_outline</span></button>
                <button class="delete-btn" type="button">Delete</button>
            </div>
        </div>
        <div class="comment-section" style="display: ${openComments.has(postId) ? "block" : "none"}; margin-top: 16px;">
            <div class="comments-list">${commentsHTML}</div>
            <div class="comment-input-wrapper">
                <input type="text" class="comment-input" placeholder="Write a comment...">
                <button class="comment-btn" type="button">Post</button>
            </div>
        </div>
    `;
  

    body.querySelector(".upvote-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        await vote(e, postId, 1);
        await openPost(postId, showComments);
    });

    body.querySelector(".downvote-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        await vote(e, postId, -1);
        await openPost(postId, showComments);
    });

    body.querySelector(".comment-icon-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleComments(e, null, postId);
    });

    body.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        openDeleteModal(postId);
    });

    const commentBtn = body.querySelector(".comment-btn");
    if (commentBtn) {
        commentBtn.addEventListener("click", (e) => submitComment(e, postId, commentBtn));
    }

    modal.style.display = "flex";
    if (showComments) {
        setTimeout(() => {
            const input = body.querySelector('.comment-input');
            if (input) input.focus();
        }, 100);
    }
}

function closeModal() {
    const modal = document.getElementById("postModal");
    if (modal) modal.style.display = "none";
}
window.closeModal = closeModal;

function toggleComments(event, btn, postId) {
    if (event) event.stopPropagation();
    const commentSection = document.querySelector('#modalBody .comment-section');
    if (!commentSection) return;
    if (commentSection.style.display === "block") {
        commentSection.style.display = "none";
        openComments.delete(postId);
    } else {
        commentSection.style.display = "block";
        openComments.add(postId);
    }
}

async function submitComment(event, postId, btn) {
    if (event) event.stopPropagation();
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return alert("You must be logged in to comment!");

    const input = btn.previousElementSibling;
    const text = input.value.trim();
    if (!text) return;

    const comment = {
        username: user.username || user.name || "Anonymous",
        text,
        timestamp: new Date().toISOString()
    };

    const postRef = doc(db, "posts", postId);
    try {
        await updateDoc(postRef, {
            comments: arrayUnion(comment)
        });
        input.value = "";
        openComments.add(postId);
        await openPost(postId, true);
    } catch (err) {
        console.error("Comment save failed:", err);
    }
}

async function deleteNote(postId) {
    try {
        await deleteDoc(doc(db, "posts", postId));
        const card = document.querySelector(`.note-card[data-postid="${postId}"]`);
        if (card) card.remove();
        closeModal();
    } catch (err) {
        console.error("Failed to delete note:", err);
        alert("Unable to delete note right now.");
    }
}

function openDeleteModal(postId) {
    pendingDeletePostId = postId;
    const modal = document.getElementById("deleteConfirmModal");
    if (modal) modal.classList.add("active");
}

window.closeDeleteModal = function () {
    pendingDeletePostId = null;
    const modal = document.getElementById("deleteConfirmModal");
    if (modal) modal.classList.remove("active");
};

window.confirmDeleteNote = async function () {
    if (!pendingDeletePostId) return;
    await deleteNote(pendingDeletePostId);
    window.closeDeleteModal();
};

const modalElement = document.getElementById("postModal");
if (modalElement) {
    modalElement.addEventListener("click", (event) => {
        if (event.target === modalElement) closeModal();
    });
}


















/* =========================
   LOAD POSTS FROM FIRESTORE
========================= */
