# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered expense tracking web application with progressive ML categorization.

## Tech Stack

- React 18 + TypeScript + Vite
- Tailwind CSS for styling
- SheetJS (xlsx) for file parsing
- Vitest + React Testing Library for unit tests
- Playwright for E2E tests
- ESLint + Prettier for code quality

## Common Commands

```bash
npm run dev           # Start dev server (http://localhost:5173)
npm run build         # Production build
npm run test:unit     # Run unit tests
npm run test:e2e      # Run E2E tests
npm run test:coverage # Coverage report (80% threshold)
npm run lint          # Run ESLint
npm run type-check    # TypeScript checking
```

## Project Structure

- `src/components/` - React components (one folder per component)
- `src/ml/phase1/` - Rule-based categorization
- `src/ml/phase2/` - Pattern matching & learning
- `src/ml/phase3/` - Advanced ML models
- `src/utils/` - Utility functions
- `src/hooks/` - Custom React hooks
- `src/context/` - React context providers
- `src/types/` - TypeScript type definitions
- `src/data/` - Static data and configurations
- `tests/e2e/` - Playwright E2E tests
- `tests/fixtures/` - Test data and fixtures

## Code Style

- Use `@/` path alias for imports from `src/`
- Follow strict TypeScript mode
- Tailwind CSS for all styling
- Components should have corresponding `.test.tsx` files
- **Commit Messages**: Short summaries (1-10 words), no elaboration needed

## Quality Standards

- **Pre-commit & Pre-PR Checks**: All commits and PRs MUST pass the following checks before being created or pushed to GitHub to avoid CI/CD failures:
  - Run `npm run lint` to verify code quality
  - Run `npm run test:unit` to verify unit tests pass
  - Run `npm run test:e2e` to verify E2E tests pass
  - Run `npm run test:coverage` to verify coverage meets minimum thresholds
- **Code Coverage**: Test coverage must be maintained at or above 80% per file. The CI/CD pipeline will fail if coverage drops below this threshold.
  - **Known Issue**: The vitest/v8 coverage reporter shows duplicate file entries on Windows, which affects aggregate coverage calculations. Individual file coverage (non-zero entries) should be above 80% for statements, lines, and functions. Branch coverage target is 70% due to this reporting issue.
