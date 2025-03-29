import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { format, isToday, parseISO } from 'date-fns';
import { supabase } from '@/lib/supabase';

// Define types
export type NotificationSettings = {
  enabled: boolean;
  time: string; // Format: 'HH:mm'
};

// Configure notifications
export const configureNotifications = () => {
  // Skip configuration on web
  if (Platform.OS === 'web') return;

  // Set notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
};

// Check if the user has completed today's workout
export const hasCompletedTodayWorkout = async (): Promise<boolean> => {
  try {
    const { session } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      // Check from Supabase if user is logged in
      const today = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('workout_history')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('date', today)
        .single();
        
      if (error && error.code !== 'PGRST116') throw error;
      return !!data;
    } else {
      // Check from AsyncStorage if not logged in
      const historyString = await AsyncStorage.getItem('workoutHistory');
      if (!historyString) return false;

      const history = JSON.parse(historyString);
      
      // Find any workout completed today
      return history.some((workout: any) => 
        isToday(parseISO(workout.date))
      );
    }
  } catch (error) {
    console.error('Error checking workout completion:', error);
    return false;
  }
};

// Check if today is a workout day
export const isTodayWorkoutDay = async (): Promise<boolean> => {
  try {
    const { session } = await supabase.auth.getSession();
    
    if (session?.user?.id) {
      // Get user's workout days from Supabase
      const { data, error } = await supabase
        .from('workout_days')
        .select('day')
        .eq('user_id', session.user.id);
        
      if (error) throw error;
      
      const workoutDays = data.map(item => item.day);
      const today = format(new Date(), 'EEEE').toLowerCase();
      
      return workoutDays.includes(today);
    } else {
      // Get user's workout days from AsyncStorage
      const workoutDaysString = await AsyncStorage.getItem('workoutDays');
      if (!workoutDaysString) return false;

      const workoutDays = JSON.parse(workoutDaysString);
      const today = format(new Date(), 'EEEE').toLowerCase();
      
      return workoutDays.includes(today);
    }
  } catch (error) {
    console.error('Error checking if today is workout day:', error);
    return false;
  }
};

// Check and update notification status based on current conditions
export const checkAndUpdateNotificationStatus = async () => {
  if (Platform.OS === 'web') return;

  try {
    console.log('Checking and updating notification status...');
    
    // Get current notification settings
    const settings = await loadReminderSettings();
    
    if (!settings.enabled) {
      console.log('Notifications are disabled, skipping update');
      return;
    }
    
    // Get current user session
    const { session } = await supabase.auth.getSession();
    
    if (!session?.user?.id) {
      console.log('No user session, using local settings');
      
      // Handle local notification settings
      const isWorkoutDay = await isTodayWorkoutDay();
      const isCompleted = await hasCompletedTodayWorkout();
      
      console.log(`Today is ${isWorkoutDay ? 'a workout day' : 'a rest day'}`);
      console.log(`Workout is ${isCompleted ? 'completed' : 'not completed'}`);
      
      // Cancel all notifications if today is a rest day or workout is completed
      if (!isWorkoutDay || isCompleted) {
        console.log('Cancelling notifications for today');
        await cancelTodayNotifications();
      } else {
        console.log('Scheduling notifications for today');
        await scheduleWorkoutNotification(settings.time);
      }
    } else {
      // Use Supabase Edge Functions to get accurate data for the user
      console.log('Using Supabase Edge Functions for notification check');
      
      try {
        // Check if today is a workout day
        const workoutDayResponse = await fetch(`${supabase.supabaseUrl}/functions/v1/check-workout-day`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`
          },
          body: JSON.stringify({
            user_id: session.user.id
          })
        });
        
        if (!workoutDayResponse.ok) {
          throw new Error('Failed to check workout day');
        }
        
        const workoutDayData = await workoutDayResponse.json();
        const isWorkoutDay = workoutDayData.is_workout_day;
        
        // If today is not a workout day, cancel notifications
        if (!isWorkoutDay) {
          console.log('Today is not a workout day, cancelling notifications');
          await cancelTodayNotifications();
          return;
        }
        
        // Check if workout is completed
        const completedResponse = await fetch(`${supabase.supabaseUrl}/functions/v1/check-workout-completed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabase.supabaseKey}`
          },
          body: JSON.stringify({
            user_id: session.user.id
          })
        });
        
        if (!completedResponse.ok) {
          throw new Error('Failed to check workout completion');
        }
        
        const completedData = await completedResponse.json();
        const isCompleted = completedData.is_completed;
        
        // If workout is completed, cancel notifications
        if (isCompleted) {
          console.log('Workout is already completed, cancelling notifications');
          await cancelTodayNotifications();
          return;
        }
        
        // Schedule notifications since today is a workout day and workout is not completed
        console.log('Today is a workout day and workout is not completed, scheduling reminder');
        await scheduleWorkoutNotification(settings.time);
      } catch (edgeFunctionError) {
        console.error('Error calling Edge Functions:', edgeFunctionError);
        
        // Fallback to local checks if Edge Functions fail
        console.log('Falling back to local checks');
        const isWorkoutDay = await isTodayWorkoutDay();
        const isCompleted = await hasCompletedTodayWorkout();
        
        if (!isWorkoutDay || isCompleted) {
          await cancelTodayNotifications();
        } else {
          await scheduleWorkoutNotification(settings.time);
        }
      }
    }
  } catch (error) {
    console.error('Error in checkAndUpdateNotificationStatus:', error);
  }
};

// Cancel notifications only for today
export const cancelTodayNotifications = async () => {
  if (Platform.OS === 'web') return;
  
  try {
    // Get all scheduled notifications
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    
    // Filter for today's workout notifications
    const todayNotifications = scheduledNotifications.filter(notification => {
      const data = notification.content.data;
      return data && data.type === 'workout_reminder';
    });
    
    // Cancel each notification
    for (const notification of todayNotifications) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
    
    console.log(`Cancelled ${todayNotifications.length} notifications for today`);
  } catch (error) {
    console.error('Error cancelling today\'s notifications:', error);
  }
};

// Schedule notifications
export const scheduleWorkoutNotification = async (time: string) => {
  if (Platform.OS === 'web') {
    console.log('Notifications not supported on web');
    return;
  }

  try {
    // First cancel any existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();
    
    // Parse time
    const [hours, minutes] = time.split(':').map(Number);
    
    console.log(`Scheduling notification for ${hours}:${minutes}`);
    
    // Calculate when to show the notification
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If the time has already passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    // Calculate seconds until notification
    const secondsUntilNotification = Math.floor((scheduledTime.getTime() - now.getTime()) / 1000);
    
    // Log for debugging
    console.log(`Notification scheduled for ${scheduledTime.toLocaleString()}`);
    console.log(`That's ${secondsUntilNotification} seconds from now`);
    
    // Create trigger for daily notification
    const trigger = {
      hour: hours,
      minute: minutes,
      repeats: true,
    };
    
    // Schedule the notification with a custom identifier
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Time for your workout!',
        body: 'Don\'t forget to complete your workout today. Stay strong!',
        data: { 
          type: 'workout_reminder',
          // Include data that will be used for smart filtering when delivered:
          checkWorkoutDay: true,
          checkWorkoutCompleted: true
        },
      },
      trigger,
    });
    
    console.log(`Notification scheduled with ID: ${notificationId}`);
    
    // Schedule a test notification to verify permissions (will appear in 5 seconds)
    if (await requestNotificationPermissions()) {
      const testId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Workout Reminders Active',
          body: 'You will be reminded daily at ' + formatTimeDisplay(hours, minutes),
          data: { type: 'test_notification' },
        },
        trigger: { seconds: 5 },
      });
      console.log(`Test notification scheduled with ID: ${testId}`);
    }
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

