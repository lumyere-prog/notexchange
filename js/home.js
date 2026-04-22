import { db } from "/firebase/firebase-client.js";
import {
  collection,
  getDocs,
  query,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  increment,
  getDoc,
  orderBy,
  arrayUnion // 🔥 ADDED FOR COMMENTS
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   CATEGORY BUTTONS
========================= */
const categories = [
  "All",
  "Art",
  "Programming",
  "Math",
  "Physics",
  "Psychology",
  "Business",
  "History",
  "Engineering",
  "Design",
  "Medicine"
];

generateCategories(categories);

function generateCategories(categoryList) {
  const container = document.getElementById("categoriesContainer");

  categoryList.forEach(category => {
    const button = document.createElement("button");

    button.classList.add("category");
    button.textContent = category;

    if (category === "All") {
      button.classList.add("active");
    }

    button.addEventListener("click", () => {
      document.querySelectorAll(".category")
        .forEach(btn => btn.classList.remove("active"));

      button.classList.add("active");

      console.log("Selected category:", category);

      // 🔥 future filter
      // loadPosts(category);
    });

    container.appendChild(button);
  });
}

/* =========================
   LOAD POSTS FROM FIRESTORE
========================= */
function loadPostsRealtime() {

  const container = document.getElementById("notesFeed");

  const q = query(
    collection(db, "posts"),
    orderBy("timestamp", "desc"),
    limit(8)
  );

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";

    // 1. Get the current user so we know whose votes to check
    const currentUser = JSON.parse(localStorage.getItem("user"));
    const userId = currentUser ? currentUser.uid : null;

    snapshot.forEach(docSnap => {
      const post = docSnap.data();

      // 2. Figure out if this specific user voted on this specific post
      let upClass = "";
      let downClass = "";
      
      if (userId && post.userVotes && post.userVotes[userId] === 1) {
          upClass = "upvoted"; // Turns it Green
      } else if (userId && post.userVotes && post.userVotes[userId] === -1) {
          downClass = "downvoted"; // Turns it Red
      }

      // 3. Build the existing comments HTML
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

      card.addEventListener("click", () => {
        openPost(docSnap.id);
      });

      card.innerHTML = `
        <div class="note-preview">

          <div class="note-preview-text">
            ${post.description || "No description"}
          </div>

          <p class="note-code">${post.subject || ""}</p>

          <h3 class="note-title">
            ${post.title || "Untitled"}
          </h3>

          <div class="note-author">
            <img src="${post.profilePic || "/photos/profile.jpg"}" class="author-pic">
            <span>${post.username || "Unknown"}</span>
          </div>

          <div class="note-footer">

            <div class="vote-box">
              <button class="vote-btn upvote-btn ${upClass}">
                  <span class="material-icons">arrow_upward</span>
              </button>
              
              <span id="voteCount" class="vote-count">
                 ${post.upvotes || 0} |  ${post.downvotes || 0}
              </span>
              
              <button class="vote-btn downvote-btn ${downClass}">
                  <span class="material-icons">arrow_downward</span>
              </button>
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
                <button class="fav-btn" onclick="toggleFav(event, this)">🔖</button>
                
                <button class="comment-icon-btn" onclick="toggleComments(event, this)">
                    <span class="material-icons">chat_bubble_outline</span>
                </button>

                <a href="${post.fileURL}" target="_blank" class="open-file-btn" onclick="event.stopPropagation()">
                  <span class="material-icons" style="font-size: 18px;">description</span> Open
                </a>
            </div>

          </div>

          <div class="comment-section" onclick="event.stopPropagation()">
              <div class="comments-list">
                  ${commentsHTML}
              </div>
              <div class="comment-input-wrapper">
                  <input type="text" class="comment-input" placeholder="Write a comment...">
                  <button class="comment-btn" onclick="submitComment(event, '${docSnap.id}', this)">Post</button>
              </div>
          </div>

        </div>
      `;

      // 🔥 VOTE EVENTS (no inline onclick)
      const upBtn = card.querySelector(".upvote-btn");
      const downBtn = card.querySelector(".downvote-btn");

      upBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        vote(e, docSnap.id, 1);
      });

      downBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        vote(e, docSnap.id, -1);
      });

      container.appendChild(card);
    });

  });
}

/* =========================
   INIT
========================= */
loadPostsRealtime();


