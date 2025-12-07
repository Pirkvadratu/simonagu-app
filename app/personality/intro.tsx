import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";

export default function PersonalityIntro() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Let’s personalize your events</Text>

      <Text style={styles.subtitle}>
        You’ll see short statements. Swipe or tap yes/no if they sound like you.
        This helps recommend events you will actually enjoy.
      </Text>

      <TouchableOpacity
        style={styles.buttonPrimary}
        onPress={() => router.push("/personality/swipe")}
      >
        <Text style={styles.buttonPrimaryText}>Start Test</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonTertiary}
        onPress={() => router.push("/personality/manual")}
      >
        <Text style={styles.buttonTertiaryText}>I already know my type</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.buttonSecondary}
        onPress={() => router.back()}
      >
        <Text style={styles.buttonSecondaryText}>Maybe later</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#F9F5F0",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#555",
    marginBottom: 32,
  },
  buttonPrimary: {
    backgroundColor: "#1F6C6B",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonPrimaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonTertiary: {
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1F6C6B",
  },
  buttonTertiaryText: {
    color: "#1F6C6B",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonSecondary: {
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonSecondaryText: {
    color: "#1F6C6B",
    fontSize: 14,
  },
});
