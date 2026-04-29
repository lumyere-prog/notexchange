import { db } from "/firebase/firebase-client.js";
import { sendNotification } from "./notificationManager.js"; // adjust path

import { addPoints } from "/js/points.js";
import {
  collection,
  getDocs,
  query,
  limit,
  where,
  onSnapshot,
  addDoc,
  deleteDoc, 
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
// ================== ELEMENTS ==================
const overlay = document.getElementById("overlay");

const actionModal = document.getElementById("action-modal");
const modalTitle = document.getElementById("modal-title");
const modalText = document.getElementById("modal-text");
const suspendReason = document.getElementById("suspend-reason");
const modalHeaderIcon = document.getElementById("modal-header-icon");

const confirmBtn = document.getElementById("confirm-btn")
const cancelBtn = document.getElementById("cancel-btn");
document.getElementById("refresh-notes-btn").addEventListener("click", refreshNotesTable);

const viewModal = document.getElementById("view-modal");
const closeView = document.getElementById("close-view");
const pdfViewer = document.getElementById("pdf-viewer");

// user modal
const userModal = document.getElementById("user-modal");
const closeUser = document.getElementById("close-user");
const userHistory = document.getElementById("user-history");

const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll(".section");

const userFilters = document.querySelectorAll("#users-section .filters button");
const noteFilters = document.querySelectorAll("#notes-section .filters button");

let currentAction = "";
let currentRow = null;





















console.log("ADMIN FIRESTORE TEST START");

const test = await getDocs(collection(db, "pendingPosts"));

console.log("pendingPosts size:", test.size);
// ================== SECTION SWITCHING ==================
navLinks.forEach(link => {
    link.addEventListener("click", () => {
        navLinks.forEach(l => l.classList.remove("active"));
        sections.forEach(s => s.classList.remove("active"));

        link.classList.add("active");

        const target = link.dataset.target;
        document.getElementById(target).classList.add("active");
    });
});




















// ================== EVENT DELEGATION ==================
document.addEventListener("click", async function (e) {

    // ================= NOTES =================

// =============================
// GLOBAL STATE (you already have these probably)
// =============================
let currentAction = null;
let currentRow = null;

// =============================
// CLICK HANDLER (APPROVE / REJECT BUTTONS)
// =============================
document.addEventListener("click", (e) => {

    // =============================
    // APPROVE BUTTON CLICK
    // =============================
    if (e.target.closest(".approve") && !e.target.closest(".view-actions")) {
        e.stopPropagation();

        currentAction = "approve";
        currentRow = e.target.closest("tr");

        // UI MODAL SETUP
        modalTitle.textContent = "Approve Document?";
        modalText.textContent = "This note will be visible to all users.";
        suspendReason.style.display = "none";

        modalHeaderIcon.innerHTML = `<span class="material-icons">check_circle</span>`;
        modalHeaderIcon.style.background = "#D1FAE5";
        modalHeaderIcon.style.color = "#10B981";

        openActionModal();
    }

    // =============================
    // REJECT BUTTON CLICK
    // =============================
    if (e.target.closest(".reject") && !e.target.closest(".view-actions")) {
        e.stopPropagation();

        currentAction = "reject";
        currentRow = e.target.closest("tr");

        // UI MODAL SETUP
        modalTitle.textContent = "Reject Document?";
        modalText.textContent = "This will move the post to rejected archive.";
        suspendReason.style.display = "none";

        modalHeaderIcon.innerHTML = `<span class="material-icons">cancel</span>`;
        modalHeaderIcon.style.background = "#FEE2E2";
        modalHeaderIcon.style.color = "#DC2626";

        openActionModal();
    }
});

















    // VIEW NOTE
// =============================
// PREVIEW DOCUMENT (FIXED)
// =============================
const noteRow = e.target.closest("#notes-section tbody tr");

if (noteRow && !e.target.closest(".action-cells")) {

    const fileURL = noteRow.dataset.fileurl;

    if (!fileURL) {
        console.error("No fileURL found for this post");
        return;
    }

    pdfViewer.src = fileURL; // 🔥 REAL FIREBASE FILE

    viewModal.style.display = "flex";
    overlay.style.display = "block";
}


















    // ================= USERS =================

   // ================= USERS =================

// VIEW USER HISTORY
if (e.target.classList.contains("view-user")) {
    const row = e.target.closest("tr");
    currentRow = row;

    const name = row.children[0].textContent;
    const email = row.children[1].textContent;
    const status = row.getAttribute("data-status");
    const userId = row.getAttribute("data-userid"); // REQUIRED

    // PROFILE
    document.getElementById("user-name").textContent = name;
    document.getElementById("user-meta").textContent =
        email + " • " + status.charAt(0).toUpperCase() + status.slice(1);

    document.getElementById("user-points").textContent = Math.floor(Math.random() * 300);

    // Avatar initials
    let initials = name.split(" ").map(n => n[0]).join("").substring(0, 2);
    document.querySelector(".user-avatar-large").textContent = initials;

    document.getElementById("profile-reason").value = "";

    // HISTORY (REAL DATA)
    userHistory.innerHTML = `<div class="loading-history">Loading posts...</div>`;

try {
    const postsRef = collection(db, "posts");
    const pendingRef = collection(db, "pendingPosts");
    const rejectedRef = collection(db, "rejectedPosts"); // 🔥 ADD THIS

    const approvedQuery = query(postsRef, where("userId", "==", userId));
    const pendingQuery = query(pendingRef, where("userId", "==", userId));
    const rejectedQuery = query(rejectedRef, where("userId", "==", userId)); // 🔥 ADD THIS

    const [approvedSnap, pendingSnap, rejectedSnap] = await Promise.all([
        getDocs(approvedQuery),
        getDocs(pendingQuery),
        getDocs(rejectedQuery)
    ]);

    let html = "";

    // =============================
    // APPROVED POSTS
    // =============================
    approvedSnap.forEach(docSnap => {
        const post = docSnap.data();

        html += `
        <div class="post-card">
            <div class="post-top">
                <h4>${post.title}</h4>
                <span class="status approved">Approved</span>
            </div>

            <div class="post-preview">${post.description}</div>

            <div class="post-details">
                <p><strong>Category:</strong> ${post.subject}</p>
                <p><strong>Date:</strong> ${
                    post.timestamp?.seconds
                        ? new Date(post.timestamp.seconds * 1000).toLocaleDateString()
                        : "N/A"
                }</p>
                <button class="view-note-btn">Preview Document</button>
            </div>
        </div>
        `;
    });

    // =============================
    // PENDING POSTS
    // =============================
    pendingSnap.forEach(docSnap => {
        const post = docSnap.data();

        html += `
        <div class="post-card">
            <div class="post-top">
                <h4>${post.title}</h4>
                <span class="status pending">Pending</span>
            </div>

            <div class="post-preview">${post.description}</div>

            <div class="post-details">
                <p><strong>Category:</strong> ${post.subject}</p>
                <p><strong>Date:</strong> ${
                    post.timestamp?.seconds
                        ? new Date(post.timestamp.seconds * 1000).toLocaleDateString()
                        : "N/A"
                }</p>
                <button class="view-note-btn">Preview Document</button>
            </div>
        </div>
        `;
    });

    // =============================
    // REJECTED POSTS 🔥 NEW
    // =============================
    rejectedSnap.forEach(docSnap => {
        const post = docSnap.data();

        html += `
        <div class="post-card">
            <div class="post-top">
                <h4>${post.title}</h4>
                <span class="status rejected">Rejected</span>
            </div>

            <div class="post-preview">${post.description}</div>

            <div class="post-details">
                <p><strong>Category:</strong> ${post.subject}</p>
                <p><strong>Date:</strong> ${
                    post.timestamp?.seconds
                        ? new Date(post.timestamp.seconds * 1000).toLocaleDateString()
                        : "N/A"
                }</p>
                <button class="view-note-btn">Preview Document</button>
            </div>
        </div>
        `;
    });

    userHistory.innerHTML = html || `<p>No posts yet.</p>`;

} catch (err) {
    console.error("Error loading user history:", err);
    userHistory.innerHTML = `<p>Error loading posts.</p>`;
}

userModal.classList.add("active");
overlay.style.display = "block";
}


// EXPAND POST CARD
const card = e.target.closest(".post-card");
if (card && !e.target.classList.contains("view-note-btn")) {
    card.classList.toggle("active");
}

    // SUSPEND USER
    if (e.target.classList.contains("suspend-user")) {
        e.stopPropagation();
        currentAction = "suspend";
        currentRow = e.target.closest("tr");

        modalTitle.textContent = "Suspend User?";
        modalText.textContent = "They will lose access to upload and comment.";
        suspendReason.style.display = "block";

        modalHeaderIcon.innerHTML = `<span class="material-icons">gavel</span>`;
        modalHeaderIcon.style.background = "#FEE2E2";
        modalHeaderIcon.style.color = "#DC2626";

        openActionModal();
    }

    // ACTIVATE USER
    if (e.target.classList.contains("activate-user")) {
        const row = e.target.closest("tr");
        const status = row.querySelector(".status");
        
        status.textContent = "Active";
        status.className = "status active";

        e.target.textContent = "Suspend";
        e.target.className = "btn-pill suspend-user action-danger";

        row.setAttribute("data-status", "active");
    }
});







function refreshNotesTable() {

    console.log("🔄 Refreshing notes table...");

    // stop old listener (VERY IMPORTANT)
    if (unsubscribePending) {
        unsubscribePending();
        unsubscribePending = null;
    }

    const tbody = document.getElementById("pendingTableBody");
    if (tbody) tbody.innerHTML = "";

    // restart clean listener
    loadPendingTable();
}







document.getElementById("pendingTableBody").addEventListener("click", async (e) => {

    const row = e.target.closest("tr");
    if (!row) return;

    const postId = row.dataset.id;
    const status = row.dataset.status;

    if (!postId) return;

    // =============================
    // APPROVE
    // =============================
    if (e.target.closest(".approve")) {
        currentRow = row;
        currentAction = "approve";
        openActionModal();
    }

    // =============================
    // REJECT
    // =============================
    if (e.target.closest(".reject")) {
        currentRow = row;
        currentAction = "reject";
        openActionModal();
    }

    // =============================
    // RETURN (REJECTED → PENDING)
    // =============================
    if (e.target.closest(".return") && status === "rejected") {

        try {
            const postRef = doc(db, "rejectedPosts", postId);
            const snap = await getDoc(postRef);
            if (!snap.exists()) return;

            const data = snap.data();

            await addDoc(collection(db, "pendingPosts"), {
                ...data,
                returnedAt: serverTimestamp()
            });

            await deleteDoc(postRef);

            console.log("🔁 Returned from rejected → pending");

        } catch (err) {
            console.error("Return failed:", err);
        }
    }

    // =============================
    // RETURN (ARCHIVED → PENDING) 🔥 NEW
    // =============================
    if (e.target.closest(".return") && status === "archived") {

        try {
            const postRef = doc(db, "archivedPosts", postId);
            const snap = await getDoc(postRef);
            if (!snap.exists()) return;

            const data = snap.data();

            await addDoc(collection(db, "pendingPosts"), {
                ...data,
                restoredFromArchive: true,
                returnedAt: serverTimestamp()
            });

            await deleteDoc(postRef);

            console.log("🔁 Returned from archive → pending");

        } catch (err) {
            console.error("Archive return failed:", err);
        }
    }

    // =============================
    // ARCHIVE (approved + rejected)
    // =============================
    if (e.target.closest(".archive")) {

        const collectionMap = {
            approved: "posts",
            rejected: "rejectedPosts"
        };

        const col = collectionMap[status];

        if (!col) return;

        try {
            const postRef = doc(db, col, postId);
            const snap = await getDoc(postRef);
            if (!snap.exists()) return;

            const data = snap.data();

            await addDoc(collection(db, "archivedPosts"), {
                ...data,
                archivedAt: serverTimestamp(),
                from: status
            });

            await deleteDoc(postRef);

            console.log("📦 Archived post");

        } catch (err) {
            console.error("Archive failed:", err);
        }
    }

    // =============================
    // EDIT (approved only)
    // =============================
    if (e.target.closest(".edit")) {

        try {
            const postRef = doc(db, "posts", postId);
            const snap = await getDoc(postRef);

            if (!snap.exists()) return;

            const data = snap.data();

            openEditModal(data, postId);

        } catch (err) {
            console.error("Edit failed:", err);
        }
    }
});











let unsubscribePending = null;
let activeNoteFilter = "all"; // 🔥 REQUIRED FOR FILTER STABILITY

function loadPendingTable() {

    const tbody = document.getElementById("pendingTableBody");
    if (!tbody) return;

    const approvedRef = collection(db, "posts");
    const pendingRef = collection(db, "pendingPosts");
    const rejectedRef = collection(db, "rejectedPosts");
    const archivedRef = collection(db, "archivedPosts");

    // =============================
    // STOP OLD LISTENER (PREVENT DUPLICATES)
    // =============================
    if (unsubscribePending) {
        unsubscribePending();
    }

    // =============================
    // SINGLE REALTIME TRIGGER (PENDING ONLY)
    // =============================
    unsubscribePending = onSnapshot(pendingRef, async (pendingSnap) => {

        // one-time fetch for other states
        const [approvedSnap, rejectedSnap, archivedSnap] = await Promise.all([
            getDocs(approvedRef),
            getDocs(rejectedRef),
            getDocs(archivedRef)
        ]);

        tbody.innerHTML = "";

        function addRow(docSnap, status) {

            const post = docSnap.data();
            const tr = document.createElement("tr");

            tr.dataset.id = docSnap.id;
            tr.dataset.status = status;
            tr.dataset.fileurl = post.fileURL || "";

            tr.innerHTML = `
                <td><b>${post.title}</b></td>

                <td><span class="category-pill">${post.subject}</span></td>

                <td>${post.username || "Unknown"}</td>

                <td><span class="status ${status}">${status}</span></td>

                <td class="action-cells">

                    ${status === "pending" ? `
                        <button class="btn-icon approve">
                            <span class="material-icons">check</span>
                        </button>

                        <button class="btn-icon reject">
                            <span class="material-icons">close</span>
                        </button>
                    ` : ""}

                    ${status === "approved" ? `
                        <button class="btn-icon edit">
                            <span class="material-icons">edit</span>
                        </button>

                        <button class="btn-icon archive">
                            <span class="material-icons">archive</span>
                        </button>
                    ` : ""}

                    ${status === "rejected" ? `
                        <button class="btn-icon return">
                            <span class="material-icons">restart_alt</span>
                        </button>

                        <button class="btn-icon archive">
                            <span class="material-icons">archive</span>
                        </button>
                    ` : ""}

                    ${status === "archived" ? `
                        <button class="btn-icon return">
                            <span class="material-icons">undo</span>
                        </button>
                    ` : ""}

                </td>
            `;

            tbody.appendChild(tr);
        }

        // =============================
        // RENDER ALL DATA
        // =============================
        pendingSnap.forEach(d => addRow(d, "pending"));
        approvedSnap.forEach(d => addRow(d, "approved"));
        rejectedSnap.forEach(d => addRow(d, "rejected"));
        archivedSnap.forEach(d => addRow(d, "archived"));

        // =============================
        // IMPORTANT: REAPPLY FILTER AFTER RENDER
        // =============================
        applyNoteFilter();

    });
}













function loadRecentActivity() {
  const list = document.getElementById("activityList");

  if (!list) return;

  const q = query(
    collection(db, "pendingPosts"),
    orderBy("timestamp", "desc"),
    limit(5)
  );

  onSnapshot(q, (snapshot) => {
    list.innerHTML = "";

    snapshot.forEach(docSnap => {
      const post = docSnap.data();

      const li = document.createElement("li");

      li.innerHTML = `
        <span class="material-icons activity-icon upload">upload_file</span>
        <b>${post.username || "Unknown"}</b>
        uploaded "${post.title}"
      `;

      list.appendChild(li);
    });
  });
}











async function confirmAction() {

    const postId = currentRow?.dataset?.id;
    const status = currentRow?.dataset?.status;

    if (!postId) {
        console.error("Missing postId");
        return null;
    }

    // =============================
    // PICK SOURCE COLLECTION
    // =============================
    let sourceCollection = "pendingPosts";

    if (status === "approved") sourceCollection = "posts";
    if (status === "rejected") sourceCollection = "rejectedPosts";

    const ref = doc(db, sourceCollection, postId);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
        console.error("Not found");
        return null;
    }

    const data = snap.data();

    // =============================
    // APPROVE
    // =============================
    if (currentAction === "approve") {

        await addDoc(collection(db, "posts"), {
            ...data,
            approvedAt: serverTimestamp()
        });

        await deleteDoc(ref);

        console.log("✅ Approved");
    }

    // =============================
    // REJECT
    // =============================
    if (currentAction === "reject") {

        await addDoc(collection(db, "rejectedPosts"), {
            ...data,
            rejectedAt: serverTimestamp()
        });

        await deleteDoc(ref);

        console.log("❌ Rejected");
    }

    // =============================
    // RETURN DATA FOR NOTIFICATIONS
    // =============================
    return {
        id: postId,
        ...data
    };
}










