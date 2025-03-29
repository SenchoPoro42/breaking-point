import { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import {
  X,
  Plus,
  Search,
  ChevronRight,
  FolderPlus,
  ChevronLeft,
  CircleAlert as AlertCircle,
  Trash2,
  Lock,
} from 'lucide-react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { exerciseData } from '@/lib/exerciseData';
import { ExercisePickerProps } from '@/types/exercises';
import DetailedExerciseView from './DetailedExerciseView';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.15;

const exerciseCategories = {
  'Upper Body': [
    'Push-ups',
    'Pull-ups',
    'Dips',
    'Diamond Push-ups',
    'Pike Push-ups',
    'Chin-ups',
    'Inverted Rows',
  ],
  'Lower Body': [
    'Squats',
    'Lunges',
    'Calf Raises',
    'Jump Squats',
    'Pistol Squats',
    'Bulgarian Split Squats',
  ],
  Core: [
    'Plank',
    'Leg Raises',
    'Russian Twists',
    'Mountain Climbers',
    'Hollow Body Hold',
    'L-Sits',
  ],
  Cardio: [
    'Burpees',
    'Mountain Climbers',
    'High Knees',
    'Jump Rope',
    'Jumping Jacks',
  ],
};

export default function ExercisePicker({
  visible,
  onClose,
  onSelectExercise,
  customExercises = [], // Default to empty array to prevent undefined
  onAddCustomExercise,
  showUpgradePrompt = false,
  onUpgrade,
  entryPoint = 'schedule',
  selectedExercise,
}: ExercisePickerProps) {
  // Component state
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [localCustomExercises, setLocalCustomExercises] = useState<string[]>(
    []
  );
  const [isClosing, setIsClosing] = useState(false);
  const [detailedExercise, setDetailedExercise] = useState<string | null>(null);

  // Animation values
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(SCREEN_HEIGHT / 3);

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Reset component state and sync with custom exercises when visibility changes
  useEffect(() => {
    if (visible) {
      setIsClosing(false);
      // Ensure we're not working with undefined
      const exercisesToUse = Array.isArray(customExercises)
        ? customExercises
        : [];
      setLocalCustomExercises([...exercisesToUse]);
      setSelectedCategory(null);
      setSearchQuery('');
      setSuggestions([]);
      setDetailedExercise(null);

      // Animate in
      opacity.value = withTiming(1, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
        mass: 1.2,
        overshootClamping: false,
      });
    } else {
      // Reset animation values when hidden
      opacity.value = 0;
      translateY.value = SCREEN_HEIGHT / 3;
    }
  }, [visible, customExercises]);

  // Component lifecycle management
  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, []);

  // Animation styles
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Safe state update - only update if component is still mounted
  const safeSetState = useCallback(
    <T>(setter: React.Dispatch<React.SetStateAction<T>>, value: T) => {
      if (isMounted.current) {
        setter(value);
      }
    },
    []
  );

  // Handle closing modal with animation
  const handleClose = useCallback(() => {
    if (isClosing) return;

    setIsClosing(true);

    // Animate out in one fluid motion
    opacity.value = withTiming(0, {
      duration: 250,
      easing: Easing.in(Easing.cubic),
    });

    translateY.value = withSpring(
      SCREEN_HEIGHT,
      {
        damping: 17,
        stiffness: 250,
        mass: 0.8,
        overshootClamping: true,
        restDisplacementThreshold: 0.01,
        restSpeedThreshold: 2,
      },
      (finished) => {
        if (finished) {
          runOnJS(onClose)();
          runOnJS(safeSetState)(setIsClosing, false);
        }
      }
    );
  }, [onClose, isClosing, safeSetState]);

  // Setup pan gesture for swipe to dismiss
  const panGesture = Gesture.Pan()
    .onStart(() => {
      if (isClosing) return;
    })
    .onUpdate((event) => {
      if (isClosing) return;

      // Only allow downward swipe
      if (event.translationY > 0) {
        // Direct assignment for immediate response during gesture
        translateY.value = event.translationY;

        // Calculate opacity based on position
        const progress = Math.min(event.translationY / (SCREEN_HEIGHT / 2), 1);
        opacity.value = 1 - progress * 0.5;
      }
    })
    .onEnd((event) => {
      if (isClosing) return;

      // If swipe is fast enough or passes threshold, dismiss
      if (event.velocityY > 500 || translateY.value > DISMISS_THRESHOLD) {
        // For seamless transition from gesture to dismiss animation,
        // use the current position as the starting point
        runOnJS(handleClose)();
      } else {
        // Spring back to position with natural feel
        translateY.value = withSpring(0, {
          damping: 20,
          stiffness: 300,
          mass: 1,
          velocity: event.velocityY,
        });

        // Restore opacity
        opacity.value = withTiming(1, {
          duration: 150,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  // Handle exercise selection
  const handleSelectExercise = useCallback(
    (exerciseName: string) => {
      if (!exerciseName.trim() || isClosing) return;

      if (onSelectExercise) {
        onSelectExercise({
          id: Date.now().toString(),
          name: exerciseName.trim(),
        });
      }

      handleClose();
    },
    [onSelectExercise, handleClose, isClosing]
  );

  // Find similar exercises for suggestions
  const findSimilarExercises = useCallback(
    (name: string): string[] => {
      const query = name.toLowerCase().trim();
      if (!query) return [];

      // Ensure localCustomExercises is never undefined when used
      const safeLocalCustomExercises = localCustomExercises || [];
      const allExercises = [
        ...Object.values(exerciseCategories).flat(),
        ...safeLocalCustomExercises,
      ];

      return allExercises
        .filter(
          (exercise) =>
            exercise.toLowerCase().includes(query) ||
            query.includes(exercise.toLowerCase())
        )
        .slice(0, 3);
    },
    [localCustomExercises]
  );

  // Handle new exercise name input with debounce
  const handleNewExerciseNameChange = useCallback(
    (text: string) => {
      setNewExerciseName(text);
      setErrorMessage(null);

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }

      if (text.trim().length >= 2) {
        searchTimeoutRef.current = setTimeout(() => {
          if (isMounted.current) {
            setSuggestions(findSimilarExercises(text));
          }
        }, 300);
      } else {
        setSuggestions([]);
      }
    },
    [findSimilarExercises]
  );

  // Delete exercise with safety checks
  const handleDeleteExercise = async (exerciseName: string) => {
    if (isDeleting || !exerciseName.trim()) return;

    try {
      safeSetState(setIsDeleting, exerciseName);

      if (session?.user.id) {
        const { error } = await supabase
          .from('custom_exercises')
          .delete()
          .eq('user_id', session.user.id)
          .eq('name', exerciseName);

        if (error) throw error;
      } else {
        // Ensure localCustomExercises is never undefined when filtered
        const safeLocalCustomExercises = localCustomExercises || [];
        const newExercises = safeLocalCustomExercises.filter(
          (name) => name !== exerciseName
        );
        await AsyncStorage.setItem(
          'customExercises',
          JSON.stringify(newExercises)
        );
      }

      if (isMounted.current) {
        safeSetState(setLocalCustomExercises, (prev) =>
          (prev || []).filter((name) => name !== exerciseName)
        );
        await onAddCustomExercise('');
      }
    } catch (error) {
      console.error('Error deleting exercise:', error);
      safeSetState(
        setErrorMessage,
        'Failed to delete exercise. Please try again.'
      );
    } finally {
      safeSetState(setIsDeleting, null);
    }
  };

  // Add custom exercise with validation
  const handleAddCustomExercise = async () => {
    const trimmedName = newExerciseName.trim();

    if (!trimmedName) {
      safeSetState(setErrorMessage, 'Please enter an exercise name');
      return;
    }

    if (trimmedName.length < 3) {
      safeSetState(
        setErrorMessage,
        'Exercise name must be at least 3 characters'
      );
      return;
    }

    if (isAdding) return;

    // Ensure safe array usage
    const safeLocalCustomExercises = localCustomExercises || [];
    const isDuplicate = [
      ...Object.values(exerciseCategories).flat(),
      ...safeLocalCustomExercises,
    ].some((exercise) => exercise.toLowerCase() === trimmedName.toLowerCase());

    if (isDuplicate) {
      safeSetState(setErrorMessage, 'This exercise already exists');
      return;
    }

    try {
      safeSetState(setIsAdding, true);
      await onAddCustomExercise(trimmedName);

      if (isMounted.current) {
        safeSetState(setLocalCustomExercises, (prev) => [
          ...(prev || []),
          trimmedName,
        ]);
        safeSetState(setNewExerciseName, '');
        safeSetState(setShowAddCustom, false);
        safeSetState(setSuggestions, []);
        safeSetState(setErrorMessage, null);
      }
    } catch (error) {
      console.error('Error adding exercise:', error);
      safeSetState(
        setErrorMessage,
        'Failed to add exercise. Please try again.'
      );
    } finally {
      safeSetState(setIsAdding, false);
    }
  };

  // Filter exercises based on search and category
  const getFilteredExercises = useCallback(() => {
    const query = searchQuery.toLowerCase().trim();
    let results: string[] = [];

    // Ensure safe array usage
    const safeLocalCustomExercises = localCustomExercises || [];

    if (selectedCategory) {
      if (selectedCategory === 'Custom') {
        results = safeLocalCustomExercises.filter((exercise) =>
          exercise.toLowerCase().includes(query)
        );
      } else if (
        exerciseCategories[selectedCategory as keyof typeof exerciseCategories]
      ) {
        results = exerciseCategories[
          selectedCategory as keyof typeof exerciseCategories
        ].filter((exercise) => exercise.toLowerCase().includes(query));
      }
    } else if (query) {
      Object.values(exerciseCategories).forEach((category) => {
        results.push(
          ...category.filter((exercise) =>
            exercise.toLowerCase().includes(query)
          )
        );
      });
      results.push(
        ...safeLocalCustomExercises.filter((exercise) =>
          exercise.toLowerCase().includes(query)
        )
      );
    }

    return Array.from(new Set(results));
  }, [searchQuery, selectedCategory, localCustomExercises]);

  const handleBack = () => {
    setDetailedExercise(null);
  };

  const handleExerciseAction = () => {
    setDetailedExercise(null);
  };

  if (!visible) return null;

  const renderExerciseList = () => (
    <ScrollView
      style={styles.exerciseList}
      bounces={false}
      showsVerticalScrollIndicator={true}
    >
      {getFilteredExercises().map((exercise) => (
        <View key={exercise} style={styles.exerciseItem}>
          <TouchableOpacity
            style={styles.exerciseButton}
            onPress={() => {
              setDetailedExercise(exercise);
            }}
            disabled={isClosing}
          >
            <Text style={styles.exerciseName}>{exercise}</Text>
          </TouchableOpacity>
          {(selectedCategory === 'Custom' ||
            (localCustomExercises &&
              localCustomExercises.includes(exercise))) && (
            <TouchableOpacity
              style={[
                styles.deleteButton,
                (isDeleting === exercise || isClosing) &&
                  styles.deleteButtonDisabled,
              ]}
              onPress={() => handleDeleteExercise(exercise)}
              disabled={isDeleting === exercise || isClosing}
            >
              {isDeleting === exercise ? (
                <ActivityIndicator size="small" color="#FF3B30" />
              ) : (
                <Trash2 size={20} color="#FF3B30" />
              )}
            </TouchableOpacity>
          )}
        </View>
      ))}
      {getFilteredExercises().length === 0 && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No exercises found</Text>
        </View>
      )}
    </ScrollView>
  );

  const renderCategoryList = () => (
    <ScrollView
      style={styles.categoriesContainer}
      bounces={false}
      showsVerticalScrollIndicator={true}
    >
      {Object.entries(exerciseCategories).map(([category, exercises]) => (
        <TouchableOpacity
          key={category}
          style={styles.categoryItem}
          onPress={() => setSelectedCategory(category)}
          disabled={isClosing}
        >
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>{category}</Text>
            <Text style={styles.exerciseCount}>
              {exercises.length} exercises
            </Text>
          </View>
          <ChevronRight size={20} color="#666666" />
        </TouchableOpacity>
      ))}

      {localCustomExercises && localCustomExercises.length > 0 && (
        <TouchableOpacity
          style={styles.categoryItem}
          onPress={() => setSelectedCategory('Custom')}
          disabled={isClosing}
        >
          <View style={styles.categoryHeader}>
            <Text style={styles.categoryTitle}>Custom Exercises</Text>
            <Text style={styles.exerciseCount}>
              {localCustomExercises.length} exercises
            </Text>
          </View>
          <ChevronRight size={20} color="#666666" />
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            onPress={handleClose}
            activeOpacity={0.7}
            disabled={isClosing}
          />
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.modalContent, contentStyle]}>
            <View style={styles.handle} />

            <View style={styles.header}>
              {selectedCategory || searchQuery || detailedExercise ? (
                <TouchableOpacity
                  onPress={() => {
                    if (detailedExercise) {
                      setDetailedExercise(null);
                    } else {
                      setSelectedCategory(null);
                      setSearchQuery('');
                      setSuggestions([]);
                    }
                  }}
                  style={styles.backButton}
                  disabled={isClosing}
                >
                  <ChevronLeft size={24} color="#007AFF" />
                  <Text style={styles.backText}>
                    {detailedExercise
                      ? selectedCategory || searchQuery
                        ? 'Exercises'
                        : 'Categories'
                      : 'Categories'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.title}>Select Exercise</Text>
              )}

              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                disabled={isClosing}
              >
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={20} color="#666666" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {!searchQuery && !selectedCategory && !detailedExercise ? (
              renderCategoryList()
            ) : detailedExercise ? (
              exerciseData[detailedExercise] ? (
                <DetailedExerciseView
                  exercise={exerciseData[detailedExercise]}
                  onBack={handleBack}
                  onModify={() => {}}
                  onRemove={() => {}}
                  onAddToSchedule={() => {}}
                  entryPoint={entryPoint}
                />
              ) : (
                <Text>Exercise not found</Text>
              )
            ) : (
              renderExerciseList()
            )}

            {showUpgradePrompt ? (
              <TouchableOpacity
                style={styles.upgradeBanner}
                onPress={onUpgrade}
                disabled={isClosing}
              >
                <Lock size={18} color="#FFFFFF" />
                <Text style={styles.upgradeText}>
                  Upgrade to add more custom exercises
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.addCustomButton}
                onPress={() => setShowAddCustom(true)}
                disabled={isClosing}
              >
                <FolderPlus size={20} color="#007AFF" />
                <Text style={styles.addCustomText}>Add Custom Exercise</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </GestureDetector>

        <Modal
          visible={showAddCustom}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowAddCustom(false)}
        >
          <View style={styles.customModalOverlay}>
            <Animated.View
              entering={FadeIn.duration(250)}
              exiting={FadeOut.duration(200)}
              style={styles.customModalContent}
            >
              <Text style={styles.customModalTitle}>Add Custom Exercise</Text>

              <TextInput
                style={[
                  styles.customExerciseInput,
                  errorMessage ? styles.inputError : null,
                ]}
                placeholder="Exercise name"
                value={newExerciseName}
                onChangeText={handleNewExerciseNameChange}
                editable={!isAdding}
                autoFocus
              />

              {errorMessage && (
                <View style={styles.errorContainer}>
                  <AlertCircle size={16} color="#FF3B30" />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={styles.suggestionsTitle}>
                    Similar exercises:
                  </Text>
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectExercise(suggestion)}
                      disabled={isAdding}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.customModalButtons}>
                <TouchableOpacity
                  style={[styles.customModalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddCustom(false);
                    setNewExerciseName('');
                    setErrorMessage(null);
                    setSuggestions([]);
                  }}
                  disabled={isAdding}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.customModalButton,
                    styles.addButton,
                    isAdding && styles.addButtonDisabled,
                  ]}
                  onPress={handleAddCustomExercise}
                  disabled={isAdding}
                >
                  {isAdding ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Plus size={20} color="#FFFFFF" />
                      <Text style={styles.addButtonText}>Add</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
    paddingTop: 24,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    alignSelf: 'center',
    position: 'absolute',
    top: 10,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
    marginTop: 5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    color: '#1A1A1A',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#1A1A1A',
  },
  categoriesContainer: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
  },
  categoryHeader: {
    flex: 1,
  },
  categoryTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  exerciseCount: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
  },
  exerciseList: {
    maxHeight: 400,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  exerciseButton: {
    flex: 1,
    padding: 16,
  },
  exerciseName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  deleteButton: {
    padding: 16,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  noResults: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#666666',
  },
  addCustomButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    marginTop: 12,
  },
  addCustomText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 8,
  },
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  customModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  customModalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  customExerciseInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  inputError: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#FF3B30',
    marginLeft: 8,
  },
  suggestionsContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  suggestionsTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  suggestionItem: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 4,
  },
  suggestionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#007AFF',
  },
  customModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  customModalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  addButtonDisabled: {
    backgroundColor: '#007AFF80',
  },
  cancelButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#666666',
  },
  addButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 8,
  },
  upgradeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  upgradeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
