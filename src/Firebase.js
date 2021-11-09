import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  
};
 const app = initializeApp(firebaseConfig);
 export const db = getFirestore();
 export const storage = getStorage();
