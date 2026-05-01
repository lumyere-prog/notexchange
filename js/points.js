import { 
  doc, 
  runTransaction, 
  increment, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "/firebase/firebase-client.js";

// 🔥 CONFIG
const DAILY_CAP = 1000; // Updated from 50 to 1000
const REWARD_VALUE = 50; // New config for the daily check-in reward

// ===============================
// CHECK NEW DAY
// ===============================
function isNewDay(lastReset){
  const now = new Date();
  const last = lastReset?.toDate?.() || new Date(0);

  return now.toDateString() !== last.toDateString();
}

// ===============================
// ADD POINTS (WITH DAILY CAP)
// ===============================
export async function addPoints(userId, amount){

  const userRef = doc(db, "user", userId);

  await runTransaction(db, async (transaction) => {

    const snap = await transaction.get(userRef);
    if (!snap.exists()) return;

    const user = snap.data();

    let dailyPoints = user.dailyPoints || 0;
    let lastReset = user.lastReset;

    // 🔄 RESET DAILY
    if (isNewDay(lastReset)) {
      dailyPoints = 0;

      transaction.update(userRef, {
        dailyPoints: 0,
        lastReset: serverTimestamp()
      });
    }

    // 🚫 CAP REACHED
    if (dailyPoints >= DAILY_CAP) {
      console.log("Daily cap reached");
      return;
    }

    // ✅ LIMIT POINTS
    let allowed = Math.min(amount, DAILY_CAP - dailyPoints);

    transaction.update(userRef, {
      points: increment(allowed),
      dailyPoints: increment(allowed),
      lastReset: serverTimestamp()
    });

  });
}
// ===============================
// SPEND POINTS (FOR AI)
// ===============================
export async function spendPoints(db, userId, cost) {

  // ✅ normalize userId (email, uid, or object)
  const id =
    typeof userId === "object"
      ? userId.uid || userId.email
      : userId;

  // 🔥 FIX: use normalized id here
  const userRef = doc(db, "user", id);

  try {

    const success = await runTransaction(db, async (transaction) => {

      const snap = await transaction.get(userRef);
      if (!snap.exists()) return false;

      const user = snap.data();

      console.log("📦 FULL USER DOC:", user);
      console.log("💰 POINTS TYPE:", typeof user.points);
      console.log("💰 RAW POINTS:", user.points);

      const currentPoints = Number(user.points) || 0;

      console.log("👤 RESOLVED USER ID:", id);
      console.log("💰 CURRENT POINTS:", currentPoints);

      if (currentPoints < cost) {
        return false;
      }

      transaction.update(userRef, {
        points: increment(-cost)
      });

      return true;
    });

    return success;

  } catch (err) {
    console.error("❌ spendPoints failed:", err);
    return false;
  }
}
// ===============================
// DAILY REWARD (NO CAP)
// ===============================
// 🔥 UPDATED: Now uses the configured REWARD_VALUE
export async function giveDailyReward(userId) {

  const userRef = doc(db, "user", userId);

  await runTransaction(db, async (transaction) => {
    transaction.update(userRef, {
      points: increment(REWARD_VALUE) // Use the new 50 point config
    });
  });
}