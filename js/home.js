import { db } from "/firebase/firebase-client.js";
import { addPoints } from "/js/points.js";
import {
  collection,
  getDocs,
  query,
  limit,
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
            globalSavedPosts = snap.data().savedPosts || [];
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

/* =========================
   CATEGORY BUTTONS
========================= */
const categories = [
  "All", "Art", "Programming", "Math", "Physics", 
  "Psychology", "Business", "History", "Engineering", 
  "Design", "Medicine"
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
    });
    container.appendChild(button);
  });
}

/* =========================
   LOAD POSTS FROM FIRESTORE
========================= */
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
                      <strong style="font-size: 12px; color: #9D182B;">${c.username}</strong>
                      <div style="font-size: 14px; margin-top: 2px;">${c.text}</div>
                  </div>
              `;
          });
      }

      const card = document.createElement("div");
      card.className = "note-card";
      card.addEventListener("click", () => openPost(docSnap.id));

      card.innerHTML = `
        <div class="note-preview">
          <div class="note-preview-text">${post.description || "No description"}</div>
          <p class="note-code">${post.subject || ""}</p>
          <h3 class="note-title">${post.title || "Untitled"}</h3>
          <div class="note-author">
<img src="${post.profilePic || (post.userId === currentUser?.uid ? currentUser.photo : null) || currentUser?.photo || "/photos/profile.jpg"}" class="author-pic">
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
                <button class="open-file-btn" onclick="openFileModal('${post.fileURL}', '${post.title}')"><span class="material-icons" style="font-size: 18px;">description</span> Open</button>
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

      card.querySelector(".upvote-btn").addEventListener("click", (e) => {
        e.stopPropagation(); vote(e, docSnap.id, 1);
      });
      card.querySelector(".downvote-btn").addEventListener("click", (e) => {
        e.stopPropagation(); vote(e, docSnap.id, -1);
      });

      container.appendChild(card);
    });

    // 🔥 Sync buttons immediately after drawing the feed
    syncAllSaveButtons();
  });
}

loadPostsRealtime();

// OPEN MODAL POST
async function openPost(postId){
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
          <button class="open-file-btn" onclick="openFileModal('${post.fileURL}', '${post.title}')"><span class="material-icons" style="font-size: 18px;">description</span> Open</button>
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

  body.querySelector(".upvote-btn").addEventListener("click", async (e) => {
      await vote(e, postId, 1); openPost(postId); 
  });
  body.querySelector(".downvote-btn").addEventListener("click", async (e) => {
      await vote(e, postId, -1); openPost(postId); 
  });

  modal.style.display = "flex";
  
  // 🔥 Sync button immediately after opening modal
  syncAllSaveButtons();
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

// OTHER FUNCTIONS (Files, Voting, Comments, etc.)
let selectedPDF = null;
let activeFile = null;
window.openFileModal = function(url, title) {
  selectedPDF = { url, title };
  activeFile = { url, title };
  document.getElementById("file-title").innerText = "📄 " + (title || "Selected File");
  document.getElementById("pdfFrame").src = url;
  document.getElementById("pdfTitle").innerText = title || "PDF File";
  document.getElementById("pdfModal").style.display = "block";
};

window.closeFileModal = function() {
  document.getElementById("pdfModal").style.display = "none";
  document.getElementById("pdfFrame").src = "";
};

window.clearFile = function () {
  activeFile = null;
  document.getElementById("file-title").innerText = "💬 Please open a file";
};

window.getSummary = async function () {
  if (!activeFile) return alert("No file selected");
  const res = await fetch("http://localhost:3000/ai/summarize", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(activeFile)
  });
  const data = await res.json();
  showMessage("🧠 Summary:\n\n" + data.summary);
};

window.getQuiz = async function () {
  if (!activeFile) return alert("No file selected");
  const res = await fetch("http://localhost:3000/ai/quiz", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(activeFile)
  });
  const data = await res.json();
  showMessage("📝 Quiz:\n\n" + data.quiz);
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
        username: user.username || "Anonymous", 
        text: text,
        timestamp: new Date().toISOString()
    };
    const postRef = doc(db, "posts", postId);
    try {
        openComments.add(postId);
        await updateDoc(postRef, { comments: arrayUnion(newComment) });
        input.value = ""; 
        if (btn.closest('#modalBody')) openPost(postId);
    } catch (error) { console.error("Error posting comment:", error); }
}
window.submitComment = submitComment;

function updateNotificationCount(count){
  let badge = document.getElementById("notificationCount");
  badge.innerText = count;
  badge.style.display = count === 0 ? "none" : "block";
}

let recentSearches = [
  { type:"user", name:"Christine Aligata", username:"@tintintin", avatar:"/photos/profile.jpg" },
  { type:"search", text:"Christine Aligata" },
  { type:"search", text:"Database" }
];

function loadRecentSearches(){
  const container = document.getElementById("recentList");
  if (!container) return;
  container.innerHTML = "";
  recentSearches.forEach((item,index)=>{
    let div = document.createElement("div");
    div.className="recent-item";
    if(item.type === "user"){
      div.innerHTML = `<img src="${item.avatar}" class="recent-avatar"><div><div class="recent-name">${item.name}</div><div class="recent-sub">${item.username}</div></div><span class="remove" onclick="removeSearch(${index})">✕</span>`;
    } else {
      div.innerHTML = `<span class="search-icon">🔍</span><span>${item.text}</span><span class="remove" onclick="removeSearch(${index})">✕</span>`;
    }
    container.appendChild(div);
  });
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