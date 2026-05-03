import { db } from "/firebase/firebase-client.js";
import { getDoc, getDocs, onSnapshot,collection, doc, deleteDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { addPoints } from "/js/points.js";
import {
  query,
  limit,
  updateDoc,
  increment,
  runTransaction,
  where,
  serverTimestamp,
  orderBy,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

function getInterestPillHTML(interest) {
    // A palette of nice pastel UI colors with dark text
    const colors = [
        { bg: '#FEE2E2', text: '#991B1B' }, // Red
        { bg: '#FEF3C7', text: '#92400E' }, // Yellow
        { bg: '#D1FAE5', text: '#065F46' }, // Green
        { bg: '#DBEAFE', text: '#1E40AF' }, // Blue
        { bg: '#E0E7FF', text: '#3730A3' }, // Indigo
        { bg: '#F3E8FF', text: '#6B21A8' }, // Purple
        { bg: '#FCE7F3', text: '#9D174D' }  // Pink
    ];
    
    // Pick a color based on the word length so it stays consistent
    const colorIndex = interest.length % colors.length;
    const color = colors[colorIndex];
    
    return `<span style="background:${color.bg}; color:${color.text}; padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700; display:inline-block; margin-right:4px; margin-bottom:4px;">${interest}</span>`;
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    
    // Hide it after 3 seconds
    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
}

const currentUser = JSON.parse(localStorage.getItem("user"));
let pendingDeletePostId = null;
let newProfilePicBase64 = null;

document.addEventListener("DOMContentLoaded", () => {
  const localUser = JSON.parse(localStorage.getItem("user"));

  if (!localUser?.uid) {
    window.location.href = "login.html";
    return;
  }

  const userRef = doc(db, "user", localUser.uid);
  loadUserNotesRealtime(localUser.uid);

  
  // 🔥 REAL-TIME LISTENER
  onSnapshot(userRef, (snap) => {
    if (!snap.exists()) {
      console.log("User not found");
      return;
    }

    const user = snap.data();

    // Update Name to show Alias if it exists, otherwise fallback to Username/Name
    const nameEl = document.querySelector(".name");
    if (nameEl) nameEl.textContent = user.alias || user.username || user.name || "No Name";

    // Username (with @ symbol)
    const usernameEl = document.querySelector(".username");
    if (usernameEl) {
        usernameEl.textContent = "@" + (user.username?.toLowerCase().replace(/\s/g, "") || "user");
    }

    // Profile Image
    const imgEl = document.querySelector(".profile-img");
    if (imgEl) {
        imgEl.src = user.profilePic || "/photos/profile.jpg";
    }

    // Render Bio
    const bioEl = document.getElementById("displayBio");
    if (bioEl) {
        bioEl.textContent = user.bio || "";
        bioEl.style.display = user.bio ? "block" : "none"; 
    }

    // Render Interests
    const interestsEl = document.getElementById("displayInterests");
    if (interestsEl) {
        interestsEl.innerHTML = "";
        const tags = user.interests || [];
        tags.forEach(tag => {
            // 🔥 Uses our new colored pill function
            interestsEl.innerHTML += getInterestPillHTML(tag);
        });
    }
let tooltipTimeout;

// 🔥 IMAGE SELECTION & AUTO-COMPRESSION
  const picInput = document.getElementById('profilePicInput');
  if (picInput) {
    picInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          
          // Shrink to 300px so the save is instant and fits in Firestore
          const MAX_SIZE = 300; 
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
          else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }

          canvas.width = w;
          canvas.height = h;
          ctx.drawImage(img, 0, 0, w, h);
          
          // Export as compressed JPEG
          const compressed = canvas.toDataURL("image/jpeg", 0.7);
          
          // Update the preview on the screen
          const previewImg = document.getElementById('editProfileImage');
          if (previewImg) previewImg.src = compressed;
          
          // Save this string to the variable we made in Step 1
          newProfilePicBase64 = compressed;
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  });
});



function toggleMenu() {
  const menu = document.getElementById("dropdownMenu");

  menu.style.display =
    menu.style.display === "block" ? "none" : "block";
}

// 🔥 make it global so HTML can access it
window.toggleMenu = toggleMenu;



// 1. Toggle the Dropdown Menu
window.toggleMenu = function() {
    const menu = document.getElementById("dropdownMenu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
};

// Close dropdown if clicking anywhere else on the screen
window.onclick = function(event) {
    if (!event.target.matches('.menu-btn')) {
        const dropdowns = document.getElementsByClassName("dropdown");
        for (let i = 0; i < dropdowns.length; i++) {
            let openDropdown = dropdowns[i];
            if (openDropdown.style.display === "block") {
                openDropdown.style.display = "none";
            }
        }
    }
};

// =========================================
// EDIT PROFILE LOGIC
// =========================================

// Define the options users are allowed to choose from
const AVAILABLE_INTERESTS = [
    "Programming", "Web Dev", "Mobile Apps", "AI & ML", 
    "Data Science", "Design", "Mathematics", "Science", 
    "History", "Business", "Art", "Writing"
];

let currentInterests = [];

// 1. Open Modal and Fetch Data
window.openEditProfile = async function() {
    const modal = document.getElementById("editProfileModal");
    if (modal) modal.classList.add("active");
    
    // Fetch fresh data from Firebase
    const userRef = doc(db, "user", currentUser.uid);
    const snap = await getDoc(userRef);
    
    let data = {};
    if (snap.exists()) {
        data = snap.data();
    }
    
    // Auto-Populate Read-Only Fields
    const profileImg = document.getElementById("editProfileImage");
    if (profileImg) profileImg.src = data.profilePic || currentUser?.profilePic || "/photos/guest.jpg";
    
    const nameInput = document.getElementById("editName");
    if (nameInput) nameInput.value = data.name || currentUser?.name || "";
    
    // Auto-Populate Editable Fields
    const aliasInput = document.getElementById("editAlias");
    if (aliasInput) aliasInput.value = data.alias || "";
    
    const bioInput = document.getElementById("editBio");
    if (bioInput) bioInput.value = data.bio || "";
    
    // Load their existing interests and build the grid
    currentInterests = data.interests || [];
    renderInterestOptions();
};

window.closeEditProfile = function() {
    const modal = document.getElementById("editProfileModal");
    if (modal) modal.classList.remove("active");
};

// 2. Render the Clickable Options Grid (Using your CSS classes)
function renderInterestOptions() {
    const container = document.getElementById("interestOptionsContainer");
    if (!container) return;
    container.innerHTML = "";
    
    AVAILABLE_INTERESTS.forEach(interest => {
        const isSelected = currentInterests.includes(interest);
        const span = document.createElement("span");
        
        span.textContent = interest;
        
        // Add the base CSS class
        span.className = "interest-option";
        
        // Add the 'selected' CSS class if the user picked it
        if (isSelected) {
            span.classList.add("selected");
        }
        
        span.onclick = () => toggleInterest(interest);
        container.appendChild(span);
    });
}

// 3. Handle Clicking an Option (Max 3 Logic)
window.toggleInterest = function(interest) {
    const index = currentInterests.indexOf(interest);
    const warning = document.getElementById("interestLimitMsg");

    if (index > -1) {
        // If they click an already selected item, remove it
        currentInterests.splice(index, 1);
        if (warning) warning.style.display = "none";
    } else {
        // If they click a new item, check the limit first
        if (currentInterests.length >= 3) {
            if (warning) warning.style.display = "block";
            return;
        }
        currentInterests.push(interest);
        if (warning) warning.style.display = "none";
    }
    
    // Re-draw the grid to update colors
    renderInterestOptions();
};

// 4. Save to Database
window.saveProfileChanges = async function() {
    const saveBtn = document.querySelector(".save-text");
    if (saveBtn) saveBtn.textContent = "Saving...";
    
    const aliasInput = document.getElementById("editAlias");
    const bioInput = document.getElementById("editBio");
    
    const alias = aliasInput ? aliasInput.value.trim() : "";
    const bio = bioInput ? bioInput.value.trim() : "";

    const userRef = doc(db, "user", currentUser.uid);
    
    // 🔥 Bundle our updates
    let updates = {
        alias: alias,
        bio: bio,
        interests: currentInterests
    };

    // 🔥 If they chose a new picture, add it to the update bundle
    if (newProfilePicBase64) {
        updates.profilePic = newProfilePicBase64;
    }
    
    try {
        await updateDoc(userRef, updates);
        
        // Update local storage so the UI updates instantly everywhere
        let localUser = JSON.parse(localStorage.getItem("user"));
        if (localUser) {
            localUser.alias = alias;
            if (newProfilePicBase64) localUser.profilePic = newProfilePicBase64;
            localStorage.setItem("user", JSON.stringify(localUser));
        }

        // Reset the variable for next time
        newProfilePicBase64 = null; 
        closeEditProfile();
    } catch (error) {
        console.error("Error updating profile:", error);
        alert("Failed to save profile changes.");
    } finally {
        if (saveBtn) saveBtn.textContent = "Save";
    }
};

// =========================================
// SETTINGS: SLIDE ANIMATION LOGIC
// =========================================

window.openSettings = function() {
    const modal = document.getElementById("editSettingsModal");
    if (modal) {
        modal.classList.add("active");
    }
    // Close dropdown
    const dropdown = document.getElementById("dropdownMenu");
    if (dropdown) dropdown.style.display = "none";
};

window.closeSettings = function() {
    const modal = document.getElementById("editSettingsModal");
    if (modal) {
        modal.classList.remove("active");
    }
};

window.handleLogout = function() {
    if(confirm("Are you sure you want to log out?")) {
        // Your existing logout logic here
        localStorage.removeItem("user");
        window.location.href = "login.html";
    }
};

// =========================================
// LEGAL MODAL: PDF.JS MULTI-PAGE LOGIC
// =========================================

let currentLegalPdf = null; 
let currentLegalPageNumber = 1;
let isLegalPageRendering = false;

// 1. Dedicated function to render a specific page
async function renderLegalPage(pageNum) {
    if (!currentLegalPdf || isLegalPageRendering) return;
    isLegalPageRendering = true;

    const canvas = document.getElementById("legalPdfCanvas");
    const ctx = canvas.getContext("2d");
    const container = document.querySelector(".pdf-viewer-container");

    try {
        const page = await currentLegalPdf.getPage(pageNum);

        // Scale to fit mobile width
        const containerWidth = container.clientWidth - 40;
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scale = containerWidth / unscaledViewport.width;
        const viewport = page.getViewport({ scale: scale });

        // 🔥 HIGH-RES FIX START
        const outputScale = window.devicePixelRatio || 1;

        // 1. Make internal resolution massive
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);

        // 2. Keep visual CSS size normal to fit the screen
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";

        // 3. Tell PDF.js to scale the text up
        const transform = outputScale !== 1 
            ? [outputScale, 0, 0, outputScale, 0, 0] 
            : null;

        const renderContext = {
            canvasContext: ctx,
            transform: transform,
            viewport: viewport
        };
        // 🔥 HIGH-RES FIX END

        await page.render(renderContext).promise;

        // Update the text and button states
        document.getElementById("legalPageIndicator").textContent = `Page ${pageNum} of ${currentLegalPdf.numPages}`;
        
        // Disable 'Previous' on page 1, disable 'Next' on last page
        const prevBtn = document.getElementById("legalPrevPage");
        const nextBtn = document.getElementById("legalNextPage");
        
        if (prevBtn) {
            prevBtn.disabled = pageNum <= 1;
            prevBtn.style.opacity = pageNum <= 1 ? "0.5" : "1";
        }
        if (nextBtn) {
            nextBtn.disabled = pageNum >= currentLegalPdf.numPages;
            nextBtn.style.opacity = pageNum >= currentLegalPdf.numPages ? "0.5" : "1";
        }

    } catch (error) {
        console.error("Error rendering Legal Page:", error);
    }

    isLegalPageRendering = false;
}

// 2. Open the modal and load the PDF
window.openTerms = async function() {
    const modal = document.getElementById("legalModal");
    const container = document.querySelector(".pdf-viewer-container");

    if (modal) modal.classList.add("active");

    try {
        // Ensure this path matches where your terms.pdf is stored!
        const loadingTask = pdfjsLib.getDocument("/assets/terms.pdf"); 
        currentLegalPdf = await loadingTask.promise;
        
        // Reset to page 1 every time it opens
        currentLegalPageNumber = 1; 
        await renderLegalPage(currentLegalPageNumber);

    } catch (error) {
        console.error("Error loading Terms PDF:", error);
        const canvas = document.getElementById("legalPdfCanvas");
        const controls = document.querySelector(".pdf-controls");
        
        if (canvas) canvas.style.display = "none";
        if (controls) controls.style.display = "none";
        
        if (container && !container.innerHTML.includes("Could not load")) {
            container.innerHTML += `<p style="color:red; text-align:center; margin-top:20px;">Could not load terms. Please try again later.</p>`;
        }
    }
};

// 3. Clean up when closed
window.closeTerms = function() {
    const modal = document.getElementById("legalModal");
    const canvas = document.getElementById("legalPdfCanvas");

    if (modal) modal.classList.remove("active");

    setTimeout(() => {
        if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        if (currentLegalPdf) {
            currentLegalPdf.destroy();
            currentLegalPdf = null;
        }
    }, 400);
};

// 4. Attach Click Listeners to the Buttons
document.addEventListener("DOMContentLoaded", () => {
    const prevBtn = document.getElementById("legalPrevPage");
    const nextBtn = document.getElementById("legalNextPage");

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (currentLegalPageNumber <= 1) return;
            currentLegalPageNumber--;
            renderLegalPage(currentLegalPageNumber);
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (!currentLegalPdf || currentLegalPageNumber >= currentLegalPdf.numPages) return;
            currentLegalPageNumber++;
            renderLegalPage(currentLegalPageNumber);
        });
    }
});