const currentUser = {
    uid: "admin",
    name: "Admin",
    photo: "/photos/guest.png"
};

// ================== MODAL FUNCTIONS ==================
function openActionModal(){
    actionModal.style.display = "block";
    overlay.style.display = "block";
}

// ================== CONFIRM ACTION BUTTON ==================
confirmBtn.addEventListener("click", async () => {

    if (!currentRow || !currentAction) return;

    const statusCell = currentRow.querySelector(".status");

    try {

        // =============================
        // RUN FIRESTORE ACTION FIRST
        // =============================
        const postData = await confirmAction(); 
        // 👆 IMPORTANT: make confirmAction RETURN postData (we fix below)

        // =============================
        // UI UPDATE
        // =============================
        if (currentAction === "approve") {
            statusCell.textContent = "Approved";
            statusCell.className = "status approved";
        }

        if (currentAction === "reject") {
            statusCell.textContent = "Rejected";
            statusCell.className = "status rejected";
        }

        // =============================
        // SEND NOTIFICATION TO USER
        // =============================
        if (postData) {
await sendNotification({
    post: {
        id: currentRow.dataset.id,
        userId: postData.userId,
        title: postData.title
    },

    currentUser: {
        uid: "admin",
        name: "Admin",
        photo: "/photos/admin.png"
    },

    type: currentAction
});
        }

        // =============================
        // SUSPEND (FUTURE USER SYSTEM)
        // =============================
        else if (currentAction === "suspend") {

            const reason = suspendReason.value;

            if (!reason.trim()) {
                alert("Please enter a reason.");
                return;
            }

            // UI only (future feature)
            statusCell.textContent = "Suspended";
            statusCell.className = "status suspended";

            const btn = currentRow.querySelector(".suspend-user, .activate-user");
            if (btn) {
                btn.textContent = "Activate";
                btn.className = "btn-pill activate-user action-success";
            }

            currentRow.setAttribute("data-status", "suspended");

            console.log("Suspend reason:", reason);
        }

        // =============================
        // CLOSE MODAL AFTER SUCCESS
        // =============================
        closeAll();

    } catch (err) {
        console.error("❌ Action failed:", err);
    }
});

