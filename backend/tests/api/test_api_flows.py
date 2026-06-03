import os
import sys
from copy import deepcopy
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "fitflow_test")
os.environ.setdefault("JWT_SECRET", "test-secret-with-at-least-32-bytes")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import server  # noqa: E402


class FakeResult:
    def __init__(self, deleted_count=0):
        self.deleted_count = deleted_count


class FakeCursor:
    def __init__(self, docs):
        self.docs = [deepcopy(doc) for doc in docs]

    def sort(self, key, direction):
        reverse = direction < 0
        self.docs.sort(key=lambda item: item.get(key), reverse=reverse)
        return self

    async def to_list(self, length):
        return self.docs[:length]


class FakeCollection:
    def __init__(self):
        self.docs = []

    async def create_index(self, *args, **kwargs):
        return None

    async def count_documents(self, query):
        return len([doc for doc in self.docs if self._matches(doc, query)])

    async def insert_one(self, doc):
        self.docs.append(deepcopy(doc))
        return FakeResult()

    async def find_one(self, query):
        for doc in self.docs:
            if self._matches(doc, query):
                return deepcopy(doc)
        return None

    def find(self, query=None, projection=None):
        query = query or {}
        return FakeCursor([doc for doc in self.docs if self._matches(doc, query)])

    async def update_one(self, query, update, upsert=False):
        for doc in self.docs:
            if self._matches(doc, query):
                self._apply_update(doc, update)
                return FakeResult()
        if upsert:
            doc = {key: value for key, value in query.items() if not isinstance(value, dict)}
            self._apply_update(doc, update)
            self.docs.append(doc)
        return FakeResult()

    async def delete_one(self, query):
        for index, doc in enumerate(self.docs):
            if self._matches(doc, query):
                self.docs.pop(index)
                return FakeResult(deleted_count=1)
        return FakeResult(deleted_count=0)

    async def delete_many(self, query):
        before = len(self.docs)
        self.docs = [doc for doc in self.docs if not self._matches(doc, query)]
        return FakeResult(deleted_count=before - len(self.docs))

    def _apply_update(self, doc, update):
        for key, value in update.get("$setOnInsert", {}).items():
            doc.setdefault(key, value)
        for key, value in update.get("$set", {}).items():
            doc[key] = value

    def _matches(self, doc, query):
        for key, expected in query.items():
            actual = doc.get(key)
            if isinstance(expected, dict):
                for op, value in expected.items():
                    if op == "$gte" and not (actual >= value):
                        return False
                    if op == "$gt" and not (actual > value):
                        return False
                    if op == "$lte" and not (actual <= value):
                        return False
                    if op == "$lt" and not (actual < value):
                        return False
            elif actual != expected:
                return False
        return True


class FakeDB:
    def __init__(self):
        self.users = FakeCollection()
        self.profiles = FakeCollection()
        self.workout_plans = FakeCollection()
        self.workout_sessions = FakeCollection()
        self.meals = FakeCollection()
        self.streaks = FakeCollection()
        self.weekly_goals = FakeCollection()
        self.nutrition_targets = FakeCollection()
        self.exercises = FakeCollection()
        self.login_attempts = FakeCollection()
        self.fridge_scans = FakeCollection()


class FakeClient:
    def close(self):
        return None


@pytest.fixture
def api_client(monkeypatch):
    fake_db = FakeDB()
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "client", FakeClient())
    with TestClient(server.app) as client:
        yield client


