import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { ChevronLeft, Youtube, Dumbbell, Target, Layers, ChartBar as BarChart3 } from 'lucide-react-native';
import { Exercise } from '@/types/exercises';
import Animated, { FadeIn } from 'react-native-reanimated';

interface DetailedExerciseViewProps {
  exercise: Exercise;
  onBack: () => void;
  onModify?: () => void;
  onRemove?: () => void;
  onAddToSchedule?: () => void;
  entryPoint: 'schedule' | 'exercisesMenu';
}

export default function DetailedExerciseView({
  exercise,
  onBack,
  onModify,
  onRemove,
  onAddToSchedule,
  entryPoint
}: DetailedExerciseViewProps) {
  const handleWatchTutorial = () => {
    const searchQuery = encodeURIComponent(`${exercise.name} proper form`);
    const youtubeUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
    Linking.openURL(youtubeUrl);
  };

  return (
    <Animated.View 
      style={styles.container}
      entering={FadeIn.duration(300)}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ChevronLeft size={24} color="#007AFF" />
            <Text style={styles.backText}>
              {entryPoint === 'schedule' ? 'Schedule' : 'Exercise List'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Exercise Image */}
        <Image
          source={{ uri: exercise.image }}
          style={styles.image}
          resizeMode="cover"
        />

        {/* Exercise Title and Description */}
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{exercise.name}</Text>
          <Text style={styles.description}>{exercise.description}</Text>

          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <BarChart3 size={20} color="#007AFF" />
              <Text style={styles.statText}>{exercise.difficulty}</Text>
            </View>
            <View style={styles.statItem}>
              <Dumbbell size={20} color="#007AFF" />
              <Text style={styles.statText}>{exercise.equipment.join(', ')}</Text>
            </View>
          </View>

          {/* Muscle Groups */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Target size={20} color="#1A1A1A" />
              <Text style={styles.sectionTitle}>Muscles Worked</Text>
            </View>
            <View style={styles.muscleGroups}>
              <View style={styles.muscleSection}>
                <Text style={styles.muscleTitle}>Primary</Text>
                <View style={styles.muscleList}>
                  {exercise.primaryMuscles.map((muscle, index) => (
                    <View key={index} style={styles.muscleBadge}>
                      <Text style={styles.muscleText}>{muscle}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.muscleSection}>
                <Text style={styles.muscleTitle}>Secondary</Text>
                <View style={styles.muscleList}>
                  {exercise.secondaryMuscles.map((muscle, index) => (
                    <View key={index} style={[styles.muscleBadge, styles.secondaryBadge]}>
                      <Text style={[styles.muscleText, styles.secondaryText]}>{muscle}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
              <Layers size={20} color="#1A1A1A" />
              <Text style={styles.sectionTitle}>Instructions</Text>
            </View>
            {exercise.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={styles.instructionNumber}>{index + 1}</Text>
                <Text style={styles.instructionText}>{instruction}</Text>
              </View>
            ))}
          </View>

          {/* Watch Tutorial Button */}
          <TouchableOpacity
            style={styles.tutorialButton}
            onPress={handleWatchTutorial}
          >
            <Youtube size={20} color="#FFFFFF" />
            <Text style={styles.tutorialButtonText}>Watch Tutorial</Text>
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {entryPoint === 'schedule' ? (
              <>
                {onModify && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.modifyButton]}
                    onPress={onModify}
                  >
                    <Text style={styles.actionButtonText}>Modify Exercise</Text>
                  </TouchableOpacity>
                )}
                {onRemove && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.removeButton]}
                    onPress={onRemove}
                  >
                    <Text style={styles.removeButtonText}>Remove from Schedule</Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              onAddToSchedule && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.addButton]}
                  onPress={onAddToSchedule}
                >
                  <Text style={styles.actionButtonText}>Add to Schedule</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
  },
  image: {
    width: '100%',
    height: 250,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#1A1A1A',
    marginBottom: 8,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
  },
  statText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#007AFF',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
    color: '#1A1A1A',
  },
  muscleGroups: {
    gap: 16,
  },
  muscleSection: {
    gap: 8,
  },
  muscleTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#666666',
  },
  muscleList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleBadge: {
    backgroundColor: '#007AFF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  muscleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  secondaryBadge: {
    backgroundColor: '#F0F7FF',
  },
  secondaryText: {
    color: '#007AFF',
  },
  instructionItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  instructionNumber: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#007AFF',
    width: 24,
    textAlign: 'center',
  },
  instructionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#1A1A1A',
    flex: 1,
    lineHeight: 24,
  },
  tutorialButton: {
    backgroundColor: '#FF0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  tutorialButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modifyButton: {
    backgroundColor: '#007AFF',
  },
  addButton: {
    backgroundColor: '#007AFF',
  },
  removeButton: {
    backgroundColor: '#FFF5F5',
  },
  actionButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  removeButtonText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    color: '#FF3B30',
  },
});
