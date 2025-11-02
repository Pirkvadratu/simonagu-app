import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth'; 
import { auth } from '@/firebase/firebaseConfig';
export default function Index() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser: any) => {
      setUser(currentUser);
    });

    // Clean up the listener when the component unmounts
    return unsubscribe;
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Welcome!</Text>

      {/* Show Login / Sign Up if not logged in */}
      {!user && (
        <>
          <Button title="Login" onPress={() => router.push('/login')} />
          <View style={{ height: 10 }} />
          <Button title="Sign Up" onPress={() => router.push('/signup')} />
        </>
      )}

      {/* Show Profile button if logged in */}
      {user && (
        <Button title="Go to Profile" onPress={() => router.push('/profile')} />
      )}
    </View>
  );
}
