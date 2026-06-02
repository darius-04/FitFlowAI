import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from muscle_ranking import get_ranking_level


def test_ranking_level_progress_between_thresholds():
    level = get_ranking_level("chest", 5500)

    assert level["level"] == "Intermediate"
    assert level["next_level"] == "Advanced"
    assert level["next_level_threshold"] == 8000
    assert level["progress_pct"] == 50.0


def test_elite_level_is_maxed():
    level = get_ranking_level("legs", 30000)

    assert level["level"] == "Elite"
    assert level["next_level"] is None
    assert level["progress_pct"] == 100.0
