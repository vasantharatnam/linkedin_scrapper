# Fixture Workflow

This project keeps committed fixtures synthetic only. Do not commit raw LinkedIn responses, cookies, CSRF tokens, API keys, authorization headers, profile data, or other personal data.

## Directories

- `fixtures/synthetic/`: committed synthetic fixtures used by tests and schema checks.
- `fixtures/raw/`: ignored local-only captures from authorized manual research.
- `fixtures/local/`: ignored local-only sanitizer output and scratch files.

## Safe Workflow

1. Place authorized raw captures only under `fixtures/raw/`.
2. Run `npm run fixtures:sanitize -- --input fixtures/raw/<file>.json --output fixtures/local/<file>.sanitized.json`.
3. Use the sanitized local output only to understand structure.
4. Manually create or update synthetic fixtures under `fixtures/synthetic/` with invented names, identifiers, URLs, companies, schools, dates, and counts.
5. Run `npm run verify:fixtures` before staging.

Sanitized files remain local and ignored because redaction is a safety net, not proof that data is safe to publish.