// =========================================
// NOTIFICATIONS: SLIDE ANIMATION LOGIC
// =========================================

window.openNotifications = function() {
    const modal = document.getElementById("notificationsModal");
    if (modal) {
        modal.classList.add("active");
    }
};

window.closeNotifications = function() {
    const modal = document.getElementById("notificationsModal");
    if (modal) {
        modal.classList.remove("active");
    }
};

function loadUserNotesRealtime(userId) {
    const container = document.getElementById("notesFeed");
    if (!container) return;

    const postsQuery = query(
        collection(db, "posts"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc")
    );

    onSnapshot(postsQuery, (snapshot) => {
        container.innerHTML = "";

        if (snapshot.empty) {
            container.innerHTML = `
                <div style="text-align:center; padding: 40px 20px; color: #6B7280;">
                    You haven't posted any notes yet.
                </div>
            `;
            return;
        }

        snapshot.forEach((docSnap) => {
            container.appendChild(createProfileNoteCard(docSnap));
        });
    }, (error) => {
        console.error("Failed to load user notes:", error);
    });
}

function createProfileNoteCard(docSnap) {
    const post = docSnap.data();
    const postId = docSnap.id;

    // 1. Calculate vote states for UI classes
    const userVote = post.userVotes?.[currentUser?.uid] || 0;
    const upClass = userVote === 1 ? "upvoted" : "";
    const downClass = userVote === -1 ? "downvoted" : "";

    const card = document.createElement("div");
    card.className = "note-card";
    card.dataset.postid = postId;
    
    // 2. Fallback logic: Alias > Username > Name
    const displayName = post.alias || post.username || post.name || "Unknown";
    
    // 3. Profile Picture Fallback
    // If the user changed their pic, post.profilePic will be the new string.
    // If not, it stays as the original Google URL or the default placeholder.
    const displayPic = post.profilePic || "/photos/profile.jpg";
    
    // 4. Build interest pills for the card
    let interestsHTML = "";
    if (post.interests && Array.isArray(post.interests)) {
        post.interests.forEach(tag => {
            interestsHTML += getInterestPillHTML(tag);
        });
    }

    card.innerHTML = `
        <div class="note-preview">
        <div class="note-preview-text">${post.description || "No description"}</div>
        <p class="note-code">${post.subject || ""}</p>
        <h3 class="note-title">${post.title || "Untitled"}</h3>
        
        <!-- Updated Author Layout -->
        <div class="note-author" style="display:flex; align-items: flex-start; gap:12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #F3F4F6;">
            <!-- Increased Profile Pic Size -->
            <img src="${displayPic}" class="author-pic" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; flex-shrink: 0;">
            
            <!-- Column for Name and Pills -->
            <div style="display:flex; flex-direction:column; gap:4px;">
                <span style="font-weight: 700; font-size: 14px; color: #111827;">${displayName}</span>
                <div class="note-interests" style="display: flex; flex-wrap: wrap;">
                    ${interestsHTML}
                </div>
            </div>
        </div>

            <div class="note-footer">
                <div class="vote-box">
                    <button class="vote-btn upvote-btn ${upClass}" type="button"><span class="material-icons">arrow_upward</span></button>
                    <span class="vote-count">${post.upvotes || 0} | ${post.downvotes || 0}</span>
                    <button class="vote-btn downvote-btn ${downClass}" type="button"><span class="material-icons">arrow_downward</span></button>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button class="comment-icon-btn" type="button"><span class="material-icons">chat_bubble_outline</span></button>
                    <button class="delete-btn" type="button">Delete</button>
                </div>
            </div>
        </div>
    `;

    // --- YOUR EXISTING EVENT LISTENERS ---
    // Do not remove these; they handle your 800+ line project logic
    card.addEventListener("click", () => openPost(postId));

    const commentBtn = card.querySelector(".comment-icon-btn");
    if (commentBtn) {
        commentBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openPost(postId, true);
        });
    }

    const deleteBtn = card.querySelector(".delete-btn");
    if (deleteBtn) {
        deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            openDeleteModal(postId);
        });
    }

    const upBtn = card.querySelector(".upvote-btn");
    if (upBtn) {
        upBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await vote(e, postId, 1);
        });
    }

    const downBtn = card.querySelector(".downvote-btn");
    if (downBtn) {
        downBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            await vote(e, postId, -1);
        });
    }

    return card;
}

