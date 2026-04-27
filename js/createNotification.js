import { db } from "/firebase/firebase-client.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export async function createNotification({
  toUserId,
  fromUser,
  type,
  postId,
  postTitle
}) {
  try {
    await addDoc(collection(db, "users", toUserId, "notifications"), {
      type,
      fromUser,
      postId,
      postTitle,
      read: false,
      createdAt: serverTimestamp()
    });
  } catch (err) {
    console.error("❌ Notification error:", err);
  }
}