import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/firebase/firebaseConfig';
import { useRouter } from 'expo-router';

const CATEGORIES = ["social", "calm", "nightlife", "culture"];

export default function CreateEventScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleAddEvent = async () => {
    if (!title || !description || !location || !category) {
      setError("Please fill all fields, pick a location, and choose a category.");
      return;
    }

    try {
      await addDoc(collection(db, 'events'), {
        title,
        description,
        category,
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

  const handleMapPress = (event: MapPressEvent) => {
    setLocation(event.nativeEvent.coordinate);
  };

  const handleFindLocation = async () => {
    if (!address) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission denied");
        return;
      }

      const results = await Location.geocodeAsync(address);

      if (results.length > 0) {
        const { latitude, longitude } = results[0];
        setLocation({ latitude, longitude });

        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } else {
        alert("Address not found");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Create Event</Text>

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

      {/* CATEGORY PICKER */}
      <Text style={styles.subtitle}>Choose category</Text>
      <View style={styles.categoryRow}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.catButton,
              category === cat && styles.catSelected
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text style={styles.catText}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ADDRESS INPUT */}
      <TextInput
        placeholder="Type address"
        value={address}
        onChangeText={setAddress}
        style={styles.input}
      />
      <Button title="Find Location" onPress={handleFindLocation} />

      {/* SHOW SELECTED LOCATION */}
      <Text style={{ marginVertical: 10 }}>
        {location
          ? `Picked: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
          : "Tap map to pick location"}
      </Text>

      {/* MAP */}
      <MapView
        ref={mapRef}
        style={styles.map}
        onPress={handleMapPress}
        initialRegion={{
          latitude: 52.3702,
          longitude: 4.8952,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
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
  pageTitle: { fontSize: 24, textAlign: "center", marginBottom: 20 },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
  },
  map: { width: "100%", height: 250, marginBottom: 20 },
  error: { color: "red", marginBottom: 10 },

  // category buttons
  subtitle: { fontWeight: "600", marginBottom: 5 },
  categoryRow: { flexDirection: "row", marginBottom: 10, flexWrap: "wrap" },
  catButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 20,
    marginRight: 6,
    marginBottom: 6,
  },
  catSelected: {
    backgroundColor: "#1F6C6B",
    borderColor: "#1F6C6B",
  },
  catText: { color: "#000", fontWeight: "600" },
});
