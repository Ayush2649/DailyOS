import type {
  FocusGoal,
  BiologicalSex,
  PaceTier,
  ActivityLevel,
  DietaryPattern,
  WorkoutDaysPerWeek,
  AvailableTrainingTimeMinutes,
  PreferredTrainingWindow,
  EquipmentAccess,
  TrainingExperience,
  HealthCondition,
} from "@/lib/onboarding/validation";
import type { CanonicalStep } from "@/lib/onboarding/constants";

export interface OnboardingFormValues {
  // Step 0
  consentGivenAt: number | null;
  consentVersion: string | null;
  confirmedAge18Plus: boolean;

  // Step 1
  focusGoal: FocusGoal | null;

  // Step 2
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
  biologicalSex: BiologicalSex | null;

  
  // Step 3
  targetWeightKg: number | null;
  paceTier: PaceTier | null;

  // Step 4
  activityLevel: ActivityLevel | null;

  // Step 5
  includeWorkouts: boolean | null;
  workoutDaysPerWeek: WorkoutDaysPerWeek | null;
  availableTrainingTimeMinutes: AvailableTrainingTimeMinutes | null;
  preferredTrainingWindow: PreferredTrainingWindow | null;

  // Step 6
  equipmentAccess: EquipmentAccess | null;
  trainingExperience: TrainingExperience | null;

  // Step 7
  dietaryPattern: DietaryPattern | null;
  foodAvoidances: string[];
}

export interface OnboardingWizardState {
  currentStep: CanonicalStep;
  formValues: OnboardingFormValues;
  // Health screening is IN-MEMORY ONLY
  healthConditions: HealthCondition[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  completedResult: {
    systemRhythm: any;
    starterRoutine: any;
  } | null;
}