let votingInProgress = false;
async function vote(event, postId, value) {
    event.stopPropagation();
    if (votingInProgress) return;
    votingInProgress = true;
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        votingInProgress = false;
        return alert("Login first");
    }

    const postRef = doc(db, "posts", postId);
    try {
        await runTransaction(db, async (transaction) => {
            const snap = await transaction.get(postRef);
            if (!snap.exists()) return;
            const post = snap.data();
            let userVotes = post.userVotes || {};
            let voteRewards = post.voteRewards || {};
            let currentVote = userVotes[user.uid] || 0;
            let alreadyRewarded = voteRewards[user.uid] || false;
            let givePoints = false;
            let updates = {};

            if (currentVote === value) {
                delete userVotes[user.uid];
                if (value === 1) updates.upvotes = increment(-1);
                else updates.downvotes = increment(-1);
            } else {
                userVotes[user.uid] = value;
                if (!alreadyRewarded) {
                    givePoints = true;
                    voteRewards[user.uid] = true;
                }
                if (value === 1) {
                    updates.upvotes = increment(1);
                    if (currentVote === -1) updates.downvotes = increment(-1);
                }
                if (value === -1) {
                    updates.downvotes = increment(1);
                    if (currentVote === 1) updates.upvotes = increment(-1);
                }
            }

            updates.userVotes = userVotes;
            updates.voteRewards = voteRewards;
            transaction.update(postRef, updates);
            if (givePoints) await addPoints(user.uid, 1);
        });
    } catch (err) {
        console.error("Vote error:", err);
    }
    votingInProgress = false;
}

