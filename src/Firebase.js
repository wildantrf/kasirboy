import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDl1iOYAi71_XoxsxCeEIMIGawRfT3wVok",
  authDomain: "kasirboy-5800c.firebaseapp.com",
  projectId: "kasirboy-5800c",
  storageBucket: "kasirboy-5800c.appspot.com",
  messagingSenderId: "337894839496",
  appId: "1:337894839496:web:f8aa75f096505fcbd201fd",
  measurementId: "G-G6M84MWY7R"
};
 const app = initializeApp(firebaseConfig);
 export const db = getFirestore();