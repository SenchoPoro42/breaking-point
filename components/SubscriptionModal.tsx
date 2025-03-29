import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Platform,
  ScrollView
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSubscription } from '@/contexts/SubscriptionContext';
import SubscriptionCard from './SubscriptionCard';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function SubscriptionModal({ visible, onClose }: SubscriptionModalProps) {
  const { isSubscribed, subscription, cancel, manageSubscription } = useSubscription();

  const handleCancelSubscription = async () => {
    try {
      await cancel();
      onClose();
    } catch (error) {
      console.error('Error canceling subscription:', error);
    }
  };

  const handleManageSubscription = async () => {
    try {
      await manageSubscription();
      onClose();
    } catch (error) {
      console.error('Error managing subscription:', error);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#666666" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {isSubscribed ? 'Manage Subscription' : 'Upgrade to Premium'}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          {isSubscribed ? (
            <View style={styles.managementContainer}>
              <Text style={styles.statusTitle}>Subscription Status</Text>
              <View style={styles.statusCard}>
                <Text style={styles.statusLabel}>Plan</Text>
                <Text style={styles.statusValue}>
                  {subscription.plan === 'monthly' ? 'Premium Monthly' : 'Premium Annual'}
                </Text>
                
                <Text style={styles.statusLabel}>Status</Text>
                <Text style={styles.statusValue}>Active</Text>
                
                <Text style={styles.statusLabel}>Valid Until</Text>
                <Text style={styles.statusValue}>
                  {subscription.validUntil ? new Date(subscription.validUntil).toLocaleDateString() : 'N/A'}
                </Text>
                
                <Text style={styles.statusLabel}>Auto-Renewal</Text>
                <Text style={styles.statusValue}>
                  {subscription.autoRenew ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
              
              <Text style={styles.featuresTitle}>Premium Features Include:</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <View style={styles.featureBullet} />
                  <Text style={styles.featureText}>Unlimited custom exercises</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureBullet} />
                  <Text style={styles.featureText}>Progress tracking with charts</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureBullet} />
                  <Text style={styles.featureText}>Export workout data</Text>
                </View>
                <View style={styles.featureItem}>
                  <View style={styles.featureBullet} />
                  <Text style={styles.featureText}>Priority support</Text>
                </View>
              </View>
              
              <View style={styles.buttonGroup}>
                <TouchableOpacity
                  style={styles.manageButton}
                  onPress={handleManageSubscription}
                >
                  <Text style={styles.manageButtonText}>Manage Payment</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancelSubscription}
                >
                  <Text style={styles.cancelButtonText}>Cancel Subscription</Text>
                </TouchableOpacity>
              </View>
              
              <Text style={styles.cancellationNote}>
                Canceling your subscription will allow you to use premium features until the end of your current billing period.
              </Text>
            </View>
          ) : (
            <SubscriptionCard />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
  },
  content: {
    flex: 1,
  },
  managementContainer: {
    padding: 20,
  },
  statusTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statusLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  statusValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  featuresTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
    marginBottom: 16,
  },
  featuresList: {
    marginBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 12,
  },
  featureText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#1A1A1A',
  },
  buttonGroup: {
    marginBottom: 16,
  },
  manageButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  manageButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FF3B30',
  },
  cancellationNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },
});
