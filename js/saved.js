import { db } from "/firebase/firebase-client.js";
import { addPoints } from "/js/points.js";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  increment,
  runTransaction,
  arrayUnion,
  arrayRemove,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   STATE MEMORY
========================= */
const openComments = new Set();
const currentUser = JSON.parse(localStorage.getItem("user"));
let globalSavedPosts = [];
let cachedPosts = JSON.parse(localStorage.getItem("savedPostsCache")) || {};

// THE EXACT COLORS
const DARK_BLUE = "#111827";
const PIN_BG = "#FEE2E2";

if (currentUser?.uid) {
    const userRef = doc(db, "user", currentUser.uid);
    onSnapshot(userRef, async (snap) => {
        if (snap.exists()) {
            globalSavedPosts = snap.data().savedPosts || [];
            await renderSavedPosts();
        } else {
            renderEmptyState();
        }
    });
} else {
    window.location.href = "login.html";
}

/* =========================
   RENDER LOGIC (Grid Cards)
========================= */
async function renderSavedPosts() {
    const container = document.getElementById("savedContainer");
    if (!container) return;

    if (globalSavedPosts.length === 0) {
        renderEmptyState();
        return;
    }

    if (Object.keys(cachedPosts).length > 0) {
        container.innerHTML = "";
        globalSavedPosts.forEach(postId => {
            if (cachedPosts[postId]) renderCard(postId, cachedPosts[postId], container);
        });
    }

    try {
        const promises = globalSavedPosts.map(postId => getDoc(doc(db, "posts", postId)));
        const docSnaps = await Promise.all(promises);
        
        let freshPosts = {};
        container.innerHTML = ""; 
        docSnaps.forEach(docSnap => {
            if (docSnap.exists()) {
                freshPosts[docSnap.id] = docSnap.data();
                renderCard(docSnap.id, docSnap.data(), container);
            }
        });
        localStorage.setItem("savedPostsCache", JSON.stringify(freshPosts));
    } catch (err) { console.error(err); }
}

function renderEmptyState() {
    const container = document.getElementById("savedContainer");
    if (!container) return;
    container.innerHTML = `
        <div class="empty" style="opacity: 0.3; text-align: center; margin-top: 100px;">
            <div style="font-size: 56px;">🔖</div>
            <h3 style="margin-top: 10px;">No saved notes yet</h3>
        </div>
    `;
}

function renderCard(postId, post, container) {
    const userId = currentUser ? currentUser.uid : null;

    // Check voting states for active colors
    const userVote = post.userVotes?.[userId] || 0;
    const upStyle = userVote === 1 ? `background: #DCFCE7; color: #10B981; border-radius: 50%;` : `color: #6B7280;`;
    const downStyle = userVote === -1 ? `background: #FEE2E2; color: #EF4444; border-radius: 50%;` : `color: #6B7280;`;
    
    // Pin active state (Saved)
    const pinStyle = `background: #FEE2E2; color: #DC2626; border-radius: 8px; padding: 6px;`;

    const card = document.createElement("div");
    card.className = "note-card";
    
    // Open modal when clicking the card body (but not the buttons)
    card.onclick = (e) => {
        if (!e.target.closest('button')) openSavedModal(postId);
    };

    card.innerHTML = `
      <div class="note-preview">
        <div class="note-preview-text" style="background: #F9FAFB; padding: 12px; border-radius: 12px; margin-bottom: 12px; font-size: 14px; color: #4B5563; overflow-wrap: break-word; word-break: break-word; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
            ${post.description || "No description provided."}
        </div>
        <p style="font-size: 12px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase;">
            ${post.subject || "GENERAL"}
        </p>
        <h3 style="font-size: 18px; font-weight: 800; color: #111827; margin: 0 0 12px 0;">
            ${post.title || "Untitled"}
        </h3>
        
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
          <img src="${post.profilePic || "/photos/profile.jpg"}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;">
          <span style="font-size: 13px; font-weight: 600; color: #6B7280;">${post.username || "Unknown"}</span>
        </div>

        <div class="note-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F3F4F6; padding-top: 12px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <button style="background:transparent; border:none; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; ${upStyle}" onclick="vote(event, '${postId}', 1)">
                <span class="material-icons" style="font-size: 18px;">arrow_upward</span>
            </button>
            <span style="font-size: 13px; font-weight: 700; padding: 0 4px; color: #4B5563;">
                ${post.upvotes || 0} | ${post.downvotes || 0}
            </span>
            <button style="background:transparent; border:none; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; ${downStyle}" onclick="vote(event, '${postId}', -1)">
                <span class="material-icons" style="font-size: 18px;">arrow_downward</span>
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
              <button onclick="toggleFav(event, this, '${postId}')" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; width:32px; height:32px; ${pinStyle}">📌</button>
              <button onclick="openSavedModal('${postId}', true)" style="background:none; border:none; cursor:pointer; color: #6B7280; display:flex; padding:6px;"><span class="material-icons" style="font-size:20px;">chat_bubble_outline</span></button>
              <button onclick="openFileModal('${post.fileURL}', '${post.title}')" style="background: white; color: #111827; border: 1px solid #E5E7EB; padding: 8px 16px; border-radius: 50px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px;">
                  <span class="material-icons" style="font-size: 18px;">description</span> Open
              </button>
          </div>
        </div>
      </div>
    `;

    container.appendChild(card);
}

