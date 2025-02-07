# Contributing to InsightFlow AI

Thank you for your interest in contributing!

## Getting Started

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Run seed data: `python scripts/seed_data.py`
4. Run tests: `pytest`
5. Run linter: `ruff check . && ruff format .`
6. Open a Pull Request

## Privacy Guidelines

- Never log raw user data in production code
- All analytics must respect data retention settings
- IP addresses must be anonymized by default

## Adding New Analytics

- New analytics queries: add to `backend/analytics/`
- New AI insights: add to `backend/ai/`
- New chart types: add React component to `frontend/src/components/`

## Code Style

- Python: PEP 8, `ruff`
- TypeScript: strict mode
- SQL: use SQLAlchemy ORM, no raw strings with user input
