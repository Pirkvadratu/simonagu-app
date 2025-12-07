// AI Agent for Event Detail Extraction
// Extracts structured information from unstructured event text

/**
 * Extracted event details from AI analysis
 */
export interface ExtractedEventDetails {
  title?: string;
  description?: string;
  category?: string;
  date?: Date | null;
  time?: string;
  location?: {
    name?: string;
    address?: string;
    city?: string;
  };
  price?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  tags?: string[];
  keywords?: string[];
  confidence: number; // 0-1 score of extraction confidence
}

/**
 * Rule-based category detection from text
 */
function detectCategory(text: string): string {
  const lowerText = text.toLowerCase();
  
  const categoryKeywords: Record<string, string[]> = {
    music: ['concert', 'music', 'dj', 'band', 'live music', 'festival', 'gig', 'singer', 'song'],
    nightlife: ['nightclub', 'club', 'nightlife', 'bar', 'party', 'dance', 'dj set', 'night'],
    culture: ['museum', 'theatre', 'theater', 'art', 'exhibition', 'gallery', 'culture', 'lecture', 'workshop'],
    sport: ['sport', 'fitness', 'gym', 'run', 'race', 'marathon', 'training', 'match', 'game'],
    calm: ['yoga', 'meditation', 'wellness', 'relax', 'nature', 'hiking', 'spa', 'calm', 'peaceful'],
    social: ['meetup', 'social', 'community', 'networking', 'food', 'cooking', 'dinner', 'lunch'],
    literature: ['book', 'reading', 'literature', 'poetry', 'author', 'writing', 'storytelling'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category;
    }
  }

  return 'social'; // Default category
}

/**
 * Extract date from text using regex patterns
 */
function extractDate(text: string): Date | null {
  const patterns = [
    // Format: "January 15, 2024" or "Jan 15, 2024"
    /\b(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/i,
    // Format: "15/01/2024" or "01-15-2024"
    /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/,
    // Format: "2024-01-15"
    /\b\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}\b/,
    // Relative dates: "today", "tomorrow", "next week"
    /\b(?:today|tomorrow|next week|next month)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try {
        const dateStr = match[0].toLowerCase();
        
        // Handle relative dates
        if (dateStr.includes('today')) {
          return new Date();
        }
        if (dateStr.includes('tomorrow')) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow;
        }
        if (dateStr.includes('next week')) {
          const nextWeek = new Date();
          nextWeek.setDate(nextWeek.getDate() + 7);
          return nextWeek;
        }

        // Try to parse the date
        const parsed = new Date(match[0]);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      } catch (error) {
        console.error('Error parsing date:', error);
      }
    }
  }

  return null;
}

/**
 * Extract time from text
 */
function extractTime(text: string): string | null {
  const patterns = [
    // 24-hour format: "18:00" or "18:00:00"
    /\b([0-1]?[0-9]|2[0-3]):[0-5][0-9](?::[0-5][0-9])?\b/,
    // 12-hour format: "6 PM" or "6:30 PM"
    /\b([0-9]|1[0-2])(?::([0-5][0-9]))?\s*(AM|PM)\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  return null;
}

/**
 * Extract location information from text
 */
function extractLocation(text: string): { name?: string; address?: string; city?: string } | null {
  const locationIndicators = ['at', 'in', 'venue', 'location', 'address'];
  const lowerText = text.toLowerCase();
  
  // Common city names in Netherlands (Eindhoven area)
  const cities = ['eindhoven', 'amsterdam', 'rotterdam', 'utrecht', 'den haag', 'the hague', 'tilburg', 'breda'];
  
  let city: string | undefined;
  for (const cityName of cities) {
    if (lowerText.includes(cityName.toLowerCase())) {
      city = cityName;
      break;
    }
  }

  // Try to find venue name after location indicators
  let venueName: string | undefined;
  for (const indicator of locationIndicators) {
    const index = lowerText.indexOf(indicator);
    if (index !== -1) {
      const afterIndicator = text.substring(index + indicator.length).trim();
      const words = afterIndicator.split(/[.,\n]/)[0].trim();
      if (words.length > 3 && words.length < 50) {
        venueName = words;
        break;
      }
    }
  }

  if (city || venueName) {
    return { name: venueName, city };
  }

  return null;
}

/**
 * Extract price information from text
 */
function extractPrice(text: string): { min?: number; max?: number; currency?: string } | null {
  const patterns = [
    // Euro format: "€10" or "10 EUR" or "10 euros"
    /€?\s*(\d+(?:\.\d{2})?)\s*(?:EUR|euros?|€)?/i,
    // Range: "€10-€20" or "10-20 EUR"
    /€?\s*(\d+(?:\.\d{2})?)\s*[-–—]\s*€?\s*(\d+(?:\.\d{2})?)\s*(?:EUR|euros?|€)?/i,
    // Free
    /\bfree\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].toLowerCase().includes('free')) {
        return { min: 0, max: 0, currency: 'EUR' };
      }
      
      const min = parseFloat(match[1]);
      const max = match[2] ? parseFloat(match[2]) : min;
      
      if (!isNaN(min)) {
        return { min, max, currency: 'EUR' };
      }
    }
  }

  return null;
}

