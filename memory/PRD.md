# FitFlow AI — Product Requirements (MVP)

## Stack
- Frontend: Expo (React Native + Expo Router) — also runs on Expo Web
- Backend: FastAPI + Python (uvicorn)
- Database: MongoDB (motor async driver)
- Auth: Custom JWT (bcrypt password hashing, Bearer token + AsyncStorage on client)
- Image storage: Base64 inline in MongoDB (MVP)
- AI: GPT-4o (vision + text) via emergentintegrations (Emergent LLM Key)
- Charts: react-native-chart-kit (workouts/week, volume/week, est. 1RM)

## Core Features (all implemented)
1. Auth: register, login, logout, /me, refresh, brute-force protection.
2. Profile onboarding: age, gender (optional), weight (kg), height (cm), activity level, goal, experience, days/week.
3. Nutrition target calculation (Mifflin-St Jeor; macro targets per goal; min 1200 kcal).
4. Workout plan generator (deterministic templates based on days/week × goal × experience).
5. Workout session logger (multi-exercise, multi-set, RPE optional, dynamic add/remove, exercise picker w/ search).
6. Workout history (volume per session, expand/collapse, delete).
7. Progress charts: workouts/week (bar), volume/week (line), est. 1RM per chosen exercise (line).
8. Weekly streak: target 1–7 workouts/week; status on_track | completed | at_risk; streak increments on prior week pass; resets on miss.
9. Muscle ranking: 30-day weighted volume → Beginner/Intermediate/Advanced/Elite with progress to next level + top 3 exercises per muscle.
10. Meal scan: image picker → GPT-4o vision → editable foods + macros → save.
11. Fridge scan: image picker → GPT-4o vision → ingredient checklist → meal suggestions.
12. Meal suggestions: GPT-4o generates 3 healthy meals using available ingredients and remaining macros.
13. Today's nutrition dashboard: progress bars, today's meals, recent meals, delete.
14. Disclaimers throughout (not medical advice).

## Out of scope (per requirements)
- Body scanning, form-checker video, live audio coach, generated future-body photos, real-time gym crowd detection.

## Backend API (all under /api)
- Auth: /auth/register, /auth/login, /auth/logout, /auth/me, /auth/refresh
- Profile: POST/GET /profile
- Nutrition: GET /nutrition/targets, GET /nutrition/today, POST/GET/DELETE /meals
- Workout: GET/POST /workout/plan, POST /workout/plan/regenerate, POST/GET/DELETE /workout/session(s), GET /workout/progress
- Streak: POST /streak/goal, GET /streak
- Ranking: GET /ranking
- Exercises: GET /exercises (32 seeded)
- AI: POST /ai/scan-meal, /ai/scan-fridge, /ai/meal-suggestions

## Demo Flow
1. Register → onboarding (age 22, weight 78, height 180, moderately_active, gain_muscle, intermediate, 4 days).
2. Plan generated: 4-Day Upper/Lower split. Targets: ~3090 kcal, 140g protein.
3. Log workout → Bench, Squat, Row → progress charts populate, streak 1/4.
4. Muscle ranking updates for chest/legs/back.
5. Scan meal photo → AI returns foods → confirm → save → nutrition page updates.
6. Scan fridge photo → AI ingredient list → tap "Get suggestions" → 3 meal ideas.

## Environment
- Backend `.env`: MONGO_URL, DB_NAME, JWT_SECRET, EMERGENT_LLM_KEY
- Frontend `.env`: EXPO_PUBLIC_BACKEND_URL (preview URL)

## Disclaimers (in UI)
- "Calorie and macronutrient targets are estimates based on your profile and are not medical advice."
- "Nutrition values are approximate visual estimates. Please confirm foods and quantities before saving."
- "Meal suggestions are general wellness suggestions and do not replace advice from a doctor or dietitian."
