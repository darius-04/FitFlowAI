import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from nutrition import calculate_bmr, compute_nutrition_targets


def test_bmr_uses_mifflin_st_jeor_for_male():
    assert calculate_bmr(weight=78, height=180, age=22, gender="male") == 1800


def test_nutrition_targets_for_demo_profile_are_stable():
    profile = {
        "age": 22,
        "gender": "male",
        "weight": 78,
        "height": 180,
        "activity_level": "moderately_active",
        "fitness_goal": "gain_muscle",
    }

    targets = compute_nutrition_targets(profile)

    assert targets == {
        "calories": 3090,
        "protein": 140,
        "carbs": 439,
        "fat": 86,
    }


def test_calorie_target_never_goes_below_minimum():
    profile = {
        "age": 90,
        "gender": "female",
        "weight": 35,
        "height": 140,
        "activity_level": "sedentary",
        "fitness_goal": "lose_weight",
    }

    assert compute_nutrition_targets(profile)["calories"] == 1200
