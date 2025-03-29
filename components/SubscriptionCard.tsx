import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Platform,
  ActivityIndicator
} from 'react-native';
import { Check, Crown, ArrowRight } from 'lucide-react-native';
import { SubscriptionPlan } from '@/lib/subscriptionService';
import { useSubscription } from '@/contexts/SubscriptionContext';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSequence, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';

interface SubscriptionCardProps {
  compact?: boolean;
  horizontal?: boolean;
  onPress?: () => void;
  showContinueButton?: boolean;
  hideFeatures?: boolean;
  customMessage?: string;
}

export default function SubscriptionCard({
  compact = false,
  horizontal = false,
  onPress,
  showContinueButton = false,
  hideFeatures = false,
  customMessage
}: SubscriptionCardProps) {
  const { subscriptionPlans, purchase, isSubscribed, isLoading: subscriptionLoading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const cardScale = useSharedValue(1);
  const badgeScale = useSharedValue(1);

  // Highlight the monthly plan by default
  const monthlyPlan = subscriptionPlans.find(plan => plan.period === 'monthly');
  const annualPlan = subscriptionPlans.find(plan => plan.period === 'annual');
  
  // If plans are available
  const hasPlans = !!monthlyPlan && !!annualPlan;
  
  // Handle subscription purchase
  const handlePurchase = async () => {
    if (!selectedPlan) return;
    
    try {
      setIsLoading(true);
      await purchase(selectedPlan);
      
      // Animate card on successful purchase
      cardScale.value = withSequence(
        withSpring(1.05, { damping: 8 }),
        withSpring(1)
      );
    } catch (error) {
      console.error('Error purchasing subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle plan selection
  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    
    // Animate badge when selecting plan
    badgeScale.value = withSequence(
      withTiming(1.1, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
  };
  
  // Calculate savings percentage for annual plan
  const calculateSavings = () => {
    if (!monthlyPlan || !annualPlan) return 0;
    
    const monthlyCostForYear = monthlyPlan.price * 12;
    const annualCost = annualPlan.price;
    const savings = ((monthlyCostForYear - annualCost) / monthlyCostForYear) * 100;
    
    return Math.round(savings);
  };
  
  const savingsPercentage = calculateSavings();
  
  // Animated styles
  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }]
  }));
  
  const animatedBadgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }]
  }));
  
  if (subscriptionLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }
  
  if (isSubscribed) {
    return (
      <View style={styles.subscribedContainer}>
        <View style={styles.subscribedBadge}>
          <Crown size={24} color="#007AFF" />
          <Text style={styles.subscribedText}>Premium Active</Text>
        </View>
      </View>
    );
  }
  
  if (compact) {
    return (
      <TouchableOpacity 
        style={styles.compactCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.compactHeader}>
          <Crown size={24} color="#FFD700" />
          <Text style={styles.compactTitle}>Go Premium</Text>
        </View>
        <ArrowRight size={20} color="#007AFF" />
      </TouchableOpacity>
    );
  }
  
  if (horizontal) {
    return (
      <TouchableOpacity 
        style={styles.horizontalCard}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.horizontalContent}>
          <View style={styles.crownContainer}>
            <Crown size={20} color="#FFD700" />
          </View>
          <View style={styles.horizontalTextContainer}>
            <Text style={styles.horizontalTitle}>Unlock Premium</Text>
            <Text style={styles.horizontalSubtitle}>
              {customMessage || "Get unlimited workouts & more"}
            </Text>
          </View>
        </View>
        <ArrowRight size={18} color="#FFFFFF" />
      </TouchableOpacity>
    );
  }
  
  return (
    <Animated.View style={[styles.container, animatedCardStyle]}>
      <View style={styles.headerContainer}>
        <Image 
          source={{ uri: "https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=800&auto=format&fit=crop" }}
          style={styles.headerImage}
        />
        <View style={styles.overlay} />
        <View style={styles.headerContent}>
          <View style={styles.badgeContainer}>
            <Animated.View style={[styles.premiumBadge, animatedBadgeStyle]}>
              <Crown size={16} color="#FFD700" />
              <Text style={styles.badgeText}>PREMIUM</Text>
            </Animated.View>
          </View>
          <Text style={styles.title}>Elevate Your Training</Text>
          <Text style={styles.subtitle}>{customMessage || "Unlock advanced features to maximize your workout potential"}</Text>
        </View>
      </View>
      
      {!hideFeatures && hasPlans && (
        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Premium Benefits</Text>
          
          {monthlyPlan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.checkContainer}>
                <Check size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      )}
      
      {hasPlans && (
        <View style={styles.plansContainer}>
          <TouchableOpacity
            style={[
              styles.planOption,
              selectedPlan?.id === monthlyPlan.id && styles.selectedPlan
            ]}
            onPress={() => handleSelectPlan(monthlyPlan)}
          >
            <Text style={styles.planName}>{monthlyPlan.name}</Text>
            <Text style={styles.planPrice}>
              ${monthlyPlan.price.toFixed(2)}<Text style={styles.perMonth}>/mo</Text>
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.planOption,
              styles.annualPlan,
              selectedPlan?.id === annualPlan.id && styles.selectedPlan
            ]}
            onPress={() => handleSelectPlan(annualPlan)}
          >
            <View style={styles.savingsBadge}>
              <Text style={styles.savingsText}>Save {savingsPercentage}%</Text>
            </View>
            <Text style={styles.planName}>{annualPlan.name}</Text>
            <Text style={styles.planPrice}>
              ${(annualPlan.price / 12).toFixed(2)}<Text style={styles.perMonth}>/mo</Text>
            </Text>
            <Text style={styles.billedAnnually}>Billed as ${annualPlan.price.toFixed(2)} annually</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {showContinueButton ? (
        <TouchableOpacity 
          style={styles.continueButton}
          onPress={onPress}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.continueButtonText}>Continue</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={[
            styles.subscribeButton,
            !selectedPlan && styles.disabledButton
          ]}
          onPress={handlePurchase}
          disabled={!selectedPlan || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              {selectedPlan ? `Subscribe for $${selectedPlan.price.toFixed(2)}` : 'Select a plan'}
            </Text>
          )}
        </TouchableOpacity>
      )}
      
      <Text style={styles.termsText}>
        Subscription will auto-renew until canceled. Cancel anytime.
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    margin: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContainer: {
    position: 'relative',
    height: 180,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  headerContent: {
    padding: 20,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  badgeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  featuresContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  featuresTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#333333',
    flex: 1,
  },
  plansContainer: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
  },
  planOption: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 2,
    borderColor: '#F5F5F5',
  },
  selectedPlan: {
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  annualPlan: {
    position: 'relative',
    paddingTop: 24,
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#FF9500',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    color: '#FFFFFF',
  },
  planName: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  planPrice: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#1A1A1A',
  },
  perMonth: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
  },
  billedAnnually: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  continueButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  termsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  // Subscribed state
  subscribedContainer: {
    margin: 16,
    alignItems: 'center',
    padding: 16,
  },
  subscribedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  subscribedText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#007AFF',
  },
  // Compact card
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    marginVertical: 8,
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#007AFF',
  },
  // Horizontal card
  horizontalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 12,
    margin: 16,
    marginVertical: 8,
  },
  horizontalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  crownContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalTextContainer: {
    flex: 1,
  },
  horizontalTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  horizontalSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
  },
});
