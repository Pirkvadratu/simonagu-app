import React, { useState } from 'react';
import { View, TextInput, Button, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { auth } from '../firebase/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Helper to convert Firebase errors to user-friendly messages
const getErrorMessage = (error: any): string => {
  const code = error?.code || '';
  const message = error?.message || 'An error occurred';
  
  if (code.includes('user-not-found') || code.includes('wrong-password')) {
    return 'Invalid email or password. Please try again.';
  }
  if (code.includes('invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (code.includes('network-request-failed')) {
    return 'Network error. Please check your internet connection and try again.';
  }
  if (code.includes('too-many-requests')) {
    return 'Too many failed attempts. Please try again later.';
  }
  if (code.includes('user-disabled')) {
    return 'This account has been disabled. Please contact support.';
  }
  
  return 'Unable to sign in. Please check your credentials and try again.';
};

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    // Clear previous errors
    setError('');
    
    // Validation
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.push('/');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError(''); // Clear error when typing
        }}
        style={[styles.input, error && styles.inputError]}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!loading}
      />
      
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setError(''); // Clear error when typing
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
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => router.push('/signup')}
        disabled={loading}
      >
        <Text style={styles.linkText}>Don't have an account? Sign up</Text>
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
