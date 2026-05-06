import os
import base64
import json
import re
import logging
from google import genai
from google.genai import types
from typing import Optional, List
from dotenv import load_dotenv
from pathlib import Path

# Configurare Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# Inițializare Client - SINGURA metodă necesară pentru noul SDK
client = genai.Client(
    api_key=os.environ.get("GEMINI_API_KEY"),
    http_options={'api_version': 'v1'}
)

def _normalize_image_b64(b64: str) -> bytes:
    """Strip data URL prefix if present și returnează BYTES (necesar pentru noul SDK)."""
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return base64.b64decode(b64)

async def scan_meal_image(image_b64: str) -> dict:
    """Analizează poza mesei folosind noul SDK google-genai."""
    try:
        image_bytes = _normalize_image_b64(image_b64)

        system_msg = (
            "You are a nutrition assistant. Analyze the meal photo and identify food items. "
            "Return ONLY valid JSON."
        )

        prompt = (
            "Analyze this meal photo. Return ONLY a JSON object with this shape:\n"
            "{\n"
            '  "detectedFoods": [\n'
            '    {"name": str, "estimatedQuantity": str, "confidence": float, '
            '"estimatedCalories": int, "protein": int, "carbs": int, "fat": int}\n'
            '  ],\n'
            '  "totalEstimate": {"calories": int, "protein": int, "carbs": int, "fat": int},\n'
            '  "disclaimer": str\n'
            "}\n"
        )

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            config=types.GenerateContentConfig(
                system_instruction=system_msg,
                response_mime_type="application/json",
            ),
            contents=[
                prompt,
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
            ]
        )

        parsed = json.loads(response.text)

        # Recalculare totaluri dacă AI-ul a dat rateu la sumă
        foods = parsed.get("detectedFoods", [])
        if not parsed.get("totalEstimate") or parsed["totalEstimate"].get("calories") == 0:
            parsed["totalEstimate"] = {
                "calories": sum(f.get("estimatedCalories", 0) for f in foods),
                "protein": sum(f.get("protein", 0) for f in foods),
                "carbs": sum(f.get("carbs", 0) for f in foods),
                "fat": sum(f.get("fat", 0) for f in foods),
            }
        return parsed

    except Exception as e:
        logger.error(f"Gemini Meal Scan error: {e}")
        return {
            "detectedFoods": [],
            "totalEstimate": {"calories": 0, "protein": 0, "carbs": 0, "fat": 0},
            "disclaimer": "Eroare la analiza imaginii.",
            "error": True
        }

async def scan_fridge_image(image_b64: str) -> dict:
    """Detectează ingredientele din frigider."""
    try:
        image_bytes = _normalize_image_b64(image_b64)

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            config=types.GenerateContentConfig(
                system_instruction="You are a kitchen assistant. List visible ingredients from the photo.",
                response_mime_type="application/json",
            ),
            contents=[
                "List all visible ingredients. Return JSON: {\"detectedIngredients\": [{\"name\": str, \"confidence\": float}], \"disclaimer\": str}",
                types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")
            ]
        )
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Gemini Fridge Scan error: {e}")
        return {"detectedIngredients": [], "error": True}

async def generate_meal_suggestions(
        ingredients: Optional[List[str]] = None,
        remaining_calories: Optional[int] = None,
        **macros
) -> dict:
    """Generează sugestii de rețete bazate pe ingredientele din frigider."""
    try:
        constraints = []
        if ingredients:
            constraints.append(f"Use these ingredients: {', '.join(ingredients)}.")
        if remaining_calories:
            constraints.append(f"Target ~{remaining_calories} kcal per meal.")

        prompt = (
            f"Suggest 3 healthy meals. {' '.join(constraints)} "
            "Return ONLY a JSON object: {\"suggestions\": ["
            "{\"name\": str, \"ingredients\": [str], \"preparation\": str, \"estimatedCalories\": int, \"protein\": int, \"carbs\": int, \"fat\": int}"
            "]}"
        )

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            config=types.GenerateContentConfig(
                system_instruction="You are a helpful healthy meal planner. Respond ONLY with JSON.",
                response_mime_type="application/json",
            ),
            contents=prompt
        )
        return json.loads(response.text)
    except Exception as e:
        logger.error(f"Gemini Suggestions error: {e}")
        return {"suggestions": [], "error": True}