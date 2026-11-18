# Hiroshima Cast Search — Cloudflare D1 storage

This is an isolated storage Worker for the Hiroshima Cast Search app.
It does not change the existing Render services or other apps.

## 1. Create the database

In Cloudflare Dashboard:
1. Open Workers & Pages > D1 SQL Database.
2. Create a database named `hiroshima-cast-storage`.
3. Open the database Console and run all SQL in `schema.sql`.
4. Copy the database ID.

## 2. Configure the Worker

Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.toml` with the database ID.
Connect this repository to a Worker using `cloudflare-d1` as the root directory.
The Worker name must be `hiroshima-cast-storage`.

After the first deployment, add a secret named `API_TOKEN` in Worker Settings > Variables and Secrets.
Use a long random value. Do not put it in GitHub or the browser.

## 3. Endpoints

- `GET /health`: database connectivity check (no secret required)
- `GET /v1/summary`: stored keys and sizes (Bearer token required)
- `GET /v1/data/{key}`: read one stored JSON record (Bearer token required)
- `PUT /v1/data/{key}`: save one JSON record (Bearer token required)
- `GET /v1/refresh-runs?limit=10`: recent refresh history (Bearer token required)
- `POST /v1/refresh-runs`: append refresh history (Bearer token required)

Allowed data keys: `stores`, `casts`, `source_status`, `ranking_state`, `refresh_status`, `settings`.

The Worker accepts a maximum 2 MB JSON record. The API token must be stored only as a Render environment secret and never exposed to the iPhone/browser.

## Important

The storage service does not scrape websites or invent current data. It only stores data received from the Hiroshima Cast Search refresh API. Source failures must remain marked as unconfirmed and must not overwrite previously confirmed data.
