// This Edge Function updates a user's stats based on their workout history

import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { differenceInDays, parseISO, isWithinInterval, startOfDay, endOfDay, subDays } from "npm:date-fns@3.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Calculate current streak from workout history
function calculateStreak(workoutHistory: any[]): number {
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
}

// Calculate longest streak from workout history
function calculateLongestStreak(workoutHistory: any[]): number {
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
}

// Calculate approximate average workout duration
function calculateAverageWorkoutDuration(workoutHistory: any[]): number {
  if (!workoutHistory || workoutHistory.length === 0) return 0;
  
  // For simplicity, assume 30 minutes per exercise on average
  const totalWorkouts = workoutHistory.length;
  const exerciseCounts = workoutHistory.map(workout => {
    const exercises = workout.exercises;
    return Array.isArray(exercises) ? exercises.length : 0;
  });
  
  const totalExercises = exerciseCounts.reduce((sum, count) => sum + count, 0);
  const averageExercisesPerWorkout = totalExercises / totalWorkouts;
  
  // Approximate 5 minutes per exercise
  return Math.round(averageExercisesPerWorkout * 5);
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Create Supabase client using environment variables
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user ID from request
    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Get user's workout history
    const { data: workoutHistory, error: historyError } = await supabaseClient
      .from("workout_history")
      .select("*")
      .eq("user_id", user_id)
      .order("date", { ascending: false });

    if (historyError) {
      throw historyError;
    }

    // Calculate stats
    const totalWorkouts = workoutHistory?.length || 0;
    const currentStreak = calculateStreak(workoutHistory || []);
    const longestStreak = calculateLongestStreak(workoutHistory || []);
    const averageWorkoutDuration = calculateAverageWorkoutDuration(workoutHistory || []);

    // Check if user stats record exists
    const { data: existingStats, error: statsError } = await supabaseClient
      .from("user_stats")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (statsError && statsError.code !== "PGRST116") {
      throw statsError;
    }

    // Update or insert stats
    let result;
    if (existingStats) {
      // Update existing stats
      result = await supabaseClient
        .from("user_stats")
        .update({
          total_workouts: totalWorkouts,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          average_workout_duration: averageWorkoutDuration,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user_id);
    } else {
      // Insert new stats
      result = await supabaseClient
        .from("user_stats")
        .insert({
          user_id,
          total_workouts: totalWorkouts,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          average_workout_duration: averageWorkoutDuration,
        });
    }

    if (result.error) {
      throw result.error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          total_workouts: totalWorkouts,
          current_streak: currentStreak,
          longest_streak: longestStreak,
          average_workout_duration: averageWorkoutDuration,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error) {
    console.error("Error updating stats:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
