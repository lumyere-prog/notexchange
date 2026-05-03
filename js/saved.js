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
  onSnapshot,
  collection,
  query, 
  where, 
  getDocs, 
  serverTimestamp
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



window.getInterestPillHTML = function(interest) {
    const colors = [
        { bg: '#FEE2E2', text: '#991B1B' }, { bg: '#FEF3C7', text: '#92400E' },
        { bg: '#D1FAE5', text: '#065F46' }, { bg: '#DBEAFE', text: '#1E40AF' },
        { bg: '#E0E7FF', text: '#3730A3' }, { bg: '#F3E8FF', text: '#6B21A8' },
        { bg: '#FCE7F3', text: '#9D174D' }
    ];
    const colorIndex = interest.length % colors.length;
    const color = colors[colorIndex];
    return `<span style="background:${color.bg}; color:${color.text}; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; display:inline-block; margin-right:4px; margin-bottom:4px;">${interest}</span>`;
};



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
    const userVote = post.userVotes?.[userId] || 0;
    const upStyle = userVote === 1 ? `background: #DCFCE7; color: #10B981; border-radius: 50%;` : `color: #6B7280;`;
    const downStyle = userVote === -1 ? `background: #FEE2E2; color: #EF4444; border-radius: 50%;` : `color: #6B7280;`;
    const pinStyle = `background: #FEE2E2; color: #DC2626; border-radius: 8px; padding: 6px;`;

    // Identity Fallbacks
    const displayName = post.alias || post.username || post.name || "Anonymous";
    const displayPic = post.profilePic || "/photos/profile.jpg";

    const fullDesc = (post.description || "No description").trim();
    const isLong = fullDesc.length > 150; 
    const displayDesc = isLong ? fullDesc.substring(0, 150) + "..." : fullDesc;
    const safeFullDesc = encodeURIComponent(fullDesc);

    let interestsHTML = "";
    if (post.interests && Array.isArray(post.interests)) {
        post.interests.forEach(tag => interestsHTML += window.getInterestPillHTML(tag));
    }

    const card = document.createElement("div");
    card.className = "note-card";
    card.onclick = (e) => {
        if (!e.target.closest('button') && !e.target.closest('.note-author')) openSavedModal(postId);
    };

    card.innerHTML = `
      <div class="note-preview">
        <!-- DIRECT FLAG BUTTON FOR POSTS -->
        <div style="position: relative; display: flex; justify-content: space-between; align-items: flex-start;">
            <h3 class="note-title" style="margin:0; padding-right: 32px; word-break: break-word; font-size: 18px; font-weight: 800; color: #111827;">${post.title || "Untitled"}</h3>
            <div style="position: absolute; top: -5px; right: -5px;">
                <button onclick="event.stopPropagation(); window.openReportModal('${postId}', 'post')" style="background:none; border:none; cursor:pointer; color:#9CA3AF; padding: 4px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: all 0.2s;" onmouseover="this.style.background='#FEE2E2'; this.style.color='#DC2626'" onmouseout="this.style.background='none'; this.style.color='#9CA3AF'" title="Report Post">
                    <span class="material-icons" style="font-size: 20px;">flag</span>
                </button>
            </div>
        </div>

        <p style="font-size: 12px; font-weight: 700; color: #111827; margin: 4px 0 12px 0; text-transform: uppercase;">${post.subject || "GENERAL"}</p>
        <div class="note-preview-text" id="desc-${postId}" data-fulldesc="${safeFullDesc}" style="white-space: pre-wrap; background: #F9FAFB; padding: 12px; border-radius: 12px; margin-bottom: 12px; font-size: 14px; color: #4B5563;">${displayDesc.replace(/</g, '&lt;').replace(/>/g, '&gt;')}${isLong ? `\n\n<span class="read-more-btn" style="color: #3B82F6; font-weight: bold; cursor: pointer; display: block; margin-top: 4px;" onclick="event.stopPropagation(); toggleReadMore('${postId}')">Read More</span>` : ""}</div>
        
        <!-- NEW AUTHOR LAYOUT -->
        <div class="note-author" onclick="event.stopPropagation(); window.openUserCard ? window.openUserCard('${post.userId}') : null" style="display:flex; align-items: flex-start; gap:12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #F3F4F6; cursor: pointer;">
            <img src="${displayPic}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">
            <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-weight: 700; font-size: 14px; color: #111827;">${displayName}</span>
                <div class="note-interests" style="display: flex; flex-wrap: wrap; gap: 4px;">${interestsHTML}</div>
            </div>
        </div>

        <div class="note-footer" style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F3F4F6; padding-top: 12px; margin-top: 16px;">
          <div style="display: flex; align-items: center; gap: 4px;">
            <button style="background:transparent; border:none; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; ${upStyle}" onclick="vote(event, '${postId}', 1)"><span class="material-icons" style="font-size: 18px;">arrow_upward</span></button>
            <span style="font-size: 13px; font-weight: 700; padding: 0 4px; color: #4B5563;">${post.upvotes || 0} | ${post.downvotes || 0}</span>
            <button style="background:transparent; border:none; cursor:pointer; width:32px; height:32px; display:flex; align-items:center; justify-content:center; ${downStyle}" onclick="vote(event, '${postId}', -1)"><span class="material-icons" style="font-size: 18px;">arrow_downward</span></button>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
              <button onclick="toggleFav(event, this, '${postId}')" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; width:32px; height:32px; ${pinStyle}">📌</button>
              <button onclick="event.stopPropagation(); openSavedModal('${postId}', true)" style="background:none; border:none; cursor:pointer; color: #6B7280; display:flex; padding:6px;"><span class="material-icons" style="font-size:20px;">chat_bubble_outline</span></button>
              <button onclick="event.stopPropagation(); openFileModal('${post.fileURL}', '${post.title}')" style="background: white; color: #111827; border: 1px solid #E5E7EB; padding: 8px 16px; border-radius: 50px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 13px;"><span class="material-icons" style="font-size: 18px;">description</span> Open</button>
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
    const modalContent = modal.querySelector(".modal-content");
    if (modalContent) {
        modalContent.style.cssText = `background: #FFFFFF; width: 92%; max-width: 450px; margin: auto; border-radius: 28px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15); border: none; display: block; overflow: hidden;`;
    }

    const ref = doc(db, "posts", postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const post = snap.data();

    const userVote = post.userVotes?.[currentUser?.uid] || 0;
    const isSaved = globalSavedPosts.includes(postId);
    const upStyle = userVote === 1 ? `background: #DCFCE7; color: #10B981; border-radius: 50%;` : `color: #6B7280;`;
    const downStyle = userVote === -1 ? `background: #FEE2E2; color: #EF4444; border-radius: 50%;` : `color: #6B7280;`;
    const pinStyle = isSaved ? `background: #FEE2E2; color: #DC2626; border-radius: 8px; padding: 6px;` : `color: #6B7280;`;

    if (showComments) openComments.add(postId);

    // 🔥 3-DOT REPORT MENU ADDED HERE
    let commentsHTML = (post.comments || []).map((c, index) => `
        <div class="comment" style="position: relative; background: #F9FAFB; padding: 12px; padding-right: 30px; border-radius: 8px; margin-bottom: 8px;">
            <strong style="font-size: 12px; color: #111827;">${c.username}</strong>
            <div style="font-size: 14px; margin-top: 2px;">${c.text}</div>
            <div class="comment-menu-container" style="position: absolute; top: 8px; right: 8px;">
                <button class="comment-more-btn" style="background:none; border:none; cursor:pointer; color:#9CA3AF; padding: 4px;" onclick="event.stopPropagation(); toggleCommentMenu('${postId}-${index}')">
                    <span class="material-icons" style="font-size: 18px;">more_vert</span>
                </button>
                <div id="commentMenu-${postId}-${index}" class="comment-dropdown" style="display:none; position:absolute; right:0; background:white; border:1px solid #E5E7EB; border-radius:8px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); z-index:100; min-width: 120px; white-space: nowrap;">
                    <button onclick="event.stopPropagation(); openReportModal('${postId}', 'comment', ${index})" style="padding: 10px 16px; border:none; background:none; width:100%; text-align:left; font-size:13px; cursor:pointer; color:#EF4444; font-weight:600; display:flex; align-items:center; gap:8px;">
                        <span class="material-icons" style="font-size:16px;">flag</span> Report
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    body.innerHTML = `
        <h3 style="font-size: 20px; font-weight: 800; margin: 0 0 8px 0; color: #111827;">${post.title}</h3>
        <p style="font-size: 12px; font-weight: 700; color: #111827; margin: 0 0 4px 0; text-transform: uppercase;">${post.subject || ""}</p>
        <div class="modal-text" style="white-space: pre-wrap; font-size: 14px; line-height: 1.6; color: #4B5563; margin-top: 20px; overflow-wrap: anywhere; word-break: normal;">${(post.description || "").trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
        <div class="note-footer" style="margin-top: 24px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #F3F4F6; padding-top: 16px;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <button class="upvote-btn" style="background:transparent; border:none; cursor:pointer; width:34px; height:34px; display:flex; align-items:center; justify-content:center; ${upStyle}"><span class="material-icons" style="font-size: 20px;">arrow_upward</span></button>
              <span style="font-size: 13px; font-weight: 700; color: #4B5563;">${post.upvotes || 0} | ${post.downvotes || 0}</span>
              <button class="downvote-btn" style="background:transparent; border:none; cursor:pointer; width:34px; height:34px; display:flex; align-items:center; justify-content:center; ${downStyle}"><span class="material-icons" style="font-size: 20px;">arrow_downward</span></button>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button onclick="toggleFav(event, this, '${postId}')" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; width:34px; height:34px; ${pinStyle}">📌</button>
                <button onclick="toggleComments(event, this, '${postId}')" style="background:none; border:none; cursor:pointer; color: #6B7280; display:flex; padding:6px;"><span class="material-icons" style="font-size:22px;">chat_bubble_outline</span></button>
                <button onclick="openFileModal('${post.fileURL}', '${post.title}')" style="background: white; color: #111827; border: 1px solid #E5E7EB; padding: 10px 20px; border-radius: 50px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 14px;"><span class="material-icons" style="font-size: 18px; color: #111827;">description</span> Open</button>
            </div>
        </div>
      
        <div class="comment-section" style="display: ${openComments.has(postId) ? 'block' : 'none'}; margin-top: 16px; padding-top: 16px; border-top: 1px solid #F3F4F6;">
            <div class="comments-list" style="max-height: 200px; overflow-y: auto; margin-bottom: 12px;">${commentsHTML}</div>
            <div style="display:flex; gap:8px;">
                <input type="text" placeholder="Write a comment..." style="flex:1; padding:10px 14px; border-radius:20px; border:1px solid #E5E7EB; outline:none; font-size:14px;">
                <button onclick="submitComment(event, '${postId}', this)" style="background: #111827; color: white; border: none; padding: 0 18px; border-radius: 20px; font-weight: 700; cursor: pointer;">Post</button>
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
            comments: arrayUnion({ 
                uid: currentUser.uid,
                username: currentUser.username || "Anonymous", 
                text: text, 
                timestamp: new Date().toISOString() 
            }) 
        });
        input.value = ""; 
        openSavedModal(postId); 
    } catch (error) { console.error(error); }
};

