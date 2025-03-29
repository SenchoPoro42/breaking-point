import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format } from 'date-fns';
import { useEffect, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeIn,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  Easing,
  runOnJS,
  FadeOut,
  SlideInDown,
  SlideOutDown
} from 'react-native-reanimated';
import { Dumbbell, Plus, X, Replace, MousePointerClick, RefreshCcw, Trash2 } from 'lucide-react-native';
import ToastManager, { Toast } from '@/components/ToastManager';
import ExercisePicker from '@/components/ExercisePicker';
import AnimatedTabScreen from '@/components/AnimatedTabScreen';

type Exercise = {
  id: string;
  name: string;
};

type WorkoutPlan = {
  exercises: Exercise[];
};

// Static data
const defaultExercises: Exercise[] = [
  { id: '1', name: 'Push-ups' },
  { id: '2', name: 'Pull-ups' },
  { id: '3', name: 'Squats' },
  { id: '4', name: 'Dips' },
];

const days = [
  { id: 'monday', label: 'Mon' },
  { id: 'tuesday', label: 'Tue' },
  { id: 'wednesday', label: 'Wed' },
  { id: 'thursday', label: 'Thu' },
  { id: 'friday', label: 'Fri' },
  { id: 'saturday', label: 'Sat' },
  { id: 'sunday', label: 'Sun' },
];

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

