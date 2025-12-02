// app/personality/swipe.tsx

import { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { auth, db } from "@/firebase/firebaseConfig";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

// 16 QUESTIONS
// 8 for MBTI (E/I, N/S, T/F, J/P)
// 8 for interests (music, sport, literature, movies)
const STATEMENTS = [
  // E / I
  {
    id: 1,
    text: "I feel energized after spending time with other people.",
    trait: "E" as const,
    yes: 1,
    no: 0,
  },
  {
    id: 2,
    text: "I prefer quiet time alone over large social gatherings.",
    trait: "I" as const,
    yes: 1,
    no: 0,
  },

  // N / S
  {
    id: 3,
    text: "I like thinking about future possibilities and abstract ideas.",
    trait: "N" as const,
    yes: 1,
    no: 0,
  },
  {
    id: 4,
    text: "I focus more on practical details than big concepts.",
    trait: "S" as const,
    yes: 1,
    no: 0,
  },

  // T / F
  {
    id: 5,
    text: "When deciding, I rely more on logic than on feelings.",
    trait: "T" as const,
    yes: 1,
    no: 0,
  },
  {
    id: 6,
    text: "I often consider how decisions will affect other people emotionally.",
    trait: "F" as const,
    yes: 1,
    no: 0,
  },

  // J / P
  {
    id: 7,
    text: "I like having plans and clear structure in my week.",
    trait: "J" as const,
    yes: 1,
    no: 0,
  },
  {
    id: 8,
    text: "I prefer to keep my options open and decide at the last moment.",
    trait: "P" as const,
    yes: 1,
    no: 0,
  },

  // Interests – music
  {
    id: 9,
    text: "Live music events are something I really enjoy.",
    trait: "music" as const,
    yes: 1,
    no: 0,
  },
  {
    id: 10,
    text: "I like smaller, calmer music settings more than big concerts.",
    trait: "music" as const,
    yes: 1,
    no: 0,
  },

  // sport
  {
    id: 11,
    text: "I like going to sports events or being active outdoors.",
    trait: "sport" as const,
    yes: 1,
    no: 0,
  },
  {
    id: 12,
    text: "I enjoy watching live sports with others.",
    trait: "sport" as const,
    yes: 1,
    no: 0,
  },

  // literature
  {
    id: 13,
    text: "Book clubs, readings, or literature events sound interesting to me.",
    trait: "literature" as const,
    yes: 1,
    no: 0,
  },
  {
    id: 14,
    text: "I like calm spaces where I can read or listen to others speak.",
    trait: "literature" as const,
    yes: 1,
    no: 0,
  },

  // movies
  {
    id: 15,
    text: "I enjoy going to the cinema or movie-related events.",
    trait: "movies" as const,
    yes: 1,
    no: 0,
  },
  {
    id: 16,
    text: "Film festivals or special screenings are something I would attend.",
    trait: "movies" as const,
    yes: 1,
    no: 0,
  },
];

type TraitKey =
  | "E"
  | "I"
  | "N"
  | "S"
  | "T"
  | "F"
  | "J"
  | "P"
  | "music"
  | "sport"
  | "literature"
  | "movies";

type Scores = Record<TraitKey, number>;

export default function PersonalitySwipe() {
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [scores, setScores] = useState<Scores>({
    E: 0,
    I: 0,
    N: 0,
    S: 0,
    T: 0,
    F: 0,
    J: 0,
    P: 0,
    music: 0,
    sport: 0,
    literature: 0,
    movies: 0,
  });

  const current = useMemo(() => STATEMENTS[index], [index]);

  // Reanimated values
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const cardOpacity = useSharedValue(1);
  const SWIPE_THRESHOLD = 120;

  // HANDLE ANSWER (YES / NO)
  const handleAnswer = (answer: "yes" | "no") => {
    if (!current) return;

    const updated: Scores = {
      ...scores,
      [current.trait]: scores[current.trait] + current[answer],
    };

    setScores(updated);

    const next = index + 1;

    if (next < STATEMENTS.length) {
      setIndex(next);
      translateX.value = 0;
      rotate.value = 0;
      cardOpacity.value = 1;
      return;
    }

    // Last question → save
    runOnJS(saveToFirebase)(updated);
  };

  // COMPUTE MBTI TYPE FROM SCORES
  const computeMbti = (s: Scores): string => {
    const EorI = s.E >= s.I ? "E" : "I";
    const NorS = s.N >= s.S ? "N" : "S";
    const TorF = s.T >= s.F ? "T" : "F";
    const JorP = s.J >= s.P ? "J" : "P";
    return `${EorI}${NorS}${TorF}${JorP}`;
  };

  // SAVE TO FIREBASE
  const saveToFirebase = async (finalScores: Scores) => {
    setSaving(true);

    const user = auth.currentUser;
    if (!user) {
      console.error("No user logged in.");
      router.replace("/login");
      return;
    }

    const mbtiType = computeMbti(finalScores);

    const userRef = doc(db, "Users", user.uid);
    const snap = await getDoc(userRef);

    const payload = {
      personality: {
        mbti: mbtiType,
        traits: {
          E: finalScores.E,
          I: finalScores.I,
          N: finalScores.N,
          S: finalScores.S,
          T: finalScores.T,
          F: finalScores.F,
          J: finalScores.J,
          P: finalScores.P,
        },
        interests: {
          music: finalScores.music,
          sport: finalScores.sport,
          literature: finalScores.literature,
          movies: finalScores.movies,
        },
        updatedAt: Date.now(),
      },
    };

    if (snap.exists()) {
      await updateDoc(userRef, payload);
    } else {
      await setDoc(userRef, payload);
    }

    setSaving(false);
    router.replace("/events"); // go back to events map after test
  };

  // SWIPE GESTURE
  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      rotate.value = translateX.value / 20;
    })
    .onEnd(() => {
      if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
        const direction: "yes" | "no" =
          translateX.value > 0 ? "yes" : "no";

        translateX.value = withTiming(translateX.value * 2);
        cardOpacity.value = withTiming(0, undefined, () => {
          runOnJS(handleAnswer)(direction);
        });
      } else {
        translateX.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
    opacity: cardOpacity.value,
  }));

  if (saving) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.info}>Saving your preferences…</Text>
      </SafeAreaView>
    );
  }

  if (!current) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.info}>Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.progress}>
        {index + 1} / {STATEMENTS.length}
      </Text>

      <View style={styles.cardWrapper}>
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.card, animatedCardStyle]}>
            <Text style={styles.cardText}>{current.text}</Text>
          </Animated.View>
        </GestureDetector>
      </View>

      <View style={styles.buttonsRow}>
        <TouchableOpacity
          style={[styles.answerButton, styles.no]}
          onPress={() => handleAnswer("no")}
        >
          <Text style={styles.answerText}>No</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.answerButton, styles.yes]}
          onPress={() => handleAnswer("yes")}
        >
          <Text style={styles.answerText}>Yes</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.hintBox}>
        <Text style={styles.hintText}>
          You can tap Yes / No or swipe the card
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9F5F0", paddingTop: 40 },
  progress: {
    textAlign: "center",
    fontSize: 16,
    marginBottom: 16,
    color: "#333",
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 28,
    borderRadius: 18,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardText: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    color: "#222",
  },
  buttonsRow: {
    flexDirection: "row",
    marginBottom: 24,
    justifyContent: "space-around",
    paddingHorizontal: 20,
  },
  answerButton: {
    paddingVertical: 14,
    paddingHorizontal: 34,
    borderRadius: 30,
  },
  yes: { backgroundColor: "#1F6C6B" },
  no: { backgroundColor: "#C85B5B" },
  answerText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
  info: {
    textAlign: "center",
    marginTop: 60,
    fontSize: 18,
    color: "#333",
  },
  hintBox: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  hintText: {
    textAlign: "center",
    fontSize: 12,
    color: "#555",
  },
});
``