# Image / Vision Testing Playbook (FitFlow AI)

## Rules
- Always use base64 PNG/JPEG/WEBP (no SVG/BMP/HEIC/GIF).
- Use real photos with visual features (not solid color blanks).
- Resize large payloads to under ~2MB.
- Re-detect MIME after any conversion.

## Endpoints
- POST /api/ai/scan-meal  body: { image_base64: "data:image/jpeg;base64,..." }
- POST /api/ai/scan-fridge body: { image_base64: "data:image/jpeg;base64,..." }
- POST /api/ai/meal-suggestions body: { ingredients: ["eggs","rice"], remaining_calories: 800, remaining_protein: 50 }

All require Authorization: Bearer <token>.

## Sample Test
```
B64=$(base64 -w0 sample_meal.jpg)
curl -X POST $URL/api/ai/scan-meal \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\":\"data:image/jpeg;base64,$B64\"}"
```

Response must contain `detectedFoods[]` with name, estimatedCalories, protein/carbs/fat, confidence, and `disclaimer`.