// ==========================================
// 🔥 PDF.JS CANVAS RENDERER (DESIGN MATCHED)
// ==========================================
// ==========================================
// 🔥 PDF.JS CANVAS RENDERER WITH DOWNLOAD
// ==========================================
let pdfDoc = null,
    pageNum = 1,
    pageIsRendering = false,
    pageNumIsPending = null;

// NEW: Track the current file for downloading
let currentDownloadUrl = "";
let currentDownloadTitle = "";

window.openFileModal = async function(url, title) {
    // 1. Store the file info for the download button
    currentDownloadUrl = url;
    currentDownloadTitle = title || "Document";

    let pdfModal = document.getElementById("pdfJsModal");
    
    // 2. Create the Modal if it doesn't exist
    if (!pdfModal) {
        pdfModal = document.createElement("div");
        pdfModal.id = "pdfJsModal";
        
        pdfModal.style.cssText = "display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 99999; justify-content: center; align-items: center;";
        
        pdfModal.innerHTML = `
            <div style="width: 95%; max-width: 800px; height: 90vh; background: #323639; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);">
                
                <!-- 🔥 UPDATED HEADER: Now with Download Button -->
                <div style="background: #111827; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;">
                    <h3 id="pdfJsTitle" style="color: white; margin: 0; font-size: 16px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${title || "Document"}</h3>
                    
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <!-- DOWNLOAD ICON -->
                        <span class="material-icons" onclick="downloadCurrentPdf()" style="color: white; font-size: 26px; cursor: pointer;" title="Download PDF">download</span>
                        <!-- CLOSE ICON -->
                        <span onclick="closePdfJsModal()" style="color: white; font-size: 24px; cursor: pointer; font-weight: bold; line-height: 1;">✕</span>
                    </div>
                </div>
                
                <div style="background: #323639; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; color: white; border-bottom: 1px solid #1f2937;">
                    <button id="prevPage" style="background: rgba(255,255,255,0.1); color: white; padding: 8px 16px; border-radius: 6px; border: none; font-size: 14px; font-weight: bold; cursor: pointer;">◄ Prev</button>
                    <span style="font-size: 14px; color: #E5E7EB;">Page <span id="page_num">...</span> of <span id="page_count">...</span></span>
                    <button id="nextPage" style="background: rgba(255,255,255,0.1); color: white; padding: 8px 16px; border-radius: 6px; border: none; font-size: 14px; font-weight: bold; cursor: pointer;">Next ►</button>
                </div>

                <div id="canvasContainer" style="flex: 1; overflow: auto; background: #525659; display: flex; justify-content: center; padding: 16px;">
                    <canvas id="pdfCanvas" style="max-width: 100%; height: auto; box-shadow: 0 4px 8px rgba(0,0,0,0.4); border-radius: 4px;"></canvas>
                </div>
            </div>
        `;
        document.body.appendChild(pdfModal);

        document.getElementById('prevPage').addEventListener('click', onPrevPage);
        document.getElementById('nextPage').addEventListener('click', onNextPage);
    }

    // 3. Setup UI for new document
    document.getElementById("pdfJsTitle").innerText = title || "Document";
    pdfModal.style.display = "flex"; 
    
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('page_num').textContent = "...";
    document.getElementById('page_count').textContent = "...";

    // 4. Fetch and Render the PDF via PDF.js
    try {
        pdfDoc = await pdfjsLib.getDocument(url).promise;
        document.getElementById('page_count').textContent = pdfDoc.numPages;
        pageNum = 1;
        renderPage(pageNum);
    } catch (error) {
        console.error("Error loading PDF:", error);
        alert("Could not load PDF. It may be corrupted or blocked by CORS.");
        closePdfJsModal();
    }
};

