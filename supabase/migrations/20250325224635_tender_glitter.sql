/*
  # Database Schema Update
  
  1. Tables
    - Creates profiles, custom_exercises, workout_days, and workout_history tables
    - All tables have appropriate foreign key relationships
    
  2. Security
    - Enables RLS on all tables
    - Creates policies for authenticated users to manage their own data
    
  3. Triggers
    - Creates trigger for automatic profile creation on user signup
*/

-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create custom_exercises table if it doesn't exist
CREATE TABLE IF NOT EXISTS custom_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Create workout_days table if it doesn't exist
CREATE TABLE IF NOT EXISTS workout_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  day text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, day)
);

-- Create workout_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS workout_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_history ENABLE ROW LEVEL SECURITY;

-- Create policies with existence checks
DO $$ 
BEGIN
  -- Profiles policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can read own profile'
  ) THEN
    CREATE POLICY "Users can read own profile"
      ON profiles FOR SELECT
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile"
      ON profiles FOR UPDATE
      TO authenticated
      USING (auth.uid() = id);
  END IF;

  -- Custom exercises policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'custom_exercises' AND policyname = 'Users can read own custom exercises'
  ) THEN
    CREATE POLICY "Users can read own custom exercises"
      ON custom_exercises FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'custom_exercises' AND policyname = 'Users can insert own custom exercises'
  ) THEN
    CREATE POLICY "Users can insert own custom exercises"
      ON custom_exercises FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'custom_exercises' AND policyname = 'Users can delete own custom exercises'
  ) THEN
    CREATE POLICY "Users can delete own custom exercises"
      ON custom_exercises FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Workout days policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workout_days' AND policyname = 'Users can read own workout days'
  ) THEN
    CREATE POLICY "Users can read own workout days"
      ON workout_days FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workout_days' AND policyname = 'Users can manage own workout days'
  ) THEN
    CREATE POLICY "Users can manage own workout days"
      ON workout_days FOR ALL
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Workout history policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workout_history' AND policyname = 'Users can read own workout history'
  ) THEN
    CREATE POLICY "Users can read own workout history"
      ON workout_history FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'workout_history' AND policyname = 'Users can insert own workout history'
  ) THEN
    CREATE POLICY "Users can insert own workout history"
      ON workout_history FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create or replace function to handle profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
