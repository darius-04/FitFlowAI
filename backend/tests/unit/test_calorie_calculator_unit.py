import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from calorie_calculator import (
    calculate_calories_from_duration,
    calculate_exercise_calories,
    calculate_session_calories,
    estimate_exercise_duration,
)


def test_estimates_duration_from_set_count_and_reps():
    assert estimate_exercise_duration(sets=4, reps=8) == 5.6


def test_calculates_exercise_calories_from_compendium_formula():
    calories = calculate_exercise_calories(
        met_value=6.0,
        weight_kg=78,
        sets=4,
        reps=8,
    )

    assert calories == 45.9


def test_calculates_calories_from_duration():
    assert calculate_calories_from_duration(6.0, 78, 5.6) == 45.9


def test_session_calories_returns_total_and_breakdown():
    session = calculate_session_calories(
        exercises=[
            {
                "name": "Bench Press",
                "met_value": 6.0,
                "sets": [
                    {"set_number": 1, "reps": 8, "weight": 60, "rpe": 7},
                    {"set_number": 2, "reps": 8, "weight": 65, "rpe": 8},
                ],
            },
            {
                "name": "Squat",
                "met_value": 5.0,
                "sets": [
                    {"set_number": 1, "reps": 5, "weight": 80, "rpe": 8},
                ],
            },
        ],
        weight_kg=78,
    )

    assert session["estimated_calories"] == 31.4
    assert session["exercise_calories"] == [
        {
            "name": "Bench Press",
            "estimated_calories": 22.9,
            "estimated_duration_minutes": 2.8,
        },
        {
            "name": "Squat",
            "estimated_calories": 8.5,
            "estimated_duration_minutes": 1.25,
        },
    ]
