const notifications = [
    {
        user: "Christine G. Aligata",
        action: "upvoted your post",
        time: "1h",
        unread: true,
        postTitle: "CC106 Application Development",
        postContent: "This lesson explains presentation tier, logic tier, and data tier."
    },
    {
        user: "Jennifer E. Cabutin",
        action: "commented on your post",
        quote: "This is very helpful. Thank you",
        time: "1h",
        unread: true,
        postTitle: "Application Development and Emerging Technologies",
        postContent: "Modern application development focuses on software design and security."
    },
    {
        user: "Janelle A. Caycob",
        action: "bookmarked your post",
        time: "21h",
        unread: false,
        postTitle: "Cloud Computing",
        postContent: "Cloud computing enables on-demand delivery of computing services."
    }
];

const container = document.getElementById("notificationsContainer");
const badge = document.getElementById("badgeCount");
const modal = document.getElementById("postModal");

function loadNotifications() {
    let unreadCount = 0;

    notifications.forEach((n, index) => {
        if (n.unread) unreadCount++;

        let div = document.createElement("div");
        div.className = "notification";

        if (n.unread) {
            let dot = document.createElement("div");
            dot.className = "unread-dot";
            div.appendChild(dot);
        }

        // The "See Post" button was removed to make it cleaner
        div.innerHTML += `
            <img class="avatar" src="/photos/profile.jpg" alt="Avatar">
            <div class="notif-text">
                <b>${n.user}</b> ${n.action}
                ${n.quote ? `<div class="quote">"${n.quote}"</div>` : ""}
                <div class="time">${n.time}</div>
            </div>
        `;

        // Tapping the card marks it as read AND opens the post
        div.onclick = () => {
            markRead(index, div);
            openPost(n);
        };

        container.appendChild(div);
    });

    badge.innerText = unreadCount;

    if (unreadCount === 0) {
        badge.style.display = "none";
    }
}

function markRead(index, element) {
    notifications[index].unread = false;

    let dot = element.querySelector(".unread-dot");
    if (dot) {
        dot.remove();
    }

    updateBadge();
}

function updateBadge() {
    let count = notifications.filter(n => n.unread).length;
    badge.innerText = count;

    if (count === 0) {
        badge.style.display = "none";
    }
}

function openPost(n) {
    document.getElementById("modalTitle").innerText = n.postTitle;
    document.getElementById("modalContent").innerText = n.postContent;
    
    // Note: We use flex here to center it perfectly based on the new CSS
    modal.style.display = "flex"; 
}

// Close Modal when clicking the X
document.querySelector(".close").onclick = () => {
    modal.style.display = "none";
};

// Close Modal when clicking the dark background outside the content
window.onclick = function(e) {
    if (e.target === modal) {
        modal.style.display = "none";
    }
};

function goBack() {
    window.history.back();
}

// Initialize the page
loadNotifications();