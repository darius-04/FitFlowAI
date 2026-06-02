import json
from pathlib import Path


CASES_DIR = Path(__file__).parent / "ai_cases"
UNSAFE_MEDICAL_PHRASES = [
    "guaranteed to cure",
    "medical treatment",
    "stop taking medication",
    "diagnose",
    "guaranteed weight loss",
]


def load_case(name: str) -> dict:
    return json.loads((CASES_DIR / name).read_text())


def assert_number(value, *, minimum=0, maximum=None):
    assert isinstance(value, (int, float)), f"{value!r} is not numeric"
    assert value >= minimum
    if maximum is not None:
        assert value <= maximum


def assert_safe_text(text: str):
    lowered = text.lower()
    for phrase in UNSAFE_MEDICAL_PHRASES:
        assert phrase not in lowered


def test_meal_scan_agent_contract():
    case = load_case("meal_scan_cases.json")
    output = case["mock_output"]

    assert "detectedFoods" in output
    assert output["detectedFoods"]
    assert "totalEstimate" in output
    assert "disclaimer" in output
    assert_safe_text(output["disclaimer"])

    total_calories = 0
    for food in output["detectedFoods"]:
        assert food["name"]
        assert food["estimatedQuantity"]
        assert_number(food["confidence"], minimum=0, maximum=1)
        assert_number(food["estimatedCalories"])
        assert_number(food["protein"])
        assert_number(food["carbs"])
        assert_number(food["fat"])
        total_calories += food["estimatedCalories"]

    assert abs(total_calories - output["totalEstimate"]["calories"]) <= case["tolerances"]["calories"]


def test_fridge_scan_agent_contract():
    case = load_case("fridge_scan_cases.json")
    output = case["mock_output"]

    assert output["detectedIngredients"]
    assert output["suggestedRecipes"]
    assert "disclaimer" in output
    assert_safe_text(output["disclaimer"])

    for ingredient in output["detectedIngredients"]:
        assert ingredient["name"]
        assert ingredient["category"]
        assert_number(ingredient["confidence"], minimum=0, maximum=1)

    for recipe in output["suggestedRecipes"]:
        assert recipe["title"]
        assert recipe["ingredientsUsed"]
        assert recipe["difficulty"]
        assert_number(recipe["calories"])
        assert_number(recipe["protein"])
        assert_number(recipe["carbs"])
        assert_number(recipe["fat"])


def test_meal_suggestions_agent_contract_and_macro_fit():
    case = load_case("meal_suggestions_cases.json")
    output = case["mock_output"]
    target = case["target"]
    tolerance = case["tolerance"]

    suggestions = output["suggestions"]
    assert len(suggestions) == 3

    totals = {"calories": 0, "protein": 0, "carbs": 0, "fat": 0}
    for meal in suggestions:
        assert meal["name"]
        assert meal["description"]
        assert_safe_text(meal["description"])
        for key in totals:
            assert_number(meal[key])
            totals[key] += meal[key]

    for key, expected in target.items():
        assert abs(totals[key] - expected) <= tolerance[key], (key, totals[key], expected)
