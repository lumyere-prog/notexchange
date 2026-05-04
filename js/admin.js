import { db } from "/firebase/firebase-client.js";
import { sendNotification } from "/js/notificationManager.js"; // adjust path

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
// =============================
// ACTIVATE USER (THE "HALT" BUTTON)
// =============================
if (e.target.classList.contains("activate-user")) {
    const row = e.target.closest("tr");
    const userId = row?.dataset?.userid;

    if (!userId) return console.error("Missing userId");

    try {
        const userRef = doc(db, "user", userId);

        // 🔥 UPDATED: Clear state AND granular restrictions
        await updateDoc(userRef, {
            state: "active",
            restrictions: {
                appLock: false,
                postBlock: false,
                commentBlock: false
            },
            suspendReason: "" // Optional: Clear the old reason
        });

        // UI Update: Instantly change the status badge and button text
        const status = row.querySelector(".status");
        if (status) {
            status.textContent = "Active";
            status.className = "status active";
        }

        e.target.textContent = "Suspend";
        e.target.className = "btn-pill suspend-user action-danger";
        row.dataset.state = "active";

        console.log("🔓 User restrictions lifted and state set to Active");
        alert("Suspension lifted successfully.");

    } catch (err) {
        console.error("Activation failed:", err);
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
            
            // 🔥 NEW: Check if they have ANY restrictions active
            const hasRestrictions = user.restrictions?.appLock || user.restrictions?.postBlock || user.restrictions?.commentBlock;
            const isRestricted = state === "suspended" || hasRestrictions;

            tr.innerHTML = `
                <td><b>${user.username || "Unknown"}</b></td>
                <td>${user.email || "No email"}</td>

                <td>
                    <span class="status ${isRestricted ? 'suspended' : state}">
                        ${isRestricted ? 'Restricted' : state.charAt(0).toUpperCase() + state.slice(1)}
                    </span>
                </td>

                <td class="action-cells">

                    <button class="btn-pill view-user">
                        View Profile
                    </button>

                    ${
                        isRestricted
                            ? `<button class="btn-pill activate-user action-success">Lift Restrictions</button>`
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

            // 🔥 CHANGED: Use setDoc to keep the exact same ID!
            await setDoc(doc(db, "pendingPosts", postId), {
                ...data,
                returnedAt: serverTimestamp()
            });

            await deleteDoc(postRef);

            // 🔥 NEW: Send the Restore notification
            await sendNotification({
                post: { id: postId, title: data.title || "Untitled", userId: data.userId },
                type: "restore"
            });

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

            // 🔥 CHANGED: Keep the same ID when returning
            await setDoc(doc(db, "pendingPosts", postId), {
                ...data,
                restoredFromArchive: true,
                returnedAt: serverTimestamp()
            });

            await deleteDoc(postRef);

            await sendNotification({
                post: { id: postId, title: data.title || "Untitled", userId: data.userId },
                type: "restore"
            });

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

            await setDoc(doc(db, "archivedPosts", postId), {
                ...data,
                archivedAt: serverTimestamp(),
                from: status
            });

            await deleteDoc(postRef);

            await sendNotification({
                post: { id: postId, title: data.title || "Untitled", userId: data.userId },
                type: "archive"
            });

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
        else if (status === "rejected") sourceCollection = "rejectedPosts";
        else if (status === "archived") sourceCollection = "archivedPosts";

        const ref = doc(db, sourceCollection, postId);
        const snap = await getDoc(ref);

        if (!snap.exists()) return null;

        const data = snap.data();

        // 🧠 shared notification base (removes repetition)
        const baseNotification = {
            post: {
                id: postId,
                title: data.title || "Untitled",
                userId: data.userId
            }
        };
        
        // =========================
        // APPROVE
        // =========================
        if (action === "approve") {

            // Keep the exact same ID
            await setDoc(doc(db, "posts", postId), {
                ...data,
                approvedAt: serverTimestamp()
            });

            await deleteDoc(ref);

            await sendNotification({
                ...baseNotification,
                type: "approve"
            });

            // 🔥 NEW: Give the user their pending points!
            if (data.userId) {
                console.log(`Granting 100 points to ${data.userId} for approved upload.`);
                await addPoints(data.userId, 100); 
            }
        }

        // =========================
        // REJECT
        // =========================
        else if (action === "reject") {

            // 🔥 CHANGED: Use setDoc to keep the exact same ID
            await setDoc(doc(db, "rejectedPosts", postId), {
                ...data,
                rejectedAt: serverTimestamp()
            });

            await deleteDoc(ref);

            await sendNotification({
                ...baseNotification,
                type: "reject"
            });
        }

        // =========================
        // ARCHIVE
        // =========================
        else if (action === "archive") {

            // 🔥 CHANGED: Keep the same ID when archiving
            await setDoc(doc(db, "archivedPosts", postId), {
                ...data,
                archivedAt: serverTimestamp()
            });

            await deleteDoc(ref);

            await sendNotification({
                ...baseNotification,
                type: "archive"
            });
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
    photo: "/photos/logofinal.png"
};

// ================== MODAL FUNCTIONS ==================
function openActionModal(action) {
    if (!action) return;
    currentAction = action;

    const wrapper = document.getElementById("suspend-wrapper");
    const reasonInput = document.getElementById("suspend-reason");
    
    // 🔥 NEW: Reset Checkboxes
    document.getElementById("restrict-app").checked = false;
    document.getElementById("restrict-post").checked = false;
    document.getElementById("restrict-comment").checked = false;

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

    if (action === "suspend" || action === "suspend_report") {
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

    if (!action) return;
    // Allow 'suspend_report' to proceed even if there is no table row selected
    if (action !== "suspend_report" && action !== "suspend" && !row) return;

    if (isProcessingAction) return;

    isProcessingAction = true;
    confirmBtn.disabled = true;
    confirmBtn.textContent = "Processing...";

    showLoader?.("Processing...");

    const statusCell = row ? row.querySelector(".status") : null;

    try {

        // =============================
        // APPROVE / REJECT
        // =============================
        if (action === "approve" || action === "reject") {

            const postData = await confirmAction(row, action);

            if (!postData) return;

            if (statusCell) {
                statusCell.textContent = action === "approve" ? "Approved" : "Rejected";
                statusCell.className = action === "approve"
                    ? "status approved"
                    : "status rejected";
            }

            
        }

        // =============================
        // SUSPEND USER
        // =============================
    else if (action === "suspend" || action === "suspend_report") {
    const reason = suspendReason.value;
    const lockApp = document.getElementById("restrict-app").checked;
    const blockPost = document.getElementById("restrict-post").checked;
    const blockComment = document.getElementById("restrict-comment").checked;

    if (!reason.trim()) {
        alert("Please enter a reason.");
        isProcessingAction = false;
        confirmBtn.disabled = false;
        confirmBtn.textContent = "Confirm";
        return;
    }

    // Determine target UID based on which tab we are in
    const userId = action === "suspend" ? currentRow.dataset.userid : targetReportUserId;

    // 1. Update User State with granular permissions
    await updateDoc(doc(db, "user", userId), {
        state: lockApp ? "suspended" : "active", // state remains 'suspended' for full lockdown
        restrictions: {
            appLock: lockApp,
            postBlock: blockPost,
            commentBlock: blockComment
        },
        suspendReason: reason
    });

    // 2. Resolve the report if applicable
    if (action === "suspend" || action === "suspend_report") {
        await updateDoc(doc(db, "reports", targetReportId), {
            status: "resolved",
            resolvedAt: serverTimestamp()
        });
    }

    // 3. Send Notification
    await addDoc(collection(db, "user", userId, "notifications"), {
        type: "suspension",
        title: "Account Restricted",
        message: `An admin has applied restrictions to your account. Reason: ${reason}`,
        read: false,
        createdAt: serverTimestamp()
    });

    alert("Restrictions applied successfully.");
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

window.goToSection = function(sectionId) {
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));

    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add("active");
        const navLink = document.querySelector(`[data-target="${sectionId}"]`);
        if (navLink) navLink.classList.add("active");
    }

    // 🔥 Load specific section data immediately
    if (sectionId === 'dashboard-section') syncDashboardStats();
    if (sectionId === 'reports-section') {
        currentReportFilter = "pending"; // Default to pending
        // Reset filter button UI
        document.querySelectorAll("#reports-section .filters button").forEach(b => {
            b.classList.toggle("active", b.dataset.reportFilter === "pending");
        });
        loadReports(); // 🔥 Trigger Load
    }
};


// =========================================
// REPORTS MANAGEMENT
// =========================================
let currentReportFilter = "pending";
let unsubscribeReports = null;
let targetReportUserId = null;
let targetReportId = null;

// 1. Filter Buttons
document.querySelectorAll("#reports-section .filters button").forEach(btn => {
    btn.addEventListener("click", (e) => {
        document.querySelectorAll("#reports-section .filters button").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        currentReportFilter = e.target.dataset.reportFilter;
        loadReports();
    });
});

// 2. Load Reports from Firestore (FIXED & STABILIZED)
function loadReports() {
    const tbody = document.getElementById("reports-table");
    if (!tbody) return;

    if (unsubscribeReports) unsubscribeReports();

    const reportQuery = query(collection(db, "reports"), orderBy("timestamp", "desc"));

    unsubscribeReports = onSnapshot(reportQuery, async (snap) => {
        tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px;'>Loading report details...</td></tr>";
        
        let rowsHtml = "";

        for (const docSnap of snap.docs) {
            const report = docSnap.data();
            const reportId = docSnap.id;
            
            if ((report.status || "pending") !== currentReportFilter) continue;

            let targetTitle = "Content Not Found";
            let reportedRealName = "Name Hidden"; 
            let reportedAlias = "No Alias";
            let reportedUserId = null;
            let reporterRealName = "Name Hidden";
            let reporterAlias = "No Alias";
            let postData = null;

            try {
                // 1. Reporter Identity
                if (report.reporterUid) {
                    const reporterSnap = await getDoc(doc(db, "user", report.reporterUid));
                    if (reporterSnap.exists()) {
                        const rData = reporterSnap.data();
                        reporterRealName = rData.name || rData.username || "Google User";
                        reporterAlias = rData.alias || "No Alias";
                    }
                }

                // 2. Search for the Post Context
                const collections = ["posts", "pendingPosts", "rejectedPosts"];
                for (const colName of collections) {
                    const postSnap = await getDoc(doc(db, colName, report.targetId));
                    if (postSnap.exists()) {
                        postData = postSnap.data();
                        break; 
                    }
                }
                
                if (postData) {
                    if (report.targetType === "post") {
                        targetTitle = `Post: ${postData.title || "Untitled"}`;
                        reportedUserId = postData.userId;
                    } else if (report.targetType === "comment" && postData.comments) {
                        const comment = postData.comments[report.commentIndex];
                        if (comment) {
                            targetTitle = `Comment: "${comment.text.substring(0, 30)}..."`;
                            reportedUserId = comment.uid || null;
                        }
                    }

                    if (reportedUserId) {
                        const offenderSnap = await getDoc(doc(db, "user", reportedUserId));
                        if (offenderSnap.exists()) {
                            const aData = offenderSnap.data();
                            reportedRealName = aData.name || aData.username || "Google User";
                            reportedAlias = aData.alias || "No Alias";
                        }
                    }
                }
            } catch(e) { console.error("Identity fetch error:", e); }

            rowsHtml += `
                <tr style="border-bottom: 1px solid #F3F4F6;">
                    <td style="padding: 16px;">
                        <div style="margin-bottom: 8px;">
                            <b style="color: #111827; font-size: 15px;">${targetTitle}</b>
                            ${postData ? `
                                <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
                                    <span style="font-size: 11px; color: #6B7280; font-weight: 600;">FROM POST: "${postData.title}"</span>
                                    <button class="btn-pill" style="width: fit-content; padding: 2px 10px; font-size: 11px; background: #EEF2FF; color: #4338CA; border: 1px solid #C7D2FE;" 
                                        onclick="viewReportContext('${postData.fileURL}', '${postData.title}')">
                                        View Original PDF
                                    </button>
                                </div>
                            ` : '<div style="font-size:11px; color:#EF4444; margin-top:4px;">Original post has been deleted</div>'}
                        </div>
                        <div style="font-size: 12px; color: #4B5563; line-height: 1.4; background: #F9FAFB; padding: 8px; border-radius: 8px; border: 1px solid #F3F4F6;">
                            Target: <strong>${reportedRealName}</strong> (@${reportedAlias})<br>
                            Flagged By: <strong>${reporterRealName}</strong> (@${reporterAlias})
                        </div>
                    </td>
                    <td style="padding: 16px;">
                        <b style="font-size:13px; color: #111827;">${report.reason || "No Reason"}</b><br>
                        <span style="font-size: 12px; color: #6B7280; font-style: italic;">"${report.description || "No details."}"</span>
                    </td>
                    <td style="padding: 16px;"><span class="status ${report.status || 'pending'}">${report.status || 'Pending'}</span></td>
                    <td style="padding: 16px;" class="action-cells">
                        ${(report.status || 'pending') === 'pending' ? `
                            <div style="display: flex; gap: 6px; flex-direction: column;">
                                <button class="btn-pill action-success" style="width: 100%;" onclick="resolveReport('${reportId}')">Ignore Flag</button>
                                ${report.targetType === 'comment' ? `
                                    <button class="btn-pill" style="width: 100%; background:#111827; color:white;" onclick="deleteReportedComment('${report.targetId}', ${report.commentIndex}, '${reportId}')">Delete Comment</button>
                                ` : ''}
                                ${reportedUserId ? `
                                    <button class="btn-pill action-danger" style="width: 100%; background:#FEF3C7; color:#D97706;" onclick="suspendFromReport('${reportedUserId}', '${reportId}')">Suspend</button>
                                ` : ''}
                            </div>
                        ` : `<span style="font-size: 12px; color: #9CA3AF; font-weight: 600;">RESOLVED</span>`}
                    </td>
                </tr>
            `;
        }
        tbody.innerHTML = rowsHtml || "<tr><td colspan='4' style='text-align:center;'>No reports found.</td></tr>";
    });
}

window.resolveReport = async function(reportId) {
    if (!confirm("Dismiss this report without taking action against the user?")) return;
    await updateDoc(doc(db, "reports", reportId), { status: "resolved", resolvedAt: serverTimestamp() });
};

window.deleteUserFromReport = async function(userId, reportId) {
    if (!confirm("WARNING: Permanently delete this user account? This cannot be undone.")) return;
    await deleteDoc(doc(db, "user", userId)); 
    await updateDoc(doc(db, "reports", reportId), { status: "resolved", resolvedAt: serverTimestamp() });
    alert("User account deleted.");
};

// 🔥 NEW: Opens the Action Modal to get a reason instead of instantly suspending
window.suspendFromReport = function(userId, reportId) {
    targetReportUserId = userId;
    targetReportId = reportId;
    currentAction = "suspend_report"; // Tell the confirm button what to do
    
    // Set up the Modal UI
    document.getElementById("modal-title").textContent = "Suspend User?";
    document.getElementById("modal-text").textContent = "Provide a reason. The user will be notified and suspended.";
    
    const wrapper = document.getElementById("suspend-wrapper");
    document.getElementById("suspend-reason").value = "";
    wrapper.style.display = "block";
    
    const icon = document.getElementById("modal-header-icon");
    icon.innerHTML = `<span class="material-icons">gavel</span>`;
    icon.style.background = "#FEF3C7";
    icon.style.color = "#D97706";

    document.getElementById("action-modal").style.display = "block";
    document.getElementById("overlay").style.display = "block";
};

// Trigger load on startup
document.addEventListener("DOMContentLoaded", loadReports);

window.deleteReportedComment = async function(postId, commentIndex, reportId) {
    if (!confirm("Are you sure you want to delete this comment? This cannot be undone.")) return;

    try {
        const postRef = doc(db, "posts", postId);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) {
            return alert("Post not found. It may have been deleted already.");
        }

        const postData = postSnap.data();
        const comments = postData.comments || [];
        
        // 🔥 SAFETY FIX: Instead of just using the index, we find the specific comment object
        const commentToDelete = comments[commentIndex];

        if (commentToDelete) {
            // 1. Remove the specific object from the array in the main post
            await updateDoc(postRef, {
                comments: arrayRemove(commentToDelete)
            });

            // 2. Automatically mark the report as resolved
            await updateDoc(doc(db, "reports", reportId), {
                status: "resolved",
                resolvedAt: serverTimestamp(),
                adminAction: "comment_deleted"
            });

            alert("Comment successfully removed from the post and report resolved.");
        } else {
            alert("Comment could not be located. It might have been deleted by the user already.");
            // Resolve the report anyway since the content is gone
            await updateDoc(doc(db, "reports", reportId), { status: "resolved" });
        }
    } catch (err) {
        console.error("Delete comment error:", err);
        alert("Action failed. Check console for details.");
    }
};

window.viewReportContext = function(fileURL, title) {
    if (!fileURL) return alert("File URL not found for this post.");

    const pdfViewer = document.getElementById("pdf-viewer");
    const viewModal = document.getElementById("view-modal");
    const overlay = document.getElementById("overlay");

    if (pdfViewer && viewModal) {
        pdfViewer.src = fileURL;
        
        // Hide the Approve/Reject buttons since we are just viewing context
        const modalActions = viewModal.querySelector(".view-actions");
        if (modalActions) modalActions.style.display = "none";

        viewModal.style.display = "flex";
        overlay.style.display = "block";
    }
};