document.getElementById("suspend-from-profile").addEventListener("click", () => {
    if (!currentRow) return alert("No user selected");

    const reason = document.getElementById("profile-reason").value;
    if (!reason.trim()) return alert("Please enter a reason");

    const statusCell = currentRow.querySelector(".status");

    statusCell.textContent = "Suspended";
    statusCell.className = "status suspended";

    const btn = currentRow.querySelector(".suspend-user, .activate-user");
    if(btn) {
        btn.textContent = "Activate";
        btn.className = "btn-pill activate-user action-success";
    }

    currentRow.setAttribute("data-status", "suspended");
    console.log("Suspend reason:", reason);

    closeAll();
});

// CLOSE MODALS
cancelBtn.addEventListener("click", closeAll);
overlay.addEventListener("click", closeAll);
closeView.addEventListener("click", closeAll);
closeUser.addEventListener("click", closeAll);

function closeAll(){
    actionModal.style.display = "none";
    viewModal.style.display = "none";
    userModal.classList.remove("active");
    overlay.style.display = "none";

    suspendReason.value = "";
    suspendReason.style.display = "none";
}

function applyNoteFilter() {

    document.querySelectorAll("#notes-section tbody tr").forEach(row => {

        const status = (row.dataset.status || "").toLowerCase();

        const isMatch =
            activeNoteFilter === "all" ||
            status === activeNoteFilter;

        row.style.display = isMatch ? "" : "none";
    });
}












// ================== FILTERING ==================
// =============================
// USER FILTERS (USERS TABLE)
// =============================
userFilters.forEach(btn => {
    btn.addEventListener("click", () => {

        // remove active state
        userFilters.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const filter = btn.dataset.filter.toLowerCase();

        document.querySelectorAll("#users-section tbody tr").forEach(row => {
            const status = (row.getAttribute("data-status") || "").toLowerCase();

            const show = (filter === "all" || status === filter);
            row.style.display = show ? "" : "none";
        });
    });
});

// =============================
// NOTE FILTERS (PENDING / APPROVED / REJECTED POSTS TABLE)
// =============================

noteFilters.forEach(btn => {
    btn.addEventListener("click", () => {

        noteFilters.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        activeNoteFilter = btn.textContent.trim().toLowerCase();

        applyNoteFilter(); // 🔥 re-apply instantly
    });
});

// DASHBOARD QUICK LINKS
function goToSection(sectionId){
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    document.getElementById(sectionId).classList.add("active");
    document.querySelector(`[data-target="${sectionId}"]`).classList.add("active");
}
applyNoteFilter();  
loadPendingTable();
loadRecentActivity();