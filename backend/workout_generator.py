"""Workout plan generator using deterministic templates."""
from typing import List, Dict
import uuid


# Exercise templates per muscle/day type
# Each entry: (name, primary, secondary[], equipment, difficulty)
CHEST_PRIMARY = [
    ("Bench Press", "chest", ["triceps", "shoulders"], "barbell", "intermediate"),
    ("Incline Dumbbell Press", "chest", ["shoulders", "triceps"], "dumbbell", "intermediate"),
    ("Push-up", "chest", ["triceps"], "bodyweight", "beginner"),
    ("Cable Fly", "chest", [], "cable", "intermediate"),
]
BACK_PRIMARY = [
    ("Barbell Row", "back", ["biceps"], "barbell", "intermediate"),
    ("Lat Pulldown", "back", ["biceps"], "cable", "beginner"),
    ("Seated Cable Row", "back", ["biceps"], "cable", "beginner"),
    ("Pull-up", "back", ["biceps"], "bodyweight", "advanced"),
]
LEGS_PRIMARY = [
    ("Squat", "legs", ["core"], "barbell", "intermediate"),
    ("Romanian Deadlift", "legs", ["back"], "barbell", "intermediate"),
    ("Leg Press", "legs", [], "machine", "beginner"),
    ("Lunges", "legs", ["core"], "dumbbell", "beginner"),
    ("Leg Curl", "legs", [], "machine", "beginner"),
]
SHOULDERS_PRIMARY = [
    ("Overhead Press", "shoulders", ["triceps"], "barbell", "intermediate"),
    ("Lateral Raise", "shoulders", [], "dumbbell", "beginner"),
    ("Rear Delt Fly", "shoulders", ["back"], "dumbbell", "beginner"),
]
BICEPS_PRIMARY = [
    ("Barbell Curl", "biceps", [], "barbell", "beginner"),
    ("Hammer Curl", "biceps", [], "dumbbell", "beginner"),
]
TRICEPS_PRIMARY = [
    ("Triceps Pushdown", "triceps", [], "cable", "beginner"),
    ("Skull Crusher", "triceps", [], "barbell", "intermediate"),
]
CORE_PRIMARY = [
    ("Plank", "core", [], "bodyweight", "beginner"),
    ("Hanging Leg Raise", "core", [], "bodyweight", "intermediate"),
    ("Cable Crunch", "core", [], "cable", "beginner"),
]


def _reps_for(goal: str, experience: str) -> str:
    if goal == "lose_weight":
        return "10-15"
    if goal == "gain_muscle":
        if experience == "beginner":
            return "8-12"
        return "6-12"
    return "8-12"


def _sets_for(experience: str) -> int:
    return {"beginner": 3, "intermediate": 4, "advanced": 5}.get(experience, 3)


def _slice(pool, count):
    """Take first N from a pool, cycling if needed."""
    out = []
    i = 0
    while len(out) < count:
        out.append(pool[i % len(pool)])
        i += 1
    return out


def _build_exercises(pool_specs, count, sets_n, reps_str):
    """pool_specs: list of (pool_list, n_from_pool) tuples."""
    items = []
    for pool, n in pool_specs:
        items.extend(_slice(pool, n))
    # If too many, trim; if too few, no-op
    items = items[:count] if len(items) > count else items
    out = []
    for name, primary, secondary, equipment, difficulty in items:
        out.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "primary_muscle_group": primary,
            "secondary_muscle_groups": secondary,
            "sets": sets_n,
            "reps": reps_str,
            "equipment": equipment,
            "difficulty": difficulty,
        })
    return out


def _exercise_count(experience: str, day_type: str) -> int:
    # Approximate exercise count per session
    base = {"beginner": 4, "intermediate": 5, "advanced": 6}.get(experience, 4)
    if day_type in ("full_body",):
        return base + 1
    return base


def _make_full_body(sets_n, reps_str, count):
    return _build_exercises(
        [(CHEST_PRIMARY, 1), (BACK_PRIMARY, 1), (LEGS_PRIMARY, 2),
         (SHOULDERS_PRIMARY, 1), (BICEPS_PRIMARY, 1), (TRICEPS_PRIMARY, 1), (CORE_PRIMARY, 1)],
        count, sets_n, reps_str)


def _make_full_body_b(sets_n, reps_str, count):
    return _build_exercises(
        [(LEGS_PRIMARY[1:], 2), (BACK_PRIMARY[1:], 1), (CHEST_PRIMARY[1:], 1),
         (SHOULDERS_PRIMARY[1:], 1), (BICEPS_PRIMARY, 1), (TRICEPS_PRIMARY, 1), (CORE_PRIMARY[1:], 1)],
        count, sets_n, reps_str)


def _make_full_body_c(sets_n, reps_str, count):
    return _build_exercises(
        [(LEGS_PRIMARY, 2), (BACK_PRIMARY, 1), (CHEST_PRIMARY, 1),
         (SHOULDERS_PRIMARY, 1), (BICEPS_PRIMARY[1:], 1), (TRICEPS_PRIMARY[1:], 1), (CORE_PRIMARY, 1)],
        count, sets_n, reps_str)


def _make_push(sets_n, reps_str, count):
    return _build_exercises(
        [(CHEST_PRIMARY, 2), (SHOULDERS_PRIMARY, 2), (TRICEPS_PRIMARY, 2)],
        count, sets_n, reps_str)


def _make_pull(sets_n, reps_str, count):
    return _build_exercises(
        [(BACK_PRIMARY, 3), (BICEPS_PRIMARY, 2), (CORE_PRIMARY, 1)],
        count, sets_n, reps_str)


