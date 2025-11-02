import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth } from '../firebase/firebaseConfig';

//NEW IMPORTS for Firestore
import { db } from '../firebase/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

export default function SignupScreen() {
  // NEW STATE for name
  const [name, setName] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  //UPDATED handle Signup to create Firestore profile
  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError("Please fill all fields.");
      return;
    }

    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      //Create Firestore profile document
      await setDoc(doc(db, 'profiles', user.uid), {
        name: name,
        email: user.email,
        createdAt: new Date(),
      });

      //Redirect to login
      router.push('/login');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signup</Text>

      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={setName}
        style={styles.input}
      />

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Signup" onPress={handleSignup} />
      <Button title="Go to Login" onPress={() => router.push('/login')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20, textAlign: 'center' },
  input: { borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 5 },
  error: { color: 'red', marginBottom: 10 },
});
