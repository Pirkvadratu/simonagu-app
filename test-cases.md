# Test Cases Document - What's Happening App

**Fail: 0** | **Number of test cases: 42**

---

## 1. User Authentication

| ID | Test Case Description | Test Case Procedure | Expected Output | Test date | Pass | Fail | Note |
|---|---|---|---|---|---|---|
| TC1 | User can register new account | 1: Open the app; 2: Click on Sign Up; 3: Enter email and password; 4: Click Register | User account is created and user is logged in | | Pass | | | |
| TC2 | User can login with existing account | 1: Open the app; 2: Click on Login; 3: Enter correct email and password; 4: Click Login | User is logged in and redirected to home screen | | Pass | | |
| TC3 | User cannot login with wrong password | 1: Open the app; 2: Click on Login; 3: Enter correct email but wrong password; 4: Click Login | Error message shown, user not logged in | | Pass | | |
| TC4 | User can logout | 1: Login to the app; 2: Go to Profile screen; 3: Click Logout | User is logged out and redirected to login screen | | Pass | | |

---

## 2. Personality Test

| ID | Test Case Description | Test Case Procedure | Expected Output | Test date | Pass | Fail | Note |
|---|---|---|---|---|---|---|
| TC5 | User can start personality test | 1: Login to the app; 2: Click 'Personalize My Events'; 3: Click Start on intro screen | Personality test screen opens with first question | | Pass | | |
| TC6 | User can swipe left (No) on personality question | 1: Start personality test; 2: Swipe card left or tap No button | Card animates away, next question appears | | Pass | | |
| TC7 | User can swipe right (Yes) on personality question | 1: Start personality test; 2: Swipe card right or tap Yes button | Card animates away, next question appears | | Pass | | |
| TC8 | Personality test calculates MBTI type correctly | 1: Complete all 16 questions in personality test; 2: Answer questions to get ENFP type; 3: Check user profile | MBTI type ENFP is saved in Firestore | | Pass | | |
| TC9 | Personality test saves to Firestore | 1: Complete personality test; 2: Check Firebase database | User document contains personality data with MBTI type and scores | | Pass | | |
| TC10 | User can skip personality test | 1: Login to app; 2: Click 'Maybe later' on intro screen | User returns to home, no personality data saved | | Pass | | |

---

## 3. Event Display and Filtering

| ID | Test Case Description | Test Case Procedure | Expected Output | Test date | Pass | Fail | Note |
|---|---|---|---|---|---|---|
| TC11 | Events are displayed on map | 1: Login to app; 2: Go to Events screen | Map shows markers for all events with locations | | Pass | | |
| TC12 | Events are displayed in list | 1: Login to app; 2: Go to Events screen; 3: Scroll down | List shows all events with title, description, category | | Pass | | |
| TC13 | Personality filter shows matched events | 1: Complete personality test (e.g., ENFP); 2: Go to Events screen | Only events matching personality type are shown | | Pass | | |
| TC14 | Personality filter can be turned off | 1: Go to Events screen with filters active; 2: Go to Home screen; 3: Click 'Reset Filters' | All events are shown regardless of personality | | Pass | | |
| TC15 | Events are sorted by distance (nearest first) | 1: Allow location permission; 2: Go to Events screen | Events list shows nearest events at the top | | Pass | | |
| TC16 | Events without location appear at end | 1: Create event without location; 2: Go to Events screen | Event without location appears at bottom of list | | Pass | | |
| TC17 | Real-time updates when event is added | 1: Open Events screen; 2: Create new event in another session; 3: Return to Events screen | New event appears automatically without refresh | | Pass | | |
| TC18 | Real-time updates when event is deleted | 1: Open Events screen; 2: Delete event in another session; 3: Return to Events screen | Deleted event disappears automatically | | Pass | | |

---

## 4. Event Creation

| ID | Test Case Description | Test Case Procedure | Expected Output | Test date | Pass | Fail | Note |
|---|---|---|---|---|---|---|
| TC19 | User can create new event | 1: Login to app; 2: Click 'Create Event'; 3: Fill title, description, category; 4: Pick location on map; 5: Click Add Event | Event is created and saved to Firestore | | Pass | | |
| TC20 | User cannot create event without title | 1: Go to Create Event screen; 2: Fill description and category only; 3: Try to add event | Error message shown, event not created | | Pass | | |
| TC21 | User can pick location on map | 1: Go to Create Event screen; 2: Tap on map | Marker appears at tapped location, coordinates saved | | Pass | | |
| TC22 | User can find location by address | 1: Go to Create Event screen; 2: Enter address in search field; 3: Click 'Find Location' | Map centers on address, marker placed at location | | Pass | | |
| TC23 | User can select event category | 1: Go to Create Event screen; 2: Tap category button (social, calm, nightlife, culture) | Category is selected and highlighted | | Pass | | |
| TC24 | Created event appears in events list | 1: Create new event; 2: Go to Events screen | Created event appears in list and on map | | Pass | | |

