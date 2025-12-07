import { useRouter } from 'expo-router';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { auth } from '../firebase/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

//NEW IMPORTS for Firestore
import { db } from '../firebase/firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';

// Helper to convert Firebase errors to user-friendly messages
const getErrorMessage = (error: any): string => {
  const code = error?.code || '';
  
  if (code.includes('email-already-in-use')) {
    return 'This email is already registered. Please sign in instead.';
  }
  if (code.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('weak-password')) {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code.includes('network-request-failed')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  
  return 'Unable to create account. Please try again.';
};

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignup = async () => {
    setError('');
    
    // Validation
    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter a password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      //Create Firestore profile document
      await setDoc(doc(db, 'profiles', user.uid), {
        name: name.trim(),
        email: user.email,
        createdAt: new Date(),
      });

      //Redirect to login
      router.push('/login');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign Up</Text>

      <TextInput
        placeholder="Name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setError('');
        }}
        style={[styles.input, error && styles.inputError]}
        editable={!loading}
      />

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError('');
        }}
        style={[styles.input, error && styles.inputError]}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      
      <TextInput
        placeholder="Password (min 6 characters)"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError('');
        }}
        style={[styles.input, error && styles.inputError]}
        secureTextEntry
        editable={!loading}
      />
      
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#C85B5B" />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignup}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Sign Up</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.push('/login')}
        disabled={loading}
      >
        <Text style={styles.linkText}>Already have an account? Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    padding: 14,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#C85B5B',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  error: {
    color: '#C85B5B',
    fontSize: 14,
    flex: 1,
  },
  button: {
    backgroundColor: '#1F6C6B',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  linkText: {
    color: '#1F6C6B',
    fontSize: 14,
  },
});
