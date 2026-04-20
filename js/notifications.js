const notifications = [

{
user:"Christine G. Aligata",
action:"upvoted your post",
time:"1h",
unread:true,
postTitle:"CC106 Application Development",
postContent:"This lesson explains presentation tier, logic tier, and data tier."
},

{
user:"Jennifer E. Cabutin",
action:"commented on your post",
quote:"This is very helpful. Thank you",
time:"1h",
unread:true,
postTitle:"Application Development and Emerging Technologies",
postContent:"Modern application development focuses on software design and security."
},

{
user:"Janelle A. Caycob",
action:"bookmarked your post",
time:"21h",
unread:false,
postTitle:"Cloud Computing",
postContent:"Cloud computing enables on-demand delivery of computing services."
}

];



const container = document.getElementById("notificationsContainer");
const badge = document.getElementById("badgeCount");



function loadNotifications(){

let unreadCount = 0;

notifications.forEach((n,index)=>{

if(n.unread) unreadCount++;

let div = document.createElement("div");
div.className="notification";

if(n.unread){

let dot = document.createElement("div");
dot.className="unread-dot";
div.appendChild(dot);

}

div.innerHTML += `

<img class="avatar">

<div class="notif-text">

<b>${n.user}</b> ${n.action}

${n.quote ? `<div class="quote">"${n.quote}"</div>`:""}

<div class="time">${n.time}</div>

</div>

<button class="see-btn">See Post</button>

`;



div.querySelector(".see-btn").onclick = (e)=>{
e.stopPropagation();
openPost(n,index);
};



div.onclick = ()=>{

markRead(index,div);

};



container.appendChild(div);

});

badge.innerText = unreadCount;

if(unreadCount === 0){
badge.style.display="none";
}

}



function markRead(index,element){

notifications[index].unread=false;

let dot = element.querySelector(".unread-dot");

if(dot){
dot.remove();
}

updateBadge();

}



function updateBadge(){

let count = notifications.filter(n=>n.unread).length;

badge.innerText = count;

if(count===0){
badge.style.display="none";
}

}



function openPost(n){

document.getElementById("modalTitle").innerText = n.postTitle;
document.getElementById("modalContent").innerText = n.postContent;

document.getElementById("postModal").style.display="block";

}



document.querySelector(".close").onclick = ()=>{

document.getElementById("postModal").style.display="none";

};



window.onclick = function(e){

if(e.target.classList.contains("modal")){
document.getElementById("postModal").style.display="none";
}

};



loadNotifications();

function goBack(){
window.history.back();
}