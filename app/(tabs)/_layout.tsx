import { Tabs } from 'expo-router';
import { Dumbbell, Calendar, BookOpen, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, useWindowDimensions } from 'react-native';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  
  // Pre-calculate dimensions for smoother initial render
  const initialLayout = { width, height };

  return (
    <Tabs
      initialLayout={initialLayout}
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E5E5',
          height: 60 + (insets.bottom > 0 ? insets.bottom - 5 : 0),
          paddingBottom: insets.bottom > 0 ? insets.bottom - 5 : 0,
        },
        headerShown: false,
        tabBarLabelStyle: {
          paddingBottom: 7,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Workouts',
          tabBarIcon: ({ color, size }) => <Dumbbell size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
