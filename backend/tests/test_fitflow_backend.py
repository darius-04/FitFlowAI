"""FitFlow AI – comprehensive backend API tests.

Aligned with real Pydantic models in /app/backend/models.py:
  - ProfileIn: weight (kg), height (cm), fitness_goal, training_days_per_week
  - NutritionTargetOut: { calories, protein, carbs, fat }
  - WorkoutSessionIn.exercises[].name / primary_muscle_group / sets[].set_number/reps/weight
  - MealIn.items (not foods)
  - Email validator rejects reserved TLDs (.test/.example) — use a real-looking TLD.
"""
import uuid
import pytest


def _new_email(prefix="u"):
    return f"{prefix}_{uuid.uuid4().hex[:10]}@fitflowtest.co"


# ------------------------------------------------------------------
# Auth
# ------------------------------------------------------------------
class TestAuth:
    def test_register_new_user(self, api_client, api_url):
        email = _new_email("reg")
        r = api_client.post(f"{api_url}/auth/register",
                            json={"email": email, "password": "Passw0rd!", "name": "Reg User"})
        assert r.status_code in (200, 201), r.text
        d = r.json()
        assert d["user"]["email"] == email
        assert d["user"]["has_profile"] is False
        assert "access_token" in d and "refresh_token" in d

    def test_login_demo(self, api_client, api_url):
        r = api_client.post(f"{api_url}/auth/login",
                            json={"email": "demo@fitflow.ai", "password": "Demo1234"})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["user"]["email"] == "demo@fitflow.ai"
        assert d["user"]["has_profile"] is True

    def test_me_bearer(self, api_client, api_url, demo_auth):
        r = api_client.get(f"{api_url}/auth/me", headers=demo_auth)
        assert r.status_code == 200
        assert r.json()["email"] == "demo@fitflow.ai"

    def test_me_without_token(self, api_client, api_url):
        r = api_client.get(f"{api_url}/auth/me")
        assert r.status_code in (401, 403)

    def test_brute_force_lockout(self, api_client, api_url):
        email = _new_email("bf")
        api_client.post(f"{api_url}/auth/register",
                        json={"email": email, "password": "Correct#123", "name": "BF"})
        codes = []
        for _ in range(7):
            r = api_client.post(f"{api_url}/auth/login",
                                json={"email": email, "password": "wrongpass"})
            codes.append(r.status_code)
        assert 429 in codes, f"No 429 returned, codes={codes}"


# ------------------------------------------------------------------
# Profile + Nutrition
# ------------------------------------------------------------------
class TestProfile:
    def test_demo_profile(self, api_client, api_url, demo_auth):
        r = api_client.get(f"{api_url}/profile", headers=demo_auth)
        assert r.status_code == 200, r.text
        p = r.json()
        assert p["weight"] == 78
        assert p["height"] == 180

    def test_demo_nutrition_targets(self, api_client, api_url, demo_auth):
        r = api_client.get(f"{api_url}/nutrition/targets", headers=demo_auth)
        assert r.status_code == 200, r.text
        t = r.json()
        for k in ("calories", "protein", "carbs", "fat"):
            assert k in t and t[k] > 0
        # spec says 3090 kcal, 140 P, 439 C, 86 F for demo
        assert t["calories"] == 3090
        assert t["protein"] == 140

    def test_new_user_creates_profile(self, api_client, api_url, new_user):
        payload = {
            "age": 28, "gender": "male",
            "weight": 75, "height": 178,
            "activity_level": "moderately_active",
            "fitness_goal": "gain_muscle",
            "experience_level": "intermediate",
            "training_days_per_week": 4,
        }
        r = api_client.post(f"{api_url}/profile", json=payload, headers=new_user["headers"])
        assert r.status_code in (200, 201), r.text
        assert r.json()["age"] == 28

        r2 = api_client.get(f"{api_url}/profile", headers=new_user["headers"])
        assert r2.status_code == 200 and r2.json()["weight"] == 75

        r3 = api_client.get(f"{api_url}/nutrition/targets", headers=new_user["headers"])
        assert r3.status_code == 200 and r3.json()["calories"] > 1500


# ------------------------------------------------------------------
# Workout plan / exercises / sessions / progress
# ------------------------------------------------------------------
class TestWorkout:
    def test_workout_plan_demo(self, api_client, api_url, demo_auth):
        r = api_client.get(f"{api_url}/workout/plan", headers=demo_auth)
        assert r.status_code == 200
        plan = r.json()
        assert len(plan["days"]) == 4

    def test_plan_regenerate(self, api_client, api_url, demo_auth):
        r = api_client.post(f"{api_url}/workout/plan/regenerate", headers=demo_auth)
        assert r.status_code == 200
        assert len(r.json()["days"]) == 4

    def test_exercises_seeded(self, api_client, api_url, demo_auth):
        r = api_client.get(f"{api_url}/exercises", headers=demo_auth)
        assert r.status_code == 200
        ex = r.json()
        assert isinstance(ex, list) and len(ex) >= 30

    def test_log_session_and_progress(self, api_client, api_url, demo_auth):
        payload = {
            "notes": "TEST_ session",
            "exercises": [
                {
                    "name": "Bench Press",
                    "primary_muscle_group": "chest",
                    "sets": [
                        {"set_number": 1, "reps": 8, "weight": 60},
                        {"set_number": 2, "reps": 8, "weight": 65},
                        {"set_number": 3, "reps": 6, "weight": 70},
                    ],
                },
                {
                    "name": "Barbell Row",
                    "primary_muscle_group": "back",
                    "sets": [
                        {"set_number": 1, "reps": 10, "weight": 50},
                        {"set_number": 2, "reps": 10, "weight": 55},
                    ],
                },
            ],
        }
        r = api_client.post(f"{api_url}/workout/session", json=payload, headers=demo_auth)
        assert r.status_code in (200, 201), r.text
        sid = r.json()["id"]

        r2 = api_client.get(f"{api_url}/workout/sessions/{sid}", headers=demo_auth)
        assert r2.status_code == 200
        assert r2.json()["id"] == sid

        r3 = api_client.get(f"{api_url}/workout/sessions", headers=demo_auth)
        assert r3.status_code == 200
        assert any(s["id"] == sid for s in r3.json())

        r4 = api_client.get(f"{api_url}/workout/progress", headers=demo_auth)
        assert r4.status_code == 200, r4.text

        r5 = api_client.get(f"{api_url}/workout/progress",
                            params={"exercise_name": "Bench Press"}, headers=demo_auth)
        assert r5.status_code == 200, r5.text


