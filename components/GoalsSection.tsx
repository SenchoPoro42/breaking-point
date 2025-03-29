import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator 
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';
import { Plus, X, Check, Target } from 'lucide-react-native';

interface GoalsSectionProps {
  goals: string[];
  onAddGoal: (goal: string) => Promise<void>;
  onRemoveGoal: (goal: string) => Promise<void>;
  isLoading?: boolean;
}

const GoalsSection = ({ 
  goals, 
  onAddGoal, 
  onRemoveGoal,
  isLoading = false 
}: GoalsSectionProps) => {
  const [newGoal, setNewGoal] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [removingGoal, setRemovingGoal] = useState<string | null>(null);
  const [showInput, setShowInput] = useState(false);

  const handleAddGoal = useCallback(async () => {
    if (!newGoal.trim()) return;
    
    try {
      setIsAdding(true);
      await onAddGoal(newGoal.trim());
      setNewGoal('');
      setShowInput(false);
    } catch (error) {
      console.error('Error adding goal:', error);
    } finally {
      setIsAdding(false);
    }
  }, [newGoal, onAddGoal]);

  const handleRemoveGoal = useCallback(async (goal: string) => {
    try {
      setRemovingGoal(goal);
      await onRemoveGoal(goal);
    } catch (error) {
      console.error('Error removing goal:', error);
    } finally {
      setRemovingGoal(null);
    }
  }, [onRemoveGoal]);

  return (
    <Animated.View 
      style={styles.container}
      entering={FadeIn.duration(300)}
      layout={Layout.springify()}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Target size={20} color="#1A1A1A" style={styles.icon} />
          <Text style={styles.title}>My Goals</Text>
        </View>
        
        {!showInput && (
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowInput(true)}
            disabled={isLoading}
          >
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#007AFF" size="small" />
          <Text style={styles.loadingText}>Loading goals...</Text>
        </View>
      ) : (
        <>
          {showInput && (
            <Animated.View 
              style={styles.inputContainer}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              layout={Layout.springify()}
            >
              <TextInput
                style={styles.input}
                placeholder="Enter a new goal..."
                value={newGoal}
                onChangeText={setNewGoal}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleAddGoal}
              />
              <View style={styles.inputButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowInput(false);
                    setNewGoal('');
                  }}
                  disabled={isAdding}
                >
                  <X size={18} color="#666666" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.saveButton, !newGoal.trim() && styles.saveButtonDisabled]}
                  onPress={handleAddGoal}
                  disabled={!newGoal.trim() || isAdding}
                >
                  {isAdding ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Check size={18} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}

          <ScrollView style={styles.goalList} showsVerticalScrollIndicator={false}>
            {goals.length === 0 ? (
              <Text style={styles.emptyText}>
                No goals yet. Tap the + button to add your first goal!
              </Text>
            ) : (
              goals.map((goal, index) => (
                <Animated.View 
                  key={`${goal}-${index}`}
                  style={styles.goalItem}
                  entering={FadeIn.duration(300).delay(index * 50)}
                  exiting={FadeOut.duration(200)}
                  layout={Layout.springify()}
                >
                  <View style={styles.goalBullet} />
                  <Text style={styles.goalText}>{goal}</Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveGoal(goal)}
                    disabled={removingGoal === goal}
                  >
                    {removingGoal === goal ? (
                      <ActivityIndicator color="#FF3B30" size="small" />
                    ) : (
                      <X size={18} color="#FF3B30" />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              ))
            )}
          </ScrollView>
        </>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  title: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: 'rgba(0, 122, 255, 0.5)',
  },
  goalList: {
    maxHeight: 280,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  goalBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginRight: 12,
  },
  goalText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#333333',
    flex: 1,
  },
  removeButton: {
    padding: 6,
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#999999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
});

export default GoalsSection;
