// Calendar utility functions for syncing events
import * as Calendar from 'expo-calendar';
import { Alert } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { Event } from '@/types';

/**
 * Request calendar permissions
 */
export async function requestCalendarPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting calendar permissions:', error);
    return false;
  }
}

/**
 * Get default calendar ID (primary calendar)
 */
async function getDefaultCalendarId(): Promise<string | null> {
  try {
    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCalendar = calendars.find(cal => cal.allowsModifications) || calendars[0];
    return defaultCalendar?.id || null;
  } catch (error) {
    console.error('Error getting default calendar:', error);
    return null;
  }
}

/**
 * Convert Firestore Timestamp or Date string to Date object
 */
function parseEventDate(date: Timestamp | string | undefined): Date | null {
  if (!date) return null;
  
  try {
    if (date && typeof date === 'object' && 'toDate' in date) {
      return (date as Timestamp).toDate();
    }
    if (typeof date === 'string') {
      return new Date(date);
    }
  } catch (error) {
    console.error('Error parsing date:', error);
  }
  
  return null;
}

/**
 * Add event to user's calendar
 */
export async function addEventToCalendar(event: Event): Promise<boolean> {
  try {
    // Request permissions
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      Alert.alert(
        'Permission Required',
        'We need access to your calendar to add events. Please enable calendar permissions in settings.'
      );
      return false;
    }

    // Get default calendar
    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      Alert.alert('Error', 'Could not find a calendar to add the event to.');
      return false;
    }

    // Parse event date, or use default if not available
    let eventDate = parseEventDate(event.date || event.startDate || event.eventDate);
    let usedDefaultDate = false;
    
    // If no date, use tomorrow at 6 PM as default
    if (!eventDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(18, 0, 0, 0); // 6 PM
      eventDate = tomorrow;
      usedDefaultDate = true;
    }

    // Create calendar event
    const calendarEvent = {
      title: event.title,
      notes: event.description || '',
      startDate: eventDate,
      endDate: new Date(eventDate.getTime() + 60 * 60 * 1000), // 1 hour duration by default
      location: event.location
        ? `${event.location.latitude}, ${event.location.longitude}`
        : undefined,
      alarms: [
        {
          relativeOffset: -60, // 1 hour before
          method: Calendar.AlarmMethod.ALERT,
        },
      ],
    };

    // Add to calendar
    await Calendar.createEventAsync(calendarId, calendarEvent);

    const successMessage = usedDefaultDate
      ? 'Event added to your calendar for tomorrow at 6 PM (default date). You can edit the date in your calendar app.'
      : 'Event added to your calendar!';
    
    Alert.alert('Success', successMessage);
    return true;
  } catch (error: any) {
    console.error('Error adding event to calendar:', error);
    Alert.alert(
      'Error',
      error?.message || 'Failed to add event to calendar. Please try again.'
    );
    return false;
  }
}

/**
 * Get user's calendar events for a date range
 */
export async function getCalendarEvents(
  startDate: Date,
  endDate: Date
): Promise<Calendar.Event[]> {
  try {
    const hasPermission = await requestCalendarPermissions();
    if (!hasPermission) {
      return [];
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const calendarIds = calendars.map(cal => cal.id);

    const events = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
    return events;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

/**
 * Check if user is available at a specific time
 */
export async function isUserAvailable(date: Date, durationHours: number = 2): Promise<boolean> {
  try {
    const endDate = new Date(date.getTime() + durationHours * 60 * 60 * 1000);
    const events = await getCalendarEvents(date, endDate);
    
    // If there are any events during this time, user is not available
    return events.length === 0;
  } catch (error) {
    console.error('Error checking availability:', error);
    return true; // Default to available if we can't check
  }
}

/**
 * Get AI-powered event recommendations based on calendar
 * Simple algorithm: recommend events that fit in free time slots
 */
export async function getRecommendedEvents(
  events: Event[],
  daysAhead: number = 7
): Promise<Event[]> {
  try {
    const now = new Date();
    const endDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    
    // Get calendar events for next week
    const calendarEvents = await getCalendarEvents(now, endDate);
    
    // Filter events that fit in free time slots
    const recommended: Event[] = [];
    
    for (const event of events) {
      const eventDate = parseEventDate(event.date || event.startDate || event.eventDate);
      if (!eventDate) continue;
      
      // Check if user is available
      const available = await isUserAvailable(eventDate, 2);
      if (available) {
        recommended.push(event);
      }
    }
    
    return recommended;
  } catch (error) {
    console.error('Error getting recommendations:', error);
    return events; // Return all events if we can't filter
  }
}

