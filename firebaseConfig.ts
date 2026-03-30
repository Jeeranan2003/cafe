import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

console.log("Firebase Config:", {
  projectId: firebaseConfig.projectId,
  databaseId: (firebaseConfig as any).firestoreDatabaseId || "(default)"
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || "(default)");
