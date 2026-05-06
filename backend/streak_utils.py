"""Weekly streak utilities."""
from datetime import datetime, timezone, timedelta
from typing import Tuple


def get_current_week_range(now: datetime | None = None) -> Tuple[datetime, datetime]:
    """Returns (week_start_monday_00:00, week_end_sunday_23:59:59) in UTC."""
    if now is None:
        now = datetime.now(timezone.utc)
    # Monday is weekday 0
    weekday = now.weekday()
    monday = (now - timedelta(days=weekday)).replace(hour=0, minute=0, second=0, microsecond=0)
    sunday_end = monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
    return monday, sunday_end


def get_previous_week_range(now: datetime | None = None) -> Tuple[datetime, datetime]:
    if now is None:
        now = datetime.now(timezone.utc)
    monday, _ = get_current_week_range(now)
    prev_monday = monday - timedelta(days=7)
    prev_sunday_end = prev_monday + timedelta(days=6, hours=23, minutes=59, seconds=59)
    return prev_monday, prev_sunday_end


async def count_workouts_in_range(db, user_id: str, start: datetime, end: datetime) -> int:
    return await db.workout_sessions.count_documents({
        "user_id": user_id,
        "date": {"$gte": start, "$lte": end},
    })


async def update_weekly_streak(db, user_id: str) -> dict:
    streak = await db.streaks.find_one({"user_id": user_id})
    if not streak:
        streak = {
            "user_id": user_id,
            "current_streak": 0,
            "best_streak": 0,
            "last_evaluated_week_start": None,
            "last_won_week_start": None, # Adăugăm acest câmp
        }
        await db.streaks.insert_one(dict(streak))

    goal_doc = await db.weekly_goals.find_one({"user_id": user_id})
    target = goal_doc["workouts_per_week"] if goal_doc else 3

    cur_start, cur_end = get_current_week_range()
    prev_start, prev_end = get_previous_week_range()

    # --- 1. LOGICA PENTRU REZOLVARE RETROSPECTIVĂ (Săptămâna trecută) ---
    last_eval = streak.get("last_evaluated_week_start")
    if last_eval is None or last_eval < prev_start:
        # Dacă săptămâna trecută nu a fost "câștigată" în timp real, verificăm acum
        last_won = streak.get("last_won_week_start")
        if last_won != prev_start:
            prev_count = await count_workouts_in_range(db, user_id, prev_start, prev_end)
            if prev_count < target and streak.get("current_streak", 0) > 0:
                streak["current_streak"] = 0 # Resetăm dacă a pierdut săptămâna trecută

        streak["last_evaluated_week_start"] = prev_start
        await db.streaks.update_one({"user_id": user_id}, {"$set": streak})

    # --- 2. LOGICA PENTRU TIMP REAL (Săptămâna curentă) ---
    last_won = streak.get("last_won_week_start")
    # Dacă nu am câștigat deja săptămâna asta...
    if last_won != cur_start:
        cur_count = await count_workouts_in_range(db, user_id, cur_start, cur_end)
        if cur_count >= target:
            # BINGO! A atins pragul chiar ACUM
            streak["current_streak"] = streak.get("current_streak", 0) + 1
            streak["best_streak"] = max(streak.get("best_streak", 0), streak["current_streak"])
            streak["last_won_week_start"] = cur_start

            await db.streaks.update_one(
                {"user_id": user_id},
                {"$set": {
                    "current_streak": streak["current_streak"],
                    "best_streak": streak["best_streak"],
                    "last_won_week_start": cur_start
                }}
            )

    return streak


async def get_weekly_progress(db, user_id: str) -> dict:
    goal_doc = await db.weekly_goals.find_one({"user_id": user_id})
    target = goal_doc["workouts_per_week"] if goal_doc else 3
    cur_start, cur_end = get_current_week_range()
    completed = await count_workouts_in_range(db, user_id, cur_start, cur_end)
    pct = min(100.0, (completed / target * 100.0) if target > 0 else 0)
    if completed >= target:
        status = "completed"
    else:
        # at risk if it's Friday or later and not done
        now = datetime.now(timezone.utc)
        days_left = 6 - now.weekday()  # 0=mon...6=sun. days_left includes today partially
        remaining_needed = target - completed
        status = "at_risk" if remaining_needed > days_left + 1 else "on_track"
    return {
        "workouts_per_week": target,
        "week_workouts_completed": completed,
        "week_progress_pct": round(pct, 1),
        "status": status,
    }
