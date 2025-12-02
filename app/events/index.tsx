// app/events/index.tsx

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Button,
  TouchableOpacity,
  Alert,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import {
  collection,
  query,
  deleteDoc,
  doc,
  onSnapshot,
  getDoc,
} from "firebase/firestore";
import { db, auth } from "@/firebase/firebaseConfig";

export default function EventsScreen() {
  const [events, setEvents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [personality, setPersonality] = useState<any | null>(null);

  const mapRef = useRef<MapView>(null);

  // ------------------------------
  // 1. LOAD PERSONALITY FILTER
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
  // 2. LOAD EVENTS (User + API)
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
  // 3. APPLY PERSONALITY FILTER WITH SAFE FALLBACK
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
  // 4. SEARCH FILTER
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
        {filtered.map((ev) =>
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
        data={filtered}
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
