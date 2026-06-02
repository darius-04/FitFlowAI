import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from workout_generator import generate_workout_plan


def test_four_day_plan_generates_upper_lower_split():
    plan = generate_workout_plan("gain_muscle", "intermediate", 4)

    assert plan["name"] == "4-Day Upper/Lower Split"
    assert plan["days_per_week"] == 4
    assert [day["name"] for day in plan["days"]] == [
        "Upper A",
        "Lower A",
        "Upper B",
        "Lower B",
    ]


def test_experience_controls_set_count():
    beginner = generate_workout_plan("maintain_weight", "beginner", 3)
    advanced = generate_workout_plan("maintain_weight", "advanced", 3)

    assert beginner["days"][0]["exercises"][0]["sets"] == 3
    assert advanced["days"][0]["exercises"][0]["sets"] == 5


def test_days_per_week_is_clamped_to_supported_range():
    plan = generate_workout_plan("gain_muscle", "intermediate", 99)

    assert plan["days_per_week"] == 6
    assert len(plan["days"]) == 6
