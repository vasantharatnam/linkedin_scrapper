# LinkedIn Profile API

HTTP API that normalizes LinkedIn profile data from authorized, captured LinkedIn internal endpoint responses.

This project intentionally uses direct HTTP requests only. It does not use Playwright, Puppeteer, Selenium, browser automation, DOM/HTML scraping, third-party scraping APIs, proxy bypasses, CAPTCHA solving, or access-control bypasses.

## Current Status

- Public health endpoint: `GET /api/v1/health`
- OpenAPI document: `GET /api/docs/openapi.json`
- Profile endpoint: `POST /api/v1/profiles/scrape`
- Authentication: `X-API-Key`
- LinkedIn access: caller-configured session cookies and caller-supplied internal endpoint configuration
- Fixtures: synthetic fixtures only are committed
- Tests: Vitest and Supertest with mocked HTTP calls only

## Requirements

- Node.js 22 or newer
- npm
- Docker, optional for container validation and deployment

## Setup

Install dependencies:

```sh
npm ci
```

Create local environment settings:

```sh
cp .env.example .env
```

Set `API_KEY` to a long random value before starting the API. Keep `.env` local; it is ignored by git.

Start the development server:

```sh
npm run dev
```

Build and run production output:

```sh
npm run build
npm start
```

## Environment Variables

`API_KEY` is required. Clients must send the same value in the `X-API-Key` header.

`PORT` defaults to `3000`.

`LOG_LEVEL` accepts `debug`, `info`, `warn`, or `error`.

`LINKEDIN_BASE_URL` defaults to `https://www.linkedin.com`.

`LINKEDIN_REQUEST_TIMEOUT_MS` controls direct LinkedIn HTTP timeout.

`LINKEDIN_LI_AT` and `LINKEDIN_JSESSIONID` are optional at process startup, but required when profile retrieval is used with the default LinkedIn HTTP client.

`LINKEDIN_USER_AGENT` and `LINKEDIN_LANGUAGE` are sent with LinkedIn requests. The default language is `en_US`.

`LINKEDIN_PROFILE_ENDPOINT_CONFIG_JSON` is required at runtime for profile retrieval. It must contain only sanitized endpoint structure captured from an authorized LinkedIn request: method, relative path, query parameter names/templates, headers that are safe to reproduce, and body template if needed. Do not include cookies, CSRF tokens, authorization headers, account identifiers, or real profile data.

`LINKEDIN_SKILLS_ENDPOINT_CONFIG_JSON` is optional. If the captured LinkedIn endpoint does not expose skills or returns 403/404, skills are returned as an empty array and this is treated as a documented limitation.

`PROFILE_CACHE_TTL_MS`, `PROFILE_CACHE_MAX_ENTRIES`, `API_RATE_LIMIT_WINDOW_MS`, and `API_RATE_LIMIT_MAX_REQUESTS` control in-memory cache and rate limiting.

## Direct Reverse-Engineering Approach

The service is built around a narrow request builder for LinkedIn internal endpoints. Endpoint details are isolated in JSON environment configuration so credentials and endpoint captures are not hardcoded in source.

Runtime flow:

1. Validate and canonicalize the supplied LinkedIn profile URL.
2. Build one or more direct LinkedIn HTTP requests from the configured captured endpoint shape.
3. Send requests with the local authorized LinkedIn session values.
4. Parse LinkedIn's normalized JSON response.
5. Index `included` entities by URN.
6. Normalize basic profile, experience, education, and skills into a stable public schema.
7. Validate the response before returning it.

The code deliberately avoids browser rendering, page scraping, and any automation that would operate the LinkedIn UI.

## API Usage

Health is public:

```sh
curl http://localhost:3000/api/v1/health
```

Profile retrieval requires `X-API-Key`:

```sh
curl -X POST http://localhost:3000/api/v1/profiles/scrape \
  -H "content-type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{"linkedinUrl":"https://www.linkedin.com/in/example-profile/"}'
```

Successful responses use this shape:

```json
{
  "success": true,
  "data": {
    "identifier": "example-profile",
    "fullName": "Example Person",
    "headline": "Example Headline",
    "about": null,
    "location": null,
    "profileImages": [],
    "followers": null,
    "connections": null,
    "currentCompany": null,
    "experience": [],
    "education": [],
    "skills": []
  },
  "meta": {
    "scrapedAt": "2026-08-30T00:00:00.000Z",
    "cached": false
  }
}
```

