"""Pydantic models and enums for FitFlow AI."""
from enum import Enum
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, EmailStr
import uuid


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def new_id() -> str:
    return str(uuid.uuid4())


# ============ Enums ============
class ActivityLevel(str, Enum):
    sedentary = "sedentary"
    lightly_active = "lightly_active"
    moderately_active = "moderately_active"
    very_active = "very_active"
    athlete = "athlete"


class FitnessGoal(str, Enum):
    lose_weight = "lose_weight"
    maintain_weight = "maintain_weight"
    gain_muscle = "gain_muscle"


class ExperienceLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"

class MuscleGroup(str, Enum):
    chest = "chest"
    back = "back"
    legs = "legs"
    shoulders = "shoulders"
    biceps = "biceps"
    triceps = "triceps"
    core = "core"


class MealSource(str, Enum):
    manual = "manual"
    ai_scan = "ai_scan"
    suggestion = "suggestion"


# ============ Auth ============
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=100)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    has_profile: bool = False


class AuthResponse(BaseModel):
    user: UserOut
    access_token: str
    refresh_token: str


# ============ Profile ============
class ProfileIn(BaseModel):
    age: int = Field(ge=13, le=100)
    gender: Optional[str] = None  # "male" | "female" | None
    weight: float = Field(gt=0, le=500)  # kg
    height: float = Field(gt=0, le=300)  # cm
    activity_level: ActivityLevel
    fitness_goal: FitnessGoal
    experience_level: ExperienceLevel
    training_days_per_week: int = Field(ge=1, le=6)


class ProfileOut(ProfileIn):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime


# ============ Nutrition Targets ============
class NutritionTargetOut(BaseModel):
    calories: int
    protein: int
    carbs: int
    fat: int


# ============ Workout Plan ============
class PlannedExerciseOut(BaseModel):
    id: str
    name: str
    primary_muscle_group: MuscleGroup
    secondary_muscle_groups: List[MuscleGroup] = []
    sets: int
    reps: str  # e.g., "8-12"
    equipment: str
    difficulty: str


class TrainingDayOut(BaseModel):
    id: str
    day_index: int
    name: str
    exercises: List[PlannedExerciseOut]


class WorkoutPlanOut(BaseModel):
    id: str
    user_id: str
    name: str
    goal: FitnessGoal
    experience_level: ExperienceLevel
    days_per_week: int
    days: List[TrainingDayOut]
    created_at: datetime


# ============ Workout Session Logging ============
class LoggedSetIn(BaseModel):
    set_number: int = Field(ge=1)
    reps: int = Field(ge=0)
    weight: float = Field(ge=0)
    rpe: Optional[float] = Field(default=None, ge=0, le=10)


class LoggedExerciseIn(BaseModel):
    name: str
    primary_muscle_group: MuscleGroup
    secondary_muscle_groups: List[MuscleGroup] = []
    exercise_id: Optional[str] = None
    sets: List[LoggedSetIn]


class WorkoutSessionIn(BaseModel):
    date: Optional[datetime] = None
    notes: Optional[str] = None
    exercises: List[LoggedExerciseIn]


class WorkoutSessionOut(BaseModel):
    id: str
    user_id: str
    date: datetime
    notes: Optional[str] = None
    exercises: List[dict]
    total_volume: float
    total_sets: int
    estimated_calories: Optional[float] = None
    exercise_calories: List[dict] = Field(default_factory=list)
    created_at: datetime


# ============ Exercise ============
class ExerciseOut(BaseModel):
    id: str
    name: str
    primary_muscle_group: MuscleGroup
    secondary_muscle_groups: List[MuscleGroup] = []
    equipment: str
    difficulty: str
    met_value: float = 3.5
    met_code: Optional[str] = None
    met_category: Optional[str] = None
    estimated_kcal_per_set: Optional[float] = None


# ============ Meal ============
class MealItemIn(BaseModel):
    name: str
    quantity: str = ""
    calories: float = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    confidence: Optional[float] = None


class MealIn(BaseModel):
    name: str
    date: Optional[datetime] = None
    image_b64: Optional[str] = None
    items: List[MealItemIn]
    source: MealSource = MealSource.manual


class MealOut(BaseModel):
    id: str
    user_id: str
    name: str
    date: datetime
    image_b64: Optional[str] = None
    calories: float
    protein: float
    carbs: float
    fat: float
    items: List[MealItemIn]
    source: MealSource
    created_at: datetime


# ============ AI ============
class ScanImageIn(BaseModel):
    image_base64: str  # data URL or raw base64

class DetectedIngredient(BaseModel):
    name: str
    category: str
    confidence: float

class SuggestedRecipe(BaseModel):
    title: str
    ingredientsUsed: List[str]
    difficulty: str
    calories: int  # <-- Aici forțăm Gemini să ne dea caloriile
    protein: int   # <-- și proteinele
    carbs: int     # <-- și carbohidrații
    fat: int       # <-- și grăsimile

class FridgeScanOut(BaseModel):
    detectedIngredients: List[DetectedIngredient]
    suggestedRecipes: List[SuggestedRecipe]
    disclaimer: str
class MealSuggestionIn(BaseModel):
    ingredients: Optional[List[str]] = None
    remaining_calories: Optional[int] = None
    remaining_protein: Optional[int] = None
    remaining_carbs: Optional[int] = None
    remaining_fat: Optional[int] = None

class SuggestedMeal(BaseModel):
    name: str
    description: str
    calories: int
    protein: int
    carbs: int
    fat: int

class MealPlan(BaseModel):
    suggestions: List[SuggestedMeal]

# ============ Streak / Goal ============
class WeeklyGoalIn(BaseModel):
    workouts_per_week: int = Field(ge=1, le=7)


class StreakOut(BaseModel):
    current_streak: int
    best_streak: int
    workouts_per_week: int
    week_workouts_completed: int
    week_progress_pct: float
    status: str  # on_track | completed | at_risk


# ============ Ranking ============
class MuscleRankingItem(BaseModel):
    muscle_group: MuscleGroup
    score: float
    level: str
    next_level: Optional[str]
    next_level_threshold: Optional[int]
    progress_pct: float
    top_exercises: List[str]
