"""Seed exercise database."""
from typing import List, Dict

EXERCISES: List[Dict] = [
    # Chest
    {"name": "Bench Press", "primary_muscle_group": "chest", "secondary_muscle_groups": ["triceps", "shoulders"], "equipment": "barbell", "difficulty": "intermediate"},
    {"name": "Incline Dumbbell Press", "primary_muscle_group": "chest", "secondary_muscle_groups": ["shoulders", "triceps"], "equipment": "dumbbell", "difficulty": "intermediate"},
    {"name": "Push-up", "primary_muscle_group": "chest", "secondary_muscle_groups": ["triceps", "core"], "equipment": "bodyweight", "difficulty": "beginner"},
    {"name": "Cable Fly", "primary_muscle_group": "chest", "secondary_muscle_groups": ["shoulders"], "equipment": "cable", "difficulty": "intermediate"},
    {"name": "Dumbbell Bench Press", "primary_muscle_group": "chest", "secondary_muscle_groups": ["triceps", "shoulders"], "equipment": "dumbbell", "difficulty": "beginner"},

    # Back
    {"name": "Pull-up", "primary_muscle_group": "back", "secondary_muscle_groups": ["biceps"], "equipment": "bodyweight", "difficulty": "advanced"},
    {"name": "Lat Pulldown", "primary_muscle_group": "back", "secondary_muscle_groups": ["biceps"], "equipment": "cable", "difficulty": "beginner"},
    {"name": "Barbell Row", "primary_muscle_group": "back", "secondary_muscle_groups": ["biceps"], "equipment": "barbell", "difficulty": "intermediate"},
    {"name": "Seated Cable Row", "primary_muscle_group": "back", "secondary_muscle_groups": ["biceps"], "equipment": "cable", "difficulty": "beginner"},
    {"name": "Deadlift", "primary_muscle_group": "back", "secondary_muscle_groups": ["legs", "core"], "equipment": "barbell", "difficulty": "advanced"},

    # Legs
    {"name": "Squat", "primary_muscle_group": "legs", "secondary_muscle_groups": ["core"], "equipment": "barbell", "difficulty": "intermediate"},
    {"name": "Leg Press", "primary_muscle_group": "legs", "secondary_muscle_groups": [], "equipment": "machine", "difficulty": "beginner"},
    {"name": "Romanian Deadlift", "primary_muscle_group": "legs", "secondary_muscle_groups": ["back"], "equipment": "barbell", "difficulty": "intermediate"},
    {"name": "Lunges", "primary_muscle_group": "legs", "secondary_muscle_groups": ["core"], "equipment": "dumbbell", "difficulty": "beginner"},
    {"name": "Leg Curl", "primary_muscle_group": "legs", "secondary_muscle_groups": [], "equipment": "machine", "difficulty": "beginner"},
    {"name": "Leg Extension", "primary_muscle_group": "legs", "secondary_muscle_groups": [], "equipment": "machine", "difficulty": "beginner"},

    # Shoulders
    {"name": "Overhead Press", "primary_muscle_group": "shoulders", "secondary_muscle_groups": ["triceps", "core"], "equipment": "barbell", "difficulty": "intermediate"},
    {"name": "Lateral Raise", "primary_muscle_group": "shoulders", "secondary_muscle_groups": [], "equipment": "dumbbell", "difficulty": "beginner"},
    {"name": "Rear Delt Fly", "primary_muscle_group": "shoulders", "secondary_muscle_groups": ["back"], "equipment": "dumbbell", "difficulty": "beginner"},
    {"name": "Dumbbell Shoulder Press", "primary_muscle_group": "shoulders", "secondary_muscle_groups": ["triceps"], "equipment": "dumbbell", "difficulty": "beginner"},

    # Biceps
    {"name": "Barbell Curl", "primary_muscle_group": "biceps", "secondary_muscle_groups": [], "equipment": "barbell", "difficulty": "beginner"},
    {"name": "Dumbbell Curl", "primary_muscle_group": "biceps", "secondary_muscle_groups": [], "equipment": "dumbbell", "difficulty": "beginner"},
    {"name": "Hammer Curl", "primary_muscle_group": "biceps", "secondary_muscle_groups": [], "equipment": "dumbbell", "difficulty": "beginner"},
    {"name": "Cable Curl", "primary_muscle_group": "biceps", "secondary_muscle_groups": [], "equipment": "cable", "difficulty": "beginner"},

    # Triceps
    {"name": "Triceps Pushdown", "primary_muscle_group": "triceps", "secondary_muscle_groups": [], "equipment": "cable", "difficulty": "beginner"},
    {"name": "Skull Crusher", "primary_muscle_group": "triceps", "secondary_muscle_groups": [], "equipment": "barbell", "difficulty": "intermediate"},
    {"name": "Close-Grip Bench Press", "primary_muscle_group": "triceps", "secondary_muscle_groups": ["chest"], "equipment": "barbell", "difficulty": "intermediate"},
    {"name": "Overhead Triceps Extension", "primary_muscle_group": "triceps", "secondary_muscle_groups": [], "equipment": "dumbbell", "difficulty": "beginner"},

    # Core
    {"name": "Plank", "primary_muscle_group": "core", "secondary_muscle_groups": [], "equipment": "bodyweight", "difficulty": "beginner"},
    {"name": "Hanging Leg Raise", "primary_muscle_group": "core", "secondary_muscle_groups": [], "equipment": "bodyweight", "difficulty": "intermediate"},
    {"name": "Cable Crunch", "primary_muscle_group": "core", "secondary_muscle_groups": [], "equipment": "cable", "difficulty": "beginner"},
    {"name": "Russian Twist", "primary_muscle_group": "core", "secondary_muscle_groups": [], "equipment": "bodyweight", "difficulty": "beginner"},
]
