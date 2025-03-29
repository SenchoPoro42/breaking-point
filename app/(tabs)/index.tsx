import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, Check, PartyPopper } from 'lucide-react-native';
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, isToday, parseISO } from 'date-fns';
import Animated, { 
  FadeIn,
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withDelay,
  withTiming,
  runOnJS,
  useSharedValue,
  Layout
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/lib/supabase';
import AnimatedTabScreen from '@/components/AnimatedTabScreen';
import { loadUserStats, saveUserStats, defaultStats } from '@/lib/statsService';

type Exercise = {
  id: string;
  name: string;
};

type WorkoutPlan = {
  exercises: Exercise[];
};

type WorkoutDay = Tables['workout_days']['Row'];
type WorkoutHistory = Tables['workout_history']['Row'];

const defaultExercises: Exercise[] = [
  { id: '1', name: 'Push-ups' },
  { id: '2', name: 'Pull-ups' },
  { id: '3', name: 'Squats' },
  { id: '4', name: 'Dips' },
];

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function WorkoutsScreen() {
  const { session } = useAuth();
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [todayWorkout, setTodayWorkout] = useState<WorkoutPlan | null>(null);
  const [isRestDay, setIsRestDay] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [customWorkouts, setCustomWorkouts] = useState<Record<string, WorkoutPlan>>({});
  const [isWorkoutCompleted, setIsWorkoutCompleted] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Animation values
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(0);
  const tipOpacity = useSharedValue(0);
  const tipTranslateY = useSharedValue(50);
  const isMounted = useRef(true);

  // Component lifecycle
  useEffect(() => {
    isMounted.current = true;
    
    // Animate tip card in from bottom
    setTimeout(() => {
      tipOpacity.value = withTiming(1, { duration: 600 });
      tipTranslateY.value = withSpring(0, {
        damping: 18,
        stiffness: 100,
      });
    }, 700); // Delay animation to let main content animate in first
    
    return () => {
      isMounted.current = false;
    };
  }, []);

  const loadWorkoutData = async () => {
    try {
      if (session?.user.id) {
        // Load workout days from Supabase
        const { data: workoutDays, error: daysError } = await supabase
          .from('workout_days')
          .select('day')
          .eq('user_id', session.user.id);

        if (daysError) throw daysError;

        const days = workoutDays.map(wd => wd.day);
        setSelectedDays(days);

        // Check if workout is completed today
        const today = format(new Date(), 'yyyy-MM-dd');
        const { data: history, error: historyError } = await supabase
          .from('workout_history')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('date', today)
          .single();

        if (historyError && historyError.code !== 'PGRST116') throw historyError;
        setIsWorkoutCompleted(!!history);

        // Get today's workout
        const currentDay = format(new Date(), 'EEEE').toLowerCase();
        if (days.includes(currentDay)) {
          // Load custom exercises for today
          const { data: exercises, error: exercisesError } = await supabase
            .from('custom_exercises')
            .select('name')
            .eq('user_id', session.user.id);

          if (exercisesError) throw exercisesError;

          const todayExercises = exercises?.length 
            ? exercises.map((ex, index) => ({
                id: index.toString(),
                name: ex.name,
              }))
            : defaultExercises;

          setTodayWorkout({ exercises: todayExercises });
          setIsRestDay(false);
        } else {
          setTodayWorkout(null);
          setIsRestDay(true);
        }
      } else {
        // Load from AsyncStorage for non-authenticated users
        const days = await AsyncStorage.getItem('workoutDays');
        const savedWorkouts = await AsyncStorage.getItem('customWorkouts');
        const history = await AsyncStorage.getItem('workoutHistory');
        
        if (days) {
          const parsedDays = JSON.parse(days);
          setSelectedDays(parsedDays);
        }

        if (savedWorkouts) {
          const parsedWorkouts = JSON.parse(savedWorkouts);
          setCustomWorkouts(parsedWorkouts);
        }

        if (history) {
          const parsedHistory = JSON.parse(history);
          const todayCompleted = parsedHistory.some((workout: any) => 
            isToday(parseISO(workout.date))
          );
          setIsWorkoutCompleted(todayCompleted);
        }

        const today = format(new Date(), 'EEEE').toLowerCase();
        if (days && JSON.parse(days).includes(today)) {
          const workouts = savedWorkouts ? JSON.parse(savedWorkouts) : {};
          const todayWorkoutPlan = workouts[today] || { exercises: defaultExercises };
          setTodayWorkout(todayWorkoutPlan);
          setIsRestDay(false);
        } else {
          setTodayWorkout(null);
          setIsRestDay(true);
        }
      }
    } catch (error) {
      console.error('Error loading workout data:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const triggerCelebration = () => {
    setShowCelebration(true);
    
    scale.value = withSequence(
      withSpring(1.2),
      withSpring(1),
      withDelay(500, withSpring(1.1)),
      withSpring(1)
    );

    rotate.value = withSequence(
      withTiming(360, { duration: 1000 }),
      withTiming(0, { duration: 0 })
    );

    opacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withDelay(2000, withTiming(0, { duration: 300 }, () => {
        runOnJS(setShowCelebration)(false);
      }))
    );
  };

  // Updated to also update user stats when completing a workout
  const handleComplete = async () => {
    try {
      const date = format(new Date(), 'yyyy-MM-dd');
      const completionData = {
        date,
        exercises: todayWorkout?.exercises.map(ex => ({
          name: ex.name,
          completed: true
        }))
      };

      if (session?.user.id) {
        // Save workout history
        const { error } = await supabase
          .from('workout_history')
          .insert({
            user_id: session.user.id,
            date,
            exercises: completionData.exercises,
          });

        if (error) throw error;
        
        // Update user stats
        const currentStats = await loadUserStats(session.user.id);
        const updatedStats = {
          ...currentStats,
          totalWorkouts: (currentStats.totalWorkouts || 0) + 1,
          currentStreak: (currentStats.currentStreak || 0) + 1,
          // Update longest streak if current streak is now longer
          longestStreak: Math.max(
            (currentStats.longestStreak || 0), 
            (currentStats.currentStreak || 0) + 1
          ),
        };
        
        // Save updated stats
        await saveUserStats(updatedStats, session.user.id);
      } else {
        // Save to AsyncStorage for non-authenticated users
        // 1. Save workout history
        const history = JSON.parse(await AsyncStorage.getItem('workoutHistory') || '[]');
        history.push(completionData);
        await AsyncStorage.setItem('workoutHistory', JSON.stringify(history));
        
        // 2. Update user stats
        const savedStats = await AsyncStorage.getItem('userStats');
        let currentStats = defaultStats;
        if (savedStats) {
          currentStats = JSON.parse(savedStats);
        }
        
        const updatedStats = {
          ...currentStats,
          totalWorkouts: (currentStats.totalWorkouts || 0) + 1,
          currentStreak: (currentStats.currentStreak || 0) + 1,
          longestStreak: Math.max(
            (currentStats.longestStreak || 0), 
            (currentStats.currentStreak || 0) + 1
          ),
        };
        
        // Save updated stats
        await AsyncStorage.setItem('userStats', JSON.stringify(updatedStats));
      }

      setShowCompletionModal(false);
      setIsWorkoutCompleted(true);
      triggerCelebration();
    } catch (error) {
      console.error('Error saving workout completion:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadWorkoutData();
      return () => {};
    }, [session])
  );

  useEffect(() => {
    const interval = setInterval(loadWorkoutData, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const celebrationStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` }
    ],
    opacity: opacity.value,
  }));

  const tipCardStyle = useAnimatedStyle(() => ({
    opacity: tipOpacity.value,
    transform: [{ translateY: tipTranslateY.value }],
  }));

  return (
    <AnimatedTabScreen>
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Today's Plan</Text>
          <Text style={styles.subtitle}>
            {format(new Date(), 'EEEE')} - {isRestDay ? 'Rest Day' : 'Workout Day'}
          </Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 120 } // Add extra padding at the bottom to account for the tip card
          ]}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.placeholderContainer}>
              <View style={styles.placeholderCard} />
              <View style={[styles.placeholderCard, { height: 120 }]} />
              <View style={[styles.placeholderCard, { height: 100 }]} />
            </View>
          ) : (
            <>
              {isRestDay ? (
                <Animated.View 
                  style={styles.restDayCard}
                  layout={Layout}
                >
                  <Text style={styles.restDayTitle}>Rest & Recovery</Text>
                  <Text style={styles.restDayText}>
                    Today is your scheduled rest day. Use this time to:
                  </Text>
                  <View style={styles.restTipsList}>
                    <Text style={styles.restTip}>• Get adequate sleep</Text>
                    <Text style={styles.restTip}>• Stay hydrated</Text>
                    <Text style={styles.restTip}>• Practice light stretching</Text>
                    <Text style={styles.restTip}>• Focus on proper nutrition</Text>
                  </View>
                </Animated.View>
              ) : (
                <>
                  {todayWorkout?.exercises.map((exercise, index) => (
                    <Animated.View 
                      key={exercise.id}
                      layout={Layout}
                    >
                      <TouchableOpacity style={styles.exerciseCard}>
                        <View style={styles.exerciseInfo}>
                          <Text style={styles.exerciseName}>{exercise.name}</Text>
                        </View>
                        <ChevronRight size={24} color="#007AFF" />
                      </TouchableOpacity>
                    </Animated.View>
                  ))}
                  
                  {!isRestDay && todayWorkout && !isWorkoutCompleted && (
                    <Animated.View layout={Layout}>
                      <TouchableOpacity 
                        style={styles.completeButton}
                        onPress={() => setShowCompletionModal(true)}
                      >
                        <Text style={styles.completeButtonText}>Complete Workout</Text>
                      </TouchableOpacity>
                    </Animated.View>
                  )}

                  {isWorkoutCompleted && (
                    <Animated.View 
                      style={styles.completedBanner}
                      layout={Layout}
                    >
                      <Check size={24} color="#4CAF50" />
                      <Text style={styles.completedText}>Workout completed for today!</Text>
                    </Animated.View>
                  )}
                </>
              )}
            </>
          )}

          {showCelebration && (
            <Animated.View style={[styles.celebrationOverlay, celebrationStyle]}>
              <PartyPopper size={64} color="#FFD700" />
              <Text style={styles.celebrationText}>Great job!</Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Tip of the day card - fixed at bottom */}
        <Animated.View 
          style={[styles.motivationCardContainer, tipCardStyle]}
        >
          <View style={styles.motivationCard}>
            <Text style={styles.motivationTitle}>Bruce's Tip of the Day</Text>
            <Text style={styles.motivationText}>
              {isRestDay 
                ? "Rest days are as crucial as workout days. Your body needs time to recover and adapt."
                : "Focus on quality movement and listen to your body. Progress comes from consistency."
              }
            </Text>
          </View>
        </Animated.View>

        <Modal
          visible={showCompletionModal}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Complete Workout</Text>
              <Text style={styles.modalSubtitle}>Mark today's workout as complete?</Text>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowCompletionModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleComplete}
                >
                  <Check size={20} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Complete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
    paddingBottom: Platform.OS === 'ios' ? 140 : 120,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    marginBottom: 8,
    color: '#1A1A1A',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    marginBottom: 20,
    color: '#666666',
  },
  placeholderContainer: {
    marginBottom: 20,
  },
  placeholderCard: {
    height: 80,
    borderRadius: 12,
    backgroundColor: '#EEEEEE',
    marginBottom: 16,
  },
  exerciseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
  },
  restDayCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  restDayTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  restDayText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#666666',
    marginBottom: 12,
  },
  restTipsList: {
    marginTop: 8,
  },
  restTip: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    lineHeight: 20,
  },
  motivationCardContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
  },
  motivationCard: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  motivationTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  motivationText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#FFFFFF',
    lineHeight: 24,
  },
  completeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  completeButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 500,
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#666666',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#666666',
  },
  saveButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  completedBanner: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  completedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#4CAF50',
    marginLeft: 8,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -32 }, { translateY: -32 }],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  celebrationText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#FFD700',
    marginTop: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
