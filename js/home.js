import { db } from "/firebase/firebase-client.js";
import { sendNotification } from "/js/notificationManager.js";
import { addPoints, spendPoints, giveDailyReward } from "/js/points.js";
import {
  collection,
  getDocs,
  query,
  limit,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  increment,
  runTransaction,
  serverTimestamp,
  getDoc,
  orderBy,
  arrayUnion,
  arrayRemove
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
   STATE MEMORY & GLOBAL USER
========================= */
const openComments = new Set();
const currentUser = JSON.parse(localStorage.getItem("user"));

// 🔥 1. GLOBAL SAVED POSTS ARRAY
let globalSavedPosts = [];

// 🔥 2. REAL-TIME LISTENER: Constantly syncs the UI with the database
if (currentUser?.uid) {
    const userRef = doc(db, "user", currentUser.uid);
    onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            globalSavedPosts = data.savedPosts || [];
            
            // 🔥 NEW: Check for the daily check-in as soon as user data arrives
            // We are passing the user ID and the last timestamp from the doc
            checkAndShowDailyCheckIn(currentUser.uid, data.lastCheckIn);
            
            syncAllSaveButtons(); // Auto-updates buttons when data arrives
        }
    });
}

// 🔥 3. SYNC FUNCTION: Finds all buttons and fixes their icons
function syncAllSaveButtons() {
    const saveButtons = document.querySelectorAll(".fav-btn");
    saveButtons.forEach(btn => {
        const postId = btn.getAttribute("data-postid");
        if (!postId) return;

        if (globalSavedPosts.includes(postId)) {
            btn.classList.add("saved");
            btn.innerText = "📌";
        } else {
            btn.classList.remove("saved");
            btn.innerText = "🔖";
        }
    });
}

// ===========================================
// 🔥 THE COMPLETE PH TIME CHECK-IN SYNC
// ===========================================

// Helper to get the date string of "Now" in Manila timezone
function getManilaDateString(timestamp = new Date()) {
  const date = timestamp.toDate ? timestamp.toDate() : timestamp;
  return date.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
}

// Stores the document and userId globally when the modal opens
let currentCheckInData = { userId: null };

window.checkAndShowDailyCheckIn = async function (userId, lastCheckInTimestamp) {
  // 1. SAFETY: Prevent duplicate checks if it's already open
  if (document.getElementById("checkInModal").style.display === "flex") return;

  // 2. PH Date Strings
  const todayManila = getManilaDateString();
  const lastCheckInManila = lastCheckInTimestamp 
    ? getManilaDateString(lastCheckInTimestamp) 
    : "Never";

  console.log(`Checking Daily Reward: Today (Manila) is ${todayManila}, Last Check-in was ${lastCheckInManila}`);

  // 3. Compare: If strings are different, it's a new day!
  if (todayManila !== lastCheckInManila) {
    // A. Store the info globally for the 'Claim' button
    currentCheckInData.userId = userId;

    // B. Create a simple "Open Modal" state
    const modal = document.getElementById("checkInModal");
    if (modal) modal.style.display = "flex";
  }
};

window.claimReward = async function () {
  // 1. SAFETY
  const modal = document.getElementById("checkInModal");
  if (!modal || modal.style.display !== "flex") return;

  // 2. GET userId
  const { userId } = currentCheckInData;
  if (!userId) {
    alert("System error: Could not confirm user identity.");
    modal.style.display = "none";
    return;
  }

  // 3. SHOW LOADER on the button for feedback
  const btn = modal.querySelector(".claim-btn");
  btn.innerText = "Claiming...";
  btn.disabled = true;

  try {
    // 4. FIREBASE PART
    // A. Give the points
    await giveDailyReward(userId);

    // B. Save the new timestamp using serverTimestamp()
    const userRef = doc(db, "user", userId);
    await updateDoc(userRef, {
      lastCheckIn: serverTimestamp() // The server will automatically use the correct UTC time
    });

    console.log(" Daily check-in successful!");

    // 5. SUCCESS UI
    modal.style.display = "none";
    showMessage("NICE! You just received +50 points for checking in today!");

    // 6. CLEAR MEMORY
    currentCheckInData.userId = null;

  } catch (error) {
    console.error(" Daily check-in failed:", error);
    alert("Could not process reward. Please try again later.");
    btn.innerText = "Claim Reward";
    btn.disabled = false;
  }
};