/* =========================
   MODAL LOGIC
========================= */
async function openSavedModal(postId, showComments = false){
    const modal = document.getElementById("postModal");
    const body = document.getElementById("modalBody");

    // 🔥 Added ONLY this block to inline the box size
    const modalContent = modal.querySelector(".modal-content");
    if (modalContent) {
        modalContent.style.cssText = `
            background: #FFFFFF;
            width: 82%; 
            max-width: 320px; 
            margin: auto;
            border-radius: 28px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            border: none;
            display: block;
            overflow: hidden;
        `;
    }

    const ref = doc(db, "posts", postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const post = snap.data();

    const userVote = post.userVotes?.[currentUser?.uid] || 0;
    const isSaved = globalSavedPosts.includes(postId);

    // Active State Styling
    const upStyle = userVote === 1 ? `background: #DCFCE7; color: #10B981; border-radius: 50%;` : `color: #6B7280;`;
    const downStyle = userVote === -1 ? `background: #FEE2E2; color: #EF4444; border-radius: 50%;` : `color: #6B7280;`;
    const pinStyle = isSaved ? `background: ${PIN_BG}; color: #DC2626; border-radius: 8px; padding: 6px;` : `color: #6B7280;`;

    // Handle comment visibility
    if (showComments) {
        openComments.add(postId);
    }

    let commentsHTML = (post.comments || []).map(c => `
        <div class="comment" style="background: #F9FAFB; padding: 12px; border-radius: 8px; margin-bottom: 8px;">
            <strong style="font-size: 12px; color: ${DARK_BLUE};">${c.username}</strong>
            <div style="font-size: 14px; margin-top: 2px;">${c.text}</div>
        </div>
    `).join('');

    body.innerHTML = `
        <h3 style="font-size: 20px; font-weight: 800; margin: 0 0 8px 0; color: #111827;">${post.title}</h3>
        <p style="font-size: 12px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase;">${post.subject || ""}</p>
        
        <div class="modal-text" style="font-size: 14px; line-height: 1.6; color: #4B5563; margin-top: 20px; overflow-wrap: break-word; word-break: break-word;">
            ${post.description || ""}
        </div>
      
      <div class="note-footer" style="margin-top: 24px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F3F4F6; padding-top: 16px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="upvote-btn" style="background:transparent; border:none; cursor:pointer; width:34px; height:34px; display:flex; align-items:center; justify-content:center; ${upStyle}"><span class="material-icons" style="font-size: 20px;">arrow_upward</span></button>
          <span style="font-size: 13px; font-weight: 700; color: #4B5563;">${post.upvotes || 0} | ${post.downvotes || 0}</span>
          <button class="downvote-btn" style="background:transparent; border:none; cursor:pointer; width:34px; height:34px; display:flex; align-items:center; justify-content:center; ${downStyle}"><span class="material-icons" style="font-size: 20px;">arrow_downward</span></button>
        </div>
        
        <div style="display: flex; align-items: center; gap: 12px;">
            <button onclick="toggleFav(event, this, '${postId}')" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; width:34px; height:34px; ${pinStyle}">📌</button>
            <button onclick="toggleComments(event, this, '${postId}')" style="background:none; border:none; cursor:pointer; color: #6B7280; display:flex; padding:6px;"><span class="material-icons" style="font-size:22px;">chat_bubble_outline</span></button>
            
            <button onclick="openFileModal('${post.fileURL}', '${post.title}')" style="background: white; color: ${DARK_BLUE}; border: 1px solid #E5E7EB; padding: 10px 20px; border-radius: 50px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px;">
                <span class="material-icons" style="font-size: 18px; color: ${DARK_BLUE};">description</span> Open
            </button>
        </div>
      </div>
      
      <div class="comment-section" style="display: ${openComments.has(postId) ? 'block' : 'none'}; margin-top: 16px; padding-top: 16px; border-top: 1px solid #F3F4F6;">
          <div class="comments-list" style="max-height: 200px; overflow-y: auto; margin-bottom: 12px;">${commentsHTML}</div>
          <div style="display:flex; gap:8px;">
              <input type="text" placeholder="Write a comment..." style="flex:1; padding:10px 14px; border-radius:20px; border:1px solid #E5E7EB; outline:none; font-size:14px;">
              <button onclick="submitComment(event, '${postId}', this)" style="background: ${DARK_BLUE}; color: white; border: none; padding: 0 18px; border-radius: 20px; font-weight: 700; cursor: pointer;">Post</button>
          </div>
      </div>
    `;

    body.querySelector(".upvote-btn").onclick = (e) => vote(e, postId, 1);
    body.querySelector(".downvote-btn").onclick = (e) => vote(e, postId, -1);

    modal.style.display = "flex";
}

/* =========================
   UNIVERSAL FUNCTIONS
========================= */

window.addEventListener("click", (event) => {
    const modal = document.getElementById("postModal");
    if (event.target === modal) closeModal();
});

window.closeModal = function() {
    document.getElementById("postModal").style.display = "none";
}

window.toggleFav = async function(event, btn, postId) {
    event.stopPropagation();
    if (!currentUser?.uid) return;
    const userRef = doc(db, "user", currentUser.uid);
    closeModal(); 
    try {
        await setDoc(userRef, { savedPosts: arrayRemove(postId) }, { merge: true });
    } catch (error) { console.error(error); }
};

let votingInProgress = false;
async function vote(event, postId, value){
    event.stopPropagation();
    if (votingInProgress || !currentUser) return;
    votingInProgress = true;

    const postRef = doc(db, "posts", postId);
    try {
      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(postRef);
        if (!snap.exists()) return;
        const post = snap.data();
        let userVotes = post.userVotes || {};
        let voteRewards = post.voteRewards || {}; 
        let currentVote = userVotes[currentUser.uid] || 0;
        
        let updates = {};
        if (currentVote === value) {
          delete userVotes[currentUser.uid];
          updates[value === 1 ? 'upvotes' : 'downvotes'] = increment(-1);
        } else {
          userVotes[currentUser.uid] = value;
          updates[value === 1 ? 'upvotes' : 'downvotes'] = increment(1);
          if (currentVote !== 0) updates[currentVote === 1 ? 'upvotes' : 'downvotes'] = increment(-1);
          
          if (!voteRewards[currentUser.uid]) {
              voteRewards[currentUser.uid] = true;
              await addPoints(currentUser.uid, 1);
          }
        }
        updates.userVotes = userVotes;
        updates.voteRewards = voteRewards;
        transaction.update(postRef, updates);
      });
      openSavedModal(postId); 
    } catch (err) { console.error(err); }
    votingInProgress = false;
}
window.vote = vote;

