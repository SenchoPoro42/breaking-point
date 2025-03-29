import { StyleSheet, Text, Dimensions, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
  useSharedValue
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { CircleAlert as AlertCircle, CircleCheck as CheckCircle, Circle as XCircle, Info } from 'lucide-react-native';

const WINDOW_HEIGHT = Dimensions.get('window').height;

export type Toast = {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
};

type ToastManagerProps = {
  toasts: Toast[];
  onRemove: (id: string) => void;
};

function ToastItem({ toast, onRemove, index }: { toast: Toast, onRemove: () => void, index: number }) {
  // Determine toast type and styling
  const type = toast.type || 'error';
  
  // Use useSharedValue instead of useRef(new Animated.Value())
  const translateY = useSharedValue(50);
  
  // Get the appropriate icon based on toast type
  const getIcon = () => {
    switch(type) {
      case 'success':
        return <CheckCircle size={16} color="#FFFFFF" />;
      case 'error':
        return <AlertCircle size={16} color="#FFFFFF" />;
      case 'warning':
        return <XCircle size={16} color="#FFFFFF" />;
      case 'info':
      default:
        return <Info size={16} color="#FFFFFF" />;
    }
  };
  
  // Get background color based on toast type - using more muted colors
  const getBackgroundColor = () => {
    switch(type) {
      case 'success':
        return 'rgba(16, 185, 129, 0.85)'; // Muted green
      case 'error':
        return 'rgba(239, 68, 68, 0.85)';  // Muted red
      case 'warning':
        return 'rgba(245, 158, 11, 0.85)'; // Muted orange
      case 'info':
      default:
        return 'rgba(59, 130, 246, 0.85)'; // Muted blue
    }
  };
  
  // Create animated style using useAnimatedStyle
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }]
    };
  });

  useEffect(() => {
    // Animate translateY from 50 to 0 when the toast appears
    translateY.value = withTiming(0, { duration: 300 });
    
    // Hide toast after shorter time
    const timer = setTimeout(() => {
      onRemove();
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View 
      style={[
        styles.toast, 
        { 
          backgroundColor: getBackgroundColor(),
          zIndex: 1000 + index, // Ensure newer toasts appear on top
        },
        animatedStyle
      ]}
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
    >
      <View style={styles.toastContent}>
        {getIcon()}
        <Text style={styles.text}>{toast.message}</Text>
      </View>
    </Animated.View>
  );
}

export default function ToastManager({ toasts, onRemove }: ToastManagerProps) {
  return (
    <>
      {toasts.map((toast, index) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onRemove={() => onRemove(toast.id)}
          index={index}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
    maxWidth: 400,
    alignSelf: 'center',
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255, 255, 255, 0.3)',
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    flexShrink: 1,
    opacity: 0.95,
  }
});
