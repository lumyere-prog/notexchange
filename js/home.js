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
  orderBy
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

    snapshot.forEach(docSnap => {
      const post = docSnap.data();

      const card = document.createElement("div");
      card.className = "note-card";

      // 🔥 OPEN POST (safe for modules)
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
              <button class="upvote-btn">▲</button>
              <span id="voteCount">
                 ${post.upvotes || 0} |  ${post.downvotes || 0}
              </span>
              <button class="downvote-btn">▼</button>
            </div>

            <a href="${post.fileURL}" target="_blank" onclick="event.stopPropagation()">
              📄 ${post.fileName || "Open File"}
            </a>

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

  body.innerHTML = `
    <h3>${post.title}</h3>

    <p style="font-size:12px;">${post.subject || ""}</p>

    <div class="modal-text">${post.description}</div>

    <a href="${post.fileURL}" target="_blank">📄 Open File</a>

    <div class="note-actions">

      <div class="vote-box">
        <button class="upvote-btn">▲</button>
        <span id="voteCount">
  👍 ${post.upvotes || 0} | 👎 ${post.downvotes || 0}
        </span>
        <button class="downvote-btn">▼</button>
      </div>

    </div>
  `;

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
  console.log("🔥 Vote updated");



// TOGGLE COMMENTS

function toggleComments(event,btn){

event.stopPropagation();

let section = btn.parentElement.parentElement.querySelector(".comment-section");

section.style.display = section.style.display === "none" ? "block" : "none";

}


// ADD COMMENT

function addComment(button){

let section = button.parentElement;

let input = section.querySelector(".comment-input");

let text = input.value.trim();

if(text === "") return;

let comments = section.querySelector(".comments");

let comment = document.createElement("div");

comment.className = "comment";

comment.innerText = text;

comments.appendChild(comment);

input.value = "";

}

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

// INIT PAGE


//bell notification

function updateNotificationCount(count){

let badge = document.getElementById("notificationCount");

badge.innerText = count;

if(count === 0){
badge.style.display = "none";
}else{
badge.style.display = "block";
}

}

// search bar

let recentSearches = [
{
type:"user",
name:"Christine Aligata",
username:"@tintintin",
avatar:"/photos/profile.jpg"
},
{
type:"search",
text:"Christine Aligata"
},
{
type:"search",
text:"Database"
}
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

}

else{

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

// chat bot

const chatBtn = document.getElementById("chatbot-btn");
const chatModal = document.getElementById("chatbot-modal");
const closeChat = document.getElementById("close-chat");

const sendBtn = document.getElementById("send-btn");
const input = document.getElementById("chat-input");
const chatBody = document.getElementById("chat-body");

// Open chat
chatBtn.addEventListener("click", () => {
    chatModal.style.display = "flex";
});

// Close chat
closeChat.addEventListener("click", () => {
    chatModal.style.display = "none";
});








