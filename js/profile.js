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
// LEGAL MODAL: PDF.JS MULTI-PAGE LOGIC
// =========================================

let currentLegalPdf = null; 
let currentLegalPageNumber = 1;
let isLegalPageRendering = false;

// 1. Dedicated function to render a specific page
async function renderLegalPage(pageNum) {
    if (!currentLegalPdf || isLegalPageRendering) return;
    isLegalPageRendering = true;

    const canvas = document.getElementById("legalPdfCanvas");
    const ctx = canvas.getContext("2d");
    const container = document.querySelector(".pdf-viewer-container");

    try {
        const page = await currentLegalPdf.getPage(pageNum);

        // Scale to fit mobile width
        const containerWidth = container.clientWidth - 40;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scale = containerWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale: scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
            canvasContext: ctx,
            viewport: viewport
        };
        await page.render(renderContext).promise;

        // Update the text and button states
        document.getElementById("legalPageIndicator").textContent = `Page ${pageNum} of ${currentLegalPdf.numPages}`;
        
        // Disable 'Previous' on page 1, disable 'Next' on last page
        const prevBtn = document.getElementById("legalPrevPage");
        const nextBtn = document.getElementById("legalNextPage");
        
        if (prevBtn) {
            prevBtn.disabled = pageNum <= 1;
            prevBtn.style.opacity = pageNum <= 1 ? "0.5" : "1";
        }
        if (nextBtn) {
            nextBtn.disabled = pageNum >= currentLegalPdf.numPages;
            nextBtn.style.opacity = pageNum >= currentLegalPdf.numPages ? "0.5" : "1";
        }

    } catch (error) {
        console.error("Error rendering Legal Page:", error);
    }

    isLegalPageRendering = false;
}

// 2. Open the modal and load the PDF
window.openTerms = async function() {
    const modal = document.getElementById("legalModal");
    const container = document.querySelector(".pdf-viewer-container");

    modal.classList.add("active");

    try {
        const loadingTask = pdfjsLib.getDocument("/assets/terms.pdf");
        currentLegalPdf = await loadingTask.promise;
        
        // Reset to page 1 every time it opens
        currentLegalPageNumber = 1; 
        await renderLegalPage(currentLegalPageNumber);

    } catch (error) {
        console.error("Error loading Terms PDF:", error);
        document.getElementById("legalPdfCanvas").style.display = "none";
        document.querySelector(".pdf-controls").style.display = "none";
        container.innerHTML += `<p style="color:red; text-align:center; margin-top:20px;">Could not load terms. Please try again later.</p>`;
    }
};

// 3. Clean up when closed
window.closeTerms = function() {
    const modal = document.getElementById("legalModal");
    const canvas = document.getElementById("legalPdfCanvas");

    modal.classList.remove("active");

    setTimeout(() => {
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        if (currentLegalPdf) {
            currentLegalPdf.destroy();
            currentLegalPdf = null;
        }
    }, 400);
};

// 4. Attach Click Listeners to the Buttons
document.addEventListener("DOMContentLoaded", () => {
    const prevBtn = document.getElementById("legalPrevPage");
    const nextBtn = document.getElementById("legalNextPage");

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentLegalPageNumber <= 1) return;
            currentLegalPageNumber--;
            renderLegalPage(currentLegalPageNumber);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (!currentLegalPdf || currentLegalPageNumber >= currentLegalPdf.numPages) return;
            currentLegalPageNumber++;
            renderLegalPage(currentLegalPageNumber);
        });
    }
});

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
