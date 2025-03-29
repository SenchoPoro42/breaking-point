export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
        }
      }
      custom_exercises: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
      }
      workout_days: {
        Row: {
          id: string
          user_id: string
          day: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          day: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          day?: string
          created_at?: string
        }
      }
      workout_history: {
        Row: {
          id: string
          user_id: string
          date: string
          exercises: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          exercises?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          exercises?: Json
          created_at?: string
        }
      }
      user_stats: {
        Row: {
          id: string
          user_id: string
          total_workouts: number
          current_streak: number
          longest_streak: number
          average_workout_duration: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_workouts?: number
          current_streak?: number
          longest_streak?: number
          average_workout_duration?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_workouts?: number
          current_streak?: number
          longest_streak?: number
          average_workout_duration?: number
          created_at?: string
          updated_at?: string
        }
      }
      user_goals: {
        Row: {
          id: string
          user_id: string
          goal: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          goal: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          goal?: string
          created_at?: string
        }
      }
    }
  }
}

export type Tables = Database['public']['Tables'];
