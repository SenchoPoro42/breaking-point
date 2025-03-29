import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Mail } from 'lucide-react-native';
import AppleLogo from './AppleLogo';

interface AuthModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AuthModal({ visible, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const { signInWithEmail, signUp, signInWithApple } = useAuth();

  const handleEmailAuth = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setError(null);
    setIsEmailLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setError(null);
    setIsAppleLoading(true);

    try {
      await signInWithApple();
      onClose();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Enter your email address"
              placeholderTextColor="#999999"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <TextInput
              style={styles.input}
              placeholder={isSignUp ? "Choose a secure password (min. 6 characters)" : "Enter your password"}
              placeholderTextColor="#999999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={isSignUp ? "new-password" : "current-password"}
            />
          </View>

          {error && (
            <Text style={styles.errorText}>{error}</Text>
          )}

          <TouchableOpacity
            style={styles.emailButton}
            onPress={handleEmailAuth}
            disabled={isEmailLoading || isAppleLoading}
          >
            {isEmailLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Mail size={20} color="#FFFFFF" />
                <Text style={styles.buttonText}>
                  {isSignUp ? 'Sign Up with Email' : 'Sign In with Email'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleAuth}
              disabled={isEmailLoading || isAppleLoading}
            >
              {isAppleLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <AppleLogo color="#FFFFFF" size={20} />
                  <Text style={styles.buttonText}>
                    Sign in with Apple
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setEmail('');
              setPassword('');
            }}
            disabled={isEmailLoading || isAppleLoading}
          >
            <Text style={styles.switchText}>
              {isSignUp
                ? 'Already have an account? Sign In'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={isEmailLoading || isAppleLoading}
          >
            <Text style={styles.closeText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#1A1A1A',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 24,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    color: '#1A1A1A',
  },
  emailButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    gap: 8,
  },
  appleButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  buttonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  switchButton: {
    padding: 8,
  },
  switchText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
  closeButton: {
    marginTop: 12,
    padding: 8,
  },
  closeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 16,
  },
});