const openComments = new Set();

async function openPost(postId, showComments = false) {
    if (showComments) openComments.add(postId);
    const modal = document.getElementById("postModal");
    const body = document.getElementById("modalBody");

    const ref = doc(db, "posts", postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const post = snap.data();

    const userId = currentUser ? currentUser.uid : null;
    let upClass = "";
    let downClass = "";
    if (userId && post.userVotes && post.userVotes[userId] === 1) upClass = "upvoted";
    else if (userId && post.userVotes && post.userVotes[userId] === -1) downClass = "downvoted";

    // Enhanced comments rendering with 3-dot report menu
    const commentsHTML = (post.comments || [])
        .map((c, index) => `
            <div class="comment" style="position: relative; padding-right: 30px;">
                <strong style="font-size: 12px; color: #111827;">${c.username}</strong>
                <div style="font-size: 14px; margin-top: 2px;">${c.text}</div>
                
                <!-- 3-Dot Menu for Reporting -->
                <div class="comment-menu-container" style="position: absolute; top: 5px; right: 5px;">
                    <button class="comment-more-btn" style="background:none; border:none; cursor:pointer; color:#9CA3AF;" onclick="event.stopPropagation(); toggleCommentMenu(${index})">
                        <span class="material-icons" style="font-size: 18px;">more_vert</span>
                    </button>
                    <div id="commentMenu-${index}" class="comment-dropdown" style="display:none; position:absolute; right:0; background:white; border:1px solid #E5E7EB; border-radius:8px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1); z-index:100;">
                        <button onclick="openReportModal('${postId}', 'comment', ${index})" style="padding: 8px 16px; border:none; background:none; width:100%; text-align:left; font-size:12px; cursor:pointer; color:#EF4444; font-weight:600;">Report</button>
                    </div>
                </div>
            </div>
        `)
        .join("");

    body.innerHTML = `
        <h3>${post.title}</h3>
        <p style="font-size:12px; color:#6B7280;">${post.subject || ""}</p>
        <div class="modal-text">${post.description || ""}</div>
        <div class="note-footer" style="margin-top: 24px;">
            <div class="vote-box">
                <button class="vote-btn upvote-btn ${upClass}" type="button"><span class="material-icons">arrow_upward</span></button>
                <span class="vote-count">${post.upvotes || 0} | ${post.downvotes || 0}</span>
                <button class="vote-btn downvote-btn ${downClass}" type="button"><span class="material-icons">arrow_downward</span></button>
            </div>
            <div style="display:flex; align-items:center; gap:8px;">
                <button class="comment-icon-btn" type="button"><span class="material-icons">chat_bubble_outline</span></button>
                <button class="delete-btn" type="button">Delete</button>
            </div>
        </div>
        <div class="comment-section" style="display: ${openComments.has(postId) ? "block" : "none"}; margin-top: 16px;">
            <div class="comments-list">${commentsHTML}</div>
            <div class="comment-input-wrapper">
                <input type="text" class="comment-input" placeholder="Write a comment...">
                <button class="comment-btn" type="button">Post</button>
            </div>
        </div>
    `;
  

    body.querySelector(".upvote-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        await vote(e, postId, 1);
        await openPost(postId, showComments);
    });

    body.querySelector(".downvote-btn").addEventListener("click", async (e) => {
        e.stopPropagation();
        await vote(e, postId, -1);
        await openPost(postId, showComments);
    });

    body.querySelector(".comment-icon-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        toggleComments(e, null, postId);
    });

    body.querySelector(".delete-btn").addEventListener("click", (e) => {
        e.stopPropagation();
        openDeleteModal(postId);
    });

    const commentBtn = body.querySelector(".comment-btn");
    if (commentBtn) {
        commentBtn.addEventListener("click", (e) => submitComment(e, postId, commentBtn));
    }

    modal.style.display = "flex";
    if (showComments) {
        setTimeout(() => {
            const input = body.querySelector('.comment-input');
            if (input) input.focus();
        }, 100);
    }
}