# ------------------------------------------------------------------
# Streak + ranking
# ------------------------------------------------------------------
class TestStreakRanking:
    def test_streak(self, api_client, api_url, demo_auth):
        r = api_client.get(f"{api_url}/streak", headers=demo_auth)
        # Known issue: 500 when naive datetime stored in streaks.last_evaluated_week_start
        assert r.status_code == 200, f"Streak 500: {r.text}"
        d = r.json()
        assert "workouts_per_week" in d
        assert "current_streak" in d

    def test_set_goal(self, api_client, api_url, demo_auth):
        r = api_client.post(f"{api_url}/streak/goal",
                            json={"workouts_per_week": 5}, headers=demo_auth)
        assert r.status_code == 200, r.text
        api_client.post(f"{api_url}/streak/goal",
                        json={"workouts_per_week": 4}, headers=demo_auth)

    def test_ranking_shape(self, api_client, api_url, demo_auth):
        r = api_client.get(f"{api_url}/ranking", headers=demo_auth)
        assert r.status_code == 200, r.text
        data = r.json()
        items = data if isinstance(data, list) else data.get("items") or data.get("rankings")
        assert items and len(items) == 7
        groups = {x["muscle_group"] for x in items}
        assert {"chest", "back", "legs", "shoulders", "biceps", "triceps", "core"}.issubset(groups)
        for x in items:
            assert x["level"] in ("Beginner", "Intermediate", "Advanced", "Elite")


# ------------------------------------------------------------------
# Meals / Nutrition today
# ------------------------------------------------------------------
class TestMeals:
    def test_save_and_list_meal(self, api_client, api_url, demo_auth):
        payload = {
            "name": "TEST_ manual meal",
            "items": [
                {"name": "Chicken", "quantity": "200g", "calories": 330, "protein": 62, "carbs": 0, "fat": 7},
                {"name": "Rice", "quantity": "1 cup", "calories": 200, "protein": 4, "carbs": 45, "fat": 1},
            ],
            "source": "manual",
        }
        r = api_client.post(f"{api_url}/meals", json=payload, headers=demo_auth)
        assert r.status_code in (200, 201), r.text
        r2 = api_client.get(f"{api_url}/meals", headers=demo_auth)
        assert r2.status_code == 200
        assert any(m["name"] == "TEST_ manual meal" for m in r2.json())

    def test_nutrition_today(self, api_client, api_url, demo_auth):
        r = api_client.get(f"{api_url}/nutrition/today", headers=demo_auth)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("target", "consumed", "remaining", "meals"):
            assert k in d, f"missing key {k}: {list(d.keys())}"


# ------------------------------------------------------------------
# AI endpoints (real GPT-4o via Emergent LLM Key)
# ------------------------------------------------------------------
class TestAI:
    def test_scan_meal(self, api_client, api_url, demo_auth, meal_image_b64):
        r = api_client.post(f"{api_url}/ai/scan-meal",
                            json={"image_base64": meal_image_b64},
                            headers=demo_auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert ("detectedFoods" in d) or ("detected_foods" in d), d
        assert "disclaimer" in d

    def test_scan_fridge(self, api_client, api_url, demo_auth, fridge_image_b64):
        r = api_client.post(f"{api_url}/ai/scan-fridge",
                            json={"image_base64": fridge_image_b64},
                            headers=demo_auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert ("detectedIngredients" in d) or ("detected_ingredients" in d), d

    def test_meal_suggestions(self, api_client, api_url, demo_auth):
        r = api_client.post(f"{api_url}/ai/meal-suggestions",
                            json={"ingredients": ["eggs", "rice", "chicken"],
                                  "remaining_calories": 800, "remaining_protein": 50},
                            headers=demo_auth, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        suggestions = d.get("suggestions") or d.get("meals") or d
        assert isinstance(suggestions, (list, dict)) and len(suggestions) > 0


# ------------------------------------------------------------------
# Data isolation
# ------------------------------------------------------------------
class TestIsolation:
    def test_user_cannot_access_other_user_session(self, api_client, api_url, demo_auth, new_user):
        payload = {
            "exercises": [{
                "name": "Bench Press", "primary_muscle_group": "chest",
                "sets": [{"set_number": 1, "reps": 5, "weight": 60}],
            }],
        }
        r = api_client.post(f"{api_url}/workout/session", json=payload, headers=demo_auth)
        assert r.status_code in (200, 201), r.text
        sid = r.json()["id"]
        r2 = api_client.get(f"{api_url}/workout/sessions/{sid}", headers=new_user["headers"])
        assert r2.status_code in (403, 404), f"Isolation broken: {r2.status_code} {r2.text}"
