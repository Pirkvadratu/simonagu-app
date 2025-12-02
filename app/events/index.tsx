// app/events/index.tsx

import { auth, db } from "@/firebase/firebaseConfig";
import * as Location from "expo-location";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

export default function EventsScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [sortedEvents, setSortedEvents] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [personality, setPersonality] = useState<any | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const mapRef = useRef<MapView>(null);

  // ------------------------------
  // DISTANCE CALCULATION (Haversine formula)
  // ------------------------------
  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  // ------------------------------
  // 1. GET USER LOCATION
  // ------------------------------
  useEffect(() => {
    async function getUserLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("Location permission denied");
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error("Error getting user location:", error);
      }
    }
    getUserLocation();
  }, []);

  // ------------------------------
  // 2. LOAD PERSONALITY FILTER
  // ------------------------------
  useEffect(() => {
    async function loadPersonality() {
      const user = auth.currentUser;
      if (!user) return;

      const snap = await getDoc(doc(db, "Users", user.uid));
      if (snap.exists() && snap.data().personality) {
        setPersonality(snap.data().personality);
      }
    }
    loadPersonality();
  }, []);

  // ------------------------------
  // 3. LOAD EVENTS (User + API)
  // ------------------------------
  useEffect(() => {
    const q = query(collection(db, "events"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setEvents(list);
      setFiltered(list); // show all first load
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ----------------------------------------------------
  // 4. APPLY PERSONALITY FILTER WITH SAFE FALLBACK
  // ----------------------------------------------------
  useEffect(() => {
    if (!personality) {
      setFiltered(events); // no filter → show all
      return;
    }

    const tags = {
      calm: ["calm", "yoga", "wellness", "relax", "nature"],
      nightlife: ["nightlife", "party", "club", "festival"],
      culture: ["culture", "theatre", "museum", "art", "exhibition", "lecture"],
      social: ["social", "meetup", "community", "food", "cooking"],
      music: ["music", "concert", "live", "dj"],
      sport: ["sport", "gym", "run", "fitness"],
      literature: ["books", "literature", "reading", "poetry"],
    };

    const result = events.filter((ev) => {
      const cat = (ev.category || "").toLowerCase();

      if (personality.calm > 0 && tags.calm.includes(cat)) return true;
      if (personality.nightlife > 0 && tags.nightlife.includes(cat)) return true;
      if (personality.culture > 0 && tags.culture.includes(cat)) return true;
      if (personality.social > 0 && tags.social.includes(cat)) return true;
      if (personality.music > 0 && tags.music.includes(cat)) return true;
      if (personality.sport > 0 && tags.sport.includes(cat)) return true;
      if (personality.literature > 0 && tags.literature.includes(cat)) return true;

      return false;
    });

    // --------- SAFETY NET: NEVER RETURN EMPTY ---------
    if (result.length === 0) {
      console.log("⚠ No matches → showing all events");
      setFiltered(events);
      return;
    }

    setFiltered(result);
  }, [events, personality]);

  // ------------------------------
  // 5. SEARCH FILTER
  // ------------------------------
  useEffect(() => {
    if (!search) {
      setFiltered(events);
      return;
    }

    const searchResult = events.filter((ev) =>
      (ev.title || "").toLowerCase().includes(search.toLowerCase())
    );

    setFiltered(searchResult);
  }, [search]);

  // ------------------------------
  // 6. SORT EVENTS BY DISTANCE
  // ------------------------------
  useEffect(() => {
    if (!userLocation || filtered.length === 0) {
      setSortedEvents(filtered);
      return;
    }

    const eventsWithDistance = filtered.map((event) => {
      if (!event.location) {
        return { ...event, distance: Infinity }; // Events without location go to the end
      }

      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        event.location.latitude,
        event.location.longitude
      );

      return { ...event, distance };
    });

    const sorted = [...eventsWithDistance].sort((a, b) => {
      // Events without location go to the end
      if (!a.location) return 1;
      if (!b.location) return -1;
      return a.distance - b.distance;
    });

    setSortedEvents(sorted);
  }, [filtered, userLocation]);

  // ------------------------------
  // MAP FOCUS
  // ------------------------------
  const handleFocusEvent = (event: any) => {
    if (!event.location) return;
    mapRef.current?.animateToRegion({
      latitude: event.location.latitude,
      longitude: event.location.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    });
  };

  // ------------------------------
  // DELETE EVENT
  // ------------------------------
  const handleDelete = async (id: string, userId: string) => {
    if (userId !== auth.currentUser?.uid) {
      Alert.alert("Permission denied", "You can only delete your own events.");
      return;
    }

    await deleteDoc(doc(db, "events", id));
  };

  if (loading) return <Text style={{ textAlign: "center" }}>Loading…</Text>;

  return (
    <View style={styles.container}>
      <Text style={styles.debug}>
        Events: {events.length} | Showing: {filtered.length}
      </Text>

      <TextInput
        style={styles.search}
        placeholder="Search events..."
        value={search}
        onChangeText={setSearch}
      />

      <MapView
        ref={mapRef}
        style={styles.map}
        showsUserLocation={true}
        initialRegion={{
          latitude: 51.4416,
          longitude: 5.4697,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {sortedEvents.map((ev) =>
          ev.location ? (
            <Marker
              key={ev.id}
              coordinate={ev.location}
              title={ev.title}
              description={ev.description}
            />
          ) : null
        )}
      </MapView>

      <FlatList
        data={sortedEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => handleFocusEvent(item)}>
              <Text style={styles.title}>{item.title}</Text>
              <Text>{item.description}</Text>
              <Text>Category: {item.category || "none"}</Text>
              <Text>By: {item.userId}</Text>
            </TouchableOpacity>

            {item.userId === auth.currentUser?.uid && (
              <Button
                title="Delete"
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
  map: { width: "100%", height: 300 },
  search: { margin: 8, borderWidth: 1, padding: 10, borderRadius: 8 },
  title: { fontSize: 16, fontWeight: "600" },
  card: { padding: 10, borderBottomWidth: 1, borderColor: "#ddd" },
  debug: { textAlign: "center", color: "#777", marginTop: 6 },
});
