import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { calculateStreak } from './streakUtils';
import type { Tables } from '@/types/supabase';

// Types
export interface UserStats {
  totalWorkouts: number;
  currentStreak: number;
  longestStreak: number;
  averageWorkoutDuration: number;
}

export const defaultStats: UserStats = {
  totalWorkouts: 0,
  currentStreak: 0,
  longestStreak: 0,
  averageWorkoutDuration: 0,
};

// Load user stats from Supabase or AsyncStorage
export const loadUserStats = async (userId?: string): Promise<UserStats> => {
  try {
    // If user is signed in, load from Supabase
    if (userId) {
      // Check if user stats exist
      const { data: existingStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingStats) {
        return {
          totalWorkouts: existingStats.total_workouts,
          currentStreak: existingStats.current_streak,
          longestStreak: existingStats.longest_streak,
          averageWorkoutDuration: existingStats.average_workout_duration,
        };
      }

      // Calculate stats from workout history if no stats record exists
      const { data: workoutHistory, error: historyError } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (historyError) {
        throw historyError;
      }

      const calculatedStats = calculateStatsFromHistory(workoutHistory || []);
      
      // Save calculated stats to Supabase
      await saveUserStats(calculatedStats, userId);
      
      return calculatedStats;
    }

    // If user is not signed in, load from AsyncStorage
    const storedStats = await AsyncStorage.getItem('userStats');
    if (storedStats) {
      return JSON.parse(storedStats);
    }

    return defaultStats;
  } catch (error) {
    console.error('Error loading user stats:', error);
    return defaultStats;
  }
};

// Save user stats to Supabase or AsyncStorage
export const saveUserStats = async (stats: UserStats, userId?: string): Promise<void> => {
  try {
    // If user is signed in, save to Supabase
    if (userId) {
      const { data: existingStats, error: fetchError } = await supabase
        .from('user_stats')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (existingStats) {
        // Update existing stats
        const { error: updateError } = await supabase
          .from('user_stats')
          .update({
            total_workouts: stats.totalWorkouts,
            current_streak: stats.currentStreak,
            longest_streak: stats.longestStreak,
            average_workout_duration: stats.averageWorkoutDuration,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        if (updateError) {
          throw updateError;
        }
      } else {
        // Insert new stats
        const { error: insertError } = await supabase
          .from('user_stats')
          .insert({
            user_id: userId,
            total_workouts: stats.totalWorkouts,
            current_streak: stats.currentStreak,
            longest_streak: stats.longestStreak,
            average_workout_duration: stats.averageWorkoutDuration,
          });

        if (insertError) {
          throw insertError;
        }
      }
    } else {
      // If user is not signed in, save to AsyncStorage
      await AsyncStorage.setItem('userStats', JSON.stringify(stats));
    }
  } catch (error) {
    console.error('Error saving user stats:', error);
    throw error;
  }
};

// Load user goals from Supabase or AsyncStorage
export const loadUserGoals = async (userId?: string): Promise<string[]> => {
  try {
    // If user is signed in, load from Supabase
    if (userId) {
      const { data, error } = await supabase
        .from('user_goals')
        .select('goal')
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      return data.map(item => item.goal);
    }

    // If user is not signed in, load from AsyncStorage
    const storedGoals = await AsyncStorage.getItem('userGoals');
    if (storedGoals) {
      return JSON.parse(storedGoals);
    }

    return [];
  } catch (error) {
    console.error('Error loading user goals:', error);
    return [];
  }
};

// Add a user goal
export const addUserGoal = async (goal: string, userId?: string): Promise<void> => {
  try {
    // If user is signed in, save to Supabase
    if (userId) {
      const { error } = await supabase
        .from('user_goals')
        .insert({
          user_id: userId,
          goal,
        });

      if (error) {
        throw error;
      }
    } else {
      // If user is not signed in, save to AsyncStorage
      const currentGoals = await loadUserGoals();
      const updatedGoals = [...currentGoals, goal];
      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
    }
  } catch (error) {
    console.error('Error adding user goal:', error);
    throw error;
  }
};

// Remove a user goal
export const removeUserGoal = async (goal: string, userId?: string): Promise<void> => {
  try {
    // If user is signed in, remove from Supabase
    if (userId) {
      const { error } = await supabase
        .from('user_goals')
        .delete()
        .eq('user_id', userId)
        .eq('goal', goal);

      if (error) {
        throw error;
      }
    } else {
      // If user is not signed in, remove from AsyncStorage
      const currentGoals = await loadUserGoals();
      const updatedGoals = currentGoals.filter(g => g !== goal);
      await AsyncStorage.setItem('userGoals', JSON.stringify(updatedGoals));
    }
  } catch (error) {
    console.error('Error removing user goal:', error);
    throw error;
  }
};

// Calculate stats from workout history
export const calculateStatsFromHistory = (workoutHistory: Tables['workout_history']['Row'][]): UserStats => {
  // Total workouts is simply the length of the history
  const totalWorkouts = workoutHistory.length;
  
  // Current streak
  const currentStreak = calculateStreak(workoutHistory);
  
  // Longest streak - would require additional logic through past data
  // For now, we'll set it equal to current streak if it's higher
  const longestStreak = currentStreak;
  
  // Average workout duration - would need duration in workout data
  // For now, set a placeholder value
  const averageWorkoutDuration = 30; // 30 minutes placeholder
  
  return {
    totalWorkouts,
    currentStreak,
    longestStreak,
    averageWorkoutDuration
  };
};
