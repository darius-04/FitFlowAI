"""Nutrition target calculation (Mifflin-St Jeor)."""
from typing import Dict


ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "lightly_active": 1.375,
    "moderately_active": 1.55,
    "very_active": 1.725,
    "athlete": 1.9,
}

GOAL_DELTA = {
    "lose_weight": -400,
    "maintain_weight": 0,
    "gain_muscle": 300,
}

PROTEIN_PER_KG = {
    "lose_weight": 2.0,
    "maintain_weight": 1.6,
    "gain_muscle": 1.8,
}


def calculate_bmr(weight: float, height: float, age: int, gender: str | None) -> float:
    """Mifflin-St Jeor."""
    if gender == "male":
        return 10 * weight + 6.25 * height - 5 * age + 5
    if gender == "female":
        return 10 * weight + 6.25 * height - 5 * age - 161
    return 10 * weight + 6.25 * height - 5 * age - 78


def calculate_tdee(bmr: float, activity_level: str) -> float:
    return bmr * ACTIVITY_MULTIPLIERS.get(activity_level, 1.2)


def calculate_calorie_target(tdee: float, goal: str) -> int:
    target = tdee + GOAL_DELTA.get(goal, 0)
    return max(int(round(target)), 1200)


def calculate_macros(calories: int, weight_kg: float, goal: str) -> Dict[str, int]:
    protein_g = round(PROTEIN_PER_KG.get(goal, 1.6) * weight_kg)
    fat_calories = calories * 0.25
    fat_g = round(fat_calories / 9)
    carb_calories = calories - (protein_g * 4) - (fat_g * 9)
    carbs_g = max(0, round(carb_calories / 4))
    return {"protein": protein_g, "fat": fat_g, "carbs": carbs_g}


def compute_nutrition_targets(profile: dict) -> dict:
    bmr = calculate_bmr(
        profile["weight"],
        profile["height"],
        profile["age"],
        profile.get("gender"),
    )
    tdee = calculate_tdee(bmr, profile["activity_level"])
    calories = calculate_calorie_target(tdee, profile["fitness_goal"])
    macros = calculate_macros(calories, profile["weight"], profile["fitness_goal"])
    return {
        "calories": calories,
        "protein": macros["protein"],
        "carbs": macros["carbs"],
        "fat": macros["fat"],
    }
