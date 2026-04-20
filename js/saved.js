// SAMPLE DATA
const savedPosts = [
{
title:"Application Development",
subject:"CC106",
author:"Jennifer Cabutin",
content:"Application Development explores APIs, mobile development, cloud services..."
},
{
title:"Database Management Systems",
subject:"IT201",
author:"Mark Rivera",
content:"Topics include normalization, indexing, transactions, and database design..."
}
];


// LOAD SAVED POSTS
function loadSaved(){

const container = document.getElementById("savedContainer");
container.innerHTML = "";

// EMPTY STATE
if(savedPosts.length === 0){
container.innerHTML = `
<div class="empty">
📁 No saved notes yet
<p>Save posts to see them here</p>
</div>
`;
return;
}

// RENDER CARDS
savedPosts.forEach((post, index) => {

let card = document.createElement("div");
card.className = "saved-card";

card.innerHTML = `
<div class="saved-top">${post.subject}</div>
<div class="saved-title">${post.title}</div>
<div class="saved-author">${post.author}</div>
`;

card.onclick = () => openSavedModal(index);

container.appendChild(card);

});

}


// OPEN MODAL
function openSavedModal(index){

const post = savedPosts[index];

const modal = document.getElementById("postModal");
const body = document.getElementById("modalBody");

body.innerHTML = `

<div class="modal-note">

<div class="modal-image"></div>

<p class="note-code">${post.subject}</p>

<h2 class="note-title">${post.title}</h2>

<div class="note-author">
<img src="/photos/profile.jpg" class="author-pic">
<span>${post.author}</span>
</div>

<p class="note-full">
${post.content}
</p>

<div class="note-actions">

<div class="vote-box">
<button class="vote-btn">▲</button>
<span class="vote-count">0</span>
<button class="vote-btn">▼</button>
</div>

<button class="comment-btn">💬 Comment</button>

</div>

</div>

`;

modal.style.display = "flex";

}


// CLOSE MODAL
function closeModal(){
document.getElementById("postModal").style.display = "none";
}


// VIEW TOGGLE (GRID / LIST)
function setView(type){

const container = document.getElementById("savedContainer");

if(type === "list"){
container.style.display = "block";
} else {
container.style.display = "grid";
}

}


// INIT
document.addEventListener("DOMContentLoaded", function(){
loadSaved();
});