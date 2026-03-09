// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBfHSJDtobmzj1TY4FwKcRn-dKrq0BlocQ",
  authDomain: "teteruk2.firebaseapp.com",
  projectId: "teteruk2",
  storageBucket: "teteruk2.firebasestorage.app",
  messagingSenderId: "855263100778",
  appId: "1:855263100778:web:e328d801bf82a1f93d2f13"
};

// Ініціалізація
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Експортуємо базу та авторизацію для використання в інших файлах
export { db, auth };