import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings, Bell, Award, TrendingUp, LogOut, Camera, Dumbbell, Clock, CreditCard, Crown } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useRef, useCallback } from 'react';
import Animated, { 
  FadeOut, 
  Layout
} from 'react-native-reanimated';
import { differenceInDays, parseISO, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import ExercisePicker from '@/components/ExercisePicker';
import AuthModal from '@/components/AuthModal';
import RemindersModal from '@/components/RemindersModal';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/contexts/SubscriptionContext';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/supabase';
import AnimatedTabScreen from '@/components/AnimatedTabScreen';
import { 
  loadReminderSettings,
  NotificationSettings,
  configureNotifications
} from '@/lib/notificationService';
import SubscriptionCard from '@/components/SubscriptionCard';
import FeatureLimit from '@/components/FeatureLimit';
import SubscriptionModal from '@/components/SubscriptionModal';
import StatsSection from '@/components/StatsSection';
import GoalsSection from '@/components/GoalsSection';
import { 
  loadUserStats, 
  loadUserGoals, 
  addUserGoal, 
  removeUserGoal,
  UserStats, 
  defaultStats 
} from '@/lib/statsService';

type WorkoutHistory = Tables['workout_history']['Row'][];

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const { isSubscribed, getFeatureLimits } = useSubscription();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showRemindersModal, setShowRemindersModal] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats>(defaultStats);
  const [goals, setGoals] = useState<string[]>([]);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [customExercises, setCustomExercises] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [isGoalsLoading, setIsGoalsLoading] = useState(true);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const isMounted = useRef(true);

  // Get feature limits
  const limits = getFeatureLimits();

  const loadInitialData = async () => {
    try {
      const settings = await loadReminderSettings();
      if (isMounted.current) {
        setNotificationSettings(settings);
      }
    } catch (error) {
      console.error('Error loading reminder settings:', error);
    }
  };

  // Configure notifications on component mount
  useEffect(() => {
    configureNotifications();
  }, []);

  useEffect(() => {
    isMounted.current = true;
    
    const initializeData = async () => {
      await Promise.all([
        loadCustomExercises(),
        loadInitialData(),
        fetchUserStats(),
        fetchUserGoals()
      ]);
      
      if (isMounted.current) {
        setIsLoading(false);
      }
    };
    
    initializeData();
    
    return () => {
      isMounted.current = false;
    };
  }, [session]);

  const loadCustomExercises = async () => {
    try {
      if (session?.user.id) {
        // Load from Supabase if user is signed in
        const { data, error } = await supabase
          .from('custom_exercises')
          .select('name')
          .eq('user_id', session.user.id)
          .order('name', { ascending: true });

        if (error) throw error;
        
        if (isMounted.current) {
          setCustomExercises(data.map(exercise => exercise.name));
        }
      } else {
        // Load from AsyncStorage if user is not signed in
        const savedExercises = await AsyncStorage.getItem('customExercises');
        if (savedExercises && isMounted.current) {
          const exercises = JSON.parse(savedExercises);
          setCustomExercises(exercises.sort());
        }
      }
    } catch (error) {
      console.error('Error loading custom exercises:', error);
    }
  };

  const handleAddCustomExercise = async (name: string) => {
    if (!name.trim()) {
      await loadCustomExercises(); // Reload exercises if name is empty (deletion case)
      return;
    }

    try {
      if (session?.user.id) {
        // Save to Supabase if user is signed in
        const { error } = await supabase
          .from('custom_exercises')
          .insert({
            user_id: session.user.id,
            name: name.trim(),
          });

        if (error) throw error;
        await loadCustomExercises(); // Reload to ensure consistency
      } else {
        // Save to AsyncStorage if user is not signed in
        const newExercises = [...customExercises, name.trim()].sort();
        await AsyncStorage.setItem('customExercises', JSON.stringify(newExercises));
        setCustomExercises(newExercises);
      }
    } catch (error) {
      console.error('Error saving custom exercise:', error);
      throw error;
    }
  };

  const fetchUserStats = async () => {
    try {
      setIsStatsLoading(true);
      const userStats = await loadUserStats(session?.user.id);
      
      if (isMounted.current) {
        setStats(userStats);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      if (isMounted.current) {
        setIsStatsLoading(false);
      }
    }
  };

  const fetchUserGoals = async () => {
    try {
      setIsGoalsLoading(true);
      const userGoals = await loadUserGoals(session?.user.id);
      
      if (isMounted.current) {
        setGoals(userGoals);
      }
    } catch (error) {
      console.error('Error fetching user goals:', error);
    } finally {
      if (isMounted.current) {
        setIsGoalsLoading(false);
      }
    }
  };

  const handleAddGoal = async (goal: string) => {
    try {
      await addUserGoal(goal, session?.user.id);
      
      // Refresh goals
      await fetchUserGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
      throw error;
    }
  };

  const handleRemoveGoal = async (goal: string) => {
    try {
      await removeUserGoal(goal, session?.user.id);
      
      // Refresh goals
      await fetchUserGoals();
    } catch (error) {
      console.error('Error removing goal:', error);
      throw error;
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      if (isMounted.current) {
        setProfilePhoto(null);
        setStats(defaultStats);
        setGoals([]);
      }
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleOpenReminders = useCallback(() => {
    setShowRemindersModal(true);
  }, []);

  const handleCloseReminders = useCallback(() => {
    setShowRemindersModal(false);
    // Reload settings in case they were changed
    loadInitialData();
  }, []);

  const handleOpenSubscription = useCallback(() => {
    setShowSubscriptionModal(true);
  }, []);

  // Format reminder time for display
  const formatReminderTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <AnimatedTabScreen>
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.placeholderContainer}>
              <View style={styles.photoPlaceholder} />
              <View style={styles.placeholderStats} />
              <View style={styles.placeholderMenu} />
            </View>
          ) : (
            <>
              <Animated.View 
                style={styles.profilePhotoContainer}
                layout={Layout}
              >
                {session ? (
                  <Image
                    source={{ 
                      uri: profilePhoto || 
                      'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&auto=format&fit=crop&q=60'
                    }}
                    style={styles.profilePhoto}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Camera size={32} color="#666666" />
                  </View>
                )}
              </Animated.View>
              
              <StatsSection 
                stats={stats}
                isLoading={isStatsLoading}
              />
              
              <GoalsSection 
                goals={goals}
                onAddGoal={handleAddGoal}
                onRemoveGoal={handleRemoveGoal}
                isLoading={isGoalsLoading}
              />

              {!isSubscribed && (
                <SubscriptionCard 
                  horizontal 
                  onPress={handleOpenSubscription} 
                  customMessage="Unlock premium stats, unlimited exercises & more"
                />
              )}
              
              {!isSubscribed && (
                <FeatureLimit
                  currentCount={customExercises.length}
                  featureName="Custom Exercise"
                  featureKey="max_custom_exercises"
                  limitReachedMessage="Upgrade to add more custom exercises"
                  onUpgrade={handleOpenSubscription}
                />
              )}

              <Animated.View 
                style={styles.menuSection}
                layout={Layout}
              >
                <TouchableOpacity style={styles.menuItem}>
                  <Settings size={24} color="#1A1A1A" />
                  <Text style={styles.menuText}>Settings</Text>
                  {!session && (
                    <TouchableOpacity
                      style={styles.signInButton}
                      onPress={() => setShowAuthModal(true)}
                    >
                      <Text style={styles.signInButtonText}>Sign In</Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
                
                {session && (
                  <TouchableOpacity 
                    style={styles.menuItem}
                    onPress={handleOpenSubscription}
                  >
                    <CreditCard size={24} color="#1A1A1A" />
                    <View style={styles.menuTextContainer}>
                      <Text style={styles.menuText}>Subscription</Text>
                      {isSubscribed ? (
                        <Text style={styles.menuSubtext}>Premium Active</Text>
                      ) : (
                        <Text style={styles.menuSubtext}>Free Plan</Text>
                      )}
                    </View>
                    {isSubscribed && (
                      <View style={styles.premiumBadge}>
                        <Crown size={12} color="#FFD700" />
                        <Text style={styles.premiumText}>PREMIUM</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={handleOpenReminders}
                >
                  <Clock size={24} color="#1A1A1A" />
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuText}>Reminders</Text>
                    {notificationSettings?.enabled && (
                      <Text style={styles.menuSubtext}>
                        Daily at {formatReminderTime(notificationSettings.time)}
                      </Text>
                    )}
                  </View>
                  {notificationSettings?.enabled && (
                    <View style={styles.activeIndicator} />
                  )}
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem}>
                  <Award size={24} color="#1A1A1A" />
                  <Text style={styles.menuText}>Achievements</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.menuItem}>
                  <TrendingUp size={24} color="#1A1A1A" />
                  <Text style={styles.menuText}>Progress</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => setShowExercisePicker(true)}
                >
                  <Dumbbell size={24} color="#1A1A1A" />
                  <View style={styles.menuTextContainer}>
                    <Text style={styles.menuText}>Custom Exercises</Text>
                    {!isSubscribed && (
                      <Text style={styles.menuSubtext}>
                        {customExercises.length}/{limits.max_custom_exercises} Available
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                
                {session && (
                  <TouchableOpacity 
                    style={[styles.menuItem, styles.signOutItem]}
                    onPress={handleSignOut}
                  >
                    <LogOut size={24} color="#FF3B30" />
                    <Text style={styles.signOutText}>Sign Out</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            </>
          )}
        </ScrollView>

        <ExercisePicker
          visible={showExercisePicker}
          onClose={() => setShowExercisePicker(false)}
          customExercises={customExercises}
          onAddCustomExercise={handleAddCustomExercise}
          showUpgradePrompt={!isSubscribed && customExercises.length >= limits.max_custom_exercises}
          onUpgrade={handleOpenSubscription}
        />

        <AuthModal
          visible={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />

        <RemindersModal
          visible={showRemindersModal}
          onClose={handleCloseReminders}
        />
        
        <SubscriptionModal
          visible={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
        />
      </SafeAreaView>
    </AnimatedTabScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 0,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    // Add extra padding at bottom for better scrolling on iOS
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    marginBottom: 8,
    color: '#1A1A1A',
  },
  placeholderContainer: {
    alignItems: 'center',
    gap: 24,
  },
  placeholderStats: {
    width: '100%',
    height: 80,
    borderRadius: 12,
    backgroundColor: '#EEEEEE',
  },
  placeholderMenu: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    backgroundColor: '#EEEEEE',
  },
  profilePhotoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profilePhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5E5E5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#666666',
    borderStyle: 'dashed',
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuTextContainer: {
    flex: 1,
  },
  menuText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#1A1A1A',
    marginLeft: 16,
    flex: 1,
  },
  menuSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
    marginLeft: 16,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#007AFF',
  },
  signInButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  signInButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  signOutItem: {
    borderBottomWidth: 0,
  },
  signOutText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FF3B30',
    marginLeft: 16,
  },
});
