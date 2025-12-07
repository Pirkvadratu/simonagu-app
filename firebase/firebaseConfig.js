import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyBbDGo_7qoLdoGxYKLww5ePX0NSIzPFQfo",
  authDomain: "whatshappeningapp-75e08.firebaseapp.com",
  projectId: "whatshappeningapp-75e08",
  storageBucket: "whatshappeningapp-75e08.firebasestorage.app",
  messagingSenderId: "420951565337",
  appId: "1:420951565337:web:9d61e335040d06c6b87688",
  measurementId: "G-ZLC89WWLQT",
};

export const firebaseApp = initializeApp(firebaseConfig);

export const auth = initializeAuth(firebaseApp, {
  persistence: getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