Errors use this shape:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed"
  }
}
```

See `GET /api/docs/openapi.json` for the full request and response contract.

## Architecture

- `src/app.ts` creates the Express app and middleware stack.
- `src/routes` defines public docs/health routes and authenticated profile routes.
- `src/controllers/profile.controller.ts` handles validation, cache lookup, service calls, and response validation.
- `src/services/linkedin-profile.service.ts` coordinates URL parsing, endpoint request building, direct LinkedIn calls, and normalization.
- `src/clients/linkedin-http.client.ts` performs direct HTTP requests and maps upstream errors.
- `src/linkedin` contains endpoint configuration, normalized-response helpers, and LinkedIn profile normalizers.
- `src/cache` contains bounded TTL cache utilities.
- `src/middleware/api-key.middleware.ts` implements constant-time API key checks.

## Tests And Verification

Run the main checks:

```sh
npm run typecheck
npm test
npm run build
npm run verify:fixtures
npm run verify:endpoints
npm run verify:normalized-response
npm run verify:profile-basic
npm run verify:profile-sections
npm run verify:profile-skills
npm run verify:profile-service
npm run verify:profile-route
npm run verify:api-key-auth
npm run verify:cache-rate-limit
npm run verify:openapi
npm run verify:deployment
```

Run dependency audit:

```sh
npm audit --audit-level=moderate
```

Run Docker validation:

```sh
docker build -t linkedin-profile-api:local .
```

Tests use mocked HTTP clients and synthetic fixtures only. They do not call LinkedIn and do not use browser automation.

## Fixture Safety

Committed fixtures live under `fixtures/synthetic`.

Ignored local-only fixture paths:

- `fixtures/raw`
- `fixtures/local`

Use the fixture tooling to sanitize local captures before creating synthetic test data. Do not commit raw LinkedIn responses, cookies, CSRF tokens, authorization headers, API keys, account identifiers, personal emails, phone numbers, or real profile content.

## Caching And Rate Limits

Successful profile responses are cached in memory for a bounded TTL. Cache keys include a digest of the authenticated API key scope and the canonical LinkedIn profile URL, so data is not shared across API keys.

Failures are not cached.

Rate limiting is also scoped by API key digest. The health and docs endpoints remain public.

## Deployment

The Dockerfile uses a multi-stage Node 22 Alpine build and a non-root runtime user. The runtime image contains production dependencies and compiled `dist` output only.

The container health check calls:

```text
/api/v1/health
```

`render.yaml` provides an HTTPS-capable Render Blueprint using Docker runtime. Secret values are declared with `sync: false` and must be set in the platform dashboard, not committed to git.

Required production secrets:

- `API_KEY`
- `LINKEDIN_LI_AT`
- `LINKEDIN_JSESSIONID`
- `LINKEDIN_PROFILE_ENDPOINT_CONFIG_JSON`

Optional production secret:

- `LINKEDIN_SKILLS_ENDPOINT_CONFIG_JSON`

## Security Notes

- API key comparison is constant-time.
- API keys, LinkedIn cookies, and CSRF tokens are never logged.
- Direct LinkedIn request logs include method, origin, and pathname only.
- `.env`, raw fixtures, and local captures are ignored.
- Endpoint configuration must use relative paths and must not include credential headers.
- Cache entries are in-memory only and are not persisted.

## Operational Limitations

LinkedIn internal endpoints are undocumented and can change without notice. Endpoint paths, query names, response entity names, pagination behavior, and included entity structures may become invalid at any time.

LinkedIn session cookies expire and can be revoked. When that happens, upstream 401 responses are mapped to API errors indicating that LinkedIn authentication is required or expired.

Profile visibility is limited by the authenticated LinkedIn session. Private, restricted, out-of-network, blocked, deleted, or otherwise unavailable profiles may return 403 or 404.

Skills are only returned when the configured authorized endpoint exposes them. Missing or inaccessible skills are represented as an empty array.

The cache is process-local. Multiple replicas do not share cache state.

## Privacy And Legal Considerations

This project is a technical implementation, not legal advice. Use it only with accounts, data, and purposes you are authorized to use, and consult counsel before production use.

LinkedIn's User Agreement effective November 3, 2025 states limits on scraping/copying profiles and other data, bypassing access controls, using unauthorized automated methods, and copying or distributing information without consent. LinkedIn's Crawling Terms say automated crawling and indexing require express permission. LinkedIn's Professional Community Policies also require trustworthy use of the service.

Relevant LinkedIn references:

- https://www.linkedin.com/legal/user-agreement
- https://www.linkedin.com/legal/crawling-terms
- https://www.linkedin.com/legal/professional-community-policies
- https://www.linkedin.com/help/lms/answer/a1341387

## Explicit Non-Goals

- No browser automation.
- No HTML scraping.
- No CAPTCHA solving.
- No proxy rotation or access-control bypass.
- No third-party scraping API.
- No committed real LinkedIn data.
- No stable guarantee that LinkedIn internal endpoints will keep working.
