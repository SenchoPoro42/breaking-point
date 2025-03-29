import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Platform } from 'react-native';
import { supabase } from './supabase';

// Define subscription types
export type SubscriptionTier = 'free' | 'premium';
export type SubscriptionPeriod = 'monthly' | 'annual';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: SubscriptionPeriod;
  description: string;
  features: string[];
  tier: SubscriptionTier;
}

export interface SubscriptionInfo {
  tier: SubscriptionTier;
  validUntil: string | null;
  purchaseDate: string | null;
  subscriptionId: string | null;
  plan: SubscriptionPeriod | null;
  autoRenew: boolean;
}

// Define available plans
export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'premium-monthly',
    name: 'Premium Monthly',
    price: 5.99,
    currency: 'USD',
    period: 'monthly',
    description: 'Full access to all premium features',
    features: [
      'Unlimited custom exercises',
      'Progress tracking with charts',
      'Export workout data',
      'Priority support'
    ],
    tier: 'premium'
  },
  {
    id: 'premium-annual',
    name: 'Premium Annual',
    price: 49.99,
    currency: 'USD',
    period: 'annual',
    description: 'Save 30% with annual billing',
    features: [
      'Unlimited custom exercises',
      'Progress tracking with charts',
      'Export workout data',
      'Priority support',
      'Early access to new features'
    ],
    tier: 'premium'
  },
];

// Default free subscription information
export const defaultSubscription: SubscriptionInfo = {
  tier: 'free',
  validUntil: null,
  purchaseDate: null,
  subscriptionId: null,
  plan: null,
  autoRenew: false
};

// Initialize subscription from storage
export const initializeSubscription = async (): Promise<SubscriptionInfo> => {
  try {
    const subscriptionData = await AsyncStorage.getItem('subscription');
    if (subscriptionData) {
      return JSON.parse(subscriptionData);
    }
    
    // If not in storage, check if user is logged in and has subscription in Supabase
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', session.session.user.id)
        .single();
      
      if (error) {
        console.log('Error fetching subscription:', error);
        return defaultSubscription;
      }
      
      if (data) {
        const subscription: SubscriptionInfo = {
          tier: data.tier,
          validUntil: data.valid_until,
          purchaseDate: data.purchase_date,
          subscriptionId: data.subscription_id,
          plan: data.plan,
          autoRenew: data.auto_renew
        };
        
        // Save to local storage for future reference
        await AsyncStorage.setItem('subscription', JSON.stringify(subscription));
        return subscription;
      }
    }
    
    return defaultSubscription;
  } catch (error) {
    console.error('Error initializing subscription:', error);
    return defaultSubscription;
  }
};

// Simulate purchase (in a real app, this would integrate with a payment processor)
export const purchaseSubscription = async (
  plan: SubscriptionPlan,
  successCallback: () => void,
  errorCallback: (error: string) => void
): Promise<void> => {
  try {
    // In a real implementation, this would show a payment UI and process the payment

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Generate purchase date and valid until date
    const purchaseDate = new Date().toISOString();
    let validUntil = new Date();
    
    if (plan.period === 'monthly') {
      validUntil.setMonth(validUntil.getMonth() + 1);
    } else if (plan.period === 'annual') {
      validUntil.setFullYear(validUntil.getFullYear() + 1);
    }
    
    const validUntilString = validUntil.toISOString();
    
    // Create subscription info
    const subscriptionInfo: SubscriptionInfo = {
      tier: plan.tier,
      validUntil: validUntilString,
      purchaseDate: purchaseDate,
      subscriptionId: `sub_${Date.now()}`, // In real implementation, this would come from payment processor
      plan: plan.period,
      autoRenew: true
    };
    
    // Save to AsyncStorage
    await AsyncStorage.setItem('subscription', JSON.stringify(subscriptionInfo));
    
    // If user is logged in, save to Supabase
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      const { error } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: session.session.user.id,
          tier: plan.tier,
          valid_until: validUntilString,
          purchase_date: purchaseDate,
          subscription_id: subscriptionInfo.subscriptionId,
          plan: plan.period,
          auto_renew: true
        });
      
      if (error) {
        console.error('Error saving subscription to Supabase:', error);
      }
    }
    
    // Call success callback
    successCallback();
  } catch (error) {
    console.error('Error purchasing subscription:', error);
    errorCallback(error instanceof Error ? error.message : 'Unknown error occurred');
  }
};

