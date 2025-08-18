
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  "projectId": "inventomax-map1n",
  "appId": "1:398017582932:web:a86ea2ba764d4cba1a5ac1",
  "storageBucket": "inventomax-map1n.firebasestorage.app",
  "apiKey": "AIzaSyDLF2z0B4wwJmBLxAnD26_m-4WkdlFwzEM",
  "authDomain": "inventomax-map1n.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "398017582932"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