def _make_legs(sets_n, reps_str, count):
    return _build_exercises(
        [(LEGS_PRIMARY, 4), (CORE_PRIMARY, 2)],
        count, sets_n, reps_str)


def _make_upper(sets_n, reps_str, count):
    return _build_exercises(
        [(CHEST_PRIMARY, 1), (BACK_PRIMARY, 2), (SHOULDERS_PRIMARY, 1),
         (BICEPS_PRIMARY, 1), (TRICEPS_PRIMARY, 1)],
        count, sets_n, reps_str)


def _make_lower(sets_n, reps_str, count):
    return _build_exercises(
        [(LEGS_PRIMARY, 4), (CORE_PRIMARY, 2)],
        count, sets_n, reps_str)


def generate_workout_plan(goal: str, experience: str, days_per_week: int) -> Dict:
    """Generate a workout plan dict with name, days, exercises."""
    days_per_week = max(1, min(6, days_per_week))
    sets_n = _sets_for(experience)
    reps_str = _reps_for(goal, experience)

    plan_name_map = {
        1: "Full Body Routine",
        2: "2-Day Full Body Split",
        3: "3-Day Push Pull Legs" if goal == "gain_muscle" else "3-Day Full Body",
        4: "4-Day Upper/Lower Split",
        5: "5-Day Hybrid Split",
        6: "6-Day Push/Pull/Legs",
    }

    days: List[Dict] = []

    if days_per_week == 1:
        n = _exercise_count(experience, "full_body")
        days.append({"id": str(uuid.uuid4()), "day_index": 0, "name": "Full Body",
                     "exercises": _make_full_body(sets_n, reps_str, n)})
    elif days_per_week == 2:
        n = _exercise_count(experience, "full_body")
        days.append({"id": str(uuid.uuid4()), "day_index": 0, "name": "Full Body A",
                     "exercises": _make_full_body(sets_n, reps_str, n)})
        days.append({"id": str(uuid.uuid4()), "day_index": 1, "name": "Full Body B",
                     "exercises": _make_full_body_b(sets_n, reps_str, n)})
    elif days_per_week == 3:
        if goal == "gain_muscle":
            n = _exercise_count(experience, "split")
            days.append({"id": str(uuid.uuid4()), "day_index": 0, "name": "Push",
                         "exercises": _make_push(sets_n, reps_str, n)})
            days.append({"id": str(uuid.uuid4()), "day_index": 1, "name": "Pull",
                         "exercises": _make_pull(sets_n, reps_str, n)})
            days.append({"id": str(uuid.uuid4()), "day_index": 2, "name": "Legs",
                         "exercises": _make_legs(sets_n, reps_str, n)})
        else:
            n = _exercise_count(experience, "full_body")
            days.append({"id": str(uuid.uuid4()), "day_index": 0, "name": "Full Body A",
                         "exercises": _make_full_body(sets_n, reps_str, n)})
            days.append({"id": str(uuid.uuid4()), "day_index": 1, "name": "Full Body B",
                         "exercises": _make_full_body_b(sets_n, reps_str, n)})
            days.append({"id": str(uuid.uuid4()), "day_index": 2, "name": "Full Body C",
                         "exercises": _make_full_body_c(sets_n, reps_str, n)})
    elif days_per_week == 4:
        n = _exercise_count(experience, "split")
        days.append({"id": str(uuid.uuid4()), "day_index": 0, "name": "Upper A",
                     "exercises": _make_upper(sets_n, reps_str, n)})
        days.append({"id": str(uuid.uuid4()), "day_index": 1, "name": "Lower A",
                     "exercises": _make_lower(sets_n, reps_str, n)})
        days.append({"id": str(uuid.uuid4()), "day_index": 2, "name": "Upper B",
                     "exercises": _make_upper(sets_n, reps_str, n)})
        days.append({"id": str(uuid.uuid4()), "day_index": 3, "name": "Lower B",
                     "exercises": _make_lower(sets_n, reps_str, n)})
    elif days_per_week == 5:
        n = _exercise_count(experience, "split")
        days.append({"id": str(uuid.uuid4()), "day_index": 0, "name": "Push",
                     "exercises": _make_push(sets_n, reps_str, n)})
        days.append({"id": str(uuid.uuid4()), "day_index": 1, "name": "Pull",
                     "exercises": _make_pull(sets_n, reps_str, n)})
        days.append({"id": str(uuid.uuid4()), "day_index": 2, "name": "Legs",
                     "exercises": _make_legs(sets_n, reps_str, n)})
        days.append({"id": str(uuid.uuid4()), "day_index": 3, "name": "Upper",
                     "exercises": _make_upper(sets_n, reps_str, n)})
        days.append({"id": str(uuid.uuid4()), "day_index": 4, "name": "Lower",
                     "exercises": _make_lower(sets_n, reps_str, n)})
    else:  # 6
        n = _exercise_count(experience, "split")
        for i, name in enumerate(["Push A", "Pull A", "Legs A", "Push B", "Pull B", "Legs B"]):
            if "Push" in name:
                ex = _make_push(sets_n, reps_str, n)
            elif "Pull" in name:
                ex = _make_pull(sets_n, reps_str, n)
            else:
                ex = _make_legs(sets_n, reps_str, n)
            days.append({"id": str(uuid.uuid4()), "day_index": i, "name": name, "exercises": ex})

    return {
        "name": plan_name_map[days_per_week],
        "goal": goal,
        "experience_level": experience,
        "days_per_week": days_per_week,
        "days": days,
    }
