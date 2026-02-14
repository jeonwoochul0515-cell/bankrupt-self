// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdhvfwMoJWyMPpM7K9rbGZL34fH3qb8fY",
  authDomain: "bankrupt-self-app.firebaseapp.com",
  projectId: "bankrupt-self-app",
  storageBucket: "bankrupt-self-app.appspot.com",
  messagingSenderId: "457789714015",
  appId: "1:457789714015:web:053355c9f65e67a025b5ea"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