---

## 5. Map Functionality

| ID | Test Case Description | Test Case Procedure | Expected Output | Test date | Pass | Fail | Note |
|---|---|---|---|---|---|---|
| TC25 | Map shows user location | 1: Allow location permission; 2: Go to Events screen | Map shows blue dot for user's current location | | Pass | | |
| TC26 | Clicking event focuses map on event | 1: Go to Events screen; 2: Tap on event in list | Map animates to show event location | | Pass | | |
| TC27 | Map markers show event information | 1: Go to Events screen; 2: Tap on map marker | Marker shows event title and description | | Pass | | |
| TC28 | Map loads with default region | 1: Go to Events screen without location permission | Map shows default region (Eindhoven area) | | Pass | | |

---

## 6. Search Functionality

| ID | Test Case Description | Test Case Procedure | Expected Output | Test date | Pass | Fail | Note |
|---|---|---|---|---|---|---|
| TC29 | User can search events by title | 1: Go to Events screen; 2: Type event title in search box | Only events matching search text are shown | | Pass | | |
| TC30 | Search is case insensitive | 1: Go to Events screen; 2: Type 'MUSIC' in search (event title is 'music') | Event is found and displayed | | Pass | | |
| TC31 | Search works with partial text | 1: Go to Events screen; 2: Type part of event title | Events containing that text are shown | | Pass | | |
| TC32 | Clearing search shows all events | 1: Search for event; 2: Clear search box | All events are shown again | | Pass | | |

---

## 7. Profile and Settings

| ID | Test Case Description | Test Case Procedure | Expected Output | Test date | Pass | Fail | Note |
|---|---|---|---|---|---|---|
| TC33 | User can view their profile | 1: Login to app; 2: Click 'My Profile' | Profile screen shows user information | | Pass | | |
| TC34 | User can retake personality test | 1: Go to Profile screen; 2: Click to retake personality test | Personality test starts again | | Pass | | |

---

## 8. Event Management

| ID | Test Case Description | Test Case Procedure | Expected Output | Test date | Pass | Fail | Note |
|---|---|---|---|---|---|---|
| TC35 | User can delete their own event | 1: Create event; 2: Go to Events screen; 3: Find your event; 4: Click Delete button | Event is deleted from Firestore and disappears from list | | Pass | | |
| TC36 | User cannot delete other user's event | 1: Go to Events screen; 2: Find event created by another user; 3: Try to delete | Delete button not shown or error message appears | | Pass | | |

---

## 9. AI Features

| ID | Test Case Description | Test Case Procedure | Expected Output | Test date | Pass | Fail | Note |
|---|---|---|---|---|---|---|
| TC37 | AI extracts event details correctly | 1: Select an event; 2: Click 'Add to Calendar'; 3: AI processes event information | AI correctly extracts title, date, time, location from event | | Pass | | |
| TC38 | AI creates Google Calendar event | 1: Select event; 2: Click 'Add to Calendar'; 3: Authorize Google Calendar access; 4: Confirm sync | Event is created in user's Google Calendar with correct details | | Pass | | |
| TC39 | AI handles timezone correctly | 1: Select event in different timezone; 2: Sync to Google Calendar | Event time is converted correctly to user's timezone | | Pass | | |
| TC40 | AI provides intelligent event recommendations | 1: Complete personality test; 2: Go to Events screen; 3: View AI recommendations | AI suggests events based on personality, time of day, and preferences | | Pass | | |
| TC41 | AI recommendations adapt to time of day | 1: View recommendations in morning; 2: View recommendations in evening | Different events suggested based on time of day | | Pass | | |
| TC42 | AI handles errors gracefully | 1: Try to sync event when offline; 2: Try to sync with invalid event data | Error messages shown, app does not crash | | Pass | | |

---

## 10. Error Handling

| ID | Test Case Description | Test Case Procedure | Expected Output | Test date | Pass | Fail | Note |
|---|---|---|---|---|---|---|
| TC43 | App handles location permission denial | 1: Deny location permission; 2: Go to Events screen | App still works, events shown but not sorted by distance | | Pass | | |

---

**End of Test Cases Document**

