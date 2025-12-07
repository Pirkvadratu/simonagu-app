// Event Details Screen
import { auth, db } from "@/firebase/firebaseConfig";
import * as Location from "expo-location";
import { doc, getDoc, deleteDoc, Timestamp } from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Button,
  Image,
  Share,
  Linking,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Event } from "@/types";
import { addEventToCalendar } from "@/utils/calendar";
import * as Haptics from "expo-haptics";

export default function EventDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [addingToCalendar, setAddingToCalendar] = useState(false);

  // Calculate distance
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
    return R * c;
  };

  // Load event data
  useEffect(() => {
    async function loadEvent() {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        const eventDoc = await getDoc(doc(db, "events", id));
        if (eventDoc.exists()) {
          const eventData = { id: eventDoc.id, ...eventDoc.data() };
          setEvent(eventData);

          // Focus map on event location
          if (eventData.location) {
            mapRef.current?.animateToRegion({
              latitude: eventData.location.latitude,
              longitude: eventData.location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            });
          }
        } else {
          Alert.alert("Error", "Event not found");
          router.back();
        }
      } catch (error) {
        console.error("Error loading event:", error);
        Alert.alert("Error", "Failed to load event");
        router.back();
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [id]);

  // Get user location and calculate distance
  useEffect(() => {
    async function getUserLocation() {
      if (!event?.location) return;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const location = await Location.getCurrentPositionAsync({});
        const userLoc = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        };
        setUserLocation(userLoc);

        const dist = calculateDistance(
          userLoc.latitude,
          userLoc.longitude,
          event.location.latitude,
          event.location.longitude
        );
        setDistance(dist);
      } catch (error) {
        console.error("Error getting location:", error);
      }
    }

    if (event) {
      getUserLocation();
    }
  }, [event]);

  // Format date
  const formatDate = (date: Timestamp | string | undefined): { date: string; time: string } | null => {
    if (!date) return null;
    try {
      if (date?.toDate) {
        const d = date.toDate();
        return {
          date: d.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          time: d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      }
      if (typeof date === "string") {
        const d = new Date(date);
        return {
          date: d.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          }),
          time: d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  // Delete event
  const handleDelete = async () => {
    if (!event || event.userId !== auth.currentUser?.uid) {
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
              await deleteDoc(doc(db, "events", id));
              Alert.alert("Success", "Event deleted");
              router.back();
            } catch (error) {
              console.error("Error deleting event:", error);
              Alert.alert("Error", "Failed to delete event");
            }
          },
        },
      ]
    );
  };

  // Add event to calendar
  const handleAddToCalendar = async () => {
    if (!event) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAddingToCalendar(true);
    await addEventToCalendar(event);
    setAddingToCalendar(false);
  };

  // Share event
  const handleShare = async () => {
    if (!event) return;
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const locationText = event.location
        ? `📍 Location: ${event.location.latitude.toFixed(4)}, ${event.location.longitude.toFixed(4)}`
        : '';
      
      await Share.share({
        message: `${event.title}\n\n${event.description || 'Check out this event!'}\n\n${locationText}`,
        title: event.title,
      });
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  // Open location in maps app
  const handleOpenInMaps = () => {
    if (!event?.location) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const url = `https://maps.google.com/?q=${event.location.latitude},${event.location.longitude}`;
    Linking.openURL(url).catch(err => console.error('Error opening maps:', err));
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1F6C6B" />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Event not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const eventDateTime = formatDate(event.date || event.startDate || event.eventDate);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#1F6C6B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Details</Text>
        <View style={styles.headerRight}>
          {event.userId === auth.currentUser?.uid && (
            <TouchableOpacity onPress={handleDelete} style={styles.deleteButton}>
              <Ionicons name="trash-outline" size={24} color="#C85B5B" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Event Image */}
        {event.imageUrl && (
          <Image 
            source={{ uri: event.imageUrl }} 
            style={styles.eventImage}
            resizeMode="cover"
          />
        )}

        {/* Event Title */}
        <View style={styles.titleSection}>
          <Text style={styles.title}>{event.title}</Text>
          {event.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{event.category}</Text>
            </View>
          )}
        </View>

        {/* Info Cards Container */}
        <View style={styles.infoCardsContainer}>
          {/* Date and Time */}
          {eventDateTime && (
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="calendar-outline" size={26} color="#1F6C6B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date & Time</Text>
                <Text style={styles.infoValue}>{eventDateTime.date}</Text>
                <Text style={styles.infoTime}>{eventDateTime.time}</Text>
              </View>
            </View>
          )}

          {/* Location */}
          {event.location && (
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <Ionicons name="location-outline" size={26} color="#1F6C6B" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Location</Text>
                {distance !== null && (
                  <Text style={styles.infoValue}>
                    {distance.toFixed(1)} km away
                  </Text>
                )}
                <TouchableOpacity onPress={handleOpenInMaps}>
                  <Text style={styles.infoSubTextLink}>
                    Tap for directions →
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.descriptionCard}>
          <Text style={styles.descriptionLabel}>Description</Text>
          {event.description && 
           event.description.trim() && 
           event.description !== "No description available" &&
           event.description.length >= 10 ? (
            <Text style={styles.descriptionText}>{event.description}</Text>
          ) : (
            <View style={styles.emptyDescription}>
              <Ionicons name="document-text-outline" size={32} color="#ccc" />
              <Text style={styles.emptyDescriptionText}>No description available</Text>
              <Text style={styles.emptyDescriptionSubtext}>
                This event was imported from an external source. Click below to view more details on the event website.
              </Text>
              <TouchableOpacity
                style={styles.externalLinkButton}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const url = event.externalUrl || 
                    `https://www.google.com/search?q=${encodeURIComponent(event.title)}`;
                  Linking.openURL(url).catch(err => {
                    console.error('Error opening URL:', err);
                    Alert.alert('Error', 'Could not open the link. Please try again.');
                  });
                }}
              >
                <Ionicons name="link-outline" size={20} color="#1F6C6B" />
                <Text style={styles.externalLinkText}>
                  {event.externalUrl ? 'View Event Details' : 'Search for Event Details'}
                </Text>
                <Ionicons name="open-outline" size={18} color="#1F6C6B" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionCard}>
          <View style={styles.actionButtonsRow}>
            {/* Add to Calendar Button - Always visible and functional */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleAddToCalendar}
              disabled={addingToCalendar}
            >
              {addingToCalendar ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons 
                    name="calendar-outline" 
                    size={20} 
                    color="#fff"
                  />
                  <Text style={styles.actionButtonText}>
                    Add to Calendar
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color="#1F6C6B" />
              <Text style={styles.actionButtonTextSecondary}>Share</Text>
            </TouchableOpacity>

            {/* Open in Maps Button */}
            {event.location && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSecondary]}
                onPress={handleOpenInMaps}
              >
                <Ionicons name="navigate-outline" size={20} color="#1F6C6B" />
                <Text style={styles.actionButtonTextSecondary}>Directions</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Helper text when no date */}
          {(!event.date && !event.startDate && !event.eventDate) && (
            <View style={styles.helperContainer}>
              <Ionicons name="information-circle-outline" size={16} color="#666" />
              <Text style={styles.helperText}>
                This event doesn't have a date. It will be added to your calendar for tomorrow at 6 PM.
              </Text>
            </View>
          )}
        </View>

        {/* Map */}
        {event.location && (
          <View style={styles.mapContainer}>
            <Text style={styles.mapLabel}>Location on Map</Text>
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: event.location.latitude,
                longitude: event.location.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={true}
              zoomEnabled={true}
            >
              <Marker
                coordinate={event.location}
                title={event.title}
                description={event.description}
              />
              {userLocation && (
                <Marker
                  coordinate={userLocation}
                  title="Your Location"
                  pinColor="blue"
                />
              )}
            </MapView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: "#666",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    flex: 1,
    textAlign: "center",
  },
  headerRight: {
    width: 40,
    alignItems: "flex-end",
  },
  deleteButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  eventImage: {
    width: "100%",
    height: 300,
    backgroundColor: "#f0f0f0",
  },
  titleSection: {
    padding: 24,
    paddingBottom: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 16,
    lineHeight: 38,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1F6C6B",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#1F6C6B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "capitalize",
    letterSpacing: 0.5,
  },
  infoCardsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  infoCard: {
    flexDirection: "row",
    padding: 20,
    paddingVertical: 18,
    marginVertical: 6,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    alignItems: "flex-start",
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#E8F5F5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 17,
    color: "#1a1a1a",
    fontWeight: "600",
    marginBottom: 4,
  },
  infoTime: {
    fontSize: 15,
    color: "#1F6C6B",
    fontWeight: "500",
  },
  infoSubText: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  infoSubTextLink: {
    fontSize: 14,
    color: "#1F6C6B",
    marginTop: 4,
    fontWeight: "500",
  },
  descriptionCard: {
    padding: 20,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginVertical: 8,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    minHeight: 80,
  },
  descriptionLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  descriptionText: {
    fontSize: 16,
    color: "#333",
    lineHeight: 26,
  },
  emptyDescription: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyDescriptionText: {
    marginTop: 8,
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  emptyDescriptionSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  externalLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5F5",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    marginTop: 16,
    gap: 10,
    borderWidth: 1.5,
    borderColor: "#1F6C6B",
    shadowColor: "#1F6C6B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  externalLinkText: {
    color: "#1F6C6B",
    fontSize: 15,
    fontWeight: "700",
  },
  mapContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  mapLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  map: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
  },
  actionCard: {
    padding: 20,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  actionButton: {
    flex: 1,
    minWidth: 140,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1F6C6B",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#1F6C6B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonSecondary: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#1F6C6B",
    shadowColor: "#000",
    shadowOpacity: 0.1,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  actionButtonTextSecondary: {
    color: "#1F6C6B",
    fontSize: 15,
    fontWeight: "600",
  },
  actionButtonDisabled: {
    backgroundColor: "#ccc",
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonTextDisabled: {
    color: "#999",
  },
  helperContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    gap: 8,
  },
  helperText: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  mapContainer: {
    padding: 20,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  mapLabel: {
    fontSize: 12,
    color: "#666",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "600",
  },
  map: {
    width: "100%",
    height: 320,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
});

