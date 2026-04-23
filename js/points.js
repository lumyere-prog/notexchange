import { 
  doc, 
  runTransaction, 
  increment, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

import { db } from "/firebase/firebase-client.js";

// 🔥 CONFIG
const DAILY_CAP = 50;

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
export async function spendPoints(userId, cost){

  const userRef = doc(db, "user", userId);

  return await runTransaction(db, async (transaction) => {

    const snap = await transaction.get(userRef);
    if (!snap.exists()) return false;

    const user = snap.data();

    if ((user.points || 0) < cost){
      alert("Not enough points!");
      return false;
    }

    transaction.update(userRef, {
      points: increment(-cost)
    });

    return true;
  });
}

// ===============================
// DAILY REWARD (NO CAP)
// ===============================
export async function giveDailyReward(userId, amount = 20){

  const userRef = doc(db, "user", userId);

  await runTransaction(db, async (transaction) => {
    transaction.update(userRef, {
      points: increment(amount)
    });
  });
}