function closeModal() {
    const modal = document.getElementById("postModal");
    if (modal) modal.style.display = "none";
}
window.closeModal = closeModal;

function toggleComments(event, btn, postId) {
    if (event) event.stopPropagation();
    const commentSection = document.querySelector('#modalBody .comment-section');
    if (!commentSection) return;
    if (commentSection.style.display === "block") {
        commentSection.style.display = "none";
        openComments.delete(postId);
    } else {
        commentSection.style.display = "block";
        openComments.add(postId);
    }
}

async function submitComment(event, postId, btn) {
    if (event) event.stopPropagation();
    
    // 1. Get the UID from localStorage
    const authUser = JSON.parse(localStorage.getItem("user"));
    if (!authUser?.uid) return alert("You must be logged in to comment!");

    // 🔥 2. ADMIN RESTRICTION CHECK (Gets fresh data from Firestore)
    const userRef = doc(db, "user", authUser.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const userData = userSnap.data();
        
        // Check Full Lockdown OR specific Comment Block
        if (userData.state === "suspended" || userData.restrictions?.commentBlock === true) {
            const restrictionMsg = document.getElementById("restrictionMessage");
            const restrictionModalWrapper = document.getElementById("restrictionModalWrapper");

            if (restrictionMsg && restrictionModalWrapper) {
                restrictionMsg.textContent = "Your account is restricted from commenting. Reason: " + (userData.suspendReason || "Admin action.");
                restrictionModalWrapper.style.display = "flex";
            }
            
            const input = btn.previousElementSibling;
            if (input) input.value = ""; // Clear their typed text
            return; // STOP HERE
        }
    }

    // 3. PROCEED WITH SAVING COMMENT (Your existing logic)
    const userData = userSnap.exists() ? userSnap.data() : {};
    const input = btn.previousElementSibling;
    const text = input.value.trim();
    if (!text) return;

    const comment = {
        uid: authUser.uid, 
        username: userData.alias || authUser.username || authUser.name || "Anonymous",
        text: text,
        timestamp: new Date().toISOString()
    };

    const postRef = doc(db, "posts", postId);
    try {
        await updateDoc(postRef, {
            comments: arrayUnion(comment)
        });
        input.value = "";
        openComments.add(postId);
        await openPost(postId, true); // Refresh modal
    } catch (err) {
        console.error("Comment save failed:", err);
    }
}

