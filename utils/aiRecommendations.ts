// AI-powered event recommendation system
import { Event, Personality } from '@/types';
import { getCalendarEvents, isUserAvailable } from './calendar';
import { Timestamp } from 'firebase/firestore';
import { calculateCircadianScore, getCurrentTimeOfDay, getEventEnergyLevel } from './dayNightAdaptation';

/**
 * Calculate personality match score for an event
 */
function calculatePersonalityScore(event: Event, personality: Personality | null): number {
  if (!personality) return 0.5; // Neutral score if no personality data

  const category = (event.category || "").toLowerCase();
  let score = 0;

  // Category matching with personality interests
  const categoryMapping: Record<string, keyof typeof personality.interests> = {
    calm: 'music', // Calm events might match music interest
    nightlife: 'music',
    culture: 'literature',
    social: 'music',
    music: 'music',
    sport: 'sport',
    literature: 'literature',
    movies: 'movies',
  };

  const interestKey = categoryMapping[category];
  if (interestKey && personality.interests[interestKey] > 0) {
    score += (personality.interests[interestKey] / 8) * 0.4; // 40% weight
  }

  // MBTI trait matching
  // E/I: Social events favor E, calm events favor I
  if (category.includes('social') || category.includes('nightlife')) {
    score += (personality.traits.E / 4) * 0.2; // 20% weight
  } else if (category.includes('calm') || category.includes('culture')) {
    score += (personality.traits.I / 4) * 0.2;
  }

  // N/S: Culture/abstract events favor N, practical events favor S
  if (category.includes('culture') || category.includes('literature')) {
    score += (personality.traits.N / 4) * 0.2;
  } else if (category.includes('sport') || category.includes('social')) {
    score += (personality.traits.S / 4) * 0.2;
  }

  return Math.min(score, 1.0); // Cap at 1.0
}

/**
 * Calculate distance score (closer = higher score)
 */
function calculateDistanceScore(distance: number | null): number {
  if (distance === null || distance === Infinity) return 0.3; // Neutral if no distance
  
  // Score decreases with distance
  // 0-5km: 1.0, 5-10km: 0.8, 10-20km: 0.6, 20-50km: 0.4, 50km+: 0.2
  if (distance <= 5) return 1.0;
  if (distance <= 10) return 0.8;
  if (distance <= 20) return 0.6;
  if (distance <= 50) return 0.4;
  return 0.2;
}

/**
 * Calculate date/time score (sooner events score higher)
 */
function calculateTimeScore(eventDate: Date | null): number {
  if (!eventDate) return 0.5; // Neutral if no date

  const now = new Date();
  const daysUntil = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Events happening today/tomorrow score highest
  if (daysUntil <= 0) return 1.0; // Today
  if (daysUntil === 1) return 0.9; // Tomorrow
  if (daysUntil <= 7) return 0.8; // This week
  if (daysUntil <= 30) return 0.6; // This month
  return 0.4; // Later
}

/**
 * Calculate calendar availability score
 */
async function calculateCalendarScore(eventDate: Date | null): Promise<number> {
  if (!eventDate) return 0.5; // Neutral if no date

  try {
    const available = await isUserAvailable(eventDate, 2);
    return available ? 1.0 : 0.3; // High score if available, lower if busy
  } catch (error) {
    console.error('Error checking calendar:', error);
    return 0.5; // Neutral on error
  }
}

/**
 * Parse event date from various formats
 */
function parseEventDate(event: Event): Date | null {
  if (event.date?.toDate) {
    return event.date.toDate();
  }
  if (event.startDate?.toDate) {
    return event.startDate.toDate();
  }
  if (event.eventDate) {
    if (typeof event.eventDate === 'string') {
      return new Date(event.eventDate);
    }
    if (event.eventDate?.toDate) {
      return event.eventDate.toDate();
    }
  }
  return null;
}

/**
 * Calculate distance between two points
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
}

/**
 * Interface for scored event
 */
export interface ScoredEvent extends Event {
  aiScore: number;
  energyLevel?: 'low' | 'medium' | 'high';
  scoreBreakdown?: {
    personality: number;
    distance: number;
    time: number;
    calendar: number;
    circadian: number;
  };
}

/**
 * Get AI-powered event recommendations
 * Combines personality, distance, time, and calendar availability
 */
export async function getAIRecommendations(
  events: Event[],
  personality: Personality | null,
  userLocation: { latitude: number; longitude: number } | null,
  limit: number = 10
): Promise<ScoredEvent[]> {
  const scoredEvents: ScoredEvent[] = [];

  for (const event of events) {
    // Calculate distance
    let distance: number | null = null;
    if (userLocation && event.location) {
      distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        event.location.latitude,
        event.location.longitude
      );
    }

    // Parse event date
    const eventDate = parseEventDate(event);

    // Calculate individual scores
    const personalityScore = calculatePersonalityScore(event, personality);
    const distanceScore = calculateDistanceScore(distance);
    const timeScore = calculateTimeScore(eventDate);
    const calendarScore = await calculateCalendarScore(eventDate);
    
    // Day/Night adaptation score
    const currentTimeOfDay = getCurrentTimeOfDay();
    const circadianScore = calculateCircadianScore(event, currentTimeOfDay);

    // Weighted combination (can be adjusted)
    const weights = {
      personality: 0.30, // 30% - personality match
      distance: 0.20,    // 20% - convenience
      time: 0.15,        // 15% - sooner is better
      calendar: 0.15,    // 15% - availability
      circadian: 0.20,   // 20% - time of day adaptation
    };

    const aiScore =
      personalityScore * weights.personality +
      distanceScore * weights.distance +
      timeScore * weights.time +
      calendarScore * weights.calendar +
      circadianScore * weights.circadian;

    scoredEvents.push({
      ...event,
      aiScore,
      distance: distance || undefined,
      energyLevel: getEventEnergyLevel(event),
      scoreBreakdown: {
        personality: personalityScore,
        distance: distanceScore,
        time: timeScore,
        calendar: calendarScore,
        circadian: circadianScore,
      },
    });
  }

  // Sort by AI score (highest first)
  scoredEvents.sort((a, b) => b.aiScore - a.aiScore);

  // Return top recommendations
  return scoredEvents.slice(0, limit);
}

/**
 * Get match quality label based on AI score
 */
export function getMatchLabel(score: number): string {
  if (score >= 0.8) return 'Perfect Match';
  if (score >= 0.6) return 'Great Match';
  if (score >= 0.4) return 'Good Match';
  return 'Suggested';
}

/**
 * Get match quality color based on AI score
 */
export function getMatchColor(score: number): string {
  if (score >= 0.8) return '#1F6C6B'; // Teal
  if (score >= 0.6) return '#4CAF50'; // Green
  if (score >= 0.4) return '#FF9800'; // Orange
  return '#9E9E9E'; // Grey
}

