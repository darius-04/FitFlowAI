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

BASE_DIR = Path(__file__).resolve().parent

ENV_PATH = BASE_DIR / ".env"

load_dotenv(dotenv_path=ENV_PATH)

api_key = os.getenv("GEMINI_API_KEY")

client = genai.Client(
    api_key=api_key.strip() if api_key else None
)

def _normalize_image_b64(b64: str) -> bytes:
    """Strip data URL prefix if present și returnează BYTES (necesar pentru noul SDK)."""
    if "," in b64:
        b64 = b64.split(",", 1)[1]
    return base64.b64decode(b64)

async def scan_meal_image(image_b64: str) -> dict:
    try:
        image_bytes = _normalize_image_b64(image_b64)
        image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")

        full_prompt = (
            "Analyze this meal photo. Return ONLY a JSON object with this shape:\n"
            "{\n"
            '  "detectedFoods": [\n'
            '    {"name": "string", "estimatedQuantity": "string", "confidence": float, '
            '"estimatedCalories": int, "protein": int, "carbs": int, "fat": int}\n'
            '  ],\n'
            '  "totalEstimate": {"calories": int, "protein": int, "carbs": int, "fat": int},\n'
            '  "disclaimer": "string"\n'
            "}\n"
            "Do not include markdown tags like ```json."
        )

        # Am actualizat lista conform catalogului tău real
        available_models = [
            "gemini-3.1-flash-lite-preview",
            "gemini-2.5-flash",
            "gemini-flash-latest"
        ]

        last_error = None

        for model_name in available_models:
            try:
                logger.info(f"Încercare scanare cu modelul: {model_name}")
                response = client.models.generate_content(
                    model=model_name,
                    contents=[full_prompt, image_part]
                )

                if response and response.text:
                    clean_json = response.text.replace("```json", "").replace("```", "").strip()
                    return json.loads(clean_json)

            except Exception as e:
                last_error = e
                # Dacă e 404 (model expirat) sau 503 (ocupat), continuăm cu următorul
                if "404" in str(e) or "503" in str(e):
                    logger.warning(f"Modelul {model_name} nu este disponibil. Încercăm următorul...")
                    continue
                else:
                    break

        raise last_error

    except Exception as e:
        logger.error(f"Eroare finală: {e}")
        return {"error": True, "disclaimer": f"Eroare: {str(e)}"}
async def scan_fridge_image(image_b64: str) -> dict:
    try:
        image_bytes = _normalize_image_b64(image_b64)
        image_part = types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")

        # Prompt specific pentru frigider
        fridge_prompt = (
            "Analyze this fridge interior. Return ONLY a JSON object with this shape:\n"
            "{\n"
            '  "detectedIngredients": [{"name": "string", "category": "string", "confidence": float}],\n'
            '  "suggestedRecipes": [{"title": "string", "ingredientsUsed": ["string"], "difficulty": "string", "calories": int, "protein": int, "carbs": int, "fat": int}],\n'
            '  "disclaimer": "string"\n'
            "}\n"
            "Identify as many raw ingredients as possible. For each suggested recipe, estimate the total calories, protein (in grams), carbs (in grams), and fat (in grams) per serving."
        )

        response = client.models.generate_content(
            model="gemini-3.1-flash-lite-preview",
            contents=[fridge_prompt, image_part]
        )

        clean_json = response.text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean_json)

    except Exception as e:
        logger.error(f"Fridge Scan Error: {e}")
        return {"error": True, "disclaimer": str(e)}

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