// OPEN MODAL POST
async function openPost(postId){

  const modal = document.getElementById("postModal");
  const body = document.getElementById("modalBody");

  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const post = snap.data();

  // 1. Check user votes for the Modal!
  const currentUser = JSON.parse(localStorage.getItem("user"));
  const userId = currentUser ? currentUser.uid : null;

  let upClass = "";
  let downClass = "";
  
  if (userId && post.userVotes && post.userVotes[userId] === 1) {
      upClass = "upvoted";
  } else if (userId && post.userVotes && post.userVotes[userId] === -1) {
      downClass = "downvoted";
  }

  // 2. Build the existing comments HTML for the Modal
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

  // 3. Build the HTML inside the Modal
  body.innerHTML = `
    <h3>${post.title}</h3>

    <p style="font-size:12px;">${post.subject || ""}</p>

    <div class="modal-text">${post.description}</div>

    <div class="note-footer" style="margin-top: 24px;">

      <div class="vote-box">
        <button class="vote-btn upvote-btn ${upClass}">
            <span class="material-icons">arrow_upward</span>
        </button>
        
        <span id="voteCount" class="vote-count">
           ${post.upvotes || 0} |  ${post.downvotes || 0}
        </span>
        
        <button class="vote-btn downvote-btn ${downClass}">
            <span class="material-icons">arrow_downward</span>
        </button>
      </div>

      <div style="display: flex; align-items: center; gap: 4px;">
          <button class="fav-btn" onclick="toggleFav(event, this)">🔖</button>
          
          <button class="comment-icon-btn" onclick="toggleComments(event, this)">
              <span class="material-icons">chat_bubble_outline</span>
          </button>

          <a href="${post.fileURL}" target="_blank" class="open-file-btn" onclick="event.stopPropagation()">
            <span class="material-icons" style="font-size: 18px;">description</span> Open
          </a>
      </div>

    </div>

    <div class="comment-section" onclick="event.stopPropagation()">
        <div class="comments-list">
            ${commentsHTML}
        </div>
        <div class="comment-input-wrapper">
            <input type="text" class="comment-input" placeholder="Write a comment...">
            <button class="comment-btn" onclick="submitComment(event, '${postId}', this)">Post</button>
        </div>
    </div>
  `;

  // ==========================================
  // 4. Hook up the Vote Buttons inside the Modal
  // ==========================================
  const upBtn = body.querySelector(".upvote-btn");
  const downBtn = body.querySelector(".downvote-btn");

  upBtn.addEventListener("click", async (e) => {
      await vote(e, postId, 1);
      openPost(postId); // Instantly reloads the modal to show the new color!
  });

  downBtn.addEventListener("click", async (e) => {
      await vote(e, postId, -1);
      openPost(postId); // Instantly reloads the modal to show the new color!
  });

  // 5. Show the modal
  modal.style.display = "flex";
}

// CLOSE MODAL
const modal = document.getElementById("postModal");

function closeModal() {
  modal.style.display = "none";
}

// click outside modal content to close
modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeModal();
  }
});

// expose only if you're using onclick="closeModal()"
window.closeModal = closeModal;


// VOTING (Reddit Style)
async function vote(event, postId, value){
  event.stopPropagation();

  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return alert("Login first");

  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return;

  const post = snap.data();

  let userVotes = post.userVotes || {};
  let currentVote = userVotes[user.uid] || 0;

  let updates = {
    userVotes: userVotes
  };

  // 🔥 REMOVE SAME VOTE
  if (currentVote === value) {

    delete userVotes[user.uid];

    if (value === 1) {
      updates.upvotes = increment(-1);
    } else {
      updates.downvotes = increment(-1);
    }

  } 
  // 🔥 SWITCH VOTE
  else {

    userVotes[user.uid] = value;

    if (value === 1) {
      updates.upvotes = increment(1);

      if (currentVote === -1) {
        updates.downvotes = increment(-1);
      }

    } else {
      updates.downvotes = increment(1);

      if (currentVote === 1) {
        updates.upvotes = increment(-1);
      }
    }
  }

  await updateDoc(ref, updates);
}


/* =========================
   NEW COMMENT FUNCTIONS
========================= */

// 1. Toggle visibility of the comment section
function toggleComments(event, btn) {
    event.stopPropagation(); 
    
    // Find the footer, then open the section right below it
    const footer = btn.closest('.note-footer');
    const commentSection = footer.nextElementSibling;
    
    if (commentSection && commentSection.classList.contains('comment-section')) {
        commentSection.style.display = commentSection.style.display === "block" ? "none" : "block";
    }
}

