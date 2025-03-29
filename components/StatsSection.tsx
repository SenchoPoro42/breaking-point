import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import { TrendingUp, Award, Flame, Clock } from 'lucide-react-native';
import StatCard from './StatCard';

interface UserStats {
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  averageWorkoutDuration: number;
}

interface StatsSectionProps {
  stats: UserStats;
  isLoading?: boolean;
}

const StatsSection = ({ stats, isLoading = false }: StatsSectionProps) => {
  if (isLoading) {
    return (
      <Animated.View 
        style={styles.loadingContainer}
        entering={FadeIn.duration(300)}
      >
        <ActivityIndicator color="#007AFF" size="large" />
        <Text style={styles.loadingText}>Loading statistics...</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View 
      style={styles.container}
      entering={FadeIn.duration(300)}
      layout={Layout.springify()}
    >
      <View style={styles.header}>
        <TrendingUp size={20} color="#1A1A1A" style={styles.icon} />
        <Text style={styles.title}>Workout Statistics</Text>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            title="Current Streak"
            value={stats.currentStreak}
            unit=" days"
            icon={<Flame size={24} color="#FFFFFF" />}
            isPrimary={stats.currentStreak > 0}
          />
        </View>
        
        <View style={styles.statsRow}>
          <StatCard
            title="Total Workouts"
            value={stats.totalWorkouts}
            icon={<TrendingUp size={24} color="#007AFF" />}
          />
          
          <StatCard
            title="Longest Streak"
            value={stats.longestStreak}
            unit=" days"
            icon={<Award size={24} color="#007AFF" />}
          />
        </View>
        
        {stats.averageWorkoutDuration > 0 && (
          <StatCard
            title="Avg. Workout Duration"
            value={stats.averageWorkoutDuration}
            unit=" min"
            icon={<Clock size={24} color="#007AFF" />}
          />
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
  },
  statsGrid: {
    gap: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
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
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
});

export default StatsSection;
