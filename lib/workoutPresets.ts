import type { WorkoutTemplate } from "@/types";

function ex(id: string, name: string, sets: number, reps: number, weight?: number, unit: "kg"|"lbs"|"bodyweight" = "kg") {
  return { id, name, defaultSets: sets, defaultReps: reps, defaultWeight: weight, defaultUnit: unit };
}

export const WORKOUT_PRESETS: WorkoutTemplate[] = [
  {
    id: "preset-push",
    userId: "",
    name: "Push Day",
    description: "Chest, shoulders & triceps",
    isPreset: true,
    source: "system",
    createdAt: 0,
    exercises: [
      ex("pp-1", "Bench Press",          4, 8,  60),
      ex("pp-2", "Incline DB Press",      3, 10, 30),
      ex("pp-3", "Overhead Press",        3, 8,  40),
      ex("pp-4", "Lateral Raises",        3, 15, 10),
      ex("pp-5", "Tricep Pushdown",       3, 12, 25),
      ex("pp-6", "Overhead Tricep Ext.",  3, 12, 20),
    ],
  },
  {
    id: "preset-pull",
    userId: "",
    name: "Pull Day",
    description: "Back & biceps",
    isPreset: true,
    source: "system",
    createdAt: 0,
    exercises: [
      ex("pl-1", "Deadlift",         4, 5,  100),
      ex("pl-2", "Pull-ups",         4, 8,   0, "bodyweight"),
      ex("pl-3", "Barbell Row",      3, 8,  60),
      ex("pl-4", "Lat Pulldown",     3, 10, 55),
      ex("pl-5", "Face Pulls",       3, 15, 20),
      ex("pl-6", "Bicep Curls",      3, 12, 15),
    ],
  },
  {
    id: "preset-legs",
    userId: "",
    name: "Leg Day",
    description: "Quads, hamstrings & calves",
    isPreset: true,
    source: "system",
    createdAt: 0,
    exercises: [
      ex("lg-1", "Squats",                4, 6,  80),
      ex("lg-2", "Leg Press",             3, 12, 120),
      ex("lg-3", "Romanian Deadlift",     3, 10, 60),
      ex("lg-4", "Leg Extensions",        3, 12, 50),
      ex("lg-5", "Lying Hamstring Curls", 3, 12, 35),
      ex("lg-6", "Standing Calf Raises",  4, 15, 40),
    ],
  },
  {
    id: "preset-upper",
    userId: "",
    name: "Upper Body",
    description: "Full upper body — push & pull",
    isPreset: true,
    source: "system",
    createdAt: 0,
    exercises: [
      ex("ub-1", "Bench Press",    4, 8,  60),
      ex("ub-2", "Barbell Row",    4, 8,  60),
      ex("ub-3", "Overhead Press", 3, 8,  40),
      ex("ub-4", "Lat Pulldown",   3, 10, 55),
      ex("ub-5", "Bicep Curls",    3, 12, 15),
      ex("ub-6", "Tricep Dips",    3, 10,  0, "bodyweight"),
    ],
  },
  {
    id: "preset-fullbody",
    userId: "",
    name: "Full Body",
    description: "Compound movements — all muscle groups",
    isPreset: true,
    source: "system",
    createdAt: 0,
    exercises: [
      ex("fb-1", "Squat",          3, 6,  80),
      ex("fb-2", "Bench Press",    3, 6,  60),
      ex("fb-3", "Deadlift",       3, 5, 100),
      ex("fb-4", "Pull-ups",       3, 8,   0, "bodyweight"),
      ex("fb-5", "Overhead Press", 3, 8,  40),
      ex("fb-6", "Plank",          3, 1,   0, "bodyweight"),
    ],
  },
];
