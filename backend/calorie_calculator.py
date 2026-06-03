"""MET-based workout calorie estimates.

Formula source:
Ainsworth BE, Haskell WL, Herrmann SD, et al. 2011 Compendium of Physical
Activities: A Second Update of Codes and MET Intensities.
DOI: 10.1249/MSS.0b013e31821ece12
"""
from typing import Iterable, Mapping


SECONDS_PER_REP = 3
REST_BETWEEN_SETS_SEC = 60
DEFAULT_MET_VALUE = 3.5


def _get_value(source: object, key: str, default=None):
    if isinstance(source, Mapping):
        return source.get(key, default)
    return getattr(source, key, default)


def _safe_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def estimate_set_duration_minutes(
    reps: int | float,
    seconds_per_rep: int = SECONDS_PER_REP,
    rest_seconds: int = REST_BETWEEN_SETS_SEC,
) -> float:
    """Estimate minutes spent on one set, including average rest time."""
    reps_n = max(0.0, _safe_float(reps))
    active_seconds = reps_n * seconds_per_rep
    return (active_seconds + rest_seconds) / 60


def estimate_exercise_duration(
    sets: int | Iterable[object],
    reps: int | float | None = None,
    seconds_per_rep: int = SECONDS_PER_REP,
    rest_seconds: int = REST_BETWEEN_SETS_SEC,
) -> float:
    """Estimate exercise duration in minutes from set count or logged sets."""
    if isinstance(sets, int):
        if reps is None:
            raise ValueError("reps is required when sets is an integer")
        return round(
            sets * estimate_set_duration_minutes(reps, seconds_per_rep, rest_seconds),
            2,
        )

    total = 0.0
    for set_row in sets:
        total += estimate_set_duration_minutes(
            _get_value(set_row, "reps", 0),
            seconds_per_rep,
            rest_seconds,
        )
    return round(total, 2)


def calculate_calories_from_duration(
    met_value: float,
    weight_kg: float,
    duration_minutes: float,
) -> float:
    """Calculate kcal using kcal = MET * 3.5 * kg * minutes / 200."""
    met = max(0.0, _safe_float(met_value, DEFAULT_MET_VALUE))
    weight = max(0.0, _safe_float(weight_kg))
    minutes = max(0.0, _safe_float(duration_minutes))
    return round((met * 3.5 * weight * minutes) / 200, 1)


def calculate_exercise_calories(
    met_value: float,
    weight_kg: float,
    sets: int | Iterable[object],
    reps: int | float | None = None,
) -> float:
    duration = estimate_exercise_duration(sets, reps)
    return calculate_calories_from_duration(met_value, weight_kg, duration)


def calculate_session_calories(
    exercises: Iterable[object],
    weight_kg: float,
) -> dict:
    """Return total kcal and per-exercise kcal estimates for a workout."""
    breakdown = []
    total = 0.0

    for exercise in exercises:
        sets = _get_value(exercise, "sets", [])
        kcal = calculate_exercise_calories(
            _get_value(exercise, "met_value", DEFAULT_MET_VALUE),
            weight_kg,
            sets,
        )
        total += kcal
        breakdown.append({
            "name": _get_value(exercise, "name", "Exercise"),
            "estimated_calories": kcal,
            "estimated_duration_minutes": estimate_exercise_duration(sets),
        })

    return {
        "estimated_calories": round(total, 1),
        "exercise_calories": breakdown,
    }
