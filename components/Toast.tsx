import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

type ToastProps = {
  message: string;
  isVisible: boolean;
  onHide: () => void;
};

export default function Toast({ message, isVisible, onHide }: ToastProps) {
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (isVisible) {
      translateY.value = withSequence(
        withSpring(60, { damping: 12, stiffness: 100 }),
        withTiming(55, { duration: 100 }),
      );
      opacity.value = withTiming(1, { duration: 200 });

      // Auto-hide after 2 seconds
      const timer = setTimeout(() => {
        translateY.value = withSequence(
          withTiming(60, { duration: 100 }),
          withSpring(-100, { damping: 12, stiffness: 100 }, () => {
            runOnJS(onHide)();
          }),
        );
        opacity.value = withTiming(0, { duration: 200 });
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
    zIndex: 1000,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
});
