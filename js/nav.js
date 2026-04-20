document.addEventListener("DOMContentLoaded", function(){

const navItems = document.querySelectorAll(".nav-item");

let currentPath = window.location.pathname;

navItems.forEach(link => {

    if(link.classList.contains("add-btn")) return;

    let linkPage = link.getAttribute("href");

    if(currentPath.includes(linkPage)){
        link.classList.add("active");
    } else {
        link.classList.remove("active");
    }

});

});

// fade in
document.addEventListener("DOMContentLoaded", function(){
document.body.classList.add("loaded");
});

document.querySelectorAll("a").forEach(link => {

link.addEventListener("click", function(e){

// ignore external links or anchors
if(link.getAttribute("href").startsWith("#")) return;

e.preventDefault();

let target = link.href;

document.body.classList.remove("loaded");

setTimeout(() => {
window.location.href = target;
}, 200);

});

});