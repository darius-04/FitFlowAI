# AI Evals

These tests validate the contracts expected from FitFlow AI agent outputs.

The default CI evals are mocked and deterministic. They do not call Gemini or any
external model. Their purpose is to catch broken schemas, unsafe wording, missing
disclaimers, and nutritionally incoherent generated meal plans before a change is merged.

Live model evals should be run manually or on a schedule with `GEMINI_API_KEY` configured
in GitHub Actions secrets.
