import { db } from "/firebase/firebase-client.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
console.trace("🔥 sendNotification called from:");

export async function sendNotification({ post, currentUser, type }) {
  console.log("🔥 sendNotification CALLED");
  
  try {
    if (!post?.userId) {
      console.error("❌ Missing post.userId");
      return;
    }

    // 👇 SAFE SELF-NOTIFICATION CHECK
    if (currentUser?.uid && post.userId === currentUser.uid) {
      console.log("🚫 Self-notification blocked");
      return;
    }

    console.log("📡 Writing notification to Firestore...");
    
    // 1. Determine if this is an Admin action
    // It's Admin if currentUser is missing (system) or has the 'admin' UID
    const isAdmin = !currentUser || currentUser.uid === "admin";

    const data = {
      type,
      postId: post.id,
      postTitle: post.title,
      read: false,
      createdAt: serverTimestamp(),
      // 2. Set the sender info based on Admin status
      fromUserId: isAdmin ? "admin" : currentUser.uid,
      fromUsername: isAdmin ? "Admin" : (currentUser.name || currentUser.username || "Unknown User"),
      fromProfilePic: isAdmin ? "/photos/logofinal.jpg" : (currentUser.photo || "/photos/profile.jpg")
    };

    const ref = await addDoc(
      collection(db, "user", post.userId, "notifications"),
      data
    );

    console.log("✅ Notification saved with ID:", ref.id);

  } catch (err) {
    console.error("🔥 FIRESTORE ERROR:", err);
  }
}