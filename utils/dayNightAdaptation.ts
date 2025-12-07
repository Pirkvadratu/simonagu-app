// Day/Night Adaptation System
// Personalizes event recommendations based on time of day and circadian rhythms

import { Event } from '@/types';
import { Timestamp } from 'firebase/firestore';

/**
 * Time of day periods
 */
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

/**
 * Energy levels for events
 */
export type EnergyLevel = 'low' | 'medium' | 'high';

/**
 * Energy level configuration for event categories
 */
const categoryEnergyLevels: Record<string, EnergyLevel> = {
  calm: 'low',
  yoga: 'low',
  wellness: 'low',
  meditation: 'low',
  culture: 'low',
  museum: 'low',
  art: 'low',
  literature: 'low',
  reading: 'low',
  social: 'medium',
  meetup: 'medium',
  food: 'medium',
  cooking: 'medium',
  sport: 'high',
  fitness: 'high',
  gym: 'high',
  music: 'high',
  concert: 'high',
  nightlife: 'high',
  party: 'high',
  club: 'high',
  festival: 'high',
};

/**
 * Get current time of day
 */
export function getCurrentTimeOfDay(): TimeOfDay {
  const now = new Date();
  const hour = now.getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Get energy level for an event based on category
 */
export function getEventEnergyLevel(event: Event): EnergyLevel {
  const category = (event.category || '').toLowerCase();
  const description = (event.description || '').toLowerCase();
  const title = (event.title || '').toLowerCase();

  // Check category first
  for (const [key, energy] of Object.entries(categoryEnergyLevels)) {
    if (category.includes(key)) {
      return energy;
    }
  }

  // Check description and title for keywords
  const allText = `${title} ${description}`.toLowerCase();
  
  if (
    allText.includes('party') ||
    allText.includes('club') ||
    allText.includes('festival') ||
    allText.includes('concert') ||
    allText.includes('sport') ||
    allText.includes('fitness') ||
    allText.includes('gym')
  ) {
    return 'high';
  }

  if (
    allText.includes('yoga') ||
    allText.includes('meditation') ||
    allText.includes('wellness') ||
    allText.includes('calm') ||
    allText.includes('museum') ||
    allText.includes('reading') ||
    allText.includes('art')
  ) {
    return 'low';
  }

  return 'medium'; // Default
}

/**
 * Get event time of day from event date
 */
export function getEventTimeOfDay(event: Event): TimeOfDay | null {
  let eventDate: Date | null = null;

  if (event.date?.toDate) {
    eventDate = event.date.toDate();
  } else if (event.startDate?.toDate) {
    eventDate = event.startDate.toDate();
  } else if (event.eventDate) {
    if (typeof event.eventDate === 'string') {
      eventDate = new Date(event.eventDate);
    } else if (event.eventDate?.toDate) {
      eventDate = event.eventDate.toDate();
    }
  }

  if (!eventDate || isNaN(eventDate.getTime())) {
    return null;
  }

  const hour = eventDate.getHours();

  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'night';
}

/**
 * Calculate circadian rhythm score
 * Higher score = better match for current time of day
 */
export function calculateCircadianScore(
  event: Event,
  currentTimeOfDay: TimeOfDay
): number {
  const eventTimeOfDay = getEventTimeOfDay(event);
  const energyLevel = getEventEnergyLevel(event);

  // If event has no time, use energy level to estimate
  if (!eventTimeOfDay) {
    return estimateScoreFromEnergy(energyLevel, currentTimeOfDay);
  }

  // Optimal energy levels for each time period (circadian rhythm)
  const optimalEnergy: Record<TimeOfDay, EnergyLevel[]> = {
    morning: ['low', 'medium'], // Morning: calm activities, light exercise
    afternoon: ['medium', 'high'], // Afternoon: peak energy, social activities
    evening: ['medium', 'high'], // Evening: social events, entertainment
    night: ['high'], // Night: high energy events, nightlife
  };

  // Time of day matching
  let timeMatchScore = 0;
  if (eventTimeOfDay === currentTimeOfDay) {
    timeMatchScore = 1.0; // Perfect match
  } else {
    // Adjacent time periods get partial score
    const timeOrder: TimeOfDay[] = ['morning', 'afternoon', 'evening', 'night'];
    const currentIndex = timeOrder.indexOf(currentTimeOfDay);
    const eventIndex = timeOrder.indexOf(eventTimeOfDay);
    const diff = Math.abs(currentIndex - eventIndex);

    if (diff === 1) {
      timeMatchScore = 0.7; // Adjacent period
    } else if (diff === 2) {
      timeMatchScore = 0.4; // Two periods away
    } else {
      timeMatchScore = 0.2; // Far apart
    }
  }

  // Energy level matching
  const optimalEnergies = optimalEnergy[currentTimeOfDay];
  const energyMatchScore = optimalEnergies.includes(energyLevel) ? 1.0 : 0.5;

  // Combine scores (time matching is more important)
  return (timeMatchScore * 0.6) + (energyMatchScore * 0.4);
}

/**
 * Estimate score from energy level when event time is unknown
 */
function estimateScoreFromEnergy(
  energyLevel: EnergyLevel,
  currentTimeOfDay: TimeOfDay
): number {
  const optimalEnergy: Record<TimeOfDay, EnergyLevel[]> = {
    morning: ['low', 'medium'],
    afternoon: ['medium', 'high'],
    evening: ['medium', 'high'],
    night: ['high'],
  };

  const optimalEnergies = optimalEnergy[currentTimeOfDay];
  return optimalEnergies.includes(energyLevel) ? 0.7 : 0.4;
}

/**
 * Get energy level label
 */
export function getEnergyLevelLabel(energyLevel: EnergyLevel): string {
  const labels: Record<EnergyLevel, string> = {
    low: 'Relaxed',
    medium: 'Moderate',
    high: 'Energetic',
  };
  return labels[energyLevel];
}

/**
 * Get energy level icon
 */
export function getEnergyLevelIcon(energyLevel: EnergyLevel): string {
  const icons: Record<EnergyLevel, string> = {
    low: '🌙',
    medium: '🌤️',
    high: '⚡',
  };
  return icons[energyLevel];
}

/**
 * Get energy level color
 */
export function getEnergyLevelColor(energyLevel: EnergyLevel): string {
  const colors: Record<EnergyLevel, string> = {
    low: '#8B5CF6', // Purple (calm)
    medium: '#3B82F6', // Blue (moderate)
    high: '#EF4444', // Red (energetic)
  };
  return colors[energyLevel];
}

/**
 * Filter events by time of day preference
 */
export function filterByTimeOfDay(
  events: Event[],
  timeOfDay: TimeOfDay | 'auto' = 'auto'
): Event[] {
  const currentTime = timeOfDay === 'auto' ? getCurrentTimeOfDay() : timeOfDay;

  return events
    .map((event) => ({
      event,
      score: calculateCircadianScore(event, currentTime),
    }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.event);
}

/**
 * Get recommended events for current time of day
 */
export function getTimeBasedRecommendations(
  events: Event[],
  limit: number = 5
): Event[] {
  const currentTime = getCurrentTimeOfDay();
  const scored = events.map((event) => ({
    event,
    score: calculateCircadianScore(event, currentTime),
  }));

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.event);
}

/**
 * Get time of day description
 */
export function getTimeOfDayDescription(timeOfDay: TimeOfDay): string {
  const descriptions: Record<TimeOfDay, string> = {
    morning: 'Morning activities - calm and energizing',
    afternoon: 'Afternoon events - perfect for social activities',
    evening: 'Evening events - great for entertainment',
    night: 'Night events - high energy activities',
  };
  return descriptions[timeOfDay];
}

/**
 * Get time of day emoji
 */
export function getTimeOfDayEmoji(timeOfDay: TimeOfDay): string {
  const emojis: Record<TimeOfDay, string> = {
    morning: '🌅',
    afternoon: '☀️',
    evening: '🌆',
    night: '🌙',
  };
  return emojis[timeOfDay];
}