window.closePdfJsModal = function() {
    document.getElementById("pdfJsModal").style.display = "none";
};

// 🔥 NEW: Function to force the file to download
window.downloadCurrentPdf = function() {
    if (!currentDownloadUrl) return alert("No document is currently open.");

    // Give the user visual feedback that it's working
    const titleEl = document.getElementById("pdfJsTitle");
    const originalTitle = titleEl.innerText;
    titleEl.innerText = "Downloading...";

    fetch(currentDownloadUrl)
        .then(response => response.blob())
        .then(blob => {
            const blobUrl = window.URL.createObjectURL(blob);
            const tempLink = document.createElement("a");
            tempLink.style.display = "none";
            tempLink.href = blobUrl;
            
            // Clean up the title so it makes a valid filename
            const safeTitle = currentDownloadTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            tempLink.download = safeTitle + ".pdf";
            
            document.body.appendChild(tempLink);
            tempLink.click();
            
            window.URL.revokeObjectURL(blobUrl);
            tempLink.remove();
            titleEl.innerText = originalTitle; // Put the original title back
        })
        .catch(err => {
            console.error("Download failed:", err);
            alert("Failed to download the file. Please check your connection.");
            titleEl.innerText = originalTitle;
        });
};

// --- PDF Render Logic ---
function renderPage(num) {
    pageIsRendering = true;

    pdfDoc.getPage(num).then(page => {
        const canvas = document.getElementById('pdfCanvas');
        const ctx = canvas.getContext('2d');
        
        const containerWidth = document.getElementById('canvasContainer').clientWidth;
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = Math.min((containerWidth - 20) / unscaledViewport.width, 2.0); 
        
        const viewport = page.getViewport({ scale: scale });

        // 🔥 HIGH-RES FIX START
        const outputScale = window.devicePixelRatio || 1;

        // 1. Make internal resolution massive
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);

        // 2. Keep visual CSS size normal to fit the screen
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        // 3. Tell PDF.js to scale the text up
        const transform = outputScale !== 1 
            ? [outputScale, 0, 0, outputScale, 0, 0] 
            : null;

        // Add the transform parameter to your render context
        const renderCtx = { 
            canvasContext: ctx, 
            transform: transform, 
            viewport: viewport 
        };
        // 🔥 HIGH-RES FIX END

        page.render(renderCtx).promise.then(() => {
            pageIsRendering = false;
            if (pageNumIsPending !== null) {
                renderPage(pageNumIsPending);
                pageNumIsPending = null;
            }
        });

        document.getElementById('page_num').textContent = num;
    });
}

