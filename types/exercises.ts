export type Exercise = {
  name: string;
  description: string;
  image: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  equipment: string[];
  instructions: string[];
};

export type ExercisePickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelectExercise?: (exercise: { id: string; name: string }) => void;
  customExercises: string[];
  onAddCustomExercise: (name: string) => Promise<void>;
  showUpgradePrompt?: boolean;
  onUpgrade?: () => void;
  entryPoint?: 'schedule' | 'exercisesMenu';
  selectedExercise?: string;
};
