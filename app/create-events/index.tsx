import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'expo-router';

export default function CreateEventScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  // Handle adding event to Firestore
  const handleAddEvent = async () => {
    if (!title || !description || !location) {
      setError('Please fill all fields and pick a location.');
      return;
    }

    try {
      await addDoc(collection(db, 'events'), {
        title,
        description,
        location,
        userId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });
      router.push('/events');
    } catch (err) {
      console.error('Error creating event:', err);
      setError('Failed to create event.');
    }
  };

  // Tap on map to select location
  const handleMapPress = (event: MapPressEvent) => {
    setLocation(event.nativeEvent.coordinate);
  };

  // Geocode typed address
  const handleFindLocation = async () => {
    if (!address) return;

    try {
      // Request permission (required on some devices)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      const results = await Location.geocodeAsync(address);
      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setLocation({ latitude, longitude });

        // Move map to the geocoded location
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        alert('Address not found');
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      alert('Failed to find location');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Event</Text>

      <TextInput
        placeholder="Event Title"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />
      <TextInput
        placeholder="Event Description"
        value={description}
        onChangeText={setDescription}
        style={styles.input}
      />

      <TextInput
        placeholder="Type address to find location"
        value={address}
        onChangeText={setAddress}
        style={styles.input}
      />
      <Button title="Find Location" onPress={handleFindLocation} />

      <Text style={{ marginVertical: 10 }}>
        {location
          ? `Picked: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
          : 'Tap map to select location'}
      </Text>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 52.3702,
          longitude: 4.8952,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
        onPress={handleMapPress}
      >
        {location && <Marker coordinate={location} />}
      </MapView>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button title="Add Event" onPress={handleAddEvent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 24, textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, marginBottom: 10, padding: 10, borderRadius: 5 },
  map: { width: '100%', height: 250, marginBottom: 20 },
  error: { color: 'red', marginBottom: 10 },
});