function queueRenderPage(num) {
    if (pageIsRendering) pageNumIsPending = num;
    else renderPage(num);
}

function onPrevPage() {
    if (pageNum <= 1) return;
    pageNum--;
    queueRenderPage(pageNum);
}

function onNextPage() {
    if (pageNum >= pdfDoc.numPages) return;
    pageNum++;
    queueRenderPage(pageNum);
}
window.openSavedModal = openSavedModal;

// =========================================
// GLOBAL MODAL LOGIC (User Card & Reports)
// =========================================
window.openUserCard = async function(targetUserId) {
    // 🔥 FIXED: Allow clicking your own card on the saved page
    if (!targetUserId || targetUserId === 'undefined') {
        return showToast("User data not available for this post.");
    }

    const modal = document.getElementById("userCardModal");
    if (!modal) return console.error("User Card Modal HTML is missing!");

    document.getElementById("uc-alias").textContent = "Loading...";
    document.getElementById("uc-username").textContent = "";
    document.getElementById("uc-bio").textContent = "";
    document.getElementById("uc-interests").innerHTML = "";
    document.getElementById("uc-posts").textContent = "...";
    document.getElementById("uc-pic").src = "/photos/profile.jpg";
    
    modal.style.display = "flex";

    try {
        const userSnap = await getDoc(doc(db, "user", targetUserId));
        if (userSnap.exists()) {
            const data = userSnap.data();
            document.getElementById("uc-alias").textContent = data.alias || data.name || "Anonymous";
            document.getElementById("uc-username").textContent = data.username ? "@" + data.username : "";
            document.getElementById("uc-bio").textContent = data.bio || "No bio available.";
            document.getElementById("uc-pic").src = data.profilePic || "/photos/profile.jpg";
            let pills = "";
            if (data.interests && Array.isArray(data.interests)) {
                data.interests.forEach(tag => {
                    if (typeof window.getInterestPillHTML === "function") {
                        pills += window.getInterestPillHTML(tag);
                    }
                });
            }
            document.getElementById("uc-interests").innerHTML = pills;
        }

        // 🔥 FIXED: Safety block for post counts
        try {
            const postsSnap = await getDocs(query(collection(db, "posts"), where("userId", "==", targetUserId)));
            document.getElementById("uc-posts").textContent = postsSnap.size;
        } catch (indexError) {
            console.warn("Index needed for post counts:", indexError);
            document.getElementById("uc-posts").textContent = "N/A";
        }
    } catch (error) { 
        console.error("Error fetching user data:", error); 
        document.getElementById("uc-alias").textContent = "Error loading user";
    }
};

