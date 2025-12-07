// Manual MBTI Type Entry Screen
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '@/firebase/firebaseConfig';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
];

export default function ManualMBTIScreen() {
  const [selectedType, setSelectedType] = useState<string>('');
  const [customType, setCustomType] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const mbtiType = selectedType || customType.toUpperCase().trim();
    
    if (!mbtiType || mbtiType.length !== 4) {
      Alert.alert('Invalid Type', 'Please select or enter a valid 4-letter MBTI type (e.g., INTJ, ENFP)');
      return;
    }

    // Validate MBTI type format
    const validPattern = /^[EI][NS][TF][JP]$/;
    if (!validPattern.test(mbtiType)) {
      Alert.alert('Invalid Type', 'MBTI type must be 4 letters: E/I, N/S, T/F, J/P (e.g., INTJ, ENFP)');
      return;
    }

    setSaving(true);

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('Error', 'You must be logged in');
        router.back();
        return;
      }

      // Parse MBTI type to get trait values
      const traits = {
        E: mbtiType[0] === 'E' ? 4 : 0,
        I: mbtiType[0] === 'I' ? 4 : 0,
        N: mbtiType[1] === 'N' ? 4 : 0,
        S: mbtiType[1] === 'S' ? 4 : 0,
        T: mbtiType[2] === 'T' ? 4 : 0,
        F: mbtiType[2] === 'F' ? 4 : 0,
        J: mbtiType[3] === 'J' ? 4 : 0,
        P: mbtiType[3] === 'P' ? 4 : 0,
      };

      const userRef = doc(db, 'Users', user.uid);
      const snap = await getDoc(userRef);

      const payload = {
        personality: {
          mbti: mbtiType,
          traits: traits,
          interests: {
            music: 2, // Default neutral values
            sport: 2,
            literature: 2,
            movies: 2,
          },
          updatedAt: Date.now(),
          manuallyEntered: true,
        },
      };

      if (snap.exists()) {
        await updateDoc(userRef, payload);
      } else {
        await setDoc(userRef, payload);
      }

      Alert.alert('Success', `Your personality type (${mbtiType}) has been saved!`, [
        { text: 'OK', onPress: () => router.replace('/') }
      ]);
    } catch (error) {
      console.error('Error saving MBTI type:', error);
      Alert.alert('Error', 'Failed to save your personality type. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1F6C6B" />
          <Text style={styles.savingText}>Saving your personality type...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F6C6B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Enter Your MBTI Type</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            If you already know your MBTI personality type, you can enter it directly here.
          </Text>

          {/* Quick Selection Buttons */}
          <Text style={styles.sectionTitle}>Quick Select</Text>
          <View style={styles.typeGrid}>
            {MBTI_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  selectedType === type && styles.typeButtonSelected,
                ]}
                onPress={() => {
                  setSelectedType(type);
                  setCustomType('');
                }}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    selectedType === type && styles.typeButtonTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Or Manual Entry */}
          <Text style={styles.sectionTitle}>Or Type Manually</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., INTJ, ENFP"
            value={customType}
            onChangeText={(text) => {
              setCustomType(text);
              setSelectedType('');
            }}
            maxLength={4}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Text style={styles.hint}>
            Enter 4 letters: E/I, N/S, T/F, J/P
          </Text>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!selectedType && !customType.trim()) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!selectedType && !customType.trim()}
          >
            <Text style={styles.saveButtonText}>
              Save Personality Type
            </Text>
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#1F6C6B" />
            <Text style={styles.infoText}>
              Don't know your type? Go back and take the personality test to discover it!
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F5F0',
  },
  scrollView: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  savingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  description: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
    lineHeight: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  typeButton: {
    width: '22%',
    aspectRatio: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  typeButtonSelected: {
    backgroundColor: '#1F6C6B',
    borderColor: '#1F6C6B',
  },
  typeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  typeButtonTextSelected: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#1F6C6B',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
});

