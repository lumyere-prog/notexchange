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
let isProcessingAction = false;





















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

// =============================
// CLICK HANDLER (APPROVE / REJECT BUTTONS)
// =============================
document.addEventListener("click", (e) => {

    const row = e.target.closest("tr");
    if (!row) return;

    // =============================
    // APPROVE
    // =============================
    if (e.target.closest(".approve") && !e.target.closest(".view-actions")) {
        e.stopPropagation();

        currentRow = row;
        openActionModal("approve"); // ✅ FIXED
    }

    // =============================
    // REJECT
    // =============================
    if (e.target.closest(".reject") && !e.target.closest(".view-actions")) {
        e.stopPropagation();

        currentRow = row;
        openActionModal("reject"); // ✅ FIXED
    }
});

















    // VIEW NOTE
// =============================
// PREVIEW DOCUMENT (UPDATED)
// =============================
const noteRow = e.target.closest("#notes-section tbody tr");

if (noteRow && !e.target.closest(".action-cells")) {

    const fileURL = noteRow.dataset.fileurl;
    const status = noteRow.dataset.status; // 🔥 Retrieve the current status

    if (!fileURL) {
        console.error("No fileURL found for this post");
        return;
    }

    pdfViewer.src = fileURL; 

    // 🔥 NEW LOGIC: Only show Approve/Reject if status is 'pending'
    const modalActions = viewModal.querySelector(".view-actions");
    if (modalActions) {
        if (status === "pending") {
            modalActions.style.display = "flex";
        } else {
            modalActions.style.display = "none"; // Hide actions for Approved/Rejected/Archived
        }
    }

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

    // 🔥 STATE SYSTEM (active / offline / suspended)
    const state = row.dataset.state || "offline";
    const userId = row.dataset.userid;
window.currentUserId = userId; // 🔥 STORE GLOBAL

    if (!userId) {
        console.error("Missing userId on row");
        return;
    }

    // =============================
    // PROFILE
    // =============================
    document.getElementById("user-name").textContent = name;

    document.getElementById("user-meta").textContent =
        `${email} • ${state.charAt(0).toUpperCase() + state.slice(1)}`;

    document.getElementById("user-points").textContent =
        Math.floor(Math.random() * 300);

    // =============================
    // AVATAR INITIALS
    // =============================
    let initials = name
        .split(" ")
        .map(n => n[0])
        .join("")
        .substring(0, 2);

    document.querySelector(".user-avatar-large").textContent = initials;

    document.getElementById("profile-reason").value = "";

    // =============================
    // HISTORY LOADING
    // =============================
    userHistory.innerHTML = `<div class="loading-history">Loading posts...</div>`;

    try {

        const postsRef = collection(db, "posts");
        const pendingRef = collection(db, "pendingPosts");
        const rejectedRef = collection(db, "rejectedPosts");

        const approvedQuery = query(postsRef, where("userId", "==", userId));
        const pendingQuery = query(pendingRef, where("userId", "==", userId));
        const rejectedQuery = query(rejectedRef, where("userId", "==", userId));

        const [approvedSnap, pendingSnap, rejectedSnap] = await Promise.all([
            getDocs(approvedQuery),
            getDocs(pendingQuery),
            getDocs(rejectedQuery)
        ]);

        let html = "";

        // =============================
        // APPROVED
        // =============================
        approvedSnap.forEach(docSnap => {
            const post = docSnap.data();

            html += `
            <div class="post-card" data-fileurl="${post.fileURL || ''}">
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
            </div>`;
        });

        // =============================
        // PENDING
        // =============================
        pendingSnap.forEach(docSnap => {
            const post = docSnap.data();

            html += `
            <div class="post-card" data-fileurl="${post.fileURL || ''}">
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
            </div>`;
        });

        // =============================
        // REJECTED
        // =============================
        rejectedSnap.forEach(docSnap => {
            const post = docSnap.data();

            html += `
            <div class="post-card" data-fileurl="${post.fileURL || ''}">
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
            </div>`;
        });

        userHistory.innerHTML = html || `<p>No posts yet.</p>`;

    } catch (err) {
        console.error("Error loading user history:", err);
        userHistory.innerHTML = `<p>Error loading posts.</p>`;
    }

    userModal.classList.add("active");
    overlay.style.display = "block";
}


