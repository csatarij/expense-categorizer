# Expense Categorizer

[![CI](https://github.com/csatarij/expense-categorizer/actions/workflows/ci.yml/badge.svg)](https://github.com/csatarij/expense-categorizer/actions/workflows/ci.yml)
[![Deploy](https://github.com/csatarij/expense-categorizer/actions/workflows/deploy.yml/badge.svg)](https://github.com/csatarij/expense-categorizer/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/csatarij/expense-categorizer/branch/main/graph/badge.svg)](https://codecov.io/gh/csatarij/expense-categorizer)

AI-powered expense tracking web application with progressive ML categorization.

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **File Parsing**: SheetJS (xlsx)
- **Testing**: Vitest (unit), Playwright (E2E)
- **Code Quality**: ESLint, Prettier

## Project Structure

```
src/
├── components/     # React components (organized by feature)
├── ml/             # Machine learning modules
│   ├── phase1/     # Rule-based categorization
│   ├── phase2/     # Pattern matching & learning
│   └── phase3/     # Advanced ML models
├── utils/          # Utility functions
├── hooks/          # Custom React hooks
├── context/        # React context providers
├── types/          # TypeScript type definitions
├── data/           # Static data and configurations
└── test/           # Test setup and utilities

tests/
├── e2e/            # Playwright E2E tests
└── fixtures/       # Test data and fixtures

docs/               # Documentation
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers (for E2E tests)
npx playwright install
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:5173 in your browser
```

### Building

```bash
# Create production build
npm run build

# Preview production build
npm run preview
```

## Testing

```bash
# Run unit tests
npm run test:unit

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test

# Generate coverage report
npm run test:coverage
```

## Code Quality

```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# TypeScript type checking
npm run type-check
```

## ML Progression

The expense categorization system progresses through three phases:

### Phase 1: Rule-Based Categorization
- Keyword matching
- Merchant name recognition
- Basic pattern rules

### Phase 2: Pattern Learning
- User feedback incorporation
- Category refinement
- Confidence scoring

### Phase 3: Advanced ML
- TensorFlow.js integration
- Custom model training
- Predictive categorization

---

## Development Approach

This project was built with AI assistance using [Claude](https://claude.ai), demonstrating modern AI-augmented development workflows. All code has been reviewed and understood by the developer.

---

Built with Vite + React + TypeScript