window.closeUserCard = function() { document.getElementById("userCardModal").style.display = "none"; };

let pendingReportData = null;
const REPORT_REASONS = ["Spam", "Harassment", "Hate Speech", "Inappropriate Content"];
let selectedReason = "";

function showToast(message) {
    const toast = document.getElementById("toast");
    if(toast) {
        toast.textContent = message; toast.classList.add("show");
        setTimeout(() => toast.classList.remove("show"), 3000);
    }
}

window.toggleCommentMenu = function(menuId) {
    const menu = document.getElementById(`commentMenu-${menuId}`);
    document.querySelectorAll('.comment-dropdown').forEach(m => { if(m !== menu) m.style.display = 'none'; });
    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
};

window.openReportModal = function(targetId, type, commentIndex = null) {
    pendingReportData = { targetId, type, commentIndex };
    selectedReason = ""; 
    document.getElementById("reportModal").style.display = "flex";
    document.getElementById("selectedReasonText").textContent = "Select a reason";
    document.getElementById("reportDescription").value = "";
    document.getElementById("reportOptionsList").innerHTML = REPORT_REASONS.map(reason => `
        <div style="padding: 12px; border-bottom: 1px solid #E5E7EB; cursor: pointer; font-size: 14px;" onclick="handleSelectReason('${reason}')">${reason}</div>
    `).join("");
    document.querySelectorAll('.comment-dropdown').forEach(m => m.style.display = 'none');
    window.validateReport(); 
};

