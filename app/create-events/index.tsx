import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Modal, ScrollView, Image, ActivityIndicator, Alert } from 'react-native';
import MapView, { Marker, MapPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '@/firebase/firebaseConfig';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

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
  
  // Date and time fields - default to tomorrow at 6 PM for convenience
  const getDefaultDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  const [eventDate, setEventDate] = useState(getDefaultDate());
  const [eventTime, setEventTime] = useState('18:00');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Helper to parse date and time into Firestore Timestamp
  const parseEventDateTime = (dateStr: string, timeStr: string): Timestamp | null => {
    if (!dateStr || !timeStr) return null;
    
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(dateStr);
      date.setHours(hours || 0, minutes || 0, 0, 0);
      
      // Check if date is valid
      if (isNaN(date.getTime())) return null;
      
      return Timestamp.fromDate(date);
    } catch (err) {
      console.error('Error parsing date/time:', err);
      return null;
    }
  };

  const handleAddEvent = async () => {
    setError('');
    
    // Better validation with specific messages
    if (!title.trim()) {
      setError('Please enter an event title.');
      return;
    }
    if (!description.trim()) {
      setError('Please enter an event description. Description is required.');
      return;
    }
    if (description.trim().length < 10) {
      setError('Event description must be at least 10 characters long.');
      return;
    }
    if (!location) {
      setError('Please pick a location on the map.');
      return;
    }
    if (!category) {
      setError('Please choose a category for your event.');
      return;
    }
    
    // Validate date/time format
    if (eventTime && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(eventTime)) {
      setError('Please enter a valid time format (HH:MM, e.g., 18:30).');
      return;
    }

    setUploading(true);
    try {
      const eventDateTime = parseEventDateTime(eventDate, eventTime);
      
      if (eventDate && eventTime && !eventDateTime) {
        setError('Invalid date or time. Please check your input.');
        setUploading(false);
        return;
      }
      
      // Upload image if selected
      let imageUrl: string | null = null;
      if (imageUri) {
        imageUrl = await uploadImage(imageUri);
        if (!imageUrl) {
          setError('Failed to upload image. Please try again.');
          setUploading(false);
          return;
        }
      }
      
      const eventData: {
        title: string;
        description: string;
        category: string;
        location: { latitude: number; longitude: number };
        userId?: string;
        createdAt: any;
        imageUrl?: string;
        date?: Timestamp;
        startDate?: Timestamp;
      } = {
        title: title.trim(),
        description: description.trim(),
        category,
        location,
        userId: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      };
      
      // Add image URL if uploaded
      if (imageUrl) {
        eventData.imageUrl = imageUrl;
      }
      
      // Add date/time if provided
      if (eventDateTime) {
        eventData.date = eventDateTime;
        eventData.startDate = eventDateTime;
      }

      await addDoc(collection(db, 'events'), eventData);

      // Success - navigate back
      router.push('/');
    } catch (err: unknown) {
      console.error('Error creating event:', err);
      
      // Better error messages - Type-safe error handling
      if (err && typeof err === 'object' && 'code' in err) {
        const error = err as { code?: string };
        if (error.code === 'permission-denied') {
          setError('You do not have permission to create events. Please check your account.');
        } else if (error.code === 'unavailable') {
          setError('Service temporarily unavailable. Please check your internet connection and try again.');
        } else {
          setError('Failed to create event. Please try again.');
        }
      } else {
        setError('Failed to create event. Please try again.');
      }
    } finally {
      setUploading(false);
    }
  };
  
  // Helper to format date for display
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateStr;
    }
  };
  
  // Quick date selection helpers
  const setQuickDate = (daysFromNow: number) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    setEventDate(date.toISOString().split('T')[0]);
    setShowDatePicker(false);
  };

  const handleMapPress = (event: MapPressEvent) => {
    setLocation(event.nativeEvent.coordinate);
  };

  const handleFindLocation = async () => {
    if (!address) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is required to find addresses.");
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
        Alert.alert("Not Found", "Could not find this address. Please try a different one.");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to find location. Please try again.");
    }
  };

  // Image picker handler
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photos to add event images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Upload image to Firebase Storage
  const uploadImage = async (uri: string): Promise<string | null> => {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `events/${user.uid}/${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (err) {
      console.error('Error uploading image:', err);
      return null;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.pageTitle}>Create Event</Text>

      <Text style={styles.label}>
        Event Title <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        placeholder="Enter event title... (Required)"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <Text style={styles.label}>
        Event Description <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        placeholder="Describe your event... (Required)"
        value={description}
        onChangeText={setDescription}
        style={[styles.input, styles.textArea]}
        multiline={true}
        numberOfLines={4}
        textAlignVertical="top"
      />
      {description.length > 0 && (
        <Text style={styles.charCount}>
          {description.length} characters
        </Text>
      )}

      {/* IMAGE PICKER */}
      <Text style={styles.subtitle}>Event Image (Optional)</Text>
      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} />
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => setImageUri(null)}
          >
            <Ionicons name="close-circle" size={24} color="#C85B5B" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.imagePickerButton} onPress={pickImage}>
          <Ionicons name="image-outline" size={32} color="#1F6C6B" />
          <Text style={styles.imagePickerText}>Add Event Image</Text>
        </TouchableOpacity>
      )}

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

      {/* DATE AND TIME PICKER */}
      <Text style={styles.subtitle}>When is the event? (Optional)</Text>
      <View style={styles.dateTimeRow}>
        <TouchableOpacity 
          style={styles.dateTimeButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateTimeText}>
            {eventDate ? formatDateDisplay(eventDate) : '📅 Select Date'}
          </Text>
        </TouchableOpacity>
        <TextInput
          placeholder="Time (HH:MM)"
          value={eventTime}
          onChangeText={setEventTime}
          style={[styles.input, styles.timeInput]}
          keyboardType="numeric"
        />
      </View>
      
      {/* Quick date buttons */}
      <View style={styles.quickDateRow}>
        <TouchableOpacity 
          style={styles.quickDateButton}
          onPress={() => setQuickDate(0)}
        >
          <Text style={styles.quickDateText}>Today</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickDateButton}
          onPress={() => setQuickDate(1)}
        >
          <Text style={styles.quickDateText}>Tomorrow</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.quickDateButton}
          onPress={() => setQuickDate(7)}
        >
          <Text style={styles.quickDateText}>Next Week</Text>
        </TouchableOpacity>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date</Text>
            <TextInput
              placeholder="YYYY-MM-DD"
              value={eventDate}
              onChangeText={setEventDate}
              style={styles.input}
              keyboardType="numeric"
            />
            <Text style={styles.hintText}>Format: YYYY-MM-DD (e.g., 2024-12-25)</Text>
            <View style={styles.modalButtonRow}>
              <Button title="Cancel" onPress={() => setShowDatePicker(false)} />
              <Button title="Done" onPress={() => setShowDatePicker(false)} />
            </View>
          </View>
        </View>
      </Modal>

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

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={20} color="#C85B5B" />
          <Text style={styles.error}>{error}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
        onPress={handleAddEvent}
        disabled={uploading}
      >
        {uploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>Create Event</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 20 },
  pageTitle: { fontSize: 24, textAlign: "center", marginBottom: 20 },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  required: {
    color: "#C85B5B",
    fontWeight: "bold",
  },
  input: {
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
    fontSize: 16,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 10,
  },
  charCount: {
    fontSize: 12,
    color: "#666",
    textAlign: "right",
    marginTop: -8,
    marginBottom: 12,
  },
  map: { width: "100%", height: 250, marginBottom: 20 },
  error: { color: "#C85B5B", marginBottom: 10, flex: 1 },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  
  // Image picker styles
  imagePickerButton: {
    borderWidth: 2,
    borderColor: '#1F6C6B',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  imagePickerText: {
    marginTop: 8,
    color: '#1F6C6B',
    fontSize: 14,
    fontWeight: '600',
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 4,
  },
  
  // Submit button
  submitButton: {
    backgroundColor: '#1F6C6B',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

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
  
  // date/time picker
  dateTimeRow: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 6,
    backgroundColor: "#f9f9f9",
  },
  dateTimeText: {
    fontSize: 14,
    color: "#333",
  },
  timeInput: {
    flex: 0.5,
    marginBottom: 0,
  },
  quickDateRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#1F6C6B",
    borderRadius: 6,
    backgroundColor: "#fff",
  },
  quickDateText: {
    textAlign: "center",
    color: "#1F6C6B",
    fontSize: 12,
    fontWeight: "600",
  },
  
  // modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
  },
  hintText: {
    fontSize: 12,
    color: "#666",
    marginTop: 5,
    marginBottom: 10,
  },
});
