import React, { useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  Easing
} from 'react-native-reanimated';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AnimatedTabScreenProps {
  children: React.ReactNode;
  style?: object;
}

export default function AnimatedTabScreen({ children, style }: AnimatedTabScreenProps) {
  // Get safe area insets
  const insets = useSafeAreaInsets();
  
  // Animation values
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(10);
  
  // Animation when tab comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Reset animation values when tab gains focus
      opacity.value = 0;
      translateX.value = 10;
      
      // Apply animations with slight delay for natural feel
      setTimeout(() => {
        opacity.value = withTiming(1, { 
          duration: 250,
          easing: Easing.out(Easing.cubic)
        });
        
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 250,
          mass: 0.8,
        });
      }, 50);
      
      return () => {
        // When tab loses focus, optionally reset values
        // This isn't strictly necessary but can help with memory management
        opacity.value = 0;
        translateX.value = 10;
      };
    }, [])
  );

  // Apply animations to container
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          // Apply top padding based on device insets to avoid notch
          paddingTop: Platform.OS === 'web' ? 0 : insets.top 
        },
        animatedStyle, 
        style
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
