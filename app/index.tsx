import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { auth, db } from "../firebase/firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

export default function HomeScreen() {
  async function resetFilters() {
    const user = auth.currentUser;
    if (!user) {
      console.error("No user logged in");
      return;
    }

    const userRef = doc(db, "Users", user.uid);

    try {
      await updateDoc(userRef, { personality: null });
      alert("Filters cleared!");
    } catch (error) {
      console.error("Error resetting filters:", error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to What's Happening?</Text>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/events")}>
        <Text style={styles.buttonText}>View Events</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/create-events")}>
        <Text style={styles.buttonText}>Create Event</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/personality/intro")}>
        <Text style={styles.buttonText}>Personalize My Events</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#C85B5B" }]}
        onPress={resetFilters}
      >
        <Text style={styles.buttonText}>Reset Filters</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => router.push("/profile")}>
        <Text style={styles.buttonText}>My Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 40,
  },
  button: {
    padding: 15,
    backgroundColor: "#1F6C6B",
    borderRadius: 10,
    marginBottom: 15,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    textAlign: "center",
    fontSize: 16,
  },
});