// =============================
// EXPAND POST CARD
// =============================
const card = e.target.closest(".post-card");
if (card && !e.target.classList.contains("view-note-btn")) {
    card.classList.toggle("active");
}


// =============================
// SUSPEND USER (OPEN MODAL ONLY)
// =============================
if (e.target.classList.contains("suspend-user")) {

    e.preventDefault();
    e.stopPropagation();
    console.log("CONFIRM STATE:", {
    action: currentAction,
    row: currentRow,
    reason: suspendReason?.value
});
    const row = e.target.closest("tr");
    if (!row) return;

    currentRow = row;
    currentAction = "suspend";

    console.log("🔥 SUSPEND CLICK:", currentAction, currentRow);

    modalTitle.textContent = "Suspend User?";
    modalText.textContent = "They will lose access to upload and comment.";

    suspendReason.style.display = "block";

    modalHeaderIcon.innerHTML = `<span class="material-icons">gavel</span>`;
    modalHeaderIcon.style.background = "#FEE2E2";
    modalHeaderIcon.style.color = "#DC2626";

    openActionModal("suspend");
}
// =============================
// ACTIVATE USER (FIRESTORE FIXED)
// =============================
if (e.target.classList.contains("activate-user")) {

    const row = e.target.closest("tr");
    const userId = row?.dataset?.userid;

    if (!userId) {
        console.error("Missing userId");
        return;
    }

    try {
        const userRef = doc(db, "user", userId);

        await updateDoc(userRef, {
            state: "active"
        });

        // UI update
        const status = row.querySelector(".status");
        if (status) {
            status.textContent = "Active";
            status.className = "status active";
        }

        e.target.textContent = "Suspend";
        e.target.className = "btn-pill suspend-user action-danger";

        row.dataset.state = "active";

        console.log("✅ User activated");

    } catch (err) {
        console.error("Activate failed:", err);
    }
}
});







function loadUsers() {
    console.log("🔥 loadUsers triggered");
    const tbody = document.getElementById("user-table");
    if (!tbody) return;

    const usersRef = collection(db, "user");

    onSnapshot(usersRef, (snap) => {

        tbody.innerHTML = "";

        snap.forEach(docSnap => {

            const user = docSnap.data();

            const tr = document.createElement("tr");

            tr.dataset.userid = docSnap.id;
            tr.dataset.state = user.state || "offline";

            const state = user.state || "offline";

            tr.innerHTML = `
                <td><b>${user.username || "Unknown"}</b></td>
                <td>${user.email || "No email"}</td>

                <td>
                    <span class="status ${state}">
                        ${state.charAt(0).toUpperCase() + state.slice(1)}
                    </span>
                </td>

                <td class="action-cells">

                    <button class="btn-pill view-user">
                        View Profile
                    </button>

                    ${
                        state === "suspended"
                            ? `<button class="btn-pill activate-user action-success">Activate</button>`
                            : `<button class="btn-pill suspend-user action-danger">Suspend</button>`
                    }

                </td>
            `;

            tbody.appendChild(tr);
        });
    });
}











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




const loader = document.getElementById("global-loader");

function showLoader(text = "Processing...") {
    if (!loader) return;
    loader.querySelector("p").innerText = text;
    loader.classList.remove("hidden");
}

function hideLoader() {
    if (!loader) return;
    loader.classList.add("hidden");     
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
        openActionModal("approve");
    }

    // =============================
    // REJECT
    // =============================
    if (e.target.closest(".reject")) {
        currentRow = row;
        currentAction = "reject";
        openActionModal("reject");
    }

    // =============================
    // RETURN (REJECTED → PENDING)
    // =============================
    if (e.target.closest(".return") && status === "rejected") {

        showLoader("Restoring post...");

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

            console.log("🔁 Returned → pending");

            loadPendingTable();

        } catch (err) {
            console.error("Return failed:", err);
        } finally {
            hideLoader();
        }
    }

    // =============================
    // RETURN (ARCHIVED → PENDING)
    // =============================
    if (e.target.closest(".return") && status === "archived") {

        showLoader("Restoring from archive...");

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

            console.log("🔁 Archive → pending");

            loadPendingTable();

        } catch (err) {
            console.error("Archive return failed:", err);
        } finally {
            hideLoader();
        }
    }

    // =============================
    // ARCHIVE
    // =============================
    if (e.target.closest(".archive")) {

        showLoader("Archiving post...");

        const collectionMap = {
            approved: "posts",
            rejected: "rejectedPosts"
        };

        const col = collectionMap[status];

        if (!col) {
            hideLoader();
            return;
        }

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

            console.log("📦 Archived");

            loadPendingTable();

        } catch (err) {
            console.error("Archive failed:", err);
        } finally {
            hideLoader();
        }
    }

    // =============================
    // EDIT
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







async function confirmAction(row, action) {

    const postId = row?.dataset?.id;
    const status = row?.dataset?.status;

    if (!postId) return null;

    if (row.dataset.processing === "true") {
        console.warn("⚠️ Already processing");
        return null;
    }

    row.dataset.processing = "true";

    try {

        let sourceCollection = "pendingPosts";

        if (status === "approved") sourceCollection = "posts";
        if (status === "rejected") sourceCollection = "rejectedPosts";
        if (status === "archived") sourceCollection = "archivedPosts";

        const ref = doc(db, sourceCollection, postId);
        const snap = await getDoc(ref);

        if (!snap.exists()) return null;

        const data = snap.data();

        if (action === "approve") {
            await addDoc(collection(db, "posts"), {
                ...data,
                approvedAt: serverTimestamp()
            });
            await deleteDoc(ref);
        }

        if (action === "reject") {
            await addDoc(collection(db, "rejectedPosts"), {
                ...data,
                rejectedAt: serverTimestamp()
            });
            await deleteDoc(ref);
        }

        return {
            id: postId,
            ...data
        };

    } finally {
        row.dataset.processing = "false";
    }
}










const currentUser = {
    uid: "admin",
    name: "Admin",
    photo: "/photos/guest.png"
};

// ================== MODAL FUNCTIONS ==================
function openActionModal(action) {

    if (!action) {
        console.error("❌ openActionModal missing action");
        return;
    }

    currentAction = action; // ✅ ONLY HERE

    const wrapper = document.getElementById("suspend-wrapper");
    const reasonInput = document.getElementById("suspend-reason");

    reasonInput.value = "";
    wrapper.style.display = "none";

    if (action === "approve") {
        modalTitle.textContent = "Approve Post?";
        modalText.textContent = "This will make the post visible.";

        modalHeaderIcon.innerHTML = `<span class="material-icons">check_circle</span>`;
        modalHeaderIcon.style.background = "#DCFCE7";
        modalHeaderIcon.style.color = "#16A34A";
    }

    if (action === "reject") {
        modalTitle.textContent = "Reject Post?";
        modalText.textContent = "This will move it to rejected.";

        modalHeaderIcon.innerHTML = `<span class="material-icons">cancel</span>`;
        modalHeaderIcon.style.background = "#FEE2E2";
        modalHeaderIcon.style.color = "#DC2626";
    }

    if (action === "suspend") {
        modalTitle.textContent = "Suspend User?";
        modalText.textContent = "User will lose posting access.";

        wrapper.style.display = "block";

        modalHeaderIcon.innerHTML = `<span class="material-icons">gavel</span>`;
        modalHeaderIcon.style.background = "#FEF3C7";
        modalHeaderIcon.style.color = "#D97706";
    }

    actionModal.style.display = "block";
    overlay.style.display = "block";
}



