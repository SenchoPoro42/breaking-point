import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Dimensions } from 'react-native';
import { Clock, X, Bell, BellOff, ChevronLeft } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  runOnJS,
  FadeIn,
  FadeOut,
  Easing,
  interpolateColor,
} from 'react-native-reanimated';
import { GestureDetector, Gesture, ScrollView } from 'react-native-gesture-handler';
import { loadReminderSettings, saveReminderSettings, requestNotificationPermissions } from '@/lib/notificationService';
import type { NotificationSettings } from '@/lib/notificationService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = SCREEN_HEIGHT * 0.15;

interface RemindersModalProps {
  visible: boolean;
  onClose: () => void;
}

// Time item component used in the horizontal time picker
const TimeItem = ({ value, isSelected, onPress }: { 
  value: string | number; 
  isSelected: boolean; 
  onPress: () => void;
}) => (
  <TouchableOpacity 
    onPress={onPress}
    activeOpacity={0.7}
    style={[
      styles.timeItem,
      isSelected && styles.selectedTimeItem
    ]}
  >
    <Text style={[
      styles.timeItemText,
      isSelected && styles.selectedTimeItemText
    ]}>
      {typeof value === 'number' ? value.toString().padStart(2, '0') : value}
    </Text>
  </TouchableOpacity>
);

