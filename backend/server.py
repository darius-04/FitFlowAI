"""FitFlow AI - Main FastAPI application."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import contextlib
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from models import (
    RegisterIn, LoginIn, UserOut, AuthResponse,
    ProfileIn, ProfileOut, NutritionTargetOut,
    WorkoutSessionIn, WorkoutSessionOut, WorkoutPlanOut, ExerciseOut,
    MealIn, MealOut, ScanImageIn, MealSuggestionIn,
    WeeklyGoalIn, StreakOut, MuscleRankingItem,
    new_id, utcnow,
)
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    decode_token, get_current_user as _get_user,
)
from nutrition import compute_nutrition_targets
from workout_generator import generate_workout_plan
from seed_data import EXERCISES
from streak_utils import (
    get_current_week_range, count_workouts_in_range,
    update_weekly_streak, get_weekly_progress,
)
from muscle_ranking import calculate_muscle_rankings
from ai_services import scan_meal_image, scan_fridge_image, generate_meal_suggestions

# ============ Logging ============
logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ============ DB ============
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url, tz_aware=True)
db = client[os.environ["DB_NAME"]]
# ============ App ============

@contextlib.asynccontextmanager
async def lifespan(app: FastAPI):
    # ============ STARTUP (Codul de la linia 612) ============
    # Creare Indexuri
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.profiles.create_index("user_id", unique=True)
    await db.workout_plans.create_index("user_id")
    await db.workout_sessions.create_index([("user_id", 1), ("date", -1)])
    await db.meals.create_index([("user_id", 1), ("date", -1)])
    await db.streaks.create_index("user_id", unique=True)
    await db.weekly_goals.create_index("user_id", unique=True)
    await db.nutrition_targets.create_index("user_id", unique=True)
    await db.exercises.create_index("name", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.login_attempts.create_index("last_attempt", expireAfterSeconds=3600)

    # Seed exercises if empty
    count = await db.exercises.count_documents({})
    if count == 0:
        for e in EXERCISES:
            doc = {"id": new_id(), **e, "created_at": utcnow()}
            try:
                await db.exercises.insert_one(doc)
            except Exception as ex:
                logger.warning("Seed insert skipped: %s", ex)
        logger.info("Seeded %d exercises", len(EXERCISES))


    for e in EXERCISES:
        await db.exercises.update_one(
            {"name": e["name"]},
            {"$set": {
                "met_value": e["met_value"],
                "met_code": e["met_code"],
                "met_category": e["met_category"],
            }},
        )
    yield  # Aici serverul rulează și acceptă cereri

    # ============ SHUTDOWN (Codul de la linia 640) ============
    client.close()
    logger.info("MongoDB connection closed.")

app = FastAPI(title="FitFlow AI", lifespan=lifespan)
api = APIRouter(prefix="/api")


async def get_current_user(request: Request) -> dict:
    return await _get_user(request, db)


# ============ Helpers ============
def _doc_clean(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


async def _user_has_profile(user_id: str) -> bool:
    p = await db.profiles.find_one({"user_id": user_id})
    return p is not None


async def _build_user_out(user: dict) -> UserOut:
    has_profile = await _user_has_profile(user["id"])
    return UserOut(
        id=user["id"], email=user["email"], name=user["name"], has_profile=has_profile,
    )


# ============ Auth Endpoints ============
@api.post("/auth/register", response_model=AuthResponse)
async def register(payload: RegisterIn):
    email = payload.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": new_id(),
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "created_at": utcnow(),
    }
    await db.users.insert_one(dict(user))
    user_out = await _build_user_out(user)
    return AuthResponse(
        user=user_out,
        access_token=create_access_token(user["id"], email),
        refresh_token=create_refresh_token(user["id"]),
    )


@api.post("/auth/login", response_model=AuthResponse)
async def login(payload: LoginIn, request: Request):
    email = payload.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    # Brute force protection
    attempt_doc = await db.login_attempts.find_one({"identifier": identifier})
    if attempt_doc and attempt_doc.get("locked_until"):
        locked_until = attempt_doc["locked_until"]
        if locked_until.tzinfo is None:
            locked_until = locked_until.replace(tzinfo=timezone.utc)
        if locked_until > utcnow():
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        # Increment attempts
        new_count = (attempt_doc or {}).get("count", 0) + 1
        update = {"$set": {"identifier": identifier, "count": new_count, "last_attempt": utcnow()}}
        if new_count >= 5:
            update["$set"]["locked_until"] = utcnow() + timedelta(minutes=15)
            update["$set"]["count"] = 0
        await db.login_attempts.update_one({"identifier": identifier}, update, upsert=True)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Clear attempts
    await db.login_attempts.delete_one({"identifier": identifier})

    user_out = await _build_user_out(user)
    return AuthResponse(
        user=user_out,
        access_token=create_access_token(user["id"], email),
        refresh_token=create_refresh_token(user["id"]),
    )


@api.post("/auth/logout")
async def logout():
    return {"ok": True}


@api.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return await _build_user_out(user)


@api.post("/auth/refresh")
async def refresh(payload: dict):
    rt = payload.get("refresh_token", "")
    try:
        data = decode_token(rt)
        if data.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        u = await db.users.find_one({"id": data["sub"]})
        if not u:
            raise HTTPException(status_code=401, detail="User not found")
        return {"access_token": create_access_token(u["id"], u["email"])}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


# ============ Profile / Nutrition Targets ============
async def _ensure_nutrition_target(user_id: str, profile: dict) -> dict:
    targets = compute_nutrition_targets(profile)
    doc = {
        "user_id": user_id,
        "calories": targets["calories"],
        "protein": targets["protein"],
        "carbs": targets["carbs"],
        "fat": targets["fat"],
        "updated_at": utcnow(),
    }
    await db.nutrition_targets.update_one(
        {"user_id": user_id},
        {"$set": doc, "$setOnInsert": {"created_at": utcnow()}},
        upsert=True,
    )
    return doc


async def _ensure_workout_plan(user_id: str, profile: dict) -> dict:
    plan = generate_workout_plan(
        profile["fitness_goal"], profile["experience_level"], profile["training_days_per_week"],
    )
    plan_doc = {
        "id": new_id(),
        "user_id": user_id,
        "name": plan["name"],
        "goal": plan["goal"],
        "experience_level": plan["experience_level"],
        "days_per_week": plan["days_per_week"],
        "days": plan["days"],
        "created_at": utcnow(),
    }
    # Replace existing
    await db.workout_plans.delete_many({"user_id": user_id})
    await db.workout_plans.insert_one(dict(plan_doc))
    plan_doc.pop("_id", None)
    return plan_doc


@api.post("/profile", response_model=ProfileOut)
async def create_or_update_profile(payload: ProfileIn, user: dict = Depends(get_current_user)):
    now = utcnow()
    profile = {
        "id": new_id(),
        "user_id": user["id"],
        "age": payload.age,
        "gender": payload.gender,
        "weight": payload.weight,
        "height": payload.height,
        "activity_level": payload.activity_level.value,
        "fitness_goal": payload.fitness_goal.value,
        "experience_level": payload.experience_level.value,
        "training_days_per_week": payload.training_days_per_week,
        "updated_at": now,
    }
    existing = await db.profiles.find_one({"user_id": user["id"]})
    if existing:
        profile["id"] = existing["id"]
        profile["created_at"] = existing.get("created_at", now)
        await db.profiles.update_one(
            {"user_id": user["id"]},
            {"$set": {k: v for k, v in profile.items() if k != "id"}},
        )
    else:
        profile["created_at"] = now
        await db.profiles.insert_one(dict(profile))

    # Generate nutrition targets and workout plan
    await _ensure_nutrition_target(user["id"], profile)
    await _ensure_workout_plan(user["id"], profile)

    # Default weekly goal
    await db.weekly_goals.update_one(
        {"user_id": user["id"]},
        {"$set": {"workouts_per_week": payload.training_days_per_week, "updated_at": now},
         "$setOnInsert": {"created_at": now, "user_id": user["id"]}},
        upsert=True,
    )
    profile.pop("_id", None)
    return ProfileOut(**profile)


@api.get("/profile", response_model=ProfileOut)
async def get_profile(user: dict = Depends(get_current_user)):
    p = await db.profiles.find_one({"user_id": user["id"]})
    if not p:
        raise HTTPException(status_code=404, detail="Profile not found")
    p.pop("_id", None)
    return ProfileOut(**p)


@api.get("/nutrition/targets", response_model=NutritionTargetOut)
async def get_nutrition_targets(user: dict = Depends(get_current_user)):
    t = await db.nutrition_targets.find_one({"user_id": user["id"]})
    if not t:
        raise HTTPException(status_code=404, detail="Nutrition targets not found")
    return NutritionTargetOut(
        calories=t["calories"], protein=t["protein"], carbs=t["carbs"], fat=t["fat"],
    )


# ============ Exercises ============
@api.get("/exercises", response_model=List[ExerciseOut])
async def list_exercises():
    items = await db.exercises.find({}, {"_id": 0}).to_list(500)
    return [ExerciseOut(**i) for i in items]


# ============ Workout Plan ============
@api.get("/workout/plan", response_model=WorkoutPlanOut)
async def get_workout_plan(user: dict = Depends(get_current_user)):
    plan = await db.workout_plans.find_one({"user_id": user["id"]})
    if not plan:
        raise HTTPException(status_code=404, detail="No workout plan. Complete onboarding first.")
    plan.pop("_id", None)
    return WorkoutPlanOut(**plan)


@api.post("/workout/plan/regenerate", response_model=WorkoutPlanOut)
async def regenerate_workout_plan(user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": user["id"]})
    if not profile:
        raise HTTPException(status_code=400, detail="Profile required")
    new_plan = await _ensure_workout_plan(user["id"], profile)
    return WorkoutPlanOut(**new_plan)


# ============ Workout Sessions ============
def _calc_session_volume(session: dict) -> tuple[float, int]:
    total_volume = 0.0
    total_sets = 0
    for ex in session.get("exercises", []):
        for st in ex.get("sets", []):
            total_volume += float(st.get("reps", 0)) * float(st.get("weight", 0))
            total_sets += 1
    return total_volume, total_sets


@api.post("/workout/session", response_model=WorkoutSessionOut)
async def create_workout_session(payload: WorkoutSessionIn, user: dict = Depends(get_current_user)):
    if not payload.exercises:
        raise HTTPException(status_code=400, detail="At least one exercise required")
    session = {
        "id": new_id(),
        "user_id": user["id"],
        "date": payload.date or utcnow(),
        "notes": payload.notes,
        "exercises": [
            {
                "id": new_id(),
                "exercise_id": ex.exercise_id,
                "name": ex.name,
                "primary_muscle_group": ex.primary_muscle_group.value,
                "secondary_muscle_groups": [s.value for s in ex.secondary_muscle_groups],
                "sets": [s.dict() for s in ex.sets],
            }
            for ex in payload.exercises
        ],
        "created_at": utcnow(),
    }
    total_volume, total_sets = _calc_session_volume(session)
    session["total_volume"] = total_volume
    session["total_sets"] = total_sets
    await db.workout_sessions.insert_one(dict(session))

    # Update streak after logging
    await update_weekly_streak(db, user["id"])

    session.pop("_id", None)
    return WorkoutSessionOut(**session)


@api.get("/workout/sessions", response_model=List[WorkoutSessionOut])
async def list_workout_sessions(user: dict = Depends(get_current_user), limit: int = 50):
    items = await db.workout_sessions.find({"user_id": user["id"]}).sort("date", -1).to_list(limit)
    out = []
    for it in items:
        it.pop("_id", None)
        if "total_volume" not in it:
            tv, ts = _calc_session_volume(it)
            it["total_volume"] = tv
            it["total_sets"] = ts
        out.append(WorkoutSessionOut(**it))
    return out


@api.get("/workout/sessions/{session_id}", response_model=WorkoutSessionOut)
async def get_workout_session(session_id: str, user: dict = Depends(get_current_user)):
    s = await db.workout_sessions.find_one({"id": session_id, "user_id": user["id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Session not found")
    s.pop("_id", None)
    if "total_volume" not in s:
        tv, ts = _calc_session_volume(s)
        s["total_volume"] = tv
        s["total_sets"] = ts
    return WorkoutSessionOut(**s)


@api.delete("/workout/sessions/{session_id}")
async def delete_workout_session(session_id: str, user: dict = Depends(get_current_user)):
    res = await db.workout_sessions.delete_one({"id": session_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"ok": True}


@api.get("/workout/progress")
async def workout_progress(user: dict = Depends(get_current_user), exercise_name: Optional[str] = None):
    """Return weekly aggregates and (optionally) per-exercise 1RM progression."""
    cutoff = utcnow() - timedelta(days=84)  # last 12 weeks
    sessions = await db.workout_sessions.find(
        {"user_id": user["id"], "date": {"$gte": cutoff}}
    ).sort("date", 1).to_list(500)

    # Group by week (ISO week start Monday)
    week_map = {}  # week_start_iso -> {workouts, volume}
    for s in sessions:
        d = s["date"]
        if isinstance(d, str):
            d = datetime.fromisoformat(d.replace("Z", "+00:00"))
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        week_start = (d - timedelta(days=d.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
        key = week_start.date().isoformat()
        entry = week_map.setdefault(key, {"week_start": key, "workouts": 0, "volume": 0.0})
        entry["workouts"] += 1
        tv = s.get("total_volume")
        if tv is None:
            tv, _ = _calc_session_volume(s)
        entry["volume"] += tv

    weekly = sorted(week_map.values(), key=lambda x: x["week_start"])

    # 1RM progression
    one_rm = []
    if exercise_name:
        for s in sessions:
            best = 0.0
            for ex in s.get("exercises", []):
                if ex["name"].lower() == exercise_name.lower():
                    for st in ex.get("sets", []):
                        weight = float(st.get("weight", 0))
                        reps = int(st.get("reps", 0))
                        if weight > 0 and reps > 0:
                            est = weight * (1 + reps / 30)
                            if est > best:
                                best = est
            if best > 0:
                d = s["date"]
                if isinstance(d, str):
                    d = datetime.fromisoformat(d.replace("Z", "+00:00"))
                one_rm.append({"date": d.isoformat(), "estimated_1rm": round(best, 1)})

    return {"weekly": weekly, "estimated_1rm": one_rm}


# ============ Streak / Goal ============
@api.post("/streak/goal")
async def set_weekly_goal(payload: WeeklyGoalIn, user: dict = Depends(get_current_user)):
    now = utcnow()
    await db.weekly_goals.update_one(
        {"user_id": user["id"]},
        {"$set": {"workouts_per_week": payload.workouts_per_week, "updated_at": now},
         "$setOnInsert": {"created_at": now, "user_id": user["id"]}},
        upsert=True,
    )
    return {"ok": True, "workouts_per_week": payload.workouts_per_week}


@api.get("/streak", response_model=StreakOut)
async def get_streak(user: dict = Depends(get_current_user)):
    streak = await update_weekly_streak(db, user["id"])
    progress = await get_weekly_progress(db, user["id"])
    return StreakOut(
        current_streak=streak.get("current_streak", 0),
        best_streak=streak.get("best_streak", 0),
        workouts_per_week=progress["workouts_per_week"],
        week_workouts_completed=progress["week_workouts_completed"],
        week_progress_pct=progress["week_progress_pct"],
        status=progress["status"],
    )


# ============ Meals / Nutrition ============
@api.post("/meals", response_model=MealOut)
async def save_meal(payload: MealIn, user: dict = Depends(get_current_user)):
    cals = sum(i.calories for i in payload.items)
    protein = sum(i.protein for i in payload.items)
    carbs = sum(i.carbs for i in payload.items)
    fat = sum(i.fat for i in payload.items)
    meal = {
        "id": new_id(),
        "user_id": user["id"],
        "name": payload.name,
        "date": payload.date or utcnow(),
        "image_b64": payload.image_b64,
        "calories": cals,
        "protein": protein,
        "carbs": carbs,
        "fat": fat,
        "items": [i.dict() for i in payload.items],
        "source": payload.source.value,
        "created_at": utcnow(),
    }
    await db.meals.insert_one(dict(meal))
    meal.pop("_id", None)
    return MealOut(**meal)


@api.get("/meals", response_model=List[MealOut])
async def list_meals(user: dict = Depends(get_current_user), days: int = 7):
    cutoff = utcnow() - timedelta(days=days)
    items = await db.meals.find(
        {"user_id": user["id"], "date": {"$gte": cutoff}}
    ).sort("date", -1).to_list(200)
    out = []
    for it in items:
        it.pop("_id", None)
        out.append(MealOut(**it))
    return out


@api.get("/meals/{meal_id}", response_model=MealOut)
async def get_meal(meal_id: str, user: dict = Depends(get_current_user)):
    m = await db.meals.find_one({"id": meal_id, "user_id": user["id"]})
    if not m:
        raise HTTPException(status_code=404, detail="Meal not found")
    m.pop("_id", None)
    return MealOut(**m)


@api.delete("/meals/{meal_id}")
async def delete_meal(meal_id: str, user: dict = Depends(get_current_user)):
    res = await db.meals.delete_one({"id": meal_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Meal not found")
    return {"ok": True}


@api.get("/nutrition/today")
async def today_nutrition(user: dict = Depends(get_current_user)):
    target = await db.nutrition_targets.find_one({"user_id": user["id"]})
    if not target:
        raise HTTPException(status_code=400, detail="No targets. Complete onboarding.")
    target.pop("_id", None)

    now = utcnow()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    meals = await db.meals.find(
        {"user_id": user["id"], "date": {"$gte": start, "$lt": end}}
    ).sort("date", -1).to_list(100)
    consumed = {"calories": 0.0, "protein": 0.0, "carbs": 0.0, "fat": 0.0}
    out_meals = []
    for m in meals:
        m.pop("_id", None)
        consumed["calories"] += m.get("calories", 0)
        consumed["protein"] += m.get("protein", 0)
        consumed["carbs"] += m.get("carbs", 0)
        consumed["fat"] += m.get("fat", 0)
        out_meals.append(m)

    remaining = {
        "calories": max(0, target["calories"] - consumed["calories"]),
        "protein": max(0, target["protein"] - consumed["protein"]),
        "carbs": max(0, target["carbs"] - consumed["carbs"]),
        "fat": max(0, target["fat"] - consumed["fat"]),
    }
    return {
        "target": {"calories": target["calories"], "protein": target["protein"],
                   "carbs": target["carbs"], "fat": target["fat"]},
        "consumed": {k: round(v, 1) for k, v in consumed.items()},
        "remaining": {k: round(v, 1) for k, v in remaining.items()},
        "meals": out_meals,
    }


# ============ AI Endpoints ============
@api.post("/ai/scan-meal")
async def ai_scan_meal(payload: ScanImageIn, user: dict = Depends(get_current_user)):
    if not payload.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 required")
    result = await scan_meal_image(payload.image_base64)
    return result


@api.post("/ai/scan-fridge")
async def ai_scan_fridge(payload: ScanImageIn, user: dict = Depends(get_current_user)):
    if not payload.image_base64:
        raise HTTPException(status_code=400, detail="image_base64 required")
    result = await scan_fridge_image(payload.image_base64)
    # Save fridge scan record (without huge image to keep it light: store small marker)
    await db.fridge_scans.insert_one({
        "id": new_id(),
        "user_id": user["id"],
        "items": result.get("detectedIngredients", []),
        "created_at": utcnow(),
    })
    return result


@api.post("/ai/meal-suggestions")
async def ai_meal_suggestions(payload: MealSuggestionIn, user: dict = Depends(get_current_user)):
    # 1. Luăm țintele totale din DB
    target = await db.nutrition_targets.find_one({"user_id": user["id"]})

    if not target:
        raise HTTPException(status_code=400, detail="Nu s-au găsit ținte nutriționale.")

    target_cals = int(target.get("calories", 2000))
    target_prot = int(target.get("protein", 150))
    target_carbs = int(target.get("carbs", 200))
    target_fat = int(target.get("fat", 65))

    # 2. Căutăm toate mesele mâncate AZI de utilizator
    now = utcnow()
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    meals_today = await db.meals.find(
        {"user_id": user["id"], "date": {"$gte": start, "$lt": end}}
    ).to_list(100)

    # Adunăm tot ce s-a consumat
    consumed_cals = sum(m.get("calories", 0) for m in meals_today)
    consumed_prot = sum(m.get("protein", 0) for m in meals_today)
    consumed_carbs = sum(m.get("carbs", 0) for m in meals_today)
    consumed_fat = sum(m.get("fat", 0) for m in meals_today)

    # 3. Calculăm RĂMAS (Remaining) - folosim max(0, ...) ca să nu dea cu minus dacă ai depășit
    rem_cals = max(0, int(target_cals - consumed_cals))
    rem_prot = max(0, int(target_prot - consumed_prot))
    rem_carbs = max(0, int(target_carbs - consumed_carbs))
    rem_fat = max(0, int(target_fat - consumed_fat))

    print(f"DEBUG BACKEND: Total: {target_cals} | Consumat: {consumed_cals} | RĂMAS pt AI: {rem_cals} kcal")

    # 4. Apelăm AI-ul cu ce a RĂMAS
    result = await generate_meal_suggestions(
        remaining_calories=rem_cals,
        remaining_protein=rem_prot,
        remaining_carbs=rem_carbs,
        remaining_fat=rem_fat,
        ingredients=payload.ingredients
    )
    return result


# ============ Muscle Ranking ============
@api.get("/ranking", response_model=List[MuscleRankingItem])
async def get_ranking(user: dict = Depends(get_current_user)):
    items = await calculate_muscle_rankings(db, user["id"])
    return items


# ============ Health / Root ============
@api.get("/")
async def root():
    return {"app": "FitFlow AI", "version": "1.0", "ok": True}


# ============ Mount ============

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api)

if __name__ == "__main__":
    import uvicorn
    # "server:app" înseamnă: caută în fișierul server.py variabila numită app
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
