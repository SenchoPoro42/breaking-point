import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  SubscriptionInfo, 
  SubscriptionPlan,
  defaultSubscription, 
  initializeSubscription,
  purchaseSubscription,
  cancelSubscription,
  isSubscriptionValid,
  isFeatureAvailable,
  getFeatureLimits,
  openSubscriptionManagementPage,
  subscriptionPlans
} from '@/lib/subscriptionService';

interface SubscriptionContextType {
  subscription: SubscriptionInfo;
  isLoading: boolean;
  isSubscribed: boolean;
  subscriptionPlans: SubscriptionPlan[];
  purchase: (plan: SubscriptionPlan) => Promise<void>;
  cancel: () => Promise<void>;
  manageSubscription: () => Promise<void>;
  isFeatureAvailable: (feature: string) => boolean;
  getFeatureLimits: () => Record<string, number>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [subscription, setSubscription] = useState<SubscriptionInfo>(defaultSubscription);
  const [isLoading, setIsLoading] = useState(true);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    try {
      setIsLoading(true);
      const subscriptionData = await initializeSubscription();
      setSubscription(subscriptionData);
    } catch (error) {
      console.error('Error loading subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSubscription = async () => {
    await loadSubscription();
  };

  const purchase = async (plan: SubscriptionPlan) => {
    try {
      setPurchaseInProgress(true);
      setPurchaseError(null);
      
      await purchaseSubscription(
        plan,
        async () => {
          await loadSubscription();
        },
        (error) => {
          setPurchaseError(error);
        }
      );
    } finally {
      setPurchaseInProgress(false);
    }
  };

  const cancel = async () => {
    try {
      await cancelSubscription(
        async () => {
          await loadSubscription();
        },
        (error) => {
          console.error('Error canceling subscription:', error);
        }
      );
    } catch (error) {
      console.error('Error in cancel function:', error);
    }
  };

  const manageSubscription = async () => {
    await openSubscriptionManagementPage();
  };

  const checkFeatureAvailability = (feature: string) => {
    return isFeatureAvailable(feature, subscription);
  };

  const getSubscriptionLimits = () => {
    return getFeatureLimits(subscription);
  };

  const value = {
    subscription,
    isLoading,
    isSubscribed: isSubscriptionValid(subscription),
    subscriptionPlans,
    purchase,
    cancel,
    manageSubscription,
    isFeatureAvailable: checkFeatureAvailability,
    getFeatureLimits: getSubscriptionLimits,
    refreshSubscription
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};
