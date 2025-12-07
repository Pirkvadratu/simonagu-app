// Shared TypeScript types for the app

import { Timestamp } from 'firebase/firestore';

/**
 * Event location coordinates
 */
export interface EventLocation {
  latitude: number;
  longitude: number;
}

/**
 * Event data structure from Firestore
 */
export interface Event {
  id: string;
  title: string;
  description: string;
  category: string;
  location?: EventLocation;
  userId?: string;
  imageUrl?: string;
  date?: Timestamp;
  startDate?: Timestamp;
  eventDate?: Timestamp | string;
  createdAt?: Timestamp;
  distance?: number; // Added when calculating distance from user
  externalUrl?: string; // URL for external events (e.g., Ticketmaster)
}

/**
 * Personality traits scores
 */
export interface PersonalityTraits {
  E: number;
  I: number;
  N: number;
  S: number;
  T: number;
  F: number;
  J: number;
  P: number;
}

/**
 * Personality interests scores
 */
export interface PersonalityInterests {
  music: number;
  sport: number;
  literature: number;
  movies: number;
}

/**
 * Complete personality data structure
 */
export interface Personality {
  mbti: string;
  traits: PersonalityTraits;
  interests: PersonalityInterests;
  updatedAt?: number;
}

/**
 * User data from Firestore
 */
export interface UserData {
  email?: string;
  name?: string;
  personality?: Personality;
}

/**
 * Grouped events by time period
 */
export interface GroupedEvents {
  today: Event[];
  tomorrow: Event[];
  weekend: Event[];
  later: Event[];
}

/**
 * Date range filter options
 */
export type DateRangeFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week' | 'month';

