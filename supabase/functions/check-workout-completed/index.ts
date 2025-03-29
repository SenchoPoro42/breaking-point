// This Edge Function checks if a user has completed their workout for today
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

    // Get today's date in YYYY-MM-DD format
    const today = format(new Date(), "yyyy-MM-dd");

    // Query workout_history table to check if workout is completed for today
    const { data, error } = await supabaseClient
      .from("workout_history")
      .select("*")
      .eq("user_id", user_id)
      .eq("date", today);

    if (error) {
      throw error;
    }

    // If data exists and has length > 0, workout is completed
    const isCompleted = data && data.length > 0;

    return new Response(
      JSON.stringify({ 
        is_completed: isCompleted,
        date: today,
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
    console.error("Error checking workout completion:", error);
    
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
