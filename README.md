# FitFlow AI

![CI](https://github.com/BogdanCherascu/FitnessApp/actions/workflows/ci.yml/badge.svg?branch=my-SetupAplicatie)

FitFlow AI is a fitness and nutrition assistant with a FastAPI backend and an Expo/React Native frontend. It includes profile-based nutrition targets, generated workout plans, workout logging, progress tracking, muscle ranking, meal logging, and AI-assisted meal/fridge features.

## CI Pipeline

GitHub Actions runs automatically on every push and pull request.

The CI workflow validates:

- backend unit tests;
- backend local API tests;
- AI evals for agent output contracts;
- frontend TypeScript checks;
- frontend lint;
- frontend Jest component tests;
- Expo web build.

Workflow file:

- `.github/workflows/ci.yml`

Testing strategy:

- `docs/testing_strategy.md`

Branch protection setup:

- `docs/branch_protection.md`

## Run Tests Locally

Backend unit tests:

```bash
python -m pytest backend/tests/unit -q --confcutdir=backend/tests/unit
```

Backend API tests:

```bash
python -m pytest backend/tests/api -q --confcutdir=backend/tests/api
```

AI evals:

```bash
python -m pytest evals -q
```

Frontend checks:

```bash
cd frontend
npm ci
npm run typecheck
npm run lint
npm run test
npm run build:web
```
