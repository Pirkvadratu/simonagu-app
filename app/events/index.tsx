import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Button, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { collection, getDocs, query, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/firebase/firebaseConfig';

export default function EventsScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

 useEffect(() => {
  const q = query(collection(db, 'events'));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEvents(data);
    setFiltered(data);
    setLoading(false);
  });

  // Cleanup listener when component unmounts
  return () => unsubscribe();
}, []);
  // Search filter
  useEffect(() => {
    if (!search) setFiltered(events);
    else {
      const filteredEvents = events.filter(event =>
        event.title.toLowerCase().includes(search.toLowerCase())
      );
      setFiltered(filteredEvents);
    }
  }, [search, events]);

  // Center map on selected event
  const handleFocusEvent = (event: any) => {
    if (!event.location) return;
    mapRef.current?.animateToRegion({
      latitude: event.location.latitude,
      longitude: event.location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  // Delete event (only for owner)
  const handleDelete = async (eventId: string, userId: string) => {
    if (userId !== auth.currentUser?.uid) {
      Alert.alert("Permission denied", "You can only delete your own events.");
      return;
    }

    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'events', eventId));
              setEvents(prev => prev.filter(e => e.id !== eventId));
              setFiltered(prev => prev.filter(e => e.id !== eventId));
              Alert.alert("Deleted", "Event deleted successfully!");
            } catch (err) {
              console.error("Error deleting event:", err);
              Alert.alert("Error", "Failed to delete event.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <Text style={{ textAlign: 'center', marginTop: 50 }}>Loading events...</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Events Map</Text>

      <TextInput
        style={styles.search}
        placeholder="Search by title..."
        value={search}
        onChangeText={setSearch}
      />

      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 52.3702,
          longitude: 4.8952,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {filtered.map(event =>
          event.location ? (
            <Marker
              key={event.id}
              coordinate={event.location}
              title={event.title}
              description={event.description}
              pinColor={event.userId === auth.currentUser?.uid ? 'blue' : 'red'}
            />
          ) : null
        )}
      </MapView>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => handleFocusEvent(item)}>
              <Text style={styles.title}>{item.title}</Text>
              <Text>{item.description}</Text>
              <Text style={styles.owner}>
                By: {item.userId === auth.currentUser?.uid ? 'You' : item.userId}
              </Text>
            </TouchableOpacity>

            {item.userId === auth.currentUser?.uid && (
              <Button
                title="Delete"
                color="red"
                onPress={() => handleDelete(item.id, item.userId)}
              />
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginTop: 10 },
  search: { borderWidth: 1, borderRadius: 8, padding: 10, margin: 10 },
  map: { width: '100%', height: 300, marginBottom: 10 },
  card: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' },
  title: { fontSize: 16, fontWeight: '600' },
  owner: { fontStyle: 'italic', marginTop: 4 },
});