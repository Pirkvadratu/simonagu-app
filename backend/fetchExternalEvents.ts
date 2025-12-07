import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fetch from "node-fetch";
// Note: AI extraction can be integrated here when needed
// For now, the current extraction logic is sufficient
// import { extractEventDetails, improveDescription, suggestCategory } from "../utils/aiEventExtraction.js";

// Fix ES module dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load service account
const serviceKeyPath = path.resolve(__dirname, "serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceKeyPath),
  });
}

const db = admin.firestore();

// Your API key
const API_KEY = "8qxbB2ypaVsz6cqrC9WGfzYsK1xvMJ1a";

// CHANGE THIS TO YOUR REAL LOCATION
const LAT = 51.441642;   // Eindhoven
const LNG = 5.469722;    // Eindhoven
const RADIUS = 25;       // in km

async function fetchAndSave() {
  console.log("Fetching Ticketmaster events…");

  const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${API_KEY}&latlong=${LAT},${LNG}&radius=${RADIUS}`;

  const res = await fetch(url);
  const data = await res.json();

  const events = data?._embedded?.events || [];
  console.log("Events found:", events.length);

  for (const ev of events) {
    const venue = ev._embedded?.venues?.[0];
    const loc = venue?.location;
    if (!loc) continue;

    const externalId = ev.id;

    // Skip duplicates
    const exists = await db
      .collection("events")
      .where("externalId", "==", externalId)
      .get();

    if (!exists.empty) {
      console.log("Already exists:", externalId);
      continue;
    }

    // Try multiple fields for description from Ticketmaster API
    const getDescription = () => {
      // Try various description fields in order of preference
      const desc = 
        ev.info ||
        ev.description ||
        ev.pleaseNote ||
        ev.additionalInfo ||
        ev._embedded?.venues?.[0]?.generalInfo?.generalRule ||
        ev._embedded?.attractions?.[0]?.info ||
        ev._embedded?.attractions?.[0]?.description ||
        ev.classifications?.[0]?.genre?.name ||
        null;

      if (desc && desc.trim() && desc !== "No description available" && desc.length >= 10) {
        return desc.trim();
      }

      // Generate a meaningful description from available data
      const venueName = venue?.name || "";
      const venueCity = venue?.city?.name || "";
      const venueAddress = venue?.address?.line1 || "";
      const genre = ev.classifications?.[0]?.genre?.name || "";
      const segment = ev.classifications?.[0]?.segment?.name || "";
      const subGenre = ev.classifications?.[0]?.subGenre?.name || "";
      const attraction = ev._embedded?.attractions?.[0]?.name || "";
      
      const parts = [];
      if (attraction) parts.push(attraction);
      if (genre && genre !== segment) parts.push(genre);
      if (subGenre) parts.push(subGenre.toLowerCase());
      if (segment && segment !== "Miscellaneous") parts.push(segment.toLowerCase());
      if (venueName) parts.push(`at ${venueName}`);
      if (venueCity) parts.push(`in ${venueCity}`);

      // Create a more detailed description
      let generatedDesc = "";
      if (parts.length > 0) {
        generatedDesc = `${ev.name}. ${parts.slice(0, 3).join(", ")}.`;
      } else {
        generatedDesc = `${ev.name}. Don't miss out on this exciting event!`;
      }

      // Only return generated description if it's meaningful, otherwise return null to show link
      if (generatedDesc.length >= 20) {
        return generatedDesc;
      }

      return "No description available";
    };

    const eventData = {
      title: ev.name || "Untitled Event",
      description: getDescription(),
      location: {
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
      },
      category:
        ev.classifications?.[0]?.segment?.name?.toLowerCase() || "other",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      external: true,
      externalId,
      externalUrl: ev.url || null, // Save Ticketmaster URL for link
    };

    await db.collection("events").add(eventData);
    console.log("Saved:", eventData.title);
  }

  console.log("Done importing Ticketmaster events.");
}

fetchAndSave().catch(console.error);