// 2. Save the comment to Firebase
async function submitComment(event, postId, btn) {
    event.stopPropagation();

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        alert("You must be logged in to comment!");
        return;
    }

    const input = btn.previousElementSibling;
    const text = input.value.trim();
    if (text === "") return;

    const newComment = {
        username: user.username || "Anonymous", // Uses their real username!
        text: text,
        timestamp: new Date().toISOString()
    };

    const postRef = doc(db, "posts", postId);
    try {
        await updateDoc(postRef, {
            comments: arrayUnion(newComment)
        });
        
        input.value = ""; 
        console.log("Comment posted!");

        // If inside modal, reload the modal to show the new comment!
        if (btn.closest('#modalBody')) {
            openPost(postId);
        }
        
    } catch (error) {
        console.error("Error posting comment:", error);
    }
}

// Expose functions globally
window.toggleComments = toggleComments;
window.submitComment = submitComment;


// TOGGLE FAVORITE (Visual Only)
function toggleFav(event,btn){
  event.stopPropagation();
  if(btn.classList.contains("saved")){
    btn.classList.remove("saved");
    btn.innerText="🔖";
  }else{
    btn.classList.add("saved");
    btn.innerText="📌";
  }
}
window.toggleFav = toggleFav;


/* =========================
   BELL NOTIFICATION & SEARCH
========================= */
function updateNotificationCount(count){
  let badge = document.getElementById("notificationCount");
  badge.innerText = count;
  if(count === 0){
    badge.style.display = "none";
  }else{
    badge.style.display = "block";
  }
}

let recentSearches = [
  { type:"user", name:"Christine Aligata", username:"@tintintin", avatar:"/photos/profile.jpg" },
  { type:"search", text:"Christine Aligata" },
  { type:"search", text:"Database" }
];

function loadRecentSearches(){
  const container = document.getElementById("recentList");
  container.innerHTML = "";

  recentSearches.forEach((item,index)=>{
    let div = document.createElement("div");
    div.className="recent-item";

    if(item.type === "user"){
      div.innerHTML = `
      <img src="${item.avatar}" class="recent-avatar">
      <div>
      <div class="recent-name">${item.name}</div>
      <div class="recent-sub">${item.username}</div>
      </div>
      <span class="remove" onclick="removeSearch(${index})">✕</span>
      `;
    } else {
      div.innerHTML = `
      <span class="search-icon">🔍</span>
      <span>${item.text}</span>
      <span class="remove" onclick="removeSearch(${index})">✕</span>
      `;
    }
    container.appendChild(div);
  });
}

function openSearch(){
  document.getElementById("searchPage").classList.add("active");
  loadRecentSearches();
  history.pushState({page:"search"}, "", "#search");
}

function closeSearch(){
  document.getElementById("searchPage").classList.remove("active");
}

function goBack(){
  window.history.back();
}

window.addEventListener("popstate", function(){
  let searchPage = document.getElementById("searchPage");
  if(searchPage.classList.contains("active")){
    searchPage.classList.remove("active");
  }
});


/* =========================
   CHAT BOT
========================= */
const chatBtn = document.getElementById("chatbot-btn");
const chatModal = document.getElementById("chatbot-modal");
const closeChat = document.getElementById("close-chat");
const sendBtn = document.getElementById("send-btn");
const inputChat = document.getElementById("chat-input");
const chatBody = document.getElementById("chat-body");

// Open chat
if (chatBtn) {
  chatBtn.addEventListener("click", () => {
      chatModal.style.display = "flex";
  });
}

// Close chat
if (closeChat) {
  closeChat.addEventListener("click", () => {
      chatModal.style.display = "none";
  });
}

/* =========================
   SCROLL HIDE/SHOW TOP BAR
========================= */
let lastScrollTop = 0;
const topArea = document.getElementById("topArea");

window.addEventListener("scroll", () => {
    let scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // Check exactly how tall the top bar is on the user's phone
    let topBarHeight = topArea.offsetHeight;
    
    // Only hide if scrolling down AND past the entire height of the top bar
    if (scrollTop > lastScrollTop && scrollTop > topBarHeight) {
        topArea.classList.add("hide-on-scroll");
    } 
    // If scrolling up, bring it back
    else if (scrollTop < lastScrollTop) {
        topArea.classList.remove("hide-on-scroll");
    }
    
    lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
});