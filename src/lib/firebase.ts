import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAK5WgD7I0aibzs72b3tlxs_ff08dfYtfA",
  authDomain: "as-warriors.firebaseapp.com",
  projectId: "as-warriors",
  storageBucket: "as-warriors.firebasestorage.app",
  messagingSenderId: "987760498973",
  appId: "1:987760498973:web:84af9da4dece5c6382e9f4",
  measurementId: "G-Y7HW3E6B5Y"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);