# Branch Protection Setup

This project uses GitHub Actions CI to protect code quality before merge.

## Required Checks

Enable these required status checks for protected branches:

- `Backend tests`
- `Frontend checks`

Both checks come from `.github/workflows/ci.yml`.

## Recommended Rule

Create a branch protection rule for the branch used for integration, usually:

- `main`, if the project uses `main` as the final branch
- `my-SetupAplicatie`, if this branch is used for the current project delivery

Recommended settings:

1. Require a pull request before merging.
2. Require status checks to pass before merging.
3. Require branches to be up to date before merging.
4. Select required checks:
   - `Backend tests`
   - `Frontend checks`
5. Do not allow bypassing the above settings.
6. Optionally require conversation resolution before merging.

## GitHub UI Steps

1. Open the repository on GitHub.
2. Go to `Settings`.
3. Open `Branches`.
4. Click `Add branch protection rule`.
5. Set `Branch name pattern` to the target branch, for example `main`.
6. Enable `Require a pull request before merging`.
7. Enable `Require status checks to pass before merging`.
8. Enable `Require branches to be up to date before merging`.
9. Select `Backend tests` and `Frontend checks`.
10. Save changes.

## Why This Matters

With branch protection enabled, code cannot be merged unless:

- backend unit tests pass;
- AI evals pass;
- frontend TypeScript checks pass;
- frontend lint passes;
- Expo web build passes.

This turns CI from a passive report into an enforced quality gate.
