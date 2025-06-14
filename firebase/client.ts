// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "your apikey",
  authDomain: "aicruit-783cf.firebaseapp.com",
  projectId: "aicruit-783cf",
  storageBucket: "aicruit-783cf.firebasestorage.app",
  messagingSenderId: "499639912941",
  appId: "1:499639912941:web:2c6475a7c14aa08efdffe4",
  measurementId: "G-YLHTYKTD65"
};

// Initialize Firebase
const app = !getApps.length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