window.closeReportModal = function() {
    pendingReportData = null; document.getElementById("reportModal").style.display = "none";
};

window.toggleReportDropdown = function() {
    const list = document.getElementById("reportOptionsList");
    list.style.display = list.style.display === "block" ? "none" : "block";
};

window.handleSelectReason = function(reason) {
    selectedReason = reason; document.getElementById("selectedReasonText").textContent = reason;
    window.toggleReportDropdown(); window.validateReport(); 
};

window.validateReport = function() {
    const description = document.getElementById("reportDescription").value;
    const submitBtn = document.getElementById("submitReportBtn");
    const indicator = document.getElementById("charCount");
    const isUnderLimit = description.length <= 100;
    if (selectedReason !== "" && isUnderLimit) {
        submitBtn.disabled = false; submitBtn.style.opacity = "1"; submitBtn.style.cursor = "pointer";
    } else {
        submitBtn.disabled = true; submitBtn.style.opacity = "0.5"; submitBtn.style.cursor = "not-allowed";
    }
    if (indicator) {
        indicator.textContent = `${description.length} / 100`;
        indicator.style.color = isUnderLimit ? "#9CA3AF" : "#EF4444";
    }
};

window.submitReport = async function() {
    if (!pendingReportData || !currentUser) return;
    const submitBtn = document.getElementById("submitReportBtn");
    submitBtn.disabled = true; submitBtn.textContent = "Sending...";
    try {
        await setDoc(doc(collection(db, "reports")), {
            targetId: pendingReportData.targetId, targetType: pendingReportData.type,
            commentIndex: pendingReportData.commentIndex, reporterUid: currentUser.uid,
            reason: selectedReason, description: document.getElementById("reportDescription").value,
            status: "pending", timestamp: serverTimestamp()
        });
        window.closeReportModal(); showToast("Report sent successfully");
    } catch (error) { showToast("Error sending report"); } 
    finally { submitBtn.disabled = false; submitBtn.textContent = "Submit"; }
};

