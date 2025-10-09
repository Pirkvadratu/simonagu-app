import { auth } from "./firebaseConfig.js";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

async function testSignup() {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, "test@example.com", "123456");
    console.log("User created:", userCredential.user);
  } catch (error) {
    console.error("Signup Error:", error.message);
  }
}

async function testLogin() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, "test@example.com", "123456");
    console.log("Logged in:", userCredential.user);
  } catch (error) {
    console.error("Login Error:", error.message);
  }
}

// Run signup first, then login
await testSignup();
await testLogin();