confirmBtn.addEventListener("click", async () => {

    const row = currentRow;
    const action = currentAction;

    if (!row || !action) return;

    if (isProcessingAction) return;

    isProcessingAction = true;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing...";

    showLoader?.("Processing...");

    const statusCell = row.querySelector(".status");

    try {

        // =============================
        // APPROVE / REJECT
        // =============================
        if (action === "approve" || action === "reject") {

            const postData = await confirmAction(row, action);

            if (!postData) return;

            statusCell.textContent = action === "approve" ? "Approved" : "Rejected";
            statusCell.className = action === "approve"
                ? "status approved"
                : "status rejected";

            if (postData?.userId) {
                await sendNotification({
                    post: {
                        id: postData.id,
                        userId: postData.userId,
                        title: postData.title
                    },
                    currentUser: {
                        uid: "admin",
                        name: "Admin",
                        photo: "/photos/admin.png"
                    },
                    type: action
                });
            }
        }

        // =============================
        // SUSPEND USER
        // =============================
        else if (action === "suspend") {

            const reason = suspendReason.value;

            if (!reason.trim()) {
                alert("Please enter a reason.");
                return; // 🔥 safe now (finally will still run)
            }

            const userId = row.dataset.userid;

            if (!userId) {
                console.error("Missing userId");
                return;
            }

            await addDoc(collection(db, "user", userId, "notifications"), {
                type: "suspended",
                fromUserId: "admin",
                fromUsername: "Admin",
                fromProfilePic: "/photos/admin.png",
                read: false,
                message: reason,
                createdAt: serverTimestamp()
            });

            statusCell.textContent = "Suspended";
            statusCell.className = "status suspended";

            const btn = row.querySelector(".suspend-user, .activate-user");
            if (btn) {
                btn.textContent = "Activate";
                btn.className = "btn-pill activate-user action-success";
            }

            row.setAttribute("data-state", "suspended");
        }

        closeAll();

    } catch (err) {
        console.error("❌ Action failed:", err);
    } finally {

        isProcessingAction = false;
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm";
        currentRow = null;
        currentAction = null;

        hideLoader?.();
    }
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

        // =============================
        // ACTIVE BUTTON UI
        // =============================
        userFilters.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const filter = btn.dataset.filter.toLowerCase();

        document.querySelectorAll("#users-section tbody tr").forEach(row => {

            const state = (row.dataset.state || "").toLowerCase();

            const show =
                filter === "all" ||
                state === filter;

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
loadUsers();




function checkAdminLogin() {
    const user = document.getElementById("adminUser").value;
    const pass = document.getElementById("adminPass").value;
    const errorText = document.getElementById("adminLoginError");

    // 🔥 CHANGE THESE TO YOUR PREFERRED LOGIN
    const VALID_USER = "admin";
    const VALID_PASS = "admin123";

    if (user === VALID_USER && pass === VALID_PASS) {
        // Success: Hide the login overlay, show the dashboard
        document.getElementById("adminLoginOverlay").style.display = "none";
        document.getElementById("adminDashboard").style.display = "flex"; 
        
        // Save session so it doesn't ask again on refresh
        sessionStorage.setItem("adminUnlocked", "true");
    } else {
        // Fail: Show error
        errorText.innerText = "Invalid username or password.";
        errorText.style.display = "block";
        
        // Shake animation for incorrect password (optional polish)
        const box = document.querySelector(".admin-login-box");
        box.style.transform = "translateX(5px)";
        setTimeout(() => box.style.transform = "translateX(-5px)", 50);
        setTimeout(() => box.style.transform = "translateX(0)", 100);
    }
}

// Auto-unlock if already logged in during this browser session
window.addEventListener("DOMContentLoaded", () => {
    if (sessionStorage.getItem("adminUnlocked") === "true") {
        document.getElementById("adminLoginOverlay").style.display = "none";
        document.getElementById("adminDashboard").style.display = "flex";
    }
    
    // Allow pressing "Enter" to log in
    document.getElementById("adminPass").addEventListener("keypress", function(e) {
        if (e.key === "Enter") checkAdminLogin();
    });
});

// 🔥 FIX: Added "window." so the HTML button can see this function inside a module
window.checkAdminLogin = function() {
    const user = document.getElementById("adminUser").value;
    const pass = document.getElementById("adminPass").value;
    const errorText = document.getElementById("adminLoginError");

    const VALID_USER = "admin";
    const VALID_PASS = "admin123";

    if (user === VALID_USER && pass === VALID_PASS) {
        document.getElementById("adminLoginOverlay").style.display = "none";
        document.getElementById("adminDashboard").style.display = "flex"; 
        sessionStorage.setItem("adminUnlocked", "true");
    } else {
        errorText.innerText = "Invalid username or password.";
        errorText.style.display = "block";
        
        const box = document.querySelector(".admin-login-box");
        box.style.transform = "translateX(5px)";
        setTimeout(() => box.style.transform = "translateX(-5px)", 50);
        setTimeout(() => box.style.transform = "translateX(0)", 100);
    }
};


// 🔥 SYNC DASHBOARD STATS
async function syncDashboardStats() {
    try {
        const [postsSnap, pendingSnap, rejectedSnap] = await Promise.all([
            getDocs(collection(db, "posts")),
            getDocs(collection(db, "pendingPosts")),
            getDocs(collection(db, "rejectedPosts"))
        ]);

        const cards = document.querySelectorAll(".card-info h3");
        if (cards.length >= 4) {
            // Total = Approved + Pending + Rejected
            cards[0].textContent = postsSnap.size + pendingSnap.size + rejectedSnap.size; 
            cards[1].textContent = pendingSnap.size; // Pending Review
            cards[2].textContent = postsSnap.size;   // Approved
            cards[3].textContent = rejectedSnap.size; // Rejected
        }
    } catch (err) {
        console.error("Dashboard Sync Error:", err);
    }
}
// Initial call to fill numbers on load
syncDashboardStats();

// 🔥 ADD THIS: Makes the search bar actually work
const globalSearch = document.querySelector(".search-box input");
if (globalSearch) {
    globalSearch.addEventListener("input", (e) => {
        const term = e.target.value.toLowerCase();
        const activeSection = document.querySelector(".section.active").id;
        
        // Pick the right table to search through based on the tab you're in
        const targetTableId = activeSection === "notes-section" ? "pendingTableBody" : "user-table";
        const rows = document.querySelectorAll(`#${targetTableId} tr`);

        rows.forEach(row => {
            const rowText = row.innerText.toLowerCase();
            row.style.display = rowText.includes(term) ? "" : "none";
        });
    });
}

// 🔥 ADD THIS: Handles the "Suspend" button inside the User Profile panel
document.getElementById("suspend-from-profile").addEventListener("click", async () => {
    const userId = window.currentUserId; 
    const reason = document.getElementById("profile-reason").value;

    if (!userId || !reason.trim()) return alert("Please select a user and provide a reason.");

    try {
        await updateDoc(doc(db, "user", userId), { state: "suspended" });
        await addDoc(collection(db, "user", userId, "notifications"), {
            type: "suspended",
            message: reason,
            fromUsername: "Admin",
            read: false,
            createdAt: serverTimestamp()
        });
        alert("User suspended.");
        closeAll(); // Closes the panel
    } catch (err) { console.error(err); }
});

// 🔥 ADD THIS: Handles "Preview Document" clicks inside the User History list
document.getElementById("user-history").addEventListener("click", (e) => {
    if (e.target.classList.contains("view-note-btn")) {
        const card = e.target.closest(".post-card");
        const url = card.dataset.fileurl;
        if (url) {
            document.getElementById("pdf-viewer").src = url;
            document.getElementById("view-modal").style.display = "flex";
            document.getElementById("overlay").style.display = "block";
        }
    }
});

// 🔥 Change the old 'function goToSection' to this:
window.goToSection = function(sectionId) {
    // 1. Hide all sections and remove active classes from nav
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

    // 2. Show the target section
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add("active");
        // Also add active class to the corresponding sidebar link
        const navLink = document.querySelector(`[data-target="${sectionId}"]`);
        if (navLink) navLink.classList.add("active");
    }

    // 3. If going back to dashboard, refresh the numbers
    if (sectionId === 'dashboard-section') syncDashboardStats();
};