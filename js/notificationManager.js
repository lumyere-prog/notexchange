import { db } from "/firebase/firebase-client.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* =========================
   SEND NOTIFICATION
   ========================= */
export async function sendNotification({ post, currentUser, type }) {
  console.log("🔥 sendNotification CALLED");

  console.log("POST USERID:", post?.userId);
  console.log("CURRENT USERID:", currentUser?.uid);

  try {
    if (!post?.userId) {
      console.error("❌ Missing post.userId");
      return;
    }

    if (post.userId === currentUser.uid) {
      console.log("🚫 Self-notification blocked");
      return;
    }

    console.log("📡 Writing notification to Firestore...");

    const ref = await addDoc(
      collection(db, "user", post.userId, "notifications"),
      {
        type,
        fromUserId: currentUser.uid,
       fromUsername: currentUser.name || "Unknown",
        fromProfilePic: currentUser.photo || "/photos/profile.jpg",
        postId: post.id,
        postTitle: post.title,
        read: false,
        createdAt: serverTimestamp()
      }
    );

    console.log("✅ Notification saved:", ref.id);

  } catch (err) {
    console.error("🔥 FIRESTORE ERROR:", err);
  }
}