// Confirmation Dialog Component
function ConfirmationDialog({ 
  onConfirm, 
  onCancel 
}: { 
  onConfirm: () => void, 
  onCancel: () => void 
}) {
  // Button animation values
  const buttonScale = useSharedValue(1);
  
  const handlePressIn = () => {
    buttonScale.value = withTiming(0.95, { duration: 100 });
  };
  
  const handlePressOut = () => {
    buttonScale.value = withTiming(1, { duration: 150 });
  };
  
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  return (
    <Animated.View 
      style={styles.confirmationContainer}
      entering={SlideInDown.springify().damping(15)}
      exiting={SlideOutDown.springify().damping(15)}
    >
      <View style={styles.confirmationHeader}>
        <Trash2 size={24} color="#FF3B30" />
        <Text style={styles.confirmationTitle}>Clear All Workouts?</Text>
      </View>
      
      <Text style={styles.confirmationText}>
        This will reset your entire schedule to rest days.
      </Text>
      
      <Animated.View style={[styles.buttonWrapper, buttonStyle]}>
        <TouchableOpacity 
          style={styles.clearAllButton}
          onPress={onConfirm}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.9}
        >
          <View style={styles.clearButtonContent}>
            <Trash2 size={20} color="#FFFFFF" />
            <Text style={styles.clearAllButtonText}>Clear All Workouts</Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
      
      <TouchableOpacity 
        style={styles.cancelButton}
        onPress={onCancel}
      >
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// DayCard Component
function DayCard({
  day,
  isWorkoutDay,
  isToday,
  isAnimating,
  workoutPlan,
  onToggleDay,
  onAddExercise,
  onExercisePress,
  onRemoveExercise,
  isFirstInteraction
}: {
  day: typeof days[0];
  isWorkoutDay: boolean;
  isToday: boolean;
  isAnimating: boolean;
  workoutPlan: WorkoutPlan | null;
  onToggleDay: (dayId: string) => void;
  onAddExercise: (dayId: string) => void;
  onExercisePress: (dayId: string, index: number) => void;
  onRemoveExercise: (dayId: string, exerciseId: string) => void;
  isFirstInteraction: boolean;
}) {
  const scale = useSharedValue(1);
  
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  // Handle tap on the card with simple scaling animation
  const handlePress = () => {
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withTiming(1, { duration: 200 })
    );
    onToggleDay(day.id);
  };

  return (
    <View style={styles.dayCardContainer}>      
      {/* Card - using simple tap instead of gesture */}
      <TouchableOpacity 
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Animated.View 
          style={[styles.dayCardContent, cardStyle]}
        >
          <Animated.View 
            style={[
              styles.dayCard,
              isWorkoutDay && styles.workoutDay,
              isToday && !isWorkoutDay && styles.todayCard,
              isAnimating && styles.errorCard
            ]}
            layout={Layout}
          >
            <View style={styles.dayHeader}>
              <Text style={[
                styles.dayLabel,
                isWorkoutDay && styles.workoutText,
                isToday && !isWorkoutDay && styles.todayText
              ]}>
                {day.label}
              </Text>
              {isToday && (
                <Text style={[
                  styles.todayBadge,
                  isWorkoutDay && styles.todayBadgeOnWorkout
                ]}>
                  TODAY
                </Text>
              )}
              {isWorkoutDay && (
                <TouchableOpacity
                  style={styles.addExerciseButton}
                  onPress={() => onAddExercise(day.id)}
                >
                  <Plus size={16} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {isWorkoutDay && workoutPlan ? (
              <View style={styles.exerciseList}>
                {workoutPlan.exercises.map((exercise, exerciseIndex) => (
                  <View key={exercise.id}>
                    <TouchableOpacity 
                      style={styles.exerciseRow}
                      onPress={() => onExercisePress(day.id, exerciseIndex)}
                    >
                      <Text style={[styles.exercise, styles.workoutText]}>
                        {exercise.name}
                      </Text>
                      <View style={styles.exerciseActions}>
                        <Replace size={16} color="#FFFFFF" style={styles.replaceIcon} />
                        <TouchableOpacity
                          onPress={() => onRemoveExercise(day.id, exercise.id)}
                          style={[styles.actionButton, styles.removeButton]}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <X size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text 
                style={[
                  styles.restDescription,
                  isToday && styles.todayText
                ]}
              >
                Rest Day
              </Text>
            )}
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

export default function ScheduleScreen() {
  // State
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [customWorkouts, setCustomWorkouts] = useState<Record<string, WorkoutPlan>>({});
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedDayForExercise, setSelectedDayForExercise] = useState<string | null>(null);
  const [selectedExerciseIndex, setSelectedExerciseIndex] = useState<number | null>(null);
  const [customExercises, setCustomExercises] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [animatingDayId, setAnimatingDayId] = useState<string | null>(null);
  const [isFirstInteraction, setIsFirstInteraction] = useState(true);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  
  // Constants
  const isMounted = useRef(true);
  const today = format(new Date(), 'EEEE').toLowerCase();
  
  // Animation values for the clear button
  const clearButtonScale = useSharedValue(1);
  const clearButtonRotate = useSharedValue(0);
  
  // Component lifecycle
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Initial load
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load workout days
        const savedDays = await AsyncStorage.getItem('workoutDays');
        if (savedDays && isMounted.current) {
          setSelectedDays(JSON.parse(savedDays));
        }
        
        // Load custom workouts
        const savedWorkouts = await AsyncStorage.getItem('customWorkouts');
        if (savedWorkouts && isMounted.current) {
          setCustomWorkouts(JSON.parse(savedWorkouts));
        }
        
        // Load custom exercises
        const savedExercises = await AsyncStorage.getItem('customExercises');
        if (savedExercises && isMounted.current) {
          setCustomExercises(JSON.parse(savedExercises));
        }
        
        // Check if this is first time viewing schedule
        const hasViewedSchedule = await AsyncStorage.getItem('hasViewedSchedule');
        if (hasViewedSchedule && isMounted.current) {
          setIsFirstInteraction(false);
        } else if (isMounted.current) {
          // Save that user has viewed schedule
          await AsyncStorage.setItem('hasViewedSchedule', 'true');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };
    
    loadData();
  }, []);

  // Save functions
  const saveCustomExercises = async (exercises: string[]) => {
    try {
      await AsyncStorage.setItem('customExercises', JSON.stringify(exercises));
    } catch (error) {
      console.error('Error saving custom exercises:', error);
    }
  };

  const saveCustomWorkouts = async (workouts: Record<string, WorkoutPlan>) => {
    try {
      await AsyncStorage.setItem('customWorkouts', JSON.stringify(workouts));
    } catch (error) {
      console.error('Error saving custom workouts:', error);
    }
  };

  // Handlers
  const handleAddCustomExercise = async (name: string) => {
    if (!name) return;
    
    try {
      const newExercises = [...customExercises, name];
      if (isMounted.current) {
        setCustomExercises(newExercises);
        await saveCustomExercises(newExercises);
      }
    } catch (error) {
      console.error('Error adding custom exercise:', error);
    }
  };

  const getWorkoutForDay = useCallback((dayId: string): WorkoutPlan | null => {
    if (!selectedDays.includes(dayId)) return null;
    if (customWorkouts[dayId]) return customWorkouts[dayId];
    return { exercises: [...defaultExercises] };
  }, [selectedDays, customWorkouts]);

  const handleAddExercise = useCallback((dayId: string) => {
    if (isMounted.current) {
      setSelectedDayForExercise(dayId);
      setSelectedExerciseIndex(null);
      setShowExercisePicker(true);
    }
  }, []);

  const handleExercisePress = useCallback((dayId: string, index: number) => {
    if (isMounted.current) {
      setSelectedDayForExercise(dayId);
      setSelectedExerciseIndex(index);
      setShowExercisePicker(true);
    }
  }, []);

  const handleSelectExercise = useCallback((exercise: Exercise) => {
    if (!selectedDayForExercise || !isMounted.current) return;

    try {
      const workout = getWorkoutForDay(selectedDayForExercise);
      if (!workout) return;

      let updatedExercises: Exercise[];

      if (selectedExerciseIndex !== null) {
        // Replace existing exercise
        updatedExercises = [...workout.exercises];
        updatedExercises[selectedExerciseIndex] = exercise;
      } else {
        // Add new exercise
        updatedExercises = [...workout.exercises, exercise];
      }

      const updatedWorkout = {
        ...workout,
        exercises: updatedExercises,
      };

      const newCustomWorkouts = {
        ...customWorkouts,
        [selectedDayForExercise]: updatedWorkout,
      };

      if (isMounted.current) {
        setCustomWorkouts(newCustomWorkouts);
        saveCustomWorkouts(newCustomWorkouts);
        setSelectedDayForExercise(null);
        setSelectedExerciseIndex(null);
      }
    } catch (error) {
      console.error('Error selecting exercise:', error);
    }
  }, [selectedDayForExercise, selectedExerciseIndex, customWorkouts, getWorkoutForDay]);

  const handleRemoveExercise = useCallback((dayId: string, exerciseId: string) => {
    if (!isMounted.current) return;
    
    try {
      const workout = getWorkoutForDay(dayId);
      if (!workout) return;

      const updatedExercises = workout.exercises.filter(exercise => exercise.id !== exerciseId);

      const updatedWorkout = {
        ...workout,
        exercises: updatedExercises,
      };

      const newCustomWorkouts = {
        ...customWorkouts,
        [dayId]: updatedWorkout,
      };

      if (isMounted.current) {
        setCustomWorkouts(newCustomWorkouts);
        saveCustomWorkouts(newCustomWorkouts);
      }
    } catch (error) {
      console.error('Error removing exercise:', error);
    }
  }, [customWorkouts, getWorkoutForDay]);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' | 'warning' = 'error') => {
    if (!isMounted.current) return;
    
    try {
      const newToast: Toast = {
        id: Date.now().toString(),
        message,
        type
      };
      setToasts(prev => [...prev, newToast]);
    } catch (error) {
      console.error('Error showing toast:', error);
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    if (isMounted.current) {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }
  }, []);

  // Animation
  const handleErrorAnimation = useCallback((dayId: string, message: string) => {
    if (!isMounted.current) return;
    
    try {
      showToast(message, 'error');
      setAnimatingDayId(dayId);
      
      // Reset animation after a short delay
      setTimeout(() => {
        if (isMounted.current) {
          setAnimatingDayId(null);
        }
      }, 500);
    } catch (error) {
      console.error('Error in error animation:', error);
    }
  }, [showToast]);

  // Validation logic for toggling workout days
  const validateDayToggle = useCallback((dayId: string, isAdding: boolean): { isValid: boolean; message?: string } => {
    try {
      if (!isAdding) {
        // Removing is always valid
        return { isValid: true };
      }
      
      // Adding needs validation
      const newSelection = [...selectedDays, dayId];
      
      if (newSelection.length > 4) {
        return { 
          isValid: false, 
          message: 'Maximum of 4 workout days allowed' 
        };
      }

      const dayIndices = newSelection.map(d => days.findIndex(day => day.id === d));
      dayIndices.sort((a, b) => a - b);
      
      const hasConsecutiveDays = dayIndices.some((dayIndex, i) => {
        if (i === 0) return false;
        return Math.abs(dayIndex - dayIndices[i - 1]) === 1;
      });

      if (hasConsecutiveDays) {
        return { 
          isValid: false, 
          message: 'Rest day required between workouts' 
        };
      }

      return { isValid: true };
    } catch (error) {
      console.error('Error validating day toggle:', error);
      return { isValid: false, message: 'Validation error' };
    }
  }, [selectedDays]);

  // Simplified toggle function without relying on gesture handler
  const toggleDay = useCallback(async (dayId: string) => {
    if (!isMounted.current) return;
    
    try {
      const isCurrentlySelected = selectedDays.includes(dayId);
      let newSelection: string[];
      
      if (isCurrentlySelected) {
        // Remove day
        newSelection = selectedDays.filter(d => d !== dayId);
      } else {
        // Validate before adding
        const validation = validateDayToggle(dayId, true);
        if (!validation.isValid) {
          handleErrorAnimation(dayId, validation.message || 'Invalid selection');
          return;
        }
        
        // Add day
        newSelection = [...selectedDays, dayId];
      }

      // Update state and AsyncStorage
      if (isMounted.current) {
        setSelectedDays(newSelection);
        try {
          await AsyncStorage.setItem('workoutDays', JSON.stringify(newSelection));
        } catch (error) {
          console.error('AsyncStorage error:', error);
        }
        
        // After first toggle, turn off first-time hints
        if (isFirstInteraction) {
          setIsFirstInteraction(false);
          try {
            await AsyncStorage.setItem('hasViewedSchedule', 'true');
          } catch (error) {
            console.error('AsyncStorage error:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error toggling day:', error);
    }
  }, [
    selectedDays, 
    validateDayToggle, 
    handleErrorAnimation, 
    isFirstInteraction
  ]);

  // Handle show confirmation dialog
  const handleShowClearConfirmation = useCallback(() => {
    if (!isMounted.current || selectedDays.length === 0) return;
    
    // Animate the button
    clearButtonScale.value = withSequence(
      withSpring(0.8),
      withSpring(1)
    );
    
    setShowClearConfirmation(true);
  }, [selectedDays.length, clearButtonScale]);

  // Function to clear all workout days
  const clearAllDays = useCallback(async () => {
    if (!isMounted.current) return;
    
    try {
      // Don't do anything if there are no selected days
      if (selectedDays.length === 0) {
        showToast('All days are already rest days', 'info');
        return;
      }
      
      // Close the confirmation dialog
      setShowClearConfirmation(false);
      
      // Animate the button
      clearButtonRotate.value = withSequence(
        withTiming(360, { duration: 600 }),
        withTiming(0, { duration: 0 })
      );
      
      // Clear selected days
      if (isMounted.current) {
        setSelectedDays([]);
        try {
          await AsyncStorage.setItem('workoutDays', JSON.stringify([]));
          // Show success message
          showToast('Schedule cleared', 'success');
        } catch (error) {
          console.error('AsyncStorage error:', error);
          showToast('Failed to clear workout days', 'error');
        }
      }
    } catch (error) {
      console.error('Error clearing workout days:', error);
      showToast('Failed to clear workout days', 'error');
    }
  }, [
    selectedDays, 
    showToast,
    clearButtonRotate
  ]);

  // Clear button animation style
  const clearButtonStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: clearButtonScale.value },
      { rotate: `${clearButtonRotate.value}deg` }
    ]
  }));

  // Button disabled state and styling
  const isClearButtonDisabled = selectedDays.length === 0;

  // Render
  return (
    <AnimatedTabScreen>
      <SafeAreaView style={styles.container} edges={[]}>
        <ToastManager
          toasts={toasts}
          onRemove={removeToast}
        />
        
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Schedule</Text>
          
          <View style={styles.headerControls}>
            <TouchableOpacity
              style={[
                styles.clearButton,
                isClearButtonDisabled && styles.clearButtonDisabled
              ]}
              onPress={handleShowClearConfirmation}
              disabled={isClearButtonDisabled}
            >
              <Animated.View style={clearButtonStyle}>
                <RefreshCcw 
                  size={18} 
                  color={isClearButtonDisabled ? "#AAAAAA" : "#FF3B30"} 
                />
              </Animated.View>
              <Text 
                style={[
                  styles.clearButtonText,
                  isClearButtonDisabled && styles.clearButtonTextDisabled
                ]}
              >
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          bounces={true}
        >
          {isLoading ? (
            <View style={styles.placeholderContainer}>
              {days.map((day, index) => (
                <View 
                  key={day.id} 
                  style={[
                    styles.placeholderDay, 
                    { height: 100 + (index % 2) * 30 }
                  ]} 
                />
              ))}
            </View>
          ) : (
            <Animated.View 
              style={styles.daysGrid}
              layout={Layout}
            >
              {days.map((day) => (
                <DayCard
                  key={day.id}
                  day={day}
                  isWorkoutDay={selectedDays.includes(day.id)}
                  isToday={day.id === today}
                  isAnimating={animatingDayId === day.id}
                  workoutPlan={getWorkoutForDay(day.id)}
                  onToggleDay={toggleDay}
                  onAddExercise={handleAddExercise}
                  onExercisePress={handleExercisePress}
                  onRemoveExercise={handleRemoveExercise}
                  isFirstInteraction={isFirstInteraction}
                />
              ))}
            </Animated.View>
          )}
        </ScrollView>

        <ExercisePicker
          visible={showExercisePicker}
          onClose={() => {
            if (isMounted.current) {
              setShowExercisePicker(false);
              setSelectedDayForExercise(null);
              setSelectedExerciseIndex(null);
            }
          }}
          onSelectExercise={handleSelectExercise}
          customExercises={customExercises}
          onAddCustomExercise={handleAddCustomExercise}
        />
        
        {/* Clear confirmation overlay */}
        {showClearConfirmation && (
          <View style={styles.confirmationOverlay}>
            <Animated.View 
              style={styles.confirmationOverlayBackground}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
            >
              <TouchableOpacity 
                style={{ flex: 1 }}
                onPress={() => setShowClearConfirmation(false)}
              />
            </Animated.View>
            
            <ConfirmationDialog
              onConfirm={clearAllDays}
              onCancel={() => setShowClearConfirmation(false)}
            />
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#F8F9FA',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    color: '#1A1A1A',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  clearButtonDisabled: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  clearButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FF3B30',
  },
  clearButtonTextDisabled: {
    color: '#AAAAAA',
  },
  placeholderContainer: {
    marginBottom: 20,
  },
  placeholderDay: {
    height: 120,
    borderRadius: 12,
    backgroundColor: '#EEEEEE',
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  dayCardContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  dayCardContent: {
    width: '100%',
    position: 'relative',
  },
  dayCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 1,
  },
  workoutDay: {
    backgroundColor: '#007AFF',
  },
  todayCard: {
    backgroundColor: '#F5F5F5',
  },
  errorCard: {
    backgroundColor: '#FF3B30',
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
  },
  workoutText: {
    color: '#FFFFFF',
  },
  todayText: {
    color: '#666666',
  },
  todayBadge: {
    backgroundColor: '#666666',
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayBadgeOnWorkout: {
    backgroundColor: '#FFFFFF',
    color: '#007AFF',
  },
  exerciseList: {
    marginTop: 8,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  exercise: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    flex: 1,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  replaceIcon: {
    marginRight: 8,
    opacity: 0.8,
  },
  actionButton: {
    padding: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
  },
  removeButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
  },
  restDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  addExerciseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 6,
    borderRadius: 6,
  },
  confirmationOverlay: {
    position: 'absolute',
    left: 0,
    
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 1000,
  },
  confirmationOverlayBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  confirmationContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 10,
  },
  confirmationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  confirmationTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#1A1A1A',
  },
  confirmationText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonWrapper: {
    width: '100%',
  },
  clearAllButton: {
    backgroundColor: '#FF3B30',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  clearButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  clearAllButtonText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#FFFFFF',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#666666',
  },
});