document.addEventListener('click', (e) => {
    if (!e.target.closest('.comment-menu-container')) {
        document.querySelectorAll('.comment-dropdown').forEach(m => m.style.display = 'none');
    }
});


/* =========================
   SAVED NOTES: SUBMIT COMMENT (WITH RESTRICTIONS)
========================= */
window.submitComment = async function(event, postId, btn) {
    if (event) event.stopPropagation();
    
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.uid) return alert("You must be logged in to comment!");

    // 🔥 1. ADMIN RESTRICTION CHECK (Gets fresh data from Firestore)
    const userRef = doc(db, "user", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // Check Full Lockdown OR specific Comment Block
        if (userData.state === "suspended" || userData.restrictions?.commentBlock === true) {
            const restrictionMsg = document.getElementById("restrictionMessage");
            const restrictionModalWrapper = document.getElementById("restrictionModalWrapper");

            if (restrictionMsg && restrictionModalWrapper) {
                restrictionMsg.textContent = "Your account is restricted from commenting. Reason: " + (userData.suspendReason || "Admin action.");
                restrictionModalWrapper.style.display = "flex";
            }
            
            const input = btn.previousElementSibling;
            if (input) input.value = ""; 
            return; 
        }
    }

    // 2. PROCEED WITH SAVING COMMENT
    const input = btn.previousElementSibling;
    const text = input.value.trim();
    if (!text) return;

    const postRef = doc(db, "posts", postId);
    try {
        await updateDoc(postRef, { 
            comments: arrayUnion({ 
                uid: user.uid,
                username: user.username || user.name || "Anonymous", 
                text: text, 
                timestamp: new Date().toISOString() 
            }) 
        });
        input.value = ""; 
        openSavedModal(postId); // Refresh the modal to show the new comment
    } catch (error) { 
        console.error("Comment failed:", error); 
    }
};


window.toggleReadMore = function(postId) {
    const descEl = document.getElementById(`desc-${postId}`);
    if (!descEl) return;
    
    const fullText = decodeURIComponent(descEl.getAttribute("data-fulldesc"));
    const MAX_EXPANDED_LENGTH = 600; 
    
    if (descEl.dataset.expanded === "true") {
        // 🔥 COLLAPSED STATE
        descEl.style.maxHeight = "none";
        descEl.style.overflowY = "visible";
        
        descEl.textContent = fullText.substring(0, 150) + "...";
        descEl.insertAdjacentHTML("beforeend", `<span class="read-more-btn" style="color: #3B82F6; font-weight: bold; cursor: pointer; display: block; margin-top: 4px;" onclick="event.stopPropagation(); toggleReadMore('${postId}')">Read More</span>`);
        descEl.dataset.expanded = "false";
    } else {
        // 🔥 EXPANDED STATE
        descEl.style.maxHeight = "250px";
        descEl.style.overflowY = "auto";
        
        let expandedText = fullText;
        if (fullText.length > MAX_EXPANDED_LENGTH) {
            expandedText = fullText.substring(0, MAX_EXPANDED_LENGTH) + "\n\n... [Content truncated by Admin limit]";
        }
        
        descEl.textContent = expandedText;
        descEl.insertAdjacentHTML("beforeend", `<span class="read-more-btn" style="color: #3B82F6; font-weight: bold; cursor: pointer; display: block; margin-top: 4px;" onclick="event.stopPropagation(); toggleReadMore('${postId}')">Show Less</span>`);
        descEl.dataset.expanded = "true";
    }
};