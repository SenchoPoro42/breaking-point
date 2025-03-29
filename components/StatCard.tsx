import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface StatCardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon?: React.ReactNode;
  isPrimary?: boolean;
}

const StatCard = ({ title, value, unit, icon, isPrimary = false }: StatCardProps) => {
  return (
    <Animated.View 
      style={[
        styles.card,
        isPrimary && styles.primaryCard
      ]}
      entering={FadeIn.duration(300).delay(100)}
    >
      <View style={styles.content}>
        <View style={styles.valueContainer}>
          <Text style={[
            styles.value,
            isPrimary && styles.primaryValue
          ]}>
            {value}
            {unit && <Text style={styles.unit}>{unit}</Text>}
          </Text>
        </View>
        <Text style={[
          styles.title,
          isPrimary && styles.primaryTitle
        ]}>
          {title}
        </Text>
      </View>
      {icon && (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryCard: {
    backgroundColor: '#007AFF',
  },
  content: {
    flex: 1,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  primaryValue: {
    color: '#FFFFFF',
    fontSize: 28,
  },
  unit: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
    marginLeft: 2,
  },
  title: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
  },
  primaryTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  iconContainer: {
    marginLeft: 12,
  },
});

export default StatCard;