/* =========================
   CATEGORY BUTTONS
========================= */
let selectedCategory = "All";

const categories = [
  "All",
  "Mathematics",
  "Science",
  "Computer Science",
  "Engineering",
  "Health & Medicine",
  "Social Science",
  "Business & Economics",
  "Arts & Humanities",
  "General Studies"
];

generateCategories(categories);

function generateCategories(categoryList) {
  const container = document.getElementById("categoriesContainer");
  categoryList.forEach(category => {
    const button = document.createElement("button");
    button.classList.add("category");
    button.textContent = category;
    if (category === "All") button.classList.add("active");

    button.addEventListener("click", () => {
  document.querySelectorAll(".category").forEach(btn => btn.classList.remove("active"));
  button.classList.add("active");

  selectedCategory = category;
applyCategoryFilter();          // 👈 reload posts
}); 
    container.appendChild(button);
  });
}

/* =========================
   LOAD POSTS FROM FIRESTORE
========================= */
function applyCategoryFilter() {
  const cards = document.querySelectorAll(".note-card");

  cards.forEach(card => {
    const postCategory = card.dataset.category;

    if (selectedCategory === "All" || postCategory === selectedCategory) {
      card.style.display = "block";
    } else {
      card.style.display = "none";
    }
  });
}
function loadPostsRealtime() {
  const container = document.getElementById("notesFeed");
  const userId = currentUser ? currentUser.uid : null;

  const q = query(
    collection(db, "posts"),
    orderBy("timestamp", "desc"),
    limit(8)
  );

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";

    snapshot.forEach(docSnap => {
      const post = docSnap.data();
      let upClass = "";
      let downClass = "";
      
      if (userId && post.userVotes && post.userVotes[userId] === 1) upClass = "upvoted"; 
      else if (userId && post.userVotes && post.userVotes[userId] === -1) downClass = "downvoted"; 

      let commentsHTML = "";
      if (post.comments && post.comments.length > 0) {
          post.comments.forEach(c => {
              commentsHTML += `
                  <div class="comment">
                      <strong style="font-size: 12px; color: #111827;">${c.username}</strong>
                      <div style="font-size: 14px; margin-top: 2px;">${c.text}</div>
                  </div>
              `;
          });
      }

      const card = document.createElement("div");
      card.className = "note-card";
      card.dataset.postid = docSnap.id;
      card.addEventListener("click", () => openPost(docSnap.id));
      card.dataset.category = post.subject; // ✅ ADDED

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
              <button class="vote-btn upvote-btn ${upClass}"><span class="material-icons">arrow_upward</span></button>
              <span id="voteCount" class="vote-count">${post.upvotes || 0} |  ${post.downvotes || 0}</span>
              <button class="vote-btn downvote-btn ${downClass}"><span class="material-icons">arrow_downward</span></button>
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
                <button class="fav-btn" data-postid="${docSnap.id}" onclick="toggleFav(event, this, '${docSnap.id}')">🔖</button>
                <button class="comment-icon-btn" onclick="toggleComments(event, this, '${docSnap.id}')"><span class="material-icons">chat_bubble_outline</span></button>
                  <button class="open-file-btn"
  onclick="event.stopPropagation(); openFileModal(
    '${post.fileURL}',
    '${post.title}',
    '${post.fileName || "Unknown File"}'
  )">
  <span class="material-icons" style="font-size: 18px;">description</span>
  Open
</button>
              </div>
              
          </div>

          <div class="comment-section" style="display: ${openComments.has(docSnap.id) ? 'block' : 'none'};" onclick="event.stopPropagation()">
              <div class="comments-list">${commentsHTML}</div>
              <div class="comment-input-wrapper">
                  <input type="text" class="comment-input" placeholder="Write a comment...">
                  <button class="comment-btn" onclick="submitComment(event, '${docSnap.id}', this)">Post</button>
              </div>
          </div>
        </div>
      `;

      const user = JSON.parse(localStorage.getItem("user"));

card.querySelector(".upvote-btn").addEventListener("click", async (e) => {
  e.stopPropagation();

  await vote(e, docSnap.id, 1);

  await sendNotification({
    post: {
      id: docSnap.id,
      title: post.title || "Untitled",
      userId: post.userId
    },
    currentUser: {
      uid: user?.uid,
      name: user?.name,
      photo: user?.photo
    },
    type: "upvote"
  });
});

card.querySelector(".downvote-btn").addEventListener("click", async (e) => {
  e.stopPropagation();

  await vote(e, docSnap.id, -1);

  await sendNotification({
    post: {
      id: docSnap.id,
      title: post.title || "Untitled",
      userId: post.userId
    },
    currentUser: {
      uid: user?.uid,
      name: user?.name,
      photo: user?.photo
    },
    type: "downvote"
  });
});
      card.dataset.title = post.title || "";
card.dataset.desc = post.description || "";
card.dataset.subject = post.subject || "";
card.dataset.user = post.username || "";
      container.appendChild(card);
    });

    // 🔥 Sync buttons immediately after drawing the feed
    syncAllSaveButtons();
  });
}

loadPostsRealtime();

window.activeFile = null;
window.selectedPDF = null;


function openFileModal(fileURL, title, fileName) {
  currentFile = {
    fileURL,
    title,
    fileName
  };

  // existing code below (DO NOT REMOVE)
  document.getElementById("fileModal").classList.add("active");
}

// OPEN MODAL POST
async function openPost(postId, showComments = false){
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

  let commentsHTML = "";
  if (post.comments && post.comments.length > 0) {
      post.comments.forEach(c => {
          commentsHTML += `
              <div class="comment">
                  <strong style="font-size: 12px; color: #9D182B;">${c.username}</strong>
                  <div style="font-size: 14px; margin-top: 2px;">${c.text}</div>
              </div>
          `;
      });
  }

  body.innerHTML = `
    <h3>${post.title}</h3>
    <p style="font-size:12px;">${post.subject || ""}</p>
    <div class="modal-text">${post.description}</div>
    <div class="note-footer" style="margin-top: 24px;">
      <div class="vote-box">
        <button class="vote-btn upvote-btn ${upClass}"><span class="material-icons">arrow_upward</span></button>
        <span id="voteCount" class="vote-count">${post.upvotes || 0} |  ${post.downvotes || 0}</span>
        <button class="vote-btn downvote-btn ${downClass}"><span class="material-icons">arrow_downward</span></button>
      </div>
      <div style="display: flex; align-items: center; gap: 4px;">
          <button class="fav-btn" data-postid="${postId}" onclick="toggleFav(event, this, '${postId}')">🔖</button>
          <button class="comment-icon-btn" onclick="toggleComments(event, this, '${postId}')"><span class="material-icons">chat_bubble_outline</span></button>
          <button class="open-file-btn" onclick="event.stopPropagation(); openFileModal('${post.fileURL}', '${post.title}')"><span class="material-icons" style="font-size: 18px;">description</span> Open</button>
      </div>
    </div>
    <div class="comment-section" style="display: ${openComments.has(postId) ? 'block' : 'none'};" onclick="event.stopPropagation()">
        <div class="comments-list">${commentsHTML}</div>
        <div class="comment-input-wrapper">
            <input type="text" class="comment-input" placeholder="Write a comment...">
            <button class="comment-btn" onclick="submitComment(event, '${postId}', this)">Post</button>
        </div>
    </div>
  `;
   const user = JSON.parse(localStorage.getItem("user"));

body.querySelector(".upvote-btn").addEventListener("click", async (e) => {
  e.stopPropagation();

  await vote(e, postId, 1);

  await sendNotification({
    post: {
      id: postId,
      title: post.title || "Untitled",
      userId: post.userId
    },
    currentUser: {
      uid: user?.uid,
      name: user?.name,
      photo: user?.photo
    },
    type: "upvote"
  });

  // refresh modal content properly
  await openPost(postId);
});

body.querySelector(".downvote-btn").addEventListener("click", async (e) => {
  e.stopPropagation();

  await vote(e, postId, -1);

  await sendNotification({
    post: {
      id: postId,
      title: post.title || "Untitled",
      userId: post.userId
    },
    currentUser: {
      uid: user?.uid,
      name: user?.name,
      photo: user?.photo
    },
    type: "downvote"
  });

  await openPost(postId);
});

modal.style.display = "flex";
  
  // 🔥 Sync button immediately after opening modal
  syncAllSaveButtons();

  // If opened with showComments, focus the comment input
  if (showComments) {
    setTimeout(() => {
      const input = body.querySelector('.comment-input');
      if (input) input.focus();
    }, 100); // Small delay to ensure modal is rendered
  }
}

// TOGGLE FAVORITE 
async function toggleFav(event, btn, postId) {
  event.stopPropagation();
  
  if (!currentUser?.uid) {
    alert("You must be logged in to save notes!");
    return;
  }

  const userRef = doc(db, "user", currentUser.uid);
  
  // Check the global array, not just the button class
  const isCurrentlySaved = globalSavedPosts.includes(postId);

  // Optimistic Visual Update
  if (isCurrentlySaved) {
    btn.classList.remove("saved");
    btn.innerText = "🔖";
  } else {
    btn.classList.add("saved");
    btn.innerText = "📌";
  }

  try {
    if (isCurrentlySaved) {
      await setDoc(userRef, { savedPosts: arrayRemove(postId) }, { merge: true });
    } else {
      await setDoc(userRef, { savedPosts: arrayUnion(postId) }, { merge: true });
    }
  } catch (error) {
    console.error("FIREBASE ERROR:", error);
    // If the database fails, run the sync function to correct the button
    syncAllSaveButtons(); 
  }
}
window.toggleFav = toggleFav;

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
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderCtx = { canvasContext: ctx, viewport: viewport };

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

window.clearFile = function () {
  activeFile = null;
  document.getElementById("file-title").innerText = "💬 Please open a file";
};

function showMessage(text) {
  const div = document.createElement("div");
  div.className = "bot-msg";
  div.innerText = text;
  const chat = document.getElementById("chat-body");
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

const modal = document.getElementById("postModal");
function closeModal() { modal.style.display = "none"; }
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
window.closeModal = closeModal;

let votingInProgress = false;
async function vote(event, postId, value){
  event.stopPropagation();
  if (votingInProgress) return; 
  votingInProgress = true;
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) { votingInProgress = false; return alert("Login first"); }

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
        if (!alreadyRewarded) { givePoints = true; voteRewards[user.uid] = true; }
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
  } catch (err) { console.error("Vote error:", err); }
  votingInProgress = false;
}

function toggleComments(event, btn, postId) {
    event.stopPropagation(); 
    const footer = btn.closest('.note-footer');
    const commentSection = footer.nextElementSibling;
    if (commentSection && commentSection.classList.contains('comment-section')) {
        if (commentSection.style.display === "block" || commentSection.style.display === "") {
            commentSection.style.display = "none";
            if(postId) openComments.delete(postId); 
        } else {
            commentSection.style.display = "block";
            if(postId) openComments.add(postId); 
        }
    }
}
window.toggleComments = toggleComments;

async function submitComment(event, postId, btn) {
  event.stopPropagation();

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return alert("You must be logged in to comment!");

  const input = btn.previousElementSibling;
  const text = input.value.trim();
  if (text === "") return;

  const newComment = {
    username: user.username || user.name || "Anonymous",
    text: text,
    timestamp: new Date().toISOString()
  };

  const postRef = doc(db, "posts", postId);

  try {
    openComments.add(postId);

    await updateDoc(postRef, {
      comments: arrayUnion(newComment)
    });

    input.value = "";

    // 🔥 GET POST DATA (IMPORTANT)
    const snap = await getDoc(postRef);
    const post = snap.data();

    // 🔥 SEND NOTIFICATION
    await sendNotification({
      post: {
        id: postId,
        title: post.title || "Untitled",
        userId: post.userId
      },
      currentUser: {
        uid: user.uid,
        name: user.name,
        photo: user.photo
      },
      type: "comment"
    });

    // refresh modal if needed
    if (btn.closest('#modalBody')) openPost(postId);

  } catch (error) {
    console.error("Error posting comment:", error);
  }
}

window.submitComment = submitComment;

function updateNotificationCount(count){
  let badge = document.getElementById("notificationCount");
  badge.innerText = count;
  badge.style.display = count === 0 ? "none" : "block";
}



const searchInput = document.getElementById("searchInput");
const results = document.getElementById("searchResults");
const SEARCH_HISTORY_KEY = "noteXchangeSearchHistory";

/* =========================
   RECENT SEARCHES
   ========================= */

let recentSearches = JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY)) || [];

function saveSearchQuery(value) {
  const text = value.trim();
  if (!text) return;
  const normalized = text.toLowerCase();
  recentSearches = recentSearches.filter(item => item.text.toLowerCase() !== normalized);
  recentSearches.unshift({ text });
  if (recentSearches.length > 12) recentSearches.length = 12;
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(recentSearches));
  loadRecentSearches();
}

function loadRecentSearches() {
  const container = document.getElementById("recentList");
  if (!container) return;

  container.innerHTML = "";

  if (recentSearches.length === 0) {
    container.innerHTML = `<div style="padding:14px;color:#9CA3AF;">No recent searches yet.</div>`;
    return;
  }

  recentSearches.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "recent-item";
    div.innerHTML = `
      <span class="material-icons search-icon">search</span>
      <span>${item.text}</span>
      <span class="remove" onclick="event.stopPropagation(); removeSearch(${index})">✕</span>
    `;
    div.addEventListener("click", () => {
      if (searchInput) {
        searchInput.value = item.text;
        searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    container.appendChild(div);
  });
}

if (searchInput) {
  const results = document.getElementById("searchResults");

  searchInput.addEventListener("input", function () {
    const query = this.value.toLowerCase().trim();
    const cards = document.querySelectorAll("#notesFeed .note-card");

    results.innerHTML = "";

    if (!query) {
      cards.forEach(c => (c.style.display = ""));
      return;
    }

    const tokens = query.split(" ").filter(Boolean);

    let scored = [];

    cards.forEach(card => {
      const title = (card.dataset.title || "").toLowerCase();
      const desc = (card.dataset.desc || "").toLowerCase();
      const subject = (card.dataset.subject || "").toLowerCase();
      const user = (card.dataset.user || "").toLowerCase();

      let score = 0;

      // normalize helper
      const fields = { title, desc, subject, user };

      // EXACT MATCH (highest priority)
      if (subject === query) score += 200;
      if (title === query) score += 180;

      // PREFIX MATCH (feels like autocomplete)
      if (subject.startsWith(query)) score += 120;
      if (title.startsWith(query)) score += 100;

      // TOKEN MATCH (social media style)
      tokens.forEach(t => {
        if (subject.includes(t)) score += 60;
        if (title.includes(t)) score += 50;
        if (user.includes(t)) score += 30;
        if (desc.includes(t)) score += 10;
      });

      // FULL TEXT MATCH BONUS
      if (
        subject.includes(query) ||
        title.includes(query) ||
        user.includes(query) ||
        desc.includes(query)
      ) {
        score += 20;
      }

      if (score > 0) {
        scored.push({ card, score });
      }
    });

    // sort best match first (THIS is what makes it "social media-like")
    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      results.innerHTML = `<div style="padding:10px;color:#888;">No results found</div>`;
      return;
    }

    // render results
    scored.forEach(({ card }) => {
      const clone = card.cloneNode(true);
      clone.style.display = "block";
      
      // Hide inline comment sections in search results since we use modal
      const commentSection = clone.querySelector('.comment-section');
      if (commentSection) commentSection.style.display = 'none';
      
      results.appendChild(clone);

      const postId = clone.dataset.postid;
      if (postId) {
        clone.addEventListener("click", () => openPost(postId));

        const commentBtn = clone.querySelector(".comment-icon-btn");
        if (commentBtn) {
          commentBtn.removeAttribute('onclick'); // Remove inline onclick to prevent inline toggle
          commentBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openPost(postId, true);
          });
        }

        const upBtn = clone.querySelector(".upvote-btn");
        if (upBtn) {
          upBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await vote(e, postId, 1);
            // Refresh the search results to show updated vote counts
            searchInput.dispatchEvent(new Event("input", { bubbles: true }));
          });
        }

        const downBtn = clone.querySelector(".downvote-btn");
        if (downBtn) {
          downBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await vote(e, postId, -1);
            // Refresh the search results to show updated vote counts
            searchInput.dispatchEvent(new Event("input", { bubbles: true }));
          });
        }

        const openBtn = clone.querySelector(".open-file-btn");
        if (openBtn) {
          openBtn.addEventListener("click", (e) => {
            e.stopPropagation();
          });
        }
      }
    });
  });




  document.addEventListener("DOMContentLoaded", () => {
  const trigger = document.getElementById("searchInputTrigger");

  if (trigger) {
    trigger.addEventListener("click", () => {
      document.getElementById("searchPage").classList.add("active");
      loadRecentSearches();
      history.pushState({ page: "search" }, "", "#search");
    });
  }
});

  /* =========================
     SAVE RECENT SEARCH
     ========================= */
  searchInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveSearchQuery(this.value);
    }
  });

  searchInput.addEventListener("change", function () {
    saveSearchQuery(this.value);
  });
}

/* =========================
   END SEARCH CONTROLLER
   ========================= */
function removeSearch(index) {
  recentSearches.splice(index, 1);
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(recentSearches));
  loadRecentSearches();
}
function openSearch(){
  document.getElementById("searchPage").classList.add("active");
  loadRecentSearches();
  history.pushState({page:"search"}, "", "#search");
}
function closeSearch(){ document.getElementById("searchPage").classList.remove("active"); }
function goBack(){ window.history.back(); }
window.addEventListener("popstate", function(){
  let searchPage = document.getElementById("searchPage");
  if(searchPage && searchPage.classList.contains("active")) searchPage.classList.remove("active");
});
window.openSearch = openSearch;
window.closeSearch = closeSearch;
window.goBack = goBack;
window.removeSearch = removeSearch;

const chatBtn = document.getElementById("chatbot-btn");
const chatModal = document.getElementById("chatbot-modal");
const closeChat = document.getElementById("close-chat");
if (chatBtn) chatBtn.addEventListener("click", () => { chatModal.style.display = "flex"; });
if (closeChat) closeChat.addEventListener("click", () => { chatModal.style.display = "none"; });

let lastScrollTop = 0;
const topArea = document.getElementById("topArea");
if (topArea) {
    window.addEventListener("scroll", () => {
        let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        let topBarHeight = topArea.offsetHeight;
        if (scrollTop > lastScrollTop && scrollTop > topBarHeight) topArea.classList.add("hide-on-scroll");
        else if (scrollTop < lastScrollTop) topArea.classList.remove("hide-on-scroll");
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; 
    });
}

/* =========================
   BELL COUNTER SYNC
========================= */
function syncBellCounter() {
    try {
        const badge = document.getElementById("notificationCount");
        if (!badge || !currentUser) return;

        // 🔥 NO "s" here!
        const q = query(
            collection(db, "user", currentUser.uid, "notifications"),
            where("read", "==", false)
        );

        onSnapshot(q, (snapshot) => {
            const unreadCount = snapshot.size;
            console.log("Unread notifications found:", unreadCount);
            
            badge.innerText = unreadCount;
            badge.style.display = unreadCount > 0 ? "inline-block" : "none";
        }, (error) => {
            console.error("🔥 Snapshot error:", error);
        });

    } catch (error) {
        console.error("🔥 syncBellCounter crashed:", error);
    }
}

// Start the listener
syncBellCounter();