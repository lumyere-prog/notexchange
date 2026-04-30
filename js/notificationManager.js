import { db } from "/firebase/firebase-client.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
console.trace("🔥 sendNotification called from:");

export async function sendNotification({ post, currentUser, type }) {
  console.log("🔥 sendNotification CALLED");

  console.log("POST USERID:", post?.userId);
  console.log("CURRENT USERID:", currentUser?.uid);

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
    const data = {
      type,
      postId: post.id,
      postTitle: post.title,
      read: false,
      createdAt: serverTimestamp()
    };

    // 👇 ONLY ADD USER INFO IF currentUser EXISTS
    if (currentUser) {
     const isAdmin = !currentUser || currentUser.uid === "admin";

      data.fromUserId = isAdmin ? "admin" : currentUser.uid;
      data.fromUsername = isAdmin ? "Admin" : (currentUser.name || "Unknown");
      data.fromProfilePic = isAdmin
        ? "/photos/logofinal.jpg"
        : (currentUser.photo || "/photos/profile.jpg");
    }

    const ref = await addDoc(
      collection(db, "user", post.userId, "notifications"),
      data
    );

    console.log("✅ Notification saved:", ref.id);

  } catch (err) {
    console.error("🔥 FIRESTORE ERROR:", err);
  }
}