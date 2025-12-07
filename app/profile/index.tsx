import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '@/firebase/firebaseConfig';
import { doc, getDoc } from 'firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UserData } from '@/types';

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Load from Users collection (where personality data is stored)
        const docRef = doc(db, 'Users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [auth.currentUser]);

  if (!auth.currentUser) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.text}>You need to log in first.</Text>
          <Button title="Go to Login" onPress={() => router.push('/login')} />
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1F6C6B" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const personality = userData?.personality;
  const mbtiType = personality?.mbti;
  const traits = personality?.traits;
  const interests = personality?.interests;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Profile</Text>
        </View>

        {/* User Email */}
        <View style={styles.section}>
          <View style={styles.emailCard}>
            <Ionicons name="mail-outline" size={20} color="#1F6C6B" />
            <Text style={styles.emailText}>{auth.currentUser?.email}</Text>
          </View>
        </View>

        {/* MBTI Type */}
        {mbtiType && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Personality Type</Text>
            <View style={styles.mbtiCard}>
              <Text style={styles.mbtiType}>{mbtiType}</Text>
              <Text style={styles.mbtiDescription}>
                {getMbtiDescription(mbtiType)}
              </Text>
            </View>
          </View>
        )}

        {/* Personality Traits */}
        {traits && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personality Traits</Text>
            <View style={styles.traitsContainer}>
              <TraitBar label="E" value={traits.E || 0} opposite="I" oppositeValue={traits.I || 0} />
              <TraitBar label="N" value={traits.N || 0} opposite="S" oppositeValue={traits.S || 0} />
              <TraitBar label="T" value={traits.T || 0} opposite="F" oppositeValue={traits.F || 0} />
              <TraitBar label="J" value={traits.J || 0} opposite="P" oppositeValue={traits.P || 0} />
            </View>
          </View>
        )}

        {/* Interests */}
        {interests && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Interests</Text>
            <View style={styles.interestsContainer}>
              <InterestBadge label="Music" value={interests.music || 0} icon="musical-notes" />
              <InterestBadge label="Sport" value={interests.sport || 0} icon="football" />
              <InterestBadge label="Literature" value={interests.literature || 0} icon="book" />
              <InterestBadge label="Movies" value={interests.movies || 0} icon="film" />
            </View>
          </View>
        )}

        {/* No Personality Data */}
        {!personality && (
          <View style={styles.section}>
            <View style={styles.emptyPersonalityCard}>
              <Ionicons name="person-outline" size={48} color="#999" />
              <Text style={styles.emptyPersonalityText}>
                Take the personality test to see personalized event recommendations!
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => router.push('/personality/intro')}
              >
                <Text style={styles.primaryButtonText}>Take Personality Test</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.section}>
          {personality && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/personality/intro')}
            >
              <Ionicons name="refresh-outline" size={20} color="#1F6C6B" />
              <Text style={styles.actionButtonText}>Retake Personality Test</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/create-events')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#1F6C6B" />
            <Text style={styles.actionButtonText}>Create Event</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={async () => {
            await auth.signOut();
            router.replace('/');
          }}
        >
          <Ionicons name="log-out-outline" size={20} color="#C85B5B" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper component for trait bars
function TraitBar({ label, value, opposite, oppositeValue }: { 
  label: string; 
  value: number; 
  opposite: string;
  oppositeValue: number;
}) {
  const total = Math.max(value + oppositeValue, 1);
  const leftPercentage = (value / total) * 100;
  
  return (
    <View style={styles.traitRow}>
      <Text style={styles.traitLabel}>{label}</Text>
      <View style={styles.traitBarContainer}>
        {leftPercentage > 0 && (
          <View style={[styles.traitBar, { width: `${leftPercentage}%` }]} />
        )}
      </View>
      <Text style={styles.traitLabel}>{opposite}</Text>
      <Text style={styles.traitValue}>{value}/{oppositeValue}</Text>
    </View>
  );
}

// Helper component for interest badges
function InterestBadge({ label, value, icon }: { label: string; value: number; icon: string }) {
  const maxValue = 4; // Maximum possible score
  const percentage = (value / maxValue) * 100;
  
  return (
    <View style={styles.interestBadge}>
      <Ionicons name={icon as any} size={24} color="#1F6C6B" />
      <Text style={styles.interestLabel}>{label}</Text>
      <View style={styles.interestBar}>
        <View style={[styles.interestBarFill, { width: `${percentage}%` }]} />
      </View>
      <Text style={styles.interestValue}>{value}/{maxValue}</Text>
    </View>
  );
}

// Helper function to get MBTI descriptions
function getMbtiDescription(type: string): string {
  const descriptions: { [key: string]: string } = {
    'INTJ': 'The Architect - Strategic and independent',
    'INTP': 'The Thinker - Innovative and independent',
    'ENTJ': 'The Commander - Bold and decisive',
    'ENTP': 'The Debater - Smart and curious',
    'INFJ': 'The Advocate - Creative and insightful',
    'INFP': 'The Mediator - Poetic and kind',
    'ENFJ': 'The Protagonist - Charismatic and inspiring',
    'ENFP': 'The Campaigner - Enthusiastic and creative',
    'ISTJ': 'The Logistician - Practical and fact-minded',
    'ISFJ': 'The Protector - Warm-hearted and dedicated',
    'ESTJ': 'The Executive - Excellent administrator',
    'ESFJ': 'The Consul - Caring and social',
    'ISTP': 'The Virtuoso - Bold and practical',
    'ISFP': 'The Adventurer - Flexible and charming',
    'ESTP': 'The Entrepreneur - Smart and energetic',
    'ESFP': 'The Entertainer - Spontaneous and enthusiastic',
  };
  
  return descriptions[type] || 'Your unique personality type';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  text: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  emailText: {
    fontSize: 16,
    color: '#333',
  },
  mbtiCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1F6C6B',
  },
  mbtiType: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1F6C6B',
    marginBottom: 8,
  },
  mbtiDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  traitsContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  traitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  traitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    width: 20,
  },
  traitBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  traitBar: {
    height: '100%',
    backgroundColor: '#1F6C6B',
  },
  traitValue: {
    fontSize: 12,
    color: '#666',
    minWidth: 50,
    textAlign: 'right',
  },
  interestsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  interestBadge: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  interestLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  interestBar: {
    width: '100%',
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  interestBarFill: {
    height: '100%',
    backgroundColor: '#1F6C6B',
  },
  interestValue: {
    fontSize: 12,
    color: '#666',
  },
  emptyPersonalityCard: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    gap: 16,
  },
  emptyPersonalityText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  primaryButton: {
    backgroundColor: '#1F6C6B',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#ffebee',
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#C85B5B',
    fontWeight: '600',
  },
});
