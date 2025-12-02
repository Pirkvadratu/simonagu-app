import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fetch from "node-fetch";

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

    const eventData = {
      title: ev.name || "Untitled Event",
      description: ev.info || ev.description || "No description available",
      location: {
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
      },
      category:
        ev.classifications?.[0]?.segment?.name?.toLowerCase() || "other",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      external: true,
      externalId,
    };

    await db.collection("events").add(eventData);
    console.log("Saved:", eventData.title);
  }

  console.log("Done importing Ticketmaster events.");
}

fetchAndSave().catch(console.error);
