
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration is injected by the App Hosting environment.
// You can directly use process.env.FIREBASE_CONFIG
const firebaseConfigStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
if (!firebaseConfigStr) {
  throw new Error("Firebase config not found. Please set NEXT_PUBLIC_FIREBASE_CONFIG environment variable.");
}
const firebaseConfig = JSON.parse(firebaseConfigStr);


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
