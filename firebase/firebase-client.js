
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjjeB3xXOufkT66oQwBkcotu7cz-OvUqM",
  authDomain: "notexchangedb.firebaseapp.com",
  projectId: "notexchangedb",
  storageBucket: "notexchangedb.firebasestorage.app"
};

import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// ✅ INIT APP
const app = initializeApp(firebaseConfig);

// ✅ AUTH (ONLY ONCE)
export const auth = getAuth(app);

// ✅ FIRESTORE
export const db = getFirestore(app);

// ✅ GOOGLE PROVIDER
export const provider = new GoogleAuthProvider();

export const storage = getStorage(app);

// ✅ PERSISTENCE (AFTER auth exists)
setPersistence(auth, browserLocalPersistence);