// Set up notification received handler to implement smart filtering
export const setupNotificationReceivedHandler = () => {
  if (Platform.OS === 'web') return;
  
  // Handle receiving notifications while app is foregrounded
  const subscription = Notifications.addNotificationReceivedListener(async notification => {
    try {
      const data = notification.request.content.data;
      
      // Only apply smart filtering to workout reminders
      if (data?.type === 'workout_reminder') {
        console.log('Received workout reminder notification, checking conditions...');
        
        // Check if today is a workout day
        if (data.checkWorkoutDay) {
          const isWorkoutDay = await isTodayWorkoutDay();
          console.log('Is today a workout day?', isWorkoutDay);
          
          if (!isWorkoutDay) {
            // Prevent notification if not a workout day
            console.log('Not a workout day, dismissing notification');
            await Notifications.dismissNotificationAsync(notification.request.identifier);
            return;
          }
        }
        
        // Check if workout is already completed
        if (data.checkWorkoutCompleted) {
          const isCompleted = await hasCompletedTodayWorkout();
          console.log('Is workout already completed?', isCompleted);
          
          if (isCompleted) {
            // Prevent notification if workout already completed
            console.log('Workout already completed, dismissing notification');
            await Notifications.dismissNotificationAsync(notification.request.identifier);
            return;
          }
        }
        
        console.log('All conditions passed, showing notification');
      }
    } catch (error) {
      console.error('Error in notification handler:', error);
    }
  });
  
  return subscription;
};

// Helper function to format time nicely
function formatTimeDisplay(hours: number, minutes: number): string {
  const hour12 = hours % 12 || 12;
  const minute = minutes.toString().padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  
  return `${hour12}:${minute} ${period}`;
}

// Cancel all scheduled notifications
export const cancelAllNotifications = async () => {
  if (Platform.OS === 'web') return;
  
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('All notifications canceled');
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
};

// Request notification permissions
export const requestNotificationPermissions = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    
    // Already have permission
    if (existingStatus === 'granted') {
      return true;
    }
    
    // Request permission
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
};

// Load notification settings
export const loadReminderSettings = async (): Promise<NotificationSettings> => {
  try {
    const savedSettings = await AsyncStorage.getItem('reminderSettings');
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    
    // Default settings
    return {
      enabled: false,
      time: '08:00', // 8:00 AM default
    };
  } catch (error) {
    console.error('Error loading notification settings:', error);
    return {
      enabled: false,
      time: '08:00',
    };
  }
};

// Save notification settings
export const saveReminderSettings = async (settings: NotificationSettings): Promise<void> => {
  try {
    console.log('Saving notification settings:', settings);
    await AsyncStorage.setItem('reminderSettings', JSON.stringify(settings));
    
    if (settings.enabled) {
      // First check if permission is granted
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        console.log('Cannot schedule notifications: Permission not granted');
        return;
      }
      
      // Schedule notifications with smart behavior integrated
      await scheduleWorkoutNotification(settings.time);
    } else {
      await cancelAllNotifications();
    }
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
};