async function deleteNote(postId) {
    try {
        await deleteDoc(doc(db, "posts", postId));
        const card = document.querySelector(`.note-card[data-postid="${postId}"]`);
        if (card) card.remove();
        closeModal();
    } catch (err) {
        console.error("Failed to delete note:", err);
        alert("Unable to delete note right now.");
    }
}

function openDeleteModal(postId) {
    pendingDeletePostId = postId;
    const modal = document.getElementById("deleteConfirmModal");
    if (modal) modal.classList.add("active");
}

window.closeDeleteModal = function () {
    pendingDeletePostId = null;
    const modal = document.getElementById("deleteConfirmModal");
    if (modal) modal.classList.remove("active");
};

window.confirmDeleteNote = async function () {
    if (!pendingDeletePostId) return;
    await deleteNote(pendingDeletePostId);
    window.closeDeleteModal();
};

const modalElement = document.getElementById("postModal");
if (modalElement) {
    modalElement.addEventListener("click", (event) => {
        if (event.target === modalElement) closeModal();
    });
}

// =========================================
// UNIVERSAL REPORTING SYSTEM (RE-USABLE)
// =========================================

let pendingReportData = null;

// 1. Toggle Post/Comment 3-dot menus
window.togglePostMenu = function(postId) {
    const menu = document.getElementById(`postMenu-${postId}`);
    const allMenus = document.querySelectorAll('.post-dropdown, .comment-dropdown');
    allMenus.forEach(m => { if(m.id !== `postMenu-${postId}`) m.style.display = 'none'; });
    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
};

