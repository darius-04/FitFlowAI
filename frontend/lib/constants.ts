export const COLORS = {
  background: "#0A0A0A",
  surface: "#171717",
  surface_highlight: "#262626",
  primary_workout: "#FF3B30",
  primary_nutrition: "#007AFF",
  text_primary: "#FFFFFF",
  text_secondary: "#A3A3A3",
  border: "#262626",
  success: "#34C759",
  warning: "#FF9F0A",
  danger: "#FF3B30",
};

export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Sedentary" },
  { value: "lightly_active", label: "Lightly Active" },
  { value: "moderately_active", label: "Moderately Active" },
  { value: "very_active", label: "Very Active" },
  { value: "athlete", label: "Athlete" },
];

export const FITNESS_GOALS = [
  { value: "lose_weight", label: "Lose Weight" },
  { value: "maintain_weight", label: "Maintain Weight" },
  { value: "gain_muscle", label: "Gain Muscle" },
];

export const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export const MUSCLE_GROUPS = [
  "chest",
  "back",
  "legs",
  "shoulders",
  "biceps",
  "triceps",
  "core",
] as const;
