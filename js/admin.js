// ================== ELEMENTS ==================
const overlay = document.getElementById("overlay");

const actionModal = document.getElementById("action-modal");
const modalTitle = document.getElementById("modal-title");
const modalText = document.getElementById("modal-text");
const suspendReason = document.getElementById("suspend-reason");
const modalHeaderIcon = document.getElementById("modal-header-icon");

const confirmBtn = document.getElementById("confirm-btn");
const cancelBtn = document.getElementById("cancel-btn");

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
document.addEventListener("click", (e) => {

    // ================= NOTES =================

    // APPROVE
    if (e.target.closest(".approve") && !e.target.closest(".view-actions")) {
        e.stopPropagation();
        currentAction = "approve";
        currentRow = e.target.closest("tr");

        modalTitle.textContent = "Approve Document?";
        modalText.textContent = "This note will be visible to all users.";
        suspendReason.style.display = "none";
        
        modalHeaderIcon.innerHTML = `<span class="material-icons">check_circle</span>`;
        modalHeaderIcon.style.background = "#D1FAE5";
        modalHeaderIcon.style.color = "#10B981";

        openActionModal();
    }

    // REJECT
    if (e.target.closest(".reject") && !e.target.closest(".view-actions")) {
        e.stopPropagation();
        currentAction = "reject";
        currentRow = e.target.closest("tr");

        modalTitle.textContent = "Reject Document?";
        modalText.textContent = "This will decline the user's upload.";
        suspendReason.style.display = "none";

        modalHeaderIcon.innerHTML = `<span class="material-icons">cancel</span>`;
        modalHeaderIcon.style.background = "#FEE2E2";
        modalHeaderIcon.style.color = "#DC2626";

        openActionModal();
    }

    // VIEW NOTE
    const noteRow = e.target.closest("#notes-section tbody tr");
    if (noteRow && !e.target.closest(".action-cells")) {
        pdfViewer.src = "sample.pdf"; // Replace with actual URL
        viewModal.style.display = "flex";
        overlay.style.display = "block";
    }

    // ================= USERS =================

    // VIEW USER HISTORY
    if (e.target.classList.contains("view-user")) {
        const row = e.target.closest("tr");
        currentRow = row;

        const name = row.children[0].textContent;
        const email = row.children[1].textContent;
        const status = row.getAttribute("data-status");

        // PROFILE
        document.getElementById("user-name").textContent = name;
        document.getElementById("user-meta").textContent = email + " • " + status.charAt(0).toUpperCase() + status.slice(1);
        document.getElementById("user-points").textContent = Math.floor(Math.random() * 300);
        
        // Extract Initials for Avatar
        let initials = name.split(" ").map(n => n[0]).join("").substring(0,2);
        document.querySelector(".user-avatar-large").textContent = initials;

        document.getElementById("profile-reason").value = "";

        // HISTORY (Matches new standard)
        userHistory.innerHTML = `
        <div class="post-card">
            <div class="post-top">
                <h4>Application Development</h4>
                <span class="status approved">Approved</span>
            </div>
            <div class="post-preview">Introduction to application development concepts...</div>
            <div class="post-details">
                <p><strong>Category:</strong> CC106</p>
                <p><strong>Date:</strong> May 2024</p>
                <button class="view-note-btn">Preview Document</button>
            </div>
        </div>

        <div class="post-card">
            <div class="post-top">
                <h4>Database Systems</h4>
                <span class="status pending">Pending</span>
            </div>
            <div class="post-preview">Covers relational databases and SQL basics...</div>
            <div class="post-details">
                <p><strong>Category:</strong> IT204</p>
                <p><strong>Date:</strong> June 2024</p>
                <button class="view-note-btn">Preview Document</button>
            </div>
        </div>
        `;

        userModal.classList.add("active");
        overlay.style.display = "block";
    }

    // EXPAND POST CARD
    const card = e.target.closest(".post-card");
    if(card && !e.target.classList.contains("view-note-btn")){
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


// ================== MODAL FUNCTIONS ==================
function openActionModal(){
    actionModal.style.display = "block";
    overlay.style.display = "block";
}

// CONFIRM ACTION
confirmBtn.addEventListener("click", () => {
    if(!currentRow) return;

    const statusCell = currentRow.querySelector(".status");

    if(currentAction === "approve"){
        statusCell.textContent = "Approved";
        statusCell.className = "status approved";
    } 
    else if(currentAction === "reject"){
        statusCell.textContent = "Rejected";
        statusCell.className = "status rejected";
    }
    else if(currentAction === "suspend"){
        const reason = suspendReason.value;

        if (!reason.trim()) {
            alert("Please enter a reason.");
            return;
        }

        statusCell.textContent = "Suspended";
        statusCell.className = "status suspended";

        const btn = currentRow.querySelector(".suspend-user, .activate-user");
        btn.textContent = "Activate";
        btn.className = "btn-pill activate-user action-success";

        currentRow.setAttribute("data-status", "suspended");
        console.log("Suspend reason:", reason);
    }

    closeAll();
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

// ================== FILTERING ==================
userFilters.forEach(btn => {
    btn.addEventListener("click", () => {
        userFilters.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const filter = btn.dataset.filter;

        document.querySelectorAll("#users-section tbody tr").forEach(row => {
            const status = row.getAttribute("data-status");
            row.style.display = (filter === "all" || status === filter) ? "" : "none";
        });
    });
});

noteFilters.forEach(btn => {
    btn.addEventListener("click", () => {
        noteFilters.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        const filter = btn.textContent.toLowerCase();

        document.querySelectorAll("#notes-section tbody tr").forEach(row => {
            const status = row.querySelector(".status")?.textContent.toLowerCase();
            row.style.display = (filter === "all" || status === filter) ? "" : "none";
        });
    });
});

// DASHBOARD QUICK LINKS
function goToSection(sectionId){
    document.querySelectorAll(".section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-link").forEach(l => l.classList.remove("active"));
    document.getElementById(sectionId).classList.add("active");
    document.querySelector(`[data-target="${sectionId}"]`).classList.add("active");
}