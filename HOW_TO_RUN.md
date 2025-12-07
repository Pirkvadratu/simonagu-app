# How to Run the App

## Quick Start

### 1. Install Dependencies (if not already installed)
```bash
npm install
```

### 2. Start the Development Server

You have several options:

#### Option A: Start Expo Dev Server (Recommended)
```bash
npm start
```
or
```bash
npx expo start
```

This will open a QR code in your terminal. You can then:
- **Scan with Expo Go app** on your phone (iOS/Android)
- **Press `i`** to open iOS simulator (Mac only)
- **Press `a`** to open Android emulator
- **Press `w`** to open in web browser

#### Option B: Start for Specific Platform
```bash
# iOS Simulator (Mac only)
npm run ios

# Android Emulator
npm run android

# Web Browser
npm run web
```

## Testing the New Features

### ✅ Date/Time Fields in Event Creation
1. Go to "Create Event" screen
2. You should see date and time fields
3. Try the quick date buttons (Today, Tomorrow, Next Week)
4. Enter a time like "18:30"
5. Create the event

### ✅ Time-Based Grouping
1. Go to "Events" screen
2. Events should be grouped by:
   - **Today** - Events happening today
   - **Tomorrow** - Events happening tomorrow
   - **This Weekend** - Events this weekend
   - **Later** - All other future events

### ✅ Distance Display
- Each event card shows distance in kilometers (e.g., "2.5 km away")

### ✅ Personality Match Badge
- Events matching your personality show a "⭐ Match" badge

### ✅ Date/Time Display
- Event cards show the date and time when available

## Troubleshooting

### If dependencies are missing:
```bash
npm install
```

### If you get port errors:
- Make sure no other Expo server is running
- Try: `npx expo start --clear`

### If Firebase connection fails:
- Check your Firebase configuration in `firebase/firebaseConfig.ts`
- Make sure you have internet connection

### To clear cache and restart:
```bash
npx expo start --clear
```

## Development Tips

- **Hot Reload**: Changes auto-reload in the app
- **Open DevTools**: Press `j` in the terminal
- **Reload App**: Press `r` in the terminal or shake device
- **View Logs**: Check terminal for console.log outputs

