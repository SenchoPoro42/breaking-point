// This Edge Function checks if today is a workout day for a user
// and returns true/false to help with notification filtering

import { createClient } from "npm:@supabase/supabase-js@2.39.3";
import { format } from "npm:date-fns@3.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

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

    // Get today's day of week (lowercase)
    const today = format(new Date(), "EEEE").toLowerCase();

    // Query workout_days table to check if today is a workout day
    const { data, error } = await supabaseClient
      .from("workout_days")
      .select("*")
      .eq("user_id", user_id)
      .eq("day", today);

    if (error) {
      throw error;
    }

    // If data exists and has length > 0, today is a workout day
    const isWorkoutDay = data && data.length > 0;

    return new Response(
      JSON.stringify({ 
        is_workout_day: isWorkoutDay,
        day: today,
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
    console.error("Error checking workout day:", error);
    
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
