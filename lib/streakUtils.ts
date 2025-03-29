import { differenceInDays, parseISO, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import type { Tables } from '@/types/supabase';

type WorkoutHistory = Tables['workout_history']['Row'][];

// Calculate current streak from workout history
export const calculateStreak = (workoutHistory: WorkoutHistory): number => {
  if (!workoutHistory || workoutHistory.length === 0) return 0;

  const sortedHistory = [...workoutHistory].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const today = startOfDay(new Date());
  let streak = 0;
  let currentDate = today;
  
  // Check if the most recent workout was today
  const lastWorkoutDate = parseISO(sortedHistory[0].date);
  
  // If the last workout was more than 1 day ago, streak is broken
  if (differenceInDays(today, lastWorkoutDate) > 1) {
    return 0;
  }

  // Count days in streak
  for (let i = 0; i < sortedHistory.length; i++) {
    const workoutDate = startOfDay(parseISO(sortedHistory[i].date));
    
    // Special case for first iteration - if workout is today
    if (i === 0 && isWithinInterval(workoutDate, { start: startOfDay(today), end: endOfDay(today) })) {
      streak = 1;
      currentDate = subDays(today, 1);
      continue;
    }

    // Check if there's a workout on the current date we're checking
    if (isWithinInterval(workoutDate, { start: startOfDay(currentDate), end: endOfDay(currentDate) })) {
      streak++;
      currentDate = subDays(currentDate, 1);
    } else {
      break;
    }
  }

  return streak;
};

// Calculate longest streak from workout history
export const calculateLongestStreak = (workoutHistory: WorkoutHistory): number => {
  if (!workoutHistory || workoutHistory.length === 0) return 0;

  // Convert workout dates to day strings for easier processing
  const workoutDays = new Set(
    workoutHistory.map(workout => 
      startOfDay(parseISO(workout.date)).toISOString().split('T')[0]
    )
  );

  // Sort the days
  const sortedDays = Array.from(workoutDays).sort();
  
  let currentStreak = 1;
  let longestStreak = 1;
  
  // Iterate through sorted days to find consecutive days
  for (let i = 1; i < sortedDays.length; i++) {
    const currentDay = parseISO(sortedDays[i]);
    const previousDay = parseISO(sortedDays[i - 1]);
    
    // Check if days are consecutive
    if (differenceInDays(currentDay, previousDay) === 1) {
      currentStreak++;
    } else {
      // Reset current streak if days are not consecutive
      currentStreak = 1;
    }
    
    // Update longest streak if current streak is longer
    if (currentStreak > longestStreak) {
      longestStreak = currentStreak;
    }
  }
  
  return longestStreak;
};
