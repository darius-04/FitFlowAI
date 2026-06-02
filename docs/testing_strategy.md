# Testing Strategy

FitFlow AI uses automated checks at multiple levels: backend unit tests, backend API tests, AI evals, and frontend quality checks. The goal is to catch regressions before code is merged or delivered.

## Test Layers

### Backend Unit Tests

Location:

- `backend/tests/unit/`

Purpose:

- Validate pure business logic without HTTP, MongoDB, or AI services.
- Keep feedback fast and deterministic.

Covered areas:

- nutrition target calculations;
- workout plan generation;
- muscle ranking thresholds and progress.

Run locally:

```bash
python -m pytest backend/tests/unit -q --confcutdir=backend/tests/unit
```

### Backend API Tests

Location:

- `backend/tests/api/`

Purpose:

- Validate real FastAPI endpoints using `TestClient`.
- Exercise integrated backend flows without requiring a real MongoDB instance.

Implementation details:

- Tests replace `server.db` with an async in-memory fake database.
- Tests use a dummy Gemini API key only to allow import-time initialization.
- AI providers are not called.

Covered flows:

- register -> `/auth/me` -> create profile -> nutrition targets -> workout plan;
- create profile -> log workout -> history -> progress -> ranking;
- create profile -> save meal -> today nutrition -> delete meal.
- AI endpoints with monkeypatched AI services.

Run locally:

```bash
python -m pytest backend/tests/api -q --confcutdir=backend/tests/api
```

### AI Evals

Location:

- `evals/`

Purpose:

- Validate expected agent output contracts.
- Ensure agent responses are structured, numerically coherent, and safe enough for the app to consume.

Covered agents/features:

- meal scan;
- fridge scan;
- meal suggestions.

Checks include:

- required JSON fields;
- numeric macro/calorie values;
- confidence values between 0 and 1;
- disclaimers;
- exactly 3 meal suggestions;
- macro targets within tolerance;
- no unsafe medical claims.

Run locally:

```bash
python -m pytest evals -q
```

### Frontend Checks

Location:

- `frontend/`

Purpose:

- Validate TypeScript correctness, lint rules, and build readiness.

Run locally:

```bash
cd frontend
npm ci
npm run typecheck
npm run lint
npm run test
npm run build:web
```

## CI Pipeline

Workflow:

- `.github/workflows/ci.yml`

Triggers:

- `push`
- `pull_request`

Backend job:

```bash
pytest backend/tests/unit -q --confcutdir=backend/tests/unit --cov=backend --cov-report=term-missing --cov-append
pytest backend/tests/api -q --confcutdir=backend/tests/api --cov=backend --cov-report=term-missing --cov-append
pytest evals -q
```

Frontend job:

```bash
npm ci
npm run typecheck
npm run lint
npm run test
npm run build:web
```

After a successful frontend build, CI uploads `frontend/dist` as a downloadable artifact named `fitflow-web-build`.

## Live AI Evals

Workflow:

- `.github/workflows/ai-live-evals.yml`

Purpose:

- Reserved for manual or scheduled checks that may use a real `GEMINI_API_KEY`.

Why not run live AI evals on every push:

- live model responses can vary;
- API quota or billing may be involved;
- network/provider issues can create flaky CI failures.

## Current Coverage Summary

Implemented:

- backend unit tests;
- backend local API tests;
- backend API tests for AI endpoints with monkeypatched services;
- backend coverage report in CI;
- mocked AI evals;
- frontend typecheck;
- frontend lint;
- frontend component tests;
- frontend web build;
- downloadable Expo web build artifact;
- GitHub Actions automation;
- branch protection documentation.

Recommended next steps:

1. Add more frontend screen tests for auth, onboarding, workouts, and nutrition.
2. Add optional e2e tests for high-level user flows.
3. Ask a repository owner to enable branch protection using `docs/branch_protection.md`.
4. Add coverage thresholds once the team agrees on a realistic minimum.

## Presentation Summary

The project includes an automated CI pipeline that validates backend logic, backend API flows, frontend correctness, frontend build readiness, and agent evals. Agent evals verify that AI outputs match the app's required schema, include disclaimers, stay within numeric tolerances, and avoid unsafe medical claims.
