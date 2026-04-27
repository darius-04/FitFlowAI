"""Muscle group ranking calculations."""
from datetime import datetime, timezone, timedelta
from typing import Dict, List


THRESHOLDS = {
    "chest":     [("Beginner", 0), ("Intermediate", 3000), ("Advanced", 8000), ("Elite", 15000)],
    "back":      [("Beginner", 0), ("Intermediate", 3500), ("Advanced", 9000), ("Elite", 17000)],
    "legs":      [("Beginner", 0), ("Intermediate", 5000), ("Advanced", 12000), ("Elite", 25000)],
    "shoulders": [("Beginner", 0), ("Intermediate", 2000), ("Advanced", 6000), ("Elite", 12000)],
    "biceps":    [("Beginner", 0), ("Intermediate", 1000), ("Advanced", 3000), ("Elite", 6000)],
    "triceps":   [("Beginner", 0), ("Intermediate", 1000), ("Advanced", 3000), ("Elite", 6000)],
    "core":      [("Beginner", 0), ("Intermediate", 1000), ("Advanced", 3000), ("Elite", 6000)],
}


def get_ranking_level(muscle_group: str, score: float) -> dict:
    levels = THRESHOLDS.get(muscle_group, THRESHOLDS["chest"])
    current = levels[0]
    next_l = None
    for i, (name, thr) in enumerate(levels):
        if score >= thr:
            current = (name, thr)
            next_l = levels[i + 1] if i + 1 < len(levels) else None
        else:
            break
    if next_l is None:
        progress_pct = 100.0
    else:
        span = next_l[1] - current[1]
        progress_pct = min(100.0, max(0.0, (score - current[1]) / span * 100.0)) if span > 0 else 0
    return {
        "level": current[0],
        "next_level": next_l[0] if next_l else None,
        "next_level_threshold": next_l[1] if next_l else None,
        "progress_pct": round(progress_pct, 1),
    }


async def calculate_muscle_rankings(db, user_id: str) -> List[dict]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    sessions = await db.workout_sessions.find({
        "user_id": user_id,
        "date": {"$gte": cutoff},
    }).to_list(1000)

    scores: Dict[str, float] = {m: 0.0 for m in THRESHOLDS.keys()}
    exercise_volumes: Dict[str, Dict[str, float]] = {m: {} for m in THRESHOLDS.keys()}

    for s in sessions:
        for ex in s.get("exercises", []):
            ex_volume = 0.0
            for st in ex.get("sets", []):
                ex_volume += float(st.get("reps", 0)) * float(st.get("weight", 0))
            primary = ex.get("primary_muscle_group")
            if primary in scores:
                scores[primary] += ex_volume
                exercise_volumes[primary][ex["name"]] = exercise_volumes[primary].get(ex["name"], 0) + ex_volume
            for sec in ex.get("secondary_muscle_groups", []) or []:
                if sec in scores:
                    scores[sec] += ex_volume * 0.5
                    exercise_volumes[sec][ex["name"]] = exercise_volumes[sec].get(ex["name"], 0) + ex_volume * 0.5

    out = []
    for muscle in THRESHOLDS.keys():
        score = scores[muscle]
        info = get_ranking_level(muscle, score)
        top_exercises = sorted(exercise_volumes[muscle].items(), key=lambda x: -x[1])[:3]
        out.append({
            "muscle_group": muscle,
            "score": round(score, 1),
            "level": info["level"],
            "next_level": info["next_level"],
            "next_level_threshold": info["next_level_threshold"],
            "progress_pct": info["progress_pct"],
            "top_exercises": [n for n, _ in top_exercises],
        })
    return out