def register(client, email="api-user@fitflowtest.co"):
    response = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Passw0rd!", "name": "API User"},
    )
    assert response.status_code == 200, response.text
    return response.json()


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def create_profile(client, token):
    response = client.post(
        "/api/profile",
        headers=auth_headers(token),
        json={
            "age": 22,
            "gender": "male",
            "weight": 78,
            "height": 180,
            "activity_level": "moderately_active",
            "fitness_goal": "gain_muscle",
            "experience_level": "intermediate",
            "training_days_per_week": 4,
        },
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_auth_profile_nutrition_and_plan_flow(api_client):
    auth = register(api_client)
    token = auth["access_token"]

    me = api_client.get("/api/auth/me", headers=auth_headers(token))
    assert me.status_code == 200
    assert me.json()["has_profile"] is False

    profile = create_profile(api_client, token)
    assert profile["training_days_per_week"] == 4

    targets = api_client.get("/api/nutrition/targets", headers=auth_headers(token))
    assert targets.status_code == 200
    assert targets.json()["calories"] == 3090

    plan = api_client.get("/api/workout/plan", headers=auth_headers(token))
    assert plan.status_code == 200
    assert plan.json()["name"] == "4-Day Upper/Lower Split"

    exercises = api_client.get("/api/exercises?weight_kg=78")
    assert exercises.status_code == 200
    bench = next(item for item in exercises.json() if item["name"] == "Bench Press")
    assert bench["met_value"] == 6.0
    assert bench["met_code"] == "02050"
    assert bench["estimated_kcal_per_set"] == 11.5


def test_workout_session_updates_history_progress_and_ranking(api_client):
    auth = register(api_client, email="workout-user@fitflowtest.co")
    token = auth["access_token"]
    create_profile(api_client, token)

    session = api_client.post(
        "/api/workout/session",
        headers=auth_headers(token),
        json={
            "notes": "API flow workout",
            "exercises": [
                {
                    "name": "Bench Press",
                    "primary_muscle_group": "chest",
                    "secondary_muscle_groups": ["triceps", "shoulders"],
                    "sets": [
                        {"set_number": 1, "reps": 8, "weight": 60},
                        {"set_number": 2, "reps": 8, "weight": 65},
                    ],
                }
            ],
        },
    )
    assert session.status_code == 200, session.text
    body = session.json()
    assert body["total_volume"] == 1000
    assert body["total_sets"] == 2
    assert body["estimated_calories"] == 22.9
    assert body["exercise_calories"][0]["name"] == "Bench Press"
    assert body["exercise_calories"][0]["estimated_calories"] == 22.9
    assert body["exercises"][0]["met_value"] == 6.0
    assert body["exercises"][0]["estimated_calories"] == 22.9

    history = api_client.get("/api/workout/sessions", headers=auth_headers(token))
    assert history.status_code == 200
    assert len(history.json()) == 1
    assert history.json()[0]["estimated_calories"] == 22.9

    progress = api_client.get(
        "/api/workout/progress?exercise_name=Bench%20Press",
        headers=auth_headers(token),
    )
    assert progress.status_code == 200
    assert progress.json()["weekly"][0]["volume"] == 1000
    assert progress.json()["estimated_1rm"]

    ranking = api_client.get("/api/ranking", headers=auth_headers(token))
    assert ranking.status_code == 200
    chest = next(item for item in ranking.json() if item["muscle_group"] == "chest")
    assert chest["score"] == 1000
    assert "Bench Press" in chest["top_exercises"]


def test_meals_and_today_nutrition_flow(api_client):
    auth = register(api_client, email="meal-user@fitflowtest.co")
    token = auth["access_token"]
    create_profile(api_client, token)

    meal = api_client.post(
        "/api/meals",
        headers=auth_headers(token),
        json={
            "name": "API meal",
            "source": "manual",
            "items": [
                {
                    "name": "Chicken",
                    "quantity": "200g",
                    "calories": 330,
                    "protein": 62,
                    "carbs": 0,
                    "fat": 7,
                }
            ],
        },
    )
    assert meal.status_code == 200, meal.text
    meal_id = meal.json()["id"]

    today = api_client.get("/api/nutrition/today", headers=auth_headers(token))
    assert today.status_code == 200
    assert today.json()["consumed"]["calories"] == 330
    assert today.json()["meals"][0]["id"] == meal_id

    deleted = api_client.delete(f"/api/meals/{meal_id}", headers=auth_headers(token))
    assert deleted.status_code == 200

    meals = api_client.get("/api/meals", headers=auth_headers(token))
    assert meals.status_code == 200
    assert meals.json() == []


def test_ai_endpoints_use_mocked_services(api_client, monkeypatch):
    auth = register(api_client, email="ai-user@fitflowtest.co")
    token = auth["access_token"]
    create_profile(api_client, token)

    async def fake_scan_meal(image_base64):
        assert image_base64 == "fake-image"
        return {
            "detectedFoods": [
                {
                    "name": "Chicken",
                    "estimatedQuantity": "200g",
                    "confidence": 0.9,
                    "estimatedCalories": 330,
                    "protein": 62,
                    "carbs": 0,
                    "fat": 7,
                }
            ],
            "totalEstimate": {"calories": 330, "protein": 62, "carbs": 0, "fat": 7},
            "disclaimer": "Approximate estimate.",
        }

    async def fake_scan_fridge(image_base64):
        assert image_base64 == "fake-image"
        return {
            "detectedIngredients": [
                {"name": "Eggs", "category": "protein", "confidence": 0.95}
            ],
            "suggestedRecipes": [
                {
                    "title": "Egg bowl",
                    "ingredientsUsed": ["Eggs"],
                    "difficulty": "easy",
                    "calories": 300,
                    "protein": 20,
                    "carbs": 10,
                    "fat": 18,
                }
            ],
            "disclaimer": "General suggestion.",
        }

    async def fake_suggestions(**kwargs):
        assert kwargs["remaining_calories"] == 3090
        return {
            "suggestions": [
                {
                    "name": "Meal 1",
                    "description": "Balanced meal.",
                    "calories": 1000,
                    "protein": 45,
                    "carbs": 140,
                    "fat": 28,
                },
                {
                    "name": "Meal 2",
                    "description": "Balanced meal.",
                    "calories": 1000,
                    "protein": 45,
                    "carbs": 140,
                    "fat": 28,
                },
                {
                    "name": "Meal 3",
                    "description": "Balanced meal.",
                    "calories": 1090,
                    "protein": 50,
                    "carbs": 159,
                    "fat": 30,
                },
            ]
        }

    monkeypatch.setattr(server, "scan_meal_image", fake_scan_meal)
    monkeypatch.setattr(server, "scan_fridge_image", fake_scan_fridge)
    monkeypatch.setattr(server, "generate_meal_suggestions", fake_suggestions)

    meal_scan = api_client.post(
        "/api/ai/scan-meal",
        headers=auth_headers(token),
        json={"image_base64": "fake-image"},
    )
    assert meal_scan.status_code == 200
    assert meal_scan.json()["detectedFoods"][0]["name"] == "Chicken"

    fridge_scan = api_client.post(
        "/api/ai/scan-fridge",
        headers=auth_headers(token),
        json={"image_base64": "fake-image"},
    )
    assert fridge_scan.status_code == 200
    assert fridge_scan.json()["detectedIngredients"][0]["name"] == "Eggs"

    suggestions = api_client.post(
        "/api/ai/meal-suggestions",
        headers=auth_headers(token),
        json={"ingredients": ["eggs"]},
    )
    assert suggestions.status_code == 200
    assert len(suggestions.json()["suggestions"]) == 3
