import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { configureNotifications, setupNotificationReceivedHandler, checkAndUpdateNotificationStatus } from '@/lib/notificationService';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

// Define a background task name
const BACKGROUND_TASK_NAME = 'CHECK_WORKOUT_NOTIFICATIONS';

// Define the background task
TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    console.log('[Background Task] Running notification check task');
    await checkAndUpdateNotificationStatus();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[Background Task] Error:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// Register the background task
async function registerBackgroundTask() {
  try {
    // Check if the task is already registered
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
    
    if (!isRegistered) {
      console.log('[Background Task] Registering task');
      await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
        minimumInterval: 60 * 60, // Execute at least every hour (in seconds)
        stopOnTerminate: false, // Android: continue executing when app is terminated
        startOnBoot: true, // Android: start task when device reboots
      });
      console.log('[Background Task] Registration successful');
    } else {
      console.log('[Background Task] Task already registered');
    }
  } catch (error) {
    console.error('[Background Task] Registration failed:', error);
  }
}

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  
  // Configure notifications on app startup
  useEffect(() => {
    configureNotifications();
    
    if (Platform.OS !== 'web') {
      // Set up notification handlers
      const subscription = setupNotificationReceivedHandler();
      
      const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
        console.log('Notification response received:', response);
        // Handle notification interaction here
      });
      
      // Check and update notification status
      checkAndUpdateNotificationStatus();
      
      // Register background task for notifications
      registerBackgroundTask();
      
      return () => {
        subscription?.remove();
        responseSubscription.remove();
      };
    }
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Animated.View 
            style={styles.container}
            entering={FadeIn.duration(300)}
          >
            <Stack 
              screenOptions={{ 
                headerShown: false,
                animation: 'fade',
                contentStyle: { 
                  backgroundColor: '#F8F9FA' 
                }
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="dark" />
          </Animated.View>
        </GestureHandlerRootView>
      </SubscriptionProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
});