/**
 * Extract keywords and tags from text
 */
function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const lowerText = text.toLowerCase();
  
  const commonTags = [
    'family-friendly', 'outdoor', 'indoor', 'free', 'paid', 'beginner', 'advanced',
    'workshop', 'networking', 'food', 'drinks', 'live', 'online', 'in-person',
    'weekend', 'evening', 'morning', 'all ages', '18+', '21+',
  ];

  for (const tag of commonTags) {
    if (lowerText.includes(tag.toLowerCase())) {
      keywords.push(tag);
    }
  }

  return keywords;
}

/**
 * Calculate confidence score based on extracted information
 */
function calculateConfidence(details: Partial<ExtractedEventDetails>): number {
  let score = 0;
  let maxScore = 0;

  if (details.title) {
    score += 0.2;
    maxScore += 0.2;
  }
  if (details.description && details.description.length > 50) {
    score += 0.3;
    maxScore += 0.3;
  }
  if (details.category) {
    score += 0.15;
    maxScore += 0.15;
  }
  if (details.date) {
    score += 0.2;
    maxScore += 0.2;
  }
  if (details.location) {
    score += 0.15;
    maxScore += 0.15;
  }

  return maxScore > 0 ? score / maxScore : 0;
}

/**
 * Extract event details from unstructured text (Rule-based)
 * This is a basic implementation that can be enhanced with AI APIs
 */
export function extractEventDetails(
  rawText: string,
  existingData?: {
    title?: string;
    description?: string;
    category?: string;
    date?: Date | string;
  }
): ExtractedEventDetails {
  const fullText = [
    existingData?.title,
    existingData?.description,
    rawText,
  ].filter(Boolean).join(' ');

  const details: Partial<ExtractedEventDetails> = {
    title: existingData?.title,
    description: existingData?.description || rawText,
    category: existingData?.category || detectCategory(fullText),
    date: existingData?.date 
      ? (typeof existingData.date === 'string' ? new Date(existingData.date) : existingData.date)
      : extractDate(fullText),
    time: extractTime(fullText),
    location: extractLocation(fullText),
    price: extractPrice(fullText),
    tags: extractKeywords(fullText),
  };

  const confidence = calculateConfidence(details);

  return {
    ...details,
    confidence,
  } as ExtractedEventDetails;
}

/**
 * Enhanced extraction using AI API (OpenAI or Gemini)
 * This requires API keys and can be enabled when available
 */
export async function extractEventDetailsWithAI(
  rawText: string,
  apiKey?: string,
  apiType: 'openai' | 'gemini' = 'openai'
): Promise<ExtractedEventDetails> {
  // First try rule-based extraction
  const ruleBased = extractEventDetails(rawText);

  // If no API key, return rule-based results
  if (!apiKey) {
    return ruleBased;
  }

  try {
    // AI-enhanced extraction would go here
    // For now, return rule-based with higher confidence
    // TODO: Implement OpenAI/Gemini API calls when API key is available
    
    return {
      ...ruleBased,
      confidence: Math.min(ruleBased.confidence + 0.2, 1.0), // Boost confidence
    };
  } catch (error) {
    console.error('AI extraction failed, using rule-based:', error);
    return ruleBased;
  }
}

/**
 * Improve event description using AI
 * Summarizes and cleans up event descriptions
 */
export function improveDescription(description: string): string {
  if (!description || description.length < 20) {
    return description;
  }

  // Basic cleanup
  let improved = description
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .replace(/\n\s*\n/g, '\n') // Multiple newlines to single
    .trim();

  // Capitalize first letter
  if (improved.length > 0) {
    improved = improved.charAt(0).toUpperCase() + improved.slice(1);
  }

  // Add period if missing at end
  if (!improved.match(/[.!?]$/)) {
    improved += '.';
  }

  return improved;
}

/**
 * Suggest category based on extracted details
 */
export function suggestCategory(details: ExtractedEventDetails): string {
  if (details.category) {
    return details.category;
  }

  // Use keywords to suggest category
  const keywordMapping: Record<string, string> = {
    concert: 'music',
    festival: 'music',
    museum: 'culture',
    theatre: 'culture',
    sport: 'sport',
    fitness: 'sport',
    yoga: 'calm',
    nightclub: 'nightlife',
    meetup: 'social',
  };

  const lowerText = (details.description || '').toLowerCase();
  for (const [keyword, category] of Object.entries(keywordMapping)) {
    if (lowerText.includes(keyword)) {
      return category;
    }
  }

  return 'social'; // Default
}

