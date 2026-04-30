import { db } from "/firebase/firebase-client.js";
import { collection, getDocs, doc, getDoc } 
from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";


// 🔥 LOAD PROFILE STATS + STATE
async function loadProfileStats(user) {
    try {

        // 📊 POSTS
        const postsSnap = await getDocs(collection(db, "posts"));
        const posts = postsSnap.size;

        const postEl = document.getElementById("postCount");
        if (postEl) postEl.textContent = posts;

        // 💰 POINTS (Firestore version)
        let points = 0;

        if (user?.uid) {
            const userRef = doc(db, "user", user.uid); // ✅ FIXED (was "user")
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                points = userSnap.data().points || 0;
            }
        }

        const pointsEl = document.getElementById("pointsCount");
        if (pointsEl) pointsEl.textContent = points.toLocaleString();

        // 👍 VOTES COUNT (safe + optimized)
        let votesCount = 0;

        postsSnap.forEach((postDoc) => {
            const data = postDoc.data();

            if (data.userVotes && typeof data.userVotes === "object") {
                votesCount += Object.keys(data.userVotes).length;
            }
        });

        const votesEl = document.getElementById("votesCount");
        if (votesEl) votesEl.textContent = votesCount;

        // 👤 USER STATE (ONLY ONCE)
        if (user?.uid) {
            const userRef = doc(db, "user", user.uid); // ✅ FIXED
            const userSnap = await getDoc(userRef);

            const state = userSnap.exists()
                ? (userSnap.data().state || "active").toLowerCase()
                : "active";

            applyProfileState(state);
        }

    } catch (err) {
        console.error("Profile stats error:", err);
    }
}


// 🔥 REUSABLE STATE CHECKER
export async function checkUserState(user) {

    if (!user?.uid) return "suspended";

    const userRef = doc(db, "user", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        return "suspended";
    }

    const state = userSnap.data().state;

    // 🚨 NEVER default to active
    if (!state) return "suspended";

    return state.toLowerCase();
}


// 🚫 SUSPENDED STATE HANDLER
export function applyProfileState(state) {

    const statusEl = document.getElementById("accountStatus");

    if (statusEl) {
        if (state === "suspended") {
            statusEl.textContent = "SUSPENDED";
            statusEl.style.background = "#facc15";
            statusEl.style.color = "#000";
            statusEl.style.padding = "2px 8px";
            statusEl.style.borderRadius = "6px";
            statusEl.style.display = "inline-block";
        } else {
            statusEl.textContent = "";
        }
    }

    if (state !== "suspended") return;

    const uploadBtn = document.querySelector(".upload-btn");

if (uploadBtn) {
    if (state === "suspended") {
        uploadBtn.disabled = true;
        uploadBtn.style.opacity = "0.5";
        uploadBtn.style.cursor = "not-allowed";
    } else {
        uploadBtn.disabled = false;
        uploadBtn.style.opacity = "1";
        uploadBtn.style.cursor = "pointer";
    }
}
document.querySelectorAll(".comment-btn").forEach(btn => {
    if (state === "suspended") {
        btn.disabled = true;
        btn.style.opacity = "0.5";
        btn.style.cursor = "not-allowed";
    } else {
        btn.disabled = false;
        btn.style.opacity = "1";
        btn.style.cursor = "pointer";
    }
});

    // 🚫 prevent duplicate modal
    if (document.getElementById("suspend-modal")) return;

    const modal = document.createElement("div");
modal.id = "suspend-modal";

modal.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 9998;

    display: flex;
    align-items: center;
    justify-content: center;

    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
`;

modal.innerHTML = `
    <div style="
        width: 320px;
        padding: 22px;

        background: #ffffff;
        border-radius: 16px;

        text-align: center;
        font-family: sans-serif;

        box-shadow: 0 20px 60px rgba(0,0,0,0.2);
    ">

        <div style="font-size: 40px; margin-bottom: 10px;">🚫</div>

        <h2 style="margin:0; font-size:18px; color:#991b1b;">
            Account Suspended
        </h2>

        <p style="margin:10px 0 16px; font-size:14px; color:#555;">
            Your account has been restricted from using this platform.
        </p>

        <a href="https://mail.google.com/mail/?view=cm&to=notexchange.app@gmail.com"
           target="_blank"
           style="
                display:inline-block;
                padding:10px 14px;
                background:#991b1b;
                color:#fff;
                text-decoration:none;
                border-radius:10px;
                font-size:14px;
                font-weight:600;
           ">
            Contact Support
        </a>

    </div>
`;

    document.body.appendChild(modal);
}


// 🚀 INIT
window.addEventListener("DOMContentLoaded", () => {

    const user = JSON.parse(localStorage.getItem("user"));

    loadProfileStats(user);
});