import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock, ArrowRight } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import Animated, { 
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing
} from 'react-native-reanimated';

interface PremiumFeatureProps {
  title: string;
  description: string;
  featureKey: string;
  onUpgrade: () => void;
  children?: React.ReactNode;
}

export default function PremiumFeature({
  title,
  description,
  featureKey,
  onUpgrade,
  children
}: PremiumFeatureProps) {
  const { isFeatureAvailable } = useSubscription();
  
  // Check if this feature is available with the current subscription
  const isAvailable = isFeatureAvailable(featureKey);
  
  // Animation values
  const scale = useSharedValue(1);
  
  // Animated button style
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));
  
  // Handle button press
  const handlePress = () => {
    // Animate button
    scale.value = withSequence(
      withTiming(0.95, { duration: 100, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(1, { duration: 150, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    
    // Call onUpgrade callback
    onUpgrade();
  };
  
  // If the feature is available, render children
  if (isAvailable) {
    return <>{children}</>;
  }
  
  // Otherwise, render lock screen
  return (
    <View style={styles.container}>
      <View style={styles.lockContainer}>
        <View style={styles.lockIconContainer}>
          <Lock size={32} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        
        <Animated.View style={[styles.buttonWrapper, buttonStyle]}>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={handlePress}
            activeOpacity={0.9}
          >
            <Text style={styles.buttonText}>Upgrade to Premium</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    overflow: 'hidden',
    padding: 20,
  },
  lockContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  lockIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonWrapper: {
    width: '100%',
    maxWidth: 300,
  },
  upgradeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