// Cancel subscription
export const cancelSubscription = async (
  successCallback: () => void,
  errorCallback: (error: string) => void
): Promise<void> => {
  try {
    // Get current subscription
    const subscriptionData = await AsyncStorage.getItem('subscription');
    if (!subscriptionData) {
      errorCallback('No active subscription found');
      return;
    }
    
    const subscription = JSON.parse(subscriptionData);
    
    // Update subscription to turn off auto-renewal
    subscription.autoRenew = false;
    
    // Save updated subscription
    await AsyncStorage.setItem('subscription', JSON.stringify(subscription));
    
    // If user is logged in, update in Supabase
    const { data: session } = await supabase.auth.getSession();
    if (session?.session?.user) {
      const { error } = await supabase
        .from('user_subscriptions')
        .update({ auto_renew: false })
        .eq('user_id', session.session.user.id);
      
      if (error) {
        console.error('Error updating subscription in Supabase:', error);
      }
    }
    
    // Call success callback
    successCallback();
  } catch (error) {
    console.error('Error canceling subscription:', error);
    errorCallback(error instanceof Error ? error.message : 'Unknown error occurred');
  }
};

// Check if subscription is valid
export const isSubscriptionValid = (subscription: SubscriptionInfo): boolean => {
  if (subscription.tier === 'free') {
    return false;
  }
  
  if (!subscription.validUntil) {
    return false;
  }
  
  const validUntil = new Date(subscription.validUntil);
  const now = new Date();
  
  return validUntil > now;
};

// Check if a feature is available for the current subscription
export const isFeatureAvailable = (
  feature: string,
  subscription: SubscriptionInfo
): boolean => {
  // Define feature availability by subscription tier
  const featureAvailability: Record<string, SubscriptionTier[]> = {
    'unlimited_custom_exercises': ['premium'],
    'progress_charts': ['premium'],
    'export_data': ['premium'],
    'priority_support': ['premium']
  };
  
  // Get the tiers that have access to this feature
  const allowedTiers = featureAvailability[feature] || [];
  
  // Check if the subscription tier is included in allowed tiers
  return allowedTiers.includes(subscription.tier) && isSubscriptionValid(subscription);
};

// Get subscription feature limits
export const getFeatureLimits = (subscription: SubscriptionInfo): Record<string, number> => {
  // Return feature limits based on subscription tier
  if (subscription.tier === 'premium' && isSubscriptionValid(subscription)) {
    return {
      max_custom_exercises: Infinity,
      max_workout_history: Infinity,
      max_workout_plans: Infinity,
    };
  }
  
  // Free tier limits
  return {
    max_custom_exercises: 5,
    max_workout_history: 30, // days
    max_workout_plans: 3,
  };
};

// Open subscription management web page (for managing subscription on web)
export const openSubscriptionManagementPage = async (): Promise<void> => {
  // In a real app, this would open a subscription management web page
  if (Platform.OS === 'web') {
    // On web, show alert that this would redirect to subscription management
    Alert.alert(
      'Manage Subscription',
      'This would typically redirect you to a subscription management page.',
      [{ text: 'OK' }]
    );
  } else {
    // On mobile, this would typically use Linking to open a URL
    Alert.alert(
      'Manage Subscription',
      'This would typically open the subscription management page in your browser.',
      [{ text: 'OK' }]
    );
  }
};
