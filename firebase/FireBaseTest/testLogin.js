// testLogin.js
import { auth } from "./firebaseConfig.js";
import { signInWithEmailAndPassword } from "firebase/auth";

async function testLogin() {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      "test@example.com",  // your test user email
      "Test1234"           // your test user password
    );
    console.log("Login Success:", userCredential.user.email);
  } catch (error) {
    console.log("Login Error:", error.message);
  }
}

// CALL the function
testLogin();

//(test@example.com with password Test1234)