window.toggleCommentMenu = function(index) {
    const menu = document.getElementById(`commentMenu-${index}`);
    const allMenus = document.querySelectorAll('.comment-dropdown, .post-dropdown');
    allMenus.forEach(m => { if(m.id !== `commentMenu-${index}`) m.style.display = 'none'; });
    if (menu) menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
};

// 2. Global Validator for the Submit Button
window.validateReport = function() {
    const description = document.getElementById("reportDescription").value;
    const submitBtn = document.getElementById("submitReportBtn");
    const indicator = document.getElementById("charCount");
    const isReasonSelected = selectedReason !== "";
   
    const isUnderLimit = description.length <= 100;

    // Button is enabled if a reason is picked AND the description is 100 chars or less
    if (isReasonSelected && isUnderLimit) {
        submitBtn.disabled = false;
        submitBtn.style.opacity = "1";
        submitBtn.style.cursor = "pointer";
    } else {
        submitBtn.disabled = true;
        submitBtn.style.opacity = "0.5";
        submitBtn.style.cursor = "not-allowed";
    }

    // Update character counter display
    if (indicator) {
        indicator.textContent = `${description.length} / 100`;
        indicator.style.color = isUnderLimit ? "#9CA3AF" : "#EF4444";
    }
};

// 3. Trigger validation on text input
window.handleReportInput = function(val) {
    validateReport();
};