export default function RemindersModal({ visible, onClose }: RemindersModalProps) {
  // State
  const [isEnabled, setIsEnabled] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number>(8);
  const [selectedMinute, setSelectedMinute] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  
  // For tracking mount state and preventing updates after unmount
  const isMounted = useRef(true);
  
  // For debouncing the auto-save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hourScrollViewRef = useRef<ScrollView | null>(null);
  const minuteScrollViewRef = useRef<ScrollView | null>(null);

  // Animation values
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const opacity = useSharedValue(0);
  const toggleTranslateX = useSharedValue(0);
  const feedbackOpacity = useSharedValue(0);

  // Generate time values for pickers - reordered hours to put 00 after 23
  const hours = Array.from({ length: 24 }, (_, i) => (i + 1) % 24);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  
  // Track component mounting state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Helper function to format the time values as two digits
  const formatTimeValue = (value: number) => value.toString().padStart(2, '0');

  // Format time for display
  const formatTimeDisplay = () => {
    const hour12 = selectedHour % 12 || 12;
    const minute = formatTimeValue(selectedMinute);
    const period = selectedHour >= 12 ? 'PM' : 'AM';
    
    return `${hour12}:${minute} ${period}`;
  };

  // Auto-save settings when values change
  useEffect(() => {
    if (visible && !isLoading) {
      // Clear any existing save timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set a new timeout to save settings after a short delay
      saveTimeoutRef.current = setTimeout(async () => {
        try {
          if (!isMounted.current) return;
          
          const settings: NotificationSettings = {
            enabled: isEnabled,
            time: `${formatTimeValue(selectedHour)}:${formatTimeValue(selectedMinute)}`,
          };
          await saveReminderSettings(settings);
          
          if (!isMounted.current) return;
          
          // Show saved feedback
          setSavedFeedback(true);
          feedbackOpacity.value = withTiming(1, { duration: 300 });
          
          // Hide feedback after a delay
          setTimeout(() => {
            if (!isMounted.current) return;
            
            feedbackOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
              if (finished && isMounted.current) {
                runOnJS(setSavedFeedback)(false);
              }
            });
          }, 1500);
        } catch (error) {
          console.error('Error saving notification settings:', error);
        }
      }, 500);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
    };
  }, [selectedHour, selectedMinute, isEnabled, visible, isLoading]);
  
  // Scroll to the selected hour and minute when they change
  useEffect(() => {
    if (visible && !isLoading && hourScrollViewRef.current) {
      // Find the index of the selected hour in our reordered array
      const hourIndex = hours.findIndex(h => h === selectedHour);
      if (hourIndex !== -1) {
        hourScrollViewRef.current.scrollTo({ 
          x: Math.max(0, (hourIndex - 2) * 70), 
          animated: true 
        });
      }
    }
  }, [selectedHour, visible, isLoading, hours]);

  useEffect(() => {
    if (visible && !isLoading && minuteScrollViewRef.current) {
      // Scroll to center the selected minute
      const minuteIndex = minutes.findIndex(m => m === selectedMinute);
      if (minuteIndex !== -1) {
        minuteScrollViewRef.current.scrollTo({ 
          x: Math.max(0, (minuteIndex - 2) * 70), 
          animated: true 
        });
      }
    }
  }, [selectedMinute, visible, isLoading, minutes]);
  
  // Load saved settings when modal opens
  useEffect(() => {
    let isActive = true; // Local mount state tracker for async operations
    
    const loadSettings = async () => {
      try {
        const settings = await loadReminderSettings();
        if (!isActive) return;
        
        if (settings) {
          setIsEnabled(settings.enabled);
          const [hours, minutes] = settings.time.split(':');
          const hourValue = parseInt(hours, 10);
          const minuteValue = parseInt(minutes, 10);
          
          setSelectedHour(hourValue);
          setSelectedMinute(minuteValue);
          
          // Set toggle position
          toggleTranslateX.value = settings.enabled ? 22 : 0;
        }

        // Check notification permissions
        const hasPermission = await requestNotificationPermissions();
        if (!isActive) return;
        
        setPermissionGranted(hasPermission);
      } catch (error) {
        console.error('Error loading notification settings:', error);
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (visible) {
      setIsClosing(false);
      translateY.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
      });
      opacity.value = withTiming(1, { duration: 200 });
      
      loadSettings();
    }

    // Cleanup function
    return () => {
      isActive = false;
    };
  }, [visible]);

  // Toggle animated style
  const toggleStyle = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      toggleTranslateX.value,
      [0, 22],
      ['#E9E9EA', '#007AFF']
    );
    
    return {
      backgroundColor,
    };
  });

  const handleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: toggleTranslateX.value }],
    };
  });

  // Saved feedback animated style
  const feedbackStyle = useAnimatedStyle(() => {
    return {
      opacity: feedbackOpacity.value,
    };
  });

  // Handle toggle change
  const handleToggleChange = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    toggleTranslateX.value = withSpring(newEnabled ? 22 : 0, {
      damping: 15,
      stiffness: 120,
    });
  };

  // Handle closing modal with animation
  const handleClose = useCallback(() => {
    if (isClosing) return;
    
    setIsClosing(true);
    opacity.value = withTiming(0, { 
      duration: 250,
      easing: Easing.in(Easing.cubic) 
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
        if (finished && isMounted.current) {
          runOnJS(onClose)();
          runOnJS(setIsClosing)(false);
        }
      }
    );
  }, [onClose, isClosing]);

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
          easing: Easing.out(Easing.cubic)
        });
      }
    });

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <TouchableOpacity
            style={styles.backdropTouchable}
            onPress={handleClose}
            activeOpacity={1}
          />
        </Animated.View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.contentContainer, containerStyle]}>
            <View style={styles.handle} />
            
            <View style={styles.header}>
              <TouchableOpacity 
                onPress={handleClose}
                style={styles.backButton}
              >
                <ChevronLeft size={24} color="#007AFF" />
              </TouchableOpacity>
              <Text style={styles.title}>Workout Reminders</Text>
              <TouchableOpacity 
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ width: 24 }} // Empty space to balance header
              />
            </View>
            
            {/* Main toggle section */}
            <View style={styles.mainToggleContainer}>
              <View style={styles.toggleInfo}>
                <View style={styles.bellIconContainer}>
                  <Bell size={24} color="#007AFF" />
                </View>
                <View style={styles.toggleTextContainer}>
                  <Text style={styles.toggleTitle}>Workout Reminders</Text>
                  {isEnabled && (
                    <Text style={styles.toggleSubtitle}>
                      Daily at {formatTimeDisplay()}
                    </Text>
                  )}
                </View>
              </View>
              <TouchableOpacity
                onPress={handleToggleChange}
                disabled={!permissionGranted}
                activeOpacity={0.8}
              >
                <Animated.View 
                  style={[
                    styles.toggleButton,
                    toggleStyle,
                    !permissionGranted && styles.toggleDisabled
                  ]}
                >
                  <Animated.View 
                    style={[
                      styles.toggleHandle,
                      handleStyle
                    ]}
                  >
                    {isEnabled ? (
                      <Bell size={12} color="#007AFF" />
                    ) : (
                      <BellOff size={12} color="#999999" />
                    )}
                  </Animated.View>
                </Animated.View>
              </TouchableOpacity>
            </View>

            {/* Time selection section */}
            <View style={styles.timeSelectionContainer}>
              <View style={styles.timeSelectionHeader}>
                <Clock size={20} color="#666666" />
                <Text style={styles.timeSelectionTitle}>
                  Set Reminder Time ({formatTimeValue(selectedHour)}:{formatTimeValue(selectedMinute)})
                </Text>
              </View>
              
              {/* Hour picker */}
              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>Hour</Text>
                <ScrollView
                  ref={hourScrollViewRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timeScrollContent}
                  decelerationRate="fast"
                  snapToInterval={70}
                >
                  {hours.map((hour) => (
                    <TimeItem
                      key={`hour-${hour}`}
                      value={hour}
                      isSelected={hour === selectedHour}
                      onPress={() => setSelectedHour(hour)}
                    />
                  ))}
                </ScrollView>
              </View>
              
              {/* Minute picker */}
              <View style={styles.pickerSection}>
                <Text style={styles.pickerLabel}>Minute</Text>
                <ScrollView
                  ref={minuteScrollViewRef}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.timeScrollContent}
                  decelerationRate="fast"
                  snapToInterval={70}
                >
                  {minutes.map((minute) => (
                    <TimeItem
                      key={`minute-${minute}`}
                      value={minute}
                      isSelected={minute === selectedMinute}
                      onPress={() => setSelectedMinute(minute)}
                    />
                  ))}
                </ScrollView>
              </View>
            </View>
            
            {/* Smart Reminder information text */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoTitle}>📅 Smart Reminders</Text>
              <Text style={styles.infoDescription}>
                Reminders will only be sent on your scheduled workout days, and will automatically stop once you've completed your workout for the day.
              </Text>
            </View>
            
            {!permissionGranted && (
              <TouchableOpacity 
                style={styles.permissionButton}
                onPress={requestNotificationPermissions}
              >
                <Text style={styles.permissionButtonText}>
                  Grant Notification Permission
                </Text>
              </TouchableOpacity>
            )}
            
            {savedFeedback && (
              <Animated.View style={[styles.savedIndicator, feedbackStyle]}>
                <Text style={styles.savedText}>Settings saved</Text>
              </Animated.View>
            )}
          </Animated.View>
        </GestureDetector>
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
  contentContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  mainToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bellIconContainer: {
    width: 36,
    height: 36,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#666666',
  },
  toggleButton: {
    width: 51,
    height: 31,
    backgroundColor: '#E9E9EA',
    borderRadius: 16,
    justifyContent: 'center',
    padding: 2,
  },
  toggleDisabled: {
    opacity: 0.5,
  },
  toggleHandle: {
    width: 27,
    height: 27,
    backgroundColor: '#FFFFFF',
    borderRadius: 13.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  timeSelectionContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  timeSelectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeSelectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    color: '#1A1A1A',
    marginLeft: 8,
  },
  pickerSection: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  timeScrollContent: {
    paddingHorizontal: 10,
  },
  timeItem: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedTimeItem: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  timeItemText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#333333',
  },
  selectedTimeItemText: {
    color: '#007AFF',
  },
  infoContainer: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  infoTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  infoDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
  },
  savedIndicator: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  savedText: {
    backgroundColor: 'rgba(52, 199, 89, 0.9)',
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
});
