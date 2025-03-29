import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lock, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import Animated, { 
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  Easing
} from 'react-native-reanimated';

interface FeatureLimitProps {
  currentCount: number;
  featureName: string;
  featureKey: string;
  limitReachedMessage?: string;
  onUpgrade?: () => void;
}

export default function FeatureLimit({
  currentCount,
  featureName,
  featureKey,
  limitReachedMessage,
  onUpgrade
}: FeatureLimitProps) {
  const { getFeatureLimits, isSubscribed } = useSubscription();
  const [isLimitWarningShown, setIsLimitWarningShown] = useState(false);
  
  // Get limits from subscription
  const limits = getFeatureLimits();
  const limit = limits[featureKey] || 0;
  
  // Calculate progress
  const isInfinite = limit === Infinity;
  const percentage = isInfinite ? 100 : Math.min((currentCount / limit) * 100, 100);
  const isLimitReached = currentCount >= limit;
  
  // Animation values
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);
  
  // Setup animations
  React.useEffect(() => {
    // Animate progress bar
    progress.value = withTiming(percentage, {
      duration: 1000,
      easing: Easing.out(Easing.cubic)
    });
    
    // Animate opacity
    opacity.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic)
    });
    
    // If limit reached, show warning
    if (isLimitReached && !isSubscribed) {
      setIsLimitWarningShown(true);
    }
  }, [currentCount, limit, isSubscribed]);
  
  // Animated styles
  const progressStyle = useAnimatedStyle(() => ({
    width: `${progress.value}%`,
  }));
  
  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));
  
  // Warning shake animation when limit reached
  const warningShake = useSharedValue(0);
  
  React.useEffect(() => {
    if (isLimitReached && !isSubscribed) {
      warningShake.value = withSequence(
        withTiming(-2, { duration: 100 }),
        withTiming(2, { duration: 100 }),
        withTiming(-2, { duration: 100 }),
        withTiming(0, { duration: 100 }),
        withDelay(
          2000,
          withSequence(
            withTiming(-2, { duration: 100 }),
            withTiming(2, { duration: 100 }),
            withTiming(0, { duration: 100 })
          )
        )
      );
    }
  }, [isLimitReached, isSubscribed]);
  
  const warningStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: warningShake.value }]
  }));
  
  if (isSubscribed) {
    return null; // No limits for premium users
  }
  
  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>{featureName} Limit</Text>
          <Text style={styles.count}>
            {currentCount} / {isInfinite ? '∞' : limit}
          </Text>
        </View>
      </View>
      
      <View style={styles.progressContainer}>
        <Animated.View 
          style={[
            styles.progressBar, 
            progressStyle,
            isLimitReached && styles.limitReached
          ]} 
        />
      </View>
      
      {isLimitWarningShown && (
        <Animated.View style={[styles.warningContainer, warningStyle]}>
          <AlertCircle size={16} color="#FF3B30" />
          <Text style={styles.warningText}>
            {limitReachedMessage || `You've reached the limit for ${featureName.toLowerCase()}`}
          </Text>
          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={onUpgrade}
          >
            <Lock size={12} color="#FFFFFF" />
            <Text style={styles.upgradeText}>Upgrade</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    marginVertical: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#666666',
  },
  count: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#1A1A1A',
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#E5E5E5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  limitReached: {
    backgroundColor: '#FF3B30',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
  },
  warningText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#FF3B30',
    flex: 1,
    marginLeft: 8,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
    marginLeft: 8,
  },
  upgradeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#FFFFFF',
  },
});