window.toggleComments = function(event, btn, postId) {
    event.stopPropagation(); 
    const section = btn.closest('.note-footer').nextElementSibling;
    if (section) {
        section.style.display = section.style.display === "none" ? "block" : "none";
        openComments.has(postId) ? openComments.delete(postId) : openComments.add(postId);
    }
};

window.submitComment = async function(event, postId, btn) {
    const input = btn.previousElementSibling;
    const text = input.value.trim();
    if (!text || !currentUser) return;

    const postRef = doc(db, "posts", postId);
    try {
        await updateDoc(postRef, { 
            comments: arrayUnion({ username: currentUser.username || "Anonymous", text: text, timestamp: new Date().toISOString() }) 
        });
        input.value = ""; 
        openSavedModal(postId); 
    } catch (error) { console.error(error); }
};

window.openFileModal = function(url, title) {
    let pdfModal = document.getElementById("dynamicPdfModal");
    if (!pdfModal) {
        pdfModal = document.createElement("div");
        pdfModal.id = "dynamicPdfModal";
        pdfModal.style.cssText = "display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 3000;";
        pdfModal.innerHTML = `
            <div style="background: white; width: 100%; height: 90vh; position: absolute; bottom: 0; border-radius: 20px 20px 0 0; display: flex; flex-direction: column;">
                <div style="padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #ddd;">
                    <span onclick="document.getElementById('dynamicPdfModal').style.display='none'" style="font-size: 24px; cursor: pointer;">←</span>
                    <h3 style="margin: 0; font-size: 16px;">${title || "Document"}</h3>
                    <span></span>
                </div>
                <iframe src="${url}" style="flex: 1; border: none; width: 100%;"></iframe>
            </div>
        `;
        document.body.appendChild(pdfModal);
    } else {
        pdfModal.querySelector("h3").innerText = title;
        pdfModal.querySelector("iframe").src = url;
    }
    pdfModal.style.display = "block";
};

window.openSavedModal = openSavedModal;