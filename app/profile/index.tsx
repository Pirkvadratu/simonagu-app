import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '@/firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'profiles', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          console.log('No profile found!');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [auth.currentUser]);

  if (!auth.currentUser) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>You need to log in first.</Text>
        <Button title="Go to Login" onPress={() => router.push('/login')} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Profile</Text>

      {profile ? (
        <>
          <Text>Name: {profile.name}</Text>
          <Text>Email: {auth.currentUser.email}</Text>
        </>
      ) : (
        <Text>No profile data found for this user.</Text>
      )}

      <View style={{ height: 20 }} />

      {/* Create Event button */}
      <Button
        title="Create Event"
        onPress={() => router.push('/create-events')}
      />
      <View style={{ height: 10 }} />

      {/* View Events button */}
      <Button
        title="View Events"
        onPress={() => router.push('/events')}
      />
      <View style={{ height: 10 }} />

      {/* Logout button */}
      <Button
        title="Logout"
        onPress={async () => {
          await auth.signOut();
          router.replace('/');
        }}
      />
    </View>
  );
}
