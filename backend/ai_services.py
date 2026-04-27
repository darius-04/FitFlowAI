"""AI services using GPT-4o via emergentintegrations."""
import os
import json
import re
import uuid
import logging
from typing import Optional, List

from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

logger = logging.getLogger(__name__)


def _get_key() -> str:
    return os.environ.get("EMERGENT_LLM_KEY", "")


def _strip_to_json(text: str) -> str:
    """Extract JSON block from a model response that may include code fences or extra text."""
    if not text:
        return "{}"
    text = text.strip()
    # Strip code fences
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    # If still wrapped, try to find first { ... } block
    if not text.startswith("{"):
        m = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if m:
            text = m.group(0)
    return text


def _safe_json(text: str) -> Optional[dict]:
    try:
        return json.loads(_strip_to_json(text))
    except Exception:
        logger.warning("Failed to parse AI JSON: %s", text[:300])
        return None


def _normalize_image_b64(b64: str) -> str:
    """Strip data URL prefix if present, return raw base64."""
    if "," in b64 and b64.lstrip().startswith("data:"):
        return b64.split(",", 1)[1]
    return b64


async def scan_meal_image(image_b64: str) -> dict:
    """Detect foods from a meal photo. Returns dict with detectedFoods, totalEstimate, disclaimer."""
    raw_b64 = _normalize_image_b64(image_b64)
    chat = LlmChat(
        api_key=_get_key(),
        session_id=f"meal-scan-{uuid.uuid4()}",
        system_message=(
            "You are a nutrition assistant that estimates the nutritional content of foods "
            "from a single meal photograph. Always respond with VALID JSON ONLY (no prose, "
            "no markdown). Be conservative; mark confidence (0-1) for each item."
        ),
    ).with_model("openai", "gpt-4o")

    prompt = (
        "Analyze this meal photo and identify each visible food item. "
        "Return ONLY a JSON object with this exact shape:\n"
        "{\n"
        '  "detectedFoods": [\n'
        '    {"name": str, "estimatedQuantity": str, "confidence": float, '
        '"estimatedCalories": int, "protein": int, "carbs": int, "fat": int}\n'
        "  ],\n"
        '  "totalEstimate": {"calories": int, "protein": int, "carbs": int, "fat": int},\n'
        '  "disclaimer": str\n'
        "}\n"
        "If you cannot identify any food, return detectedFoods as an empty list. "
        "Do not include any other text."
    )
    msg = UserMessage(text=prompt, file_contents=[ImageContent(image_base64=raw_b64)])
    response = await chat.send_message(msg)
    parsed = _safe_json(response if isinstance(response, str) else str(response))
    if not parsed or "detectedFoods" not in parsed:
        return {
            "detectedFoods": [],
            "totalEstimate": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0},
            "disclaimer": "We could not analyze this image. Please try again with a clearer photo.",
            "error": True,
        }
    parsed.setdefault(
        "disclaimer",
        "This is an approximate visual estimate and should be confirmed by the user.",
    )
    # Recompute total if not present or zero
    foods = parsed.get("detectedFoods", []) or []
    total = parsed.get("totalEstimate") or {}
    if not total or total.get("calories", 0) == 0:
        total = {
            "calories": int(sum(f.get("estimatedCalories", 0) for f in foods)),
            "protein": int(sum(f.get("protein", 0) for f in foods)),
            "carbs": int(sum(f.get("carbs", 0) for f in foods)),
            "fat": int(sum(f.get("fat", 0) for f in foods)),
        }
        parsed["totalEstimate"] = total
    return parsed


async def scan_fridge_image(image_b64: str) -> dict:
    raw_b64 = _normalize_image_b64(image_b64)
    chat = LlmChat(
        api_key=_get_key(),
        session_id=f"fridge-scan-{uuid.uuid4()}",
        system_message=(
            "You are an assistant that identifies ingredients visible in a fridge or pantry photo. "
            "Always respond with VALID JSON ONLY (no prose, no markdown)."
        ),
    ).with_model("openai", "gpt-4o")

    prompt = (
        "List all visible ingredients in this photo. "
        "Return ONLY a JSON object with this exact shape:\n"
        "{\n"
        '  "detectedIngredients": [{"name": str, "confidence": float}],\n'
        '  "disclaimer": str\n'
        "}\n"
        "Do not include any other text."
    )
    msg = UserMessage(text=prompt, file_contents=[ImageContent(image_base64=raw_b64)])
    response = await chat.send_message(msg)
    parsed = _safe_json(response if isinstance(response, str) else str(response))
    if not parsed or "detectedIngredients" not in parsed:
        return {
            "detectedIngredients": [],
            "disclaimer": "We could not analyze this image. Please try again with a clearer photo.",
            "error": True,
        }
    parsed.setdefault(
        "disclaimer",
        "Ingredient detection is approximate and should be confirmed by the user.",
    )
    return parsed


async def generate_meal_suggestions(
    ingredients: Optional[List[str]] = None,
    remaining_calories: Optional[int] = None,
    remaining_protein: Optional[int] = None,
    remaining_carbs: Optional[int] = None,
    remaining_fat: Optional[int] = None,
) -> dict:
    chat = LlmChat(
        api_key=_get_key(),
        session_id=f"meal-suggestions-{uuid.uuid4()}",
        system_message=(
            "You are a healthy meal suggestion assistant. Provide general wellness suggestions, "
            "never medical advice. Always respond with VALID JSON ONLY."
        ),
    ).with_model("openai", "gpt-4o")

    constraints = []
    if ingredients:
        constraints.append(f"Use mostly these ingredients: {', '.join(ingredients)}.")
    if remaining_calories is not None:
        constraints.append(f"Target ~{remaining_calories} kcal per meal.")
    if remaining_protein is not None:
        constraints.append(f"Target ~{remaining_protein}g protein.")
    if remaining_carbs is not None:
        constraints.append(f"Target ~{remaining_carbs}g carbs.")
    if remaining_fat is not None:
        constraints.append(f"Target ~{remaining_fat}g fat.")
    constraints_str = " ".join(constraints) if constraints else "Provide balanced healthy meals."

    prompt = (
        "Suggest 3 healthy meals. " + constraints_str +
        " Return ONLY a JSON object: {\n"
        '  "suggestions": [\n'
        '    {"name": str, "ingredients": [str], "preparation": str, '
        '"estimatedCalories": int, "protein": int, "carbs": int, "fat": int}\n'
        "  ]\n"
        "}\nDo not include any other text."
    )

    response = await chat.send_message(UserMessage(text=prompt))
    parsed = _safe_json(response if isinstance(response, str) else str(response))
    if not parsed or "suggestions" not in parsed:
        return {"suggestions": [], "error": True,
                "disclaimer": "Could not generate suggestions. Please try again."}
    parsed.setdefault(
        "disclaimer",
        "Meal suggestions are general wellness suggestions and do not replace advice from a doctor or dietitian.",
    )
    return parsed
