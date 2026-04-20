
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



function generateCategories(categoryList){

    const container = document.getElementById("categoriesContainer");

    categoryList.forEach(category => {

        const button = document.createElement("button");

        button.classList.add("category");
        button.textContent = category;

        if(category === "All"){
            button.classList.add("active");
        }

        button.addEventListener("click", () => {

            document.querySelectorAll(".category")
                .forEach(btn => btn.classList.remove("active"));

            button.classList.add("active");

            console.log("Selected category:", category);

            /*
                FUTURE FIREBASE NOTE FILTER

                Example:

                loadNotesByCategory(category);

            */

        });

        container.appendChild(button);

    });

}

// TEMPORARY note data for UI presentation

// SAMPLE DATA (later comes from Firebase)

const posts = [

{
id:1,
code:"CC106",
title:"Application Development and Emerging Technologies",
desc:"This subject examines modern software development practices.",
author:"Jennifer Cabutin",
votes:273,
content:"Application Development and Emerging Technologies explores APIs, mobile development, cloud services, and modern frameworks."

},

{
id:2,
code:"IT201",
title:"Database Management Systems",
desc:"Learn relational databases, SQL, and data modeling.",
author:"Mark Rivera",
votes:142,
content:"Topics include normalization, indexing, transactions, and database design."
},

{
id:3,
code:"IT201",
title:"Database Management Systems",
desc:"Learn relational databases, SQL, and data modeling.",
author:"Mark Rivera",
votes:142,
content:"Topics include normalization, indexing, transactions, and database design."
},

{
id:4,
code:"IT201",
title:"Database Management Systems",
desc:"Learn relational databases, SQL, and data modeling.",
author:"Mark Rivera",
votes:142,
content:"Topics include normalization, indexing, transactions, and database design."
},

{
id:5,
code:"IT201",
title:"Database Management Systems",
desc:"Learn relational databases, SQL, and data modeling.",
author:"Mark Rivera",
votes:142,
content:"Topics include normalization, indexing, transactions, and database design."
}
];


// LOAD POSTS INTO FEED

function loadPosts(){

let container = document.getElementById("notesFeed");

posts.forEach(post => {

let card = document.createElement("div");

card.className = "note-card";

card.innerHTML = `

<div class="note-preview" onclick="openPost(${post.id})">

<div class="note-preview-text">
${post.content}
</div>

<p class="note-code">${post.code}</p>

<h3 class="note-title">${post.title}</h3>

<div class="note-author">
<img src="/photos/profile.jpg" class="author-pic">
<span>${post.author}</span>
</div>

<div class="note-footer">

<div class="vote-box">
<button class="vote-btn" onclick="vote(event,this,1)">▲</button>
<span class="vote-count">${post.votes}</span>
<button class="vote-btn" onclick="vote(event,this,-1)">▼</button>
</div>

<button class="fav-btn" onclick="toggleFav(event,this)">🔖</button>

</div>

</div>

`;

container.appendChild(card);

});

}


// OPEN MODAL POST

function openPost(id){

let post = posts.find(p => p.id === id);

let modal = document.getElementById("postModal");

let body = document.getElementById("modalBody");

body.innerHTML = `

<h3>${post.title}</h3>

<p style="font-size:12px;">${post.code}</p>

<div class="modal-text">${post.content}</div>

<div class="note-actions">

<div class="vote-box">
<button class="vote-btn" onclick="vote(event,this,1)">▲</button>
<span class="vote-count">${post.votes}</span>
<button class="vote-btn" onclick="vote(event,this,-1)">▼</button>
</div>

<button class="fav-btn" onclick="toggleFav(event,this)">🔖</button>

<button onclick="toggleComments(event,this)">💬 Comment</button>

</div>

<div class="comment-section" style="display:none">

<input type="text" class="comment-input" placeholder="Write a comment">

<button class="comment-btn" onclick="addComment(this)">Post</button>

<div class="comments"></div>

</div>

`;

modal.style.display = "flex";

}


// CLOSE MODAL

function closeModal(){

document.getElementById("postModal").style.display = "none";

}

window.onclick = function(event){
    const modal = document.getElementById("postModal");

    if(event.target === modal){
        modal.style.display = "none";
    }
}

// VOTING (Reddit Style)

function vote(event,btn,value){

event.stopPropagation();

let count = btn.parentElement.querySelector(".vote-count");

count.innerText = parseInt(count.innerText) + value;

}


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

loadPosts();

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