// 4. Open/Close Modal Logic
window.openReportModal = function(targetId, type, commentIndex = null) {
    pendingReportData = { targetId, type, commentIndex };
    
    const modal = document.getElementById("reportModal");
    const title = document.getElementById("reportModalTitle");
    
    if (modal) {
        modal.classList.add("active"); 
        if (title) title.textContent = type === 'post' ? "Report Post" : "Report Comment";
    }
    
    // 🔥 Closes all menus so they don't peek through the modal
    document.querySelectorAll('.comment-dropdown, .post-dropdown').forEach(m => m.style.display = 'none');
    
    validateReport(); // Ensure button state is correct on open
};

window.closeReportModal = function() {
    pendingReportData = null;
    const modal = document.getElementById("reportModal");
    if (modal) modal.classList.remove("active");
    
    // Reset Form
    document.getElementById("reportDescription").value = "";
    validateReport(); 
};

// 5. Final Submission to Firebase
window.submitReport = async function() {
    if (!pendingReportData || !currentUser) return;
    
    const submitBtn = document.getElementById("submitReportBtn");
    const description = document.getElementById("reportDescription").value;

    // 🔒 1. Disable button immediately to prevent double-clicks
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";

    try {
        await addDoc(collection(db, "reports"), {
            targetId: pendingReportData.targetId,
            targetType: pendingReportData.type,
            commentIndex: pendingReportData.commentIndex,
            reporterUid: currentUser.uid,
            reason: selectedReason, 
            description: description,
            status: "pending",
            timestamp: serverTimestamp()
        });

        // ✅ 2. Close the modal IMMEDIATELY
        closeReportModal();

        // 📱 3. Show the mobile toast for feedback
        showToast("Report sent successfully");

    } catch (error) {
        console.error("Error submitting report:", error);
        showToast("Error sending report");
        
        // Re-enable button only if it fails so they can try again
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit Report";
    }
};

// 1. The Reason Array
const REPORT_REASONS = ["Spam", "Harassment", "Hate Speech", "Inappropriate Content"];
let selectedReason = "";

// 2. Render function (Call this inside openReportModal)
function renderReportOptions() {
    const listContainer = document.getElementById("reportOptionsList");
    if (!listContainer) return;

    listContainer.innerHTML = REPORT_REASONS.map(reason => `
        <div class="report-option-item" onclick="handleSelectReason('${reason}')">
            ${reason}
        </div>
    `).join("");
}

// 3. Selection Handler
window.handleSelectReason = function(reason) {
    selectedReason = reason;
    document.getElementById("selectedReasonText").textContent = reason;
    document.getElementById("reportTrigger").classList.add("active");
    
    // Close list and validate button
    toggleReportDropdown();
    validateReport(); 
};

window.toggleReportDropdown = function() {
    const list = document.getElementById("reportOptionsList");
    list.classList.toggle("show");
};

// 4. Update your existing open/close functions
const originalOpen = window.openReportModal;
window.openReportModal = function(targetId, type, commentIndex = null) {
    originalOpen(targetId, type, commentIndex); // Run your existing logic
    selectedReason = ""; 
    document.getElementById("selectedReasonText").textContent = "Select a reason";
    document.getElementById("reportTrigger").classList.remove("active");
    renderReportOptions(); // Build the new list
};