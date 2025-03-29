import { Exercise } from '@/types/exercises';

export const exerciseData: Record<string, Exercise> = {
  'Push-ups': {
    name: 'Push-ups',
    description: 'A compound exercise that strengthens the chest, shoulders, triceps, and core.',
    image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&auto=format&fit=crop&q=60',
    primaryMuscles: ['Chest', 'Shoulders', 'Triceps'],
    secondaryMuscles: ['Core', 'Upper Back'],
    difficulty: 'Beginner',
    equipment: ['None'],
    instructions: [
      'Start in a plank position with hands slightly wider than shoulders',
      'Keep your body in a straight line from head to heels',
      'Lower your body until your chest nearly touches the ground',
      'Push back up to the starting position',
      'Keep your core tight throughout the movement'
    ]
  },
  'Pull-ups': {
    name: 'Pull-ups',
    description: 'A challenging upper body exercise that builds back, bicep, and core strength.',
    image: 'https://images.unsplash.com/photo-1598971639058-fab3c3109a34?w=800&auto=format&fit=crop&q=60',
    primaryMuscles: ['Back', 'Biceps'],
    secondaryMuscles: ['Shoulders', 'Core'],
    difficulty: 'Advanced',
    equipment: ['Pull-up Bar'],
    instructions: [
      'Hang from a pull-up bar with hands slightly wider than shoulders',
      'Pull yourself up until your chin is over the bar',
      'Lower yourself back down with control',
      'Keep your core engaged throughout the movement',
      'Avoid swinging or using momentum'
    ]
  },
  'Squats': {
    name: 'Squats',
    description: 'A fundamental lower body exercise that targets multiple muscle groups.',
    image: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=800&auto=format&fit=crop&q=60',
    primaryMuscles: ['Quadriceps', 'Glutes'],
    secondaryMuscles: ['Hamstrings', 'Calves', 'Core'],
    difficulty: 'Beginner',
    equipment: ['None'],
    instructions: [
      'Stand with feet shoulder-width apart',
      'Keep your chest up and core engaged',
      'Lower your body as if sitting back into a chair',
      'Keep your knees in line with your toes',
      'Push through your heels to return to standing'
    ]
  },
  'Dips': {
    name: 'Dips',
    description: 'An upper body exercise focusing on chest, triceps, and shoulder strength.',
    image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&auto=format&fit=crop&q=60',
    primaryMuscles: ['Chest', 'Triceps'],
    secondaryMuscles: ['Shoulders', 'Core'],
    difficulty: 'Intermediate',
    equipment: ['Parallel Bars', 'Dip Station'],
    instructions: [
      'Start with arms straight on parallel bars',
      'Lower your body by bending your elbows',
      'Keep your core tight and elbows close to body',
      'Push back up to the starting position',
      'Maintain control throughout the movement'
    ]
  }
};
