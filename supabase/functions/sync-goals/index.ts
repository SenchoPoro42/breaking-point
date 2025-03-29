// This Edge Function synchronizes a user's goals between local storage and Supabase

import { createClient } from "npm:@supabase/supabase-js@2.39.3";

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

    // Get user ID and goals from request
    const { user_id, goals, operation } = await req.json();
    
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

    // If operation is 'get', return the user's goals
    if (operation === 'get') {
      const { data, error } = await supabaseClient
        .from("user_goals")
        .select("goal")
        .eq("user_id", user_id);

      if (error) {
        throw error;
      }

      return new Response(
        JSON.stringify({
          success: true,
          goals: data?.map(item => item.goal) || [],
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
    
    // If operation is 'sync', synchronize the provided goals
    else if (operation === 'sync') {
      if (!Array.isArray(goals)) {
        return new Response(
          JSON.stringify({ error: "Goals must be an array" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      // Delete existing goals for this user
      const { error: deleteError } = await supabaseClient
        .from("user_goals")
        .delete()
        .eq("user_id", user_id);

      if (deleteError) {
        throw deleteError;
      }

      // Insert new goals if there are any
      if (goals.length > 0) {
        const goalsToInsert = goals.map(goal => ({
          user_id,
          goal,
        }));

        const { error: insertError } = await supabaseClient
          .from("user_goals")
          .insert(goalsToInsert);

        if (insertError) {
          throw insertError;
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Goals synchronized successfully",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
    
    // If operation is 'add', add a single goal
    else if (operation === 'add' && goals && goals.length === 1) {
      const { error: insertError } = await supabaseClient
        .from("user_goals")
        .insert({
          user_id,
          goal: goals[0],
        });

      if (insertError) {
        throw insertError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Goal added successfully",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
    
    // If operation is 'remove', remove a single goal
    else if (operation === 'remove' && goals && goals.length === 1) {
      const { error: deleteError } = await supabaseClient
        .from("user_goals")
        .delete()
        .eq("user_id", user_id)
        .eq("goal", goals[0]);

      if (deleteError) {
        throw deleteError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "Goal removed successfully",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
    
    else {
      return new Response(
        JSON.stringify({ error: "Invalid operation" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }
  } catch (error) {
    console.error("Error synchronizing goals:", error);
    
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
