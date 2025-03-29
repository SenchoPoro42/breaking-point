import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  withSequence,
  withTiming,
  runOnJS
} from 'react-native-reanimated';

const days = [
  { id: 'sunday', label: 'Sunday' },
  { id: 'monday', label: 'Monday' },
  { id: 'tuesday', label: 'Tuesday' },
  { id: 'wednesday', label: 'Wednesday' },
  { id: 'thursday', label: 'Thursday' },
  { id: 'friday', label: 'Friday' },
  { id: 'saturday', label: 'Saturday' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday', 'wednesday', 'friday']);

  const toggleDay = (dayId: string) => {
    setSelectedDays(current => {
      // Check if selecting this day would violate the rest day rule
      const newSelection = current.includes(dayId)
        ? current.filter(d => d !== dayId)
        : [...current, dayId];
      
      // Get the day indices
      const dayIndices = newSelection.map(d => days.findIndex(day => day.id === d));
      
      // Check for consecutive days
      const hasConsecutiveDays = dayIndices.some((dayIndex, i) => {
        if (i === 0) return false;
        const prevDayIndex = dayIndices[i - 1];
        return Math.abs(dayIndex - prevDayIndex) === 1;
      });

      // If there are consecutive days, return the current selection
      if (hasConsecutiveDays) {
        return current;
      }

      return newSelection;
    });
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasLaunched', 'true');
      await AsyncStorage.setItem('workoutDays', JSON.stringify(selectedDays));
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

  const getDayButtonStyle = (dayId: string) => {
    const isSelected = selectedDays.includes(dayId);
    
    return useAnimatedStyle(() => {
      return {
        transform: [
          {
            scale: withSpring(isSelected ? 1.05 : 1, {
              damping: 15,
              stiffness: 150,
            }),
          },
        ],
        backgroundColor: withTiming(isSelected ? '#007AFF' : '#FFFFFF', {
          duration: 200,
        }),
        borderColor: withTiming(isSelected ? '#007AFF' : '#E5E5E5', {
          duration: 200,
        }),
      };
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=800&auto=format&fit=crop&q=60' }}
          style={styles.image}
        />
        
        <Text style={styles.title}>Welcome to High-Intensity Training</Text>
        <Text style={styles.subtitle}>Choose your workout days{'\n'}(Rest day required between workouts)</Text>
        
        <View style={styles.daysContainer}>
          {days.map((day) => (
            <AnimatedTouchableOpacity
              key={day.id}
              style={[styles.dayButton, getDayButtonStyle(day.id)]}
              onPress={() => toggleDay(day.id)}
            >
              <Text style={[
                styles.dayText,
                selectedDays.includes(day.id) && styles.selectedDayText
              ]}>
                {day.label}
              </Text>
            </AnimatedTouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={completeOnboarding}
        >
          <Text style={styles.continueText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    borderRadius: 20,
    marginBottom: 32,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
    textAlign: 'center',
  },
  daysContainer: {
    width: '100%',
    marginBottom: 32,
  },
  dayButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },
  selectedDay: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  dayText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
  },
  selectedDayText: {
    color: '#FFFFFF',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  continueText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
