// Main screen - Map view with navigation
import { auth, db } from "@/firebase/firebaseConfig";
import * as Location from "expo-location";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Button,
  Dimensions,
  FlatList,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Event, Personality, GroupedEvents, DateRangeFilter } from "@/types";
import { getAIRecommendations, ScoredEvent, getMatchLabel, getMatchColor } from "@/utils/aiRecommendations";
import { 
  getEventEnergyLevel, 
  getEnergyLevelLabel, 
  getEnergyLevelIcon, 
  getEnergyLevelColor,
  getCurrentTimeOfDay,
  getTimeOfDayDescription,
  getTimeOfDayEmoji,
  TimeOfDay
} from "@/utils/dayNightAdaptation";

export default function HomeScreen() {
  const [events, setEvents] = useState<Event[]>([]);
  const [filtered, setFiltered] = useState<Event[]>([]);
  const [sortedEvents, setSortedEvents] = useState<Event[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<ScoredEvent[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showList, setShowList] = useState(true); // Toggle between map and list
  const [showMenu, setShowMenu] = useState(false); // Toggle navigation menu
  const [showFilters, setShowFilters] = useState(false); // Toggle filter panel
  const [dayNightMode, setDayNightMode] = useState<TimeOfDay | 'auto'>('auto'); // Day/night adaptation mode
  
  // Advanced filter states
  const CATEGORIES = ["social", "calm", "nightlife", "culture"];
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [distanceRadius, setDistanceRadius] = useState<number | null>(null); // in km, null = no filter
  const [dateRange, setDateRange] = useState<DateRangeFilter>('all');

  const mapRef = useRef<MapView>(null);
  
  // Get screen dimensions
  const screenHeight = Dimensions.get('window').height;
  const searchBarHeight = 100; // Approximate height of search bar and filter banner
  const availableHeight = screenHeight - searchBarHeight;
  const initialMapHeight = availableHeight * 0.45;
  const expandedMapHeight = availableHeight * 0.85;
  
  // Animation for list slide down and map expansion
  const listSlideY = useSharedValue(0);
  const mapHeight = useSharedValue(initialMapHeight);
  
  useEffect(() => {
    if (showList) {
      // Slide up to show list, shrink map
      listSlideY.value = withTiming(0, {
        duration: 350,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
      mapHeight.value = withTiming(initialMapHeight, {
        duration: 350,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
    } else {
      // Slide down to hide list, expand map
      listSlideY.value = withTiming(800, {
        duration: 350,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
      mapHeight.value = withTiming(expandedMapHeight, {
        duration: 350,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      });
    }
  }, [showList, initialMapHeight, expandedMapHeight]);
  
  const animatedListStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: listSlideY.value }],
      opacity: withTiming(showList ? 1 : 0, { duration: 300 }),
    };
  });
  
  const animatedMapStyle = useAnimatedStyle(() => {
    return {
      height: mapHeight.value,
    };
  });

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
  // 3. LOAD EVENTS
  // ------------------------------
  useEffect(() => {
    const q = query(collection(db, "events"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const list = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setEvents(list);
      setFiltered(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ------------------------------
  // 4. APPLY FILTERS (Personality + Search + Advanced Filters)
  // ------------------------------
  useEffect(() => {
    let result = [...events];

    // Apply personality filter first (optional, can be overridden by manual category selection)
    if (personality && selectedCategories.length === 0) {
      const tags = {
        calm: ["calm", "yoga", "wellness", "relax", "nature"],
        nightlife: ["nightlife", "party", "club", "festival"],
        culture: ["culture", "theatre", "museum", "art", "exhibition", "lecture"],
        social: ["social", "meetup", "community", "food", "cooking"],
        music: ["music", "concert", "live", "dj"],
        sport: ["sport", "gym", "run", "fitness"],
        literature: ["books", "literature", "reading", "poetry"],
      };

      const personalityFiltered = result.filter((ev) => {
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

      // Only use personality filter if it returns results
      if (personalityFiltered.length > 0) {
        result = personalityFiltered;
      }
    }

    // Apply category filter (manual selection takes precedence over personality)
    if (selectedCategories.length > 0) {
      result = result.filter((ev) => {
        const cat = (ev.category || "").toLowerCase();
        return selectedCategories.some(selected => cat === selected.toLowerCase());
      });
    }

    // Apply distance radius filter
    if (distanceRadius !== null && userLocation) {
      result = result.filter((ev) => {
        if (!ev.location) return false;
        const distance = calculateDistance(
          userLocation.latitude,
          userLocation.longitude,
          ev.location.latitude,
          ev.location.longitude
        );
        return distance <= distanceRadius;
      });
    }

    // Apply date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      const monthFromNow = new Date(today);
      monthFromNow.setMonth(monthFromNow.getMonth() + 1);
      
      const dayOfWeek = now.getDay();
      const daysUntilWeekend = dayOfWeek === 0 ? 0 : 6 - dayOfWeek;
      const weekend = new Date(today);
      weekend.setDate(weekend.getDate() + daysUntilWeekend);
      const weekendEnd = new Date(weekend);
      weekendEnd.setDate(weekendEnd.getDate() + 2);

      result = result.filter((ev) => {
        let eventDate: Date | null = null;
        
        if (ev.date?.toDate) {
          eventDate = ev.date.toDate();
        } else if (ev.startDate?.toDate) {
          eventDate = ev.startDate.toDate();
        } else if (ev.eventDate) {
          eventDate = typeof ev.eventDate === 'string' 
            ? new Date(ev.eventDate) 
            : ev.eventDate.toDate?.() || null;
        }

        if (!eventDate || isNaN(eventDate.getTime())) {
          return dateRange === 'all'; // Include events without date only if 'all' is selected
        }

        const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
        
        switch (dateRange) {
          case 'today':
            return eventDay.getTime() === today.getTime();
          case 'tomorrow':
            return eventDay.getTime() === tomorrow.getTime();
          case 'weekend':
            return eventDay >= weekend && eventDay < weekendEnd;
          case 'week':
            return eventDay >= today && eventDay <= weekFromNow;
          case 'month':
            return eventDay >= today && eventDay <= monthFromNow;
          default:
            return true;
        }
      });
    }

    // Apply search filter
    if (search) {
      result = result.filter((ev) =>
        (ev.title || "").toLowerCase().includes(search.toLowerCase())
      );
    }

    setFiltered(result);
  }, [events, personality, search, selectedCategories, distanceRadius, dateRange, userLocation]);

  // ------------------------------
  // 6. GROUP EVENTS BY TIME
  // ------------------------------
  const groupEventsByTime = (events: Event[]): GroupedEvents => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekend = new Date(today);
    const dayOfWeek = now.getDay();
    const daysUntilWeekend = dayOfWeek === 0 ? 0 : 6 - dayOfWeek;
    weekend.setDate(weekend.getDate() + daysUntilWeekend);

    const grouped: GroupedEvents = {
      today: [],
      tomorrow: [],
      weekend: [],
      later: [],
    };

    events.forEach((event) => {
      let eventDate: Date | null = null;
      
      if (event.date?.toDate) {
        eventDate = event.date.toDate();
      } else if (event.startDate?.toDate) {
        eventDate = event.startDate.toDate();
      } else if (event.eventDate) {
        eventDate = typeof event.eventDate === 'string' 
          ? new Date(event.eventDate) 
          : event.eventDate.toDate?.() || null;
      }

      if (!eventDate || isNaN(eventDate.getTime())) {
        grouped.later.push(event);
        return;
      }

      const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      
      if (eventDay.getTime() === today.getTime()) {
        grouped.today.push(event);
      } else if (eventDay.getTime() === tomorrow.getTime()) {
        grouped.tomorrow.push(event);
      } else if (eventDay >= weekend && eventDay < new Date(weekend.getTime() + 2 * 24 * 60 * 60 * 1000)) {
        grouped.weekend.push(event);
      } else {
        grouped.later.push(event);
      }
    });

    return grouped;
  };

  // ------------------------------
  // 7. SORT EVENTS BY DISTANCE
  // ------------------------------
  useEffect(() => {
    if (!userLocation || filtered.length === 0) {
      setSortedEvents(filtered);
      return;
    }

    const eventsWithDistance = filtered.map((event) => {
      if (!event.location) {
        return { ...event, distance: Infinity };
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
      if (!a.location) return 1;
      if (!b.location) return -1;
      return a.distance - b.distance;
    });

    setSortedEvents(sorted);
  }, [filtered, userLocation]);

  // ------------------------------
  // 8. AI RECOMMENDATIONS
  // ------------------------------
  useEffect(() => {
    async function loadAIRecommendations() {
      if (!filtered.length || !userLocation) {
        setAiRecommendations([]);
        return;
      }

      setLoadingRecommendations(true);
      try {
        const recommendations = await getAIRecommendations(
          filtered,
          personality,
          userLocation,
          5 // Top 5 recommendations
        );
        setAiRecommendations(recommendations);
      } catch (error) {
        console.error('Error loading AI recommendations:', error);
        setAiRecommendations([]);
      } finally {
        setLoadingRecommendations(false);
      }
    }

    // Load AI recommendations when user has personality and events exist
    // Personality is not a "filter" - it's used to enhance recommendations
    const hasManualFilters = selectedCategories.length > 0 || distanceRadius !== null || dateRange !== 'all' || search.length > 0;
    if (!hasManualFilters && personality && filtered.length > 0) {
      loadAIRecommendations();
    } else {
      setAiRecommendations([]);
    }
  }, [filtered, personality, userLocation, search, selectedCategories, distanceRadius, dateRange]);

  // ------------------------------
  // MAP FOCUS
  // ------------------------------
  const handleFocusEvent = (event: Event) => {
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

  // ------------------------------
  // RESET FILTERS
  // ------------------------------
  const resetFilters = async () => {
    const user = auth.currentUser;
    
    // Reset all filters
    setSelectedCategories([]);
    setDistanceRadius(null);
    setDateRange('all');
    setSearch('');
    
    if (user) {
      try {
        await updateDoc(doc(db, "Users", user.uid), { personality: null });
        setPersonality(null);
      } catch (error) {
        console.error("Error resetting personality:", error);
      }
    }
  };

  // Check if any manual filters are active (personality is NOT a filter, it enhances recommendations)
  const hasActiveFilters = () => {
    return selectedCategories.length > 0 || 
           distanceRadius !== null || 
           dateRange !== 'all' || 
           search.length > 0;
  };

  // ------------------------------
  // FORMAT DATE
  // ------------------------------
  const formatDate = (date: Timestamp | string | undefined): string | null => {
    if (!date) return null;
    try {
      if (date && typeof date === 'object' && 'toDate' in date) {
        const d = (date as Timestamp).toDate();
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (typeof date === 'string') {
        const d = new Date(date);
        return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1F6C6B" />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  const groupedEvents = groupEventsByTime(sortedEvents);
  const displaySections = [
    { title: "Today", data: groupedEvents.today },
    { title: "Tomorrow", data: groupedEvents.tomorrow },
    { title: "This Weekend", data: groupedEvents.weekend },
    { title: "Later", data: groupedEvents.later },
  ].filter(section => section.data.length > 0);

  // Empty state component
  const EmptyState = ({ message, subMessage }: { message: string; subMessage?: string }) => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📍</Text>
      <Text style={styles.emptyStateText}>{message}</Text>
      {subMessage && <Text style={styles.emptyStateSubText}>{subMessage}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar with Filter Button */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.search}
          placeholder="Search events..."
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          onPress={() => setShowFilters(true)}
          style={[styles.filterButton, hasActiveFilters() && styles.filterButtonActive]}
        >
          <Ionicons 
            name="filter" 
            size={22} 
            color={hasActiveFilters() ? "#fff" : "#1F6C6B"} 
          />
          {hasActiveFilters() && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>
                {[
                  personality ? 1 : 0,
                  selectedCategories.length,
                  distanceRadius !== null ? 1 : 0,
                  dateRange !== 'all' ? 1 : 0,
                ].reduce((a, b) => a + b, 0)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* AI Status Banner - Always visible when personality exists */}
      {personality && (
        <View style={styles.aiStatusBanner}>
          <Ionicons name="sparkles" size={18} color="#1F6C6B" />
          <Text style={styles.aiStatusText}>
            {loadingRecommendations 
              ? 'AI analyzing events...' 
              : aiRecommendations.length > 0 
                ? `AI found ${aiRecommendations.length} perfect matches for you` 
                : 'AI personalization active'}
          </Text>
        </View>
      )}

      {/* Active Filters Banner */}
      {hasActiveFilters() && (
        <View style={styles.filterBanner}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
            {personality && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>🎯 Personalized</Text>
              </View>
            )}
            {selectedCategories.map((cat) => (
              <View key={cat} style={styles.filterChip}>
                <Text style={styles.filterChipText}>{cat}</Text>
              </View>
            ))}
            {distanceRadius !== null && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>📍 Within {distanceRadius} km</Text>
              </View>
            )}
            {dateRange !== 'all' && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>
                  📅 {dateRange.charAt(0).toUpperCase() + dateRange.slice(1)}
                </Text>
              </View>
            )}
            {search.length > 0 && (
              <View style={styles.filterChip}>
                <Text style={styles.filterChipText}>🔍 "{search}"</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity onPress={resetFilters} style={styles.clearAllButton}>
            <Text style={styles.clearAllText}>Clear All</Text>
      </TouchableOpacity>
        </View>
      )}

      {/* Map View - Expands when list is hidden */}
      <Animated.View style={[styles.mapContainer, animatedMapStyle]}>
        <MapView
          ref={mapRef}
          style={styles.map}
          showsUserLocation={true}
          initialRegion={{
            latitude: userLocation?.latitude || 51.4416,
            longitude: userLocation?.longitude || 5.4697,
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
      </Animated.View>

      {/* Toggle List View Button */}
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setShowList(!showList)}
      >
        <Text style={styles.toggleButtonText}>
          {showList ? "📋 Hide List" : "📋 Show List"}
        </Text>
      </TouchableOpacity>

      {/* Events List - Collapsible with Animation */}
      <Animated.View 
        style={[
          styles.listContainer,
          animatedListStyle,
        ]}
        pointerEvents={showList ? 'auto' : 'none'}
      >
          {displaySections.length === 0 ? (
            <EmptyState
              message={search ? "No events match your search" : "No events found"}
              subMessage={search ? "Try a different search term" : "Create an event to get started!"}
            />
          ) : (
            <ScrollView>
              {/* AI Recommendations Section */}
              {aiRecommendations.length > 0 && personality && (
                <View style={styles.aiRecommendationsSection}>
                  <View style={styles.aiRecommendationsHeader}>
                    <Ionicons name="sparkles" size={24} color="#1F6C6B" />
                    <Text style={styles.aiRecommendationsTitle}>AI Recommendations</Text>
                  </View>
                  <Text style={styles.aiRecommendationsSubtitle}>
                    Perfect matches for you based on your personality and schedule
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.aiRecommendationsScroll}>
                    {aiRecommendations.map((item) => {
                      const aiScore = item.aiScore || 0;
                      const matchLabel = getMatchLabel(aiScore);
                      const matchColor = getMatchColor(aiScore);
                      const distanceText = item.distance !== undefined && item.distance !== Infinity
                        ? `${item.distance.toFixed(1)} km`
                        : "";
                      const eventDate = formatDate(item.date || item.startDate || item.eventDate);

                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.aiRecommendationCard}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            router.push(`/events/${item.id}`);
                          }}
                        >
                          {item.imageUrl && (
                            <Image 
                              source={{ uri: item.imageUrl }} 
                              style={styles.aiRecommendationImage}
                              resizeMode="cover"
                            />
                          )}
                          <View style={styles.aiRecommendationContent}>
                            <View style={[styles.aiScoreBadge, { backgroundColor: matchColor }]}>
                              <Text style={styles.aiScoreBadgeText}>{matchLabel}</Text>
                            </View>
                            <Text style={styles.aiRecommendationTitle} numberOfLines={2}>
                              {item.title}
                            </Text>
                            {distanceText && (
                              <Text style={styles.aiRecommendationDistance}>📍 {distanceText}</Text>
                            )}
                            {eventDate && (
                              <Text style={styles.aiRecommendationDate}>📅 {eventDate.split(' ')[0]}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Regular Event Sections */}
              {displaySections.map((section) => (
                <View key={section.title}>
                  <View style={styles.sectionHeaderContainer}>
                    <Text style={styles.sectionHeader}>{section.title}</Text>
                    <Text style={styles.sectionCount}>{section.data.length}</Text>
                  </View>
                  {section.data.map((item: Event) => {
                    const isPersonalityMatch = personality && item.category && (() => {
                      const tags = {
                        calm: ["calm", "yoga", "wellness", "relax", "nature"],
                        nightlife: ["nightlife", "party", "club", "festival"],
                        culture: ["culture", "theatre", "museum", "art", "exhibition", "lecture"],
                        social: ["social", "meetup", "community", "food", "cooking"],
                        music: ["music", "concert", "live", "dj"],
                        sport: ["sport", "gym", "run", "fitness"],
                        literature: ["books", "literature", "reading", "poetry"],
                      };
                      const cat = (item.category || "").toLowerCase();
                      if (personality.calm > 0 && tags.calm.includes(cat)) return true;
                      if (personality.nightlife > 0 && tags.nightlife.includes(cat)) return true;
                      if (personality.culture > 0 && tags.culture.includes(cat)) return true;
                      if (personality.social > 0 && tags.social.includes(cat)) return true;
                      if (personality.music > 0 && tags.music.includes(cat)) return true;
                      if (personality.sport > 0 && tags.sport.includes(cat)) return true;
                      if (personality.literature > 0 && tags.literature.includes(cat)) return true;
                      return false;
                    })();

                    const distanceText = item.distance !== undefined && item.distance !== Infinity
                      ? `${item.distance.toFixed(1)} km away`
                      : item.location
                      ? "Distance unknown"
                      : "No location";

                    const eventDate = formatDate(item.date || item.startDate || item.eventDate);

                    return (
                      <View key={item.id} style={styles.card}>
                        <TouchableOpacity 
                          onPress={() => router.push(`/events/${item.id}`)}
                          activeOpacity={0.7}
                        >
                          {/* Event Image */}
                          {item.imageUrl && (
                            <Image 
                              source={{ uri: item.imageUrl }} 
                              style={styles.cardImage}
                              resizeMode="cover"
                            />
                          )}
                          
                          <View style={styles.cardHeader}>
                            <View style={styles.titleContainer}>
                              <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                              {isPersonalityMatch && personality && (
                                <View style={styles.matchBadge}>
                                  <Text style={styles.matchBadgeText}>⭐</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          
                          {/* Key Info Row - Most Important Info */}
                          <View style={styles.cardKeyInfo}>
                            {eventDate && (
                              <View style={styles.infoBadge}>
                                <Ionicons name="calendar-outline" size={14} color="#666" />
                                <Text style={styles.infoBadgeText}>{eventDate.split(' ')[0]}</Text>
                              </View>
                            )}
                            {item.location && distanceText !== "No location" && (
                              <View style={styles.infoBadge}>
                                <Ionicons name="location-outline" size={14} color="#666" />
                                <Text style={styles.infoBadgeText}>{distanceText.replace(' away', '')}</Text>
                              </View>
                            )}
                            {(() => {
                              const energyLevel = getEventEnergyLevel(item);
                              const energyIcon = getEnergyLevelIcon(energyLevel);
                              const energyColor = getEnergyLevelColor(energyLevel);
                              return (
                                <View style={[styles.infoBadge, { borderColor: energyColor + '40' }]}>
                                  <Text style={[styles.energyIconSmall, { color: energyColor }]}>{energyIcon}</Text>
                                </View>
                              );
                            })()}
                          </View>
                          
                          {/* Category - Subtle */}
                          {item.category && (
                            <View style={styles.categoryBadge}>
                              <Text style={styles.categoryText}>{item.category}</Text>
                            </View>
                          )}
      </TouchableOpacity>

                        {item.userId === auth.currentUser?.uid && (
                          <View style={styles.deleteButtonContainer}>
                            <Button
                              title="Delete"
                              onPress={() => handleDelete(item.id, item.userId)}
                              color="#C85B5B"
                            />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              ))}
            </ScrollView>
          )}
        </Animated.View>

      {/* Menu Button in Top Right */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setShowMenu(!showMenu)}
      >
        <Ionicons 
          name={showMenu ? "close" : "menu"} 
          size={28} 
          color="#fff" 
        />
      </TouchableOpacity>

      {/* Backdrop - Closes menu when clicked */}
      {showMenu && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        />
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Events</Text>
              <TouchableOpacity onPress={() => setShowFilters(false)}>
                <Ionicons name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Categories</Text>
                <View style={styles.filterChipsContainer}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategories.includes(cat);
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.filterChipButton,
                          isSelected && styles.filterChipButtonSelected,
                        ]}
                        onPress={() => {
                          if (isSelected) {
                            setSelectedCategories(selectedCategories.filter((c) => c !== cat));
                          } else {
                            setSelectedCategories([...selectedCategories, cat]);
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.filterChipButtonText,
                            isSelected && styles.filterChipButtonTextSelected,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Distance Radius Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Distance</Text>
                <View style={styles.filterChipsContainer}>
                  {[5, 10, 25, 50, 100].map((km) => (
                    <TouchableOpacity
                      key={km}
                      style={[
                        styles.filterChipButton,
                        distanceRadius === km && styles.filterChipButtonSelected,
                      ]}
                      onPress={() => {
                        setDistanceRadius(distanceRadius === km ? null : km);
                      }}
                    >
                      <Text
                        style={[
                          styles.filterChipButtonText,
                          distanceRadius === km && styles.filterChipButtonTextSelected,
                        ]}
                      >
                        Within {km} km
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.filterChipButton,
                      distanceRadius === null && styles.filterChipButtonSelected,
                    ]}
                    onPress={() => setDistanceRadius(null)}
                  >
                    <Text
                      style={[
                        styles.filterChipButtonText,
                        distanceRadius === null && styles.filterChipButtonTextSelected,
                      ]}
                    >
                      Any Distance
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Date Range</Text>
                <View style={styles.filterChipsContainer}>
                  {[
                    { value: 'all', label: 'All Dates' },
                    { value: 'today', label: 'Today' },
                    { value: 'tomorrow', label: 'Tomorrow' },
                    { value: 'weekend', label: 'This Weekend' },
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' },
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.filterChipButton,
                        dateRange === option.value && styles.filterChipButtonSelected,
                      ]}
                      onPress={() => setDateRange(option.value as any)}
                    >
                      <Text
                        style={[
                          styles.filterChipButtonText,
                          dateRange === option.value && styles.filterChipButtonTextSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterModalFooter}>
              <TouchableOpacity
                style={styles.resetFiltersButton}
                onPress={() => {
                  setSelectedCategories([]);
                  setDistanceRadius(null);
                  setDateRange('all');
                }}
              >
                <Text style={styles.resetFiltersText}>Reset Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => setShowFilters(false)}
              >
                <Text style={styles.applyFiltersText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Navigation Menu - Appears when menu button is pressed */}
      {showMenu && (
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              router.push("/create-events");
            }}
          >
            <Ionicons name="add-circle" size={24} color="#1F6C6B" />
            <Text style={styles.menuItemText}>Create Event</Text>
          </TouchableOpacity>
          
          <View style={styles.menuSeparator} />
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              router.push("/personality/intro");
            }}
          >
            <Ionicons name="sparkles" size={24} color="#1F6C6B" />
            <Text style={styles.menuItemText}>Personalize</Text>
          </TouchableOpacity>
          
          <View style={styles.menuSeparator} />
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMenu(false);
              router.push("/profile");
            }}
          >
            <Ionicons name="person" size={24} color="#1F6C6B" />
            <Text style={styles.menuItemText}>Profile</Text>
      </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: {
    width: "100%",
    overflow: "hidden",
  },
  map: { 
    width: "100%", 
    height: "100%", // Map fills its container
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: "#fff",
  },
  search: { 
    flex: 1,
    margin: 8, 
    borderWidth: 1, 
    padding: 10, 
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  clearButton: {
    padding: 8,
    marginRight: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: "#666",
  },
  filterButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    position: "relative",
  },
  filterButtonActive: {
    backgroundColor: "#1F6C6B",
  },
  filterBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: "#FF5722",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  filterBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#C8E6C9",
  },
  filterChips: {
    flex: 1,
  },
  filterChip: {
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1F6C6B",
  },
  filterChipText: {
    color: "#1F6C6B",
    fontSize: 12,
    fontWeight: "600",
  },
  clearAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearAllText: {
    color: "#1F6C6B",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  toggleButton: {
    backgroundColor: "#1F6C6B",
    padding: 12,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  toggleButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  listContainer: {
    maxHeight: "50%", // List takes max 50% of screen
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  title: { 
    fontSize: 18, 
    fontWeight: "700", 
    flex: 1,
    color: "#1a1a1a",
    lineHeight: 24,
  },
  card: { 
    padding: 16, 
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  cardImage: {
    width: "100%",
    height: 200,
    borderRadius: 12,
    marginBottom: 14,
    backgroundColor: "#f0f0f0",
  },
  cardHeader: {
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  matchBadge: {
    backgroundColor: "#4CAF50",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  matchBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  description: {
    color: "#666",
    marginBottom: 8,
    fontSize: 14,
  },
  cardKeyInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
    alignItems: "center",
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  infoBadgeText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  energyIconSmall: {
    fontSize: 14,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#f0f0f0",
    borderRadius: 4,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 11,
    color: "#888",
    fontWeight: "500",
    textTransform: "capitalize",
  },
  cardInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#888",
    marginRight: 8,
  },
  viewDetailsContainer: {
    marginTop: 8,
    alignItems: "flex-end",
  },
  viewDetailsText: {
    fontSize: 14,
    color: "#1F6C6B",
    fontWeight: "600",
  },
  deleteButtonContainer: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 8,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#f8f8f8",
    marginTop: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#e0e0e0",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "700",
    color: "#333",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    textAlign: "center",
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    minHeight: 200,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  menuButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#1F6C6B",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 999,
  },
  menuContainer: {
    position: "absolute",
    bottom: 80,
    right: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
    minWidth: 180,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  menuSeparator: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 8,
  },
  
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  filterModal: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  filterModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  filterModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  filterModalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  filterChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  filterChipButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 8,
  },
  filterChipButtonSelected: {
    backgroundColor: "#1F6C6B",
    borderColor: "#1F6C6B",
  },
  filterChipButtonText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterChipButtonTextSelected: {
    color: "#fff",
    fontWeight: "600",
  },
  filterModalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    gap: 12,
  },
  resetFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
  },
  resetFiltersText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#1F6C6B",
    alignItems: "center",
  },
  applyFiltersText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "600",
  },
  // AI Recommendations Styles
  aiRecommendationsSection: {
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  aiRecommendationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  aiRecommendationsTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  aiRecommendationsSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  aiRecommendationsScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  aiRecommendationCard: {
    width: 200,
    marginRight: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  aiRecommendationImage: {
    width: "100%",
    height: 120,
    backgroundColor: "#f0f0f0",
  },
  aiRecommendationContent: {
    padding: 12,
  },
  aiScoreBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  aiScoreBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  aiRecommendationTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  aiRecommendationDistance: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  aiRecommendationDate: {
    fontSize: 12,
    color: "#666",
  },
  // Energy Level Badge Styles
  energyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  energyIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  energyLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  // AI Status Banner
  aiStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#E8F5F4",
    borderBottomWidth: 1,
    borderBottomColor: "#d0e8e6",
    gap: 8,
  },
  aiStatusText: {
    fontSize: 13,
    color: "#1F6C6B",
    fontWeight: "500",
    flex: 1,
  },
});
