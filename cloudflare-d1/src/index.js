const ALLOWED_KEYS = new Set([
  "stores",
  "casts",
  "source_status",
  "ranking_state",
  "refresh_status",
  "settings"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function authorized(request, env) {
  const token = env.API_TOKEN;
  if (!token) return false;
  return request.headers.get("authorization") === `Bearer ${token}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (request.method === "GET" && path === "/health") {
      try {
        const row = await env.DB.prepare("SELECT COUNT(*) AS count FROM app_data").first();
        return json({ ok: true, service: "hiroshima-cast-storage", database: "connected", keys: row?.count ?? 0 });
      } catch (error) {
        return json({ ok: false, error: "database_not_ready" }, 503);
      }
    }

    if (!authorized(request, env)) {
      return json({ ok: false, error: "unauthorized" }, 401);
    }

    if (request.method === "GET" && path === "/v1/summary") {
      const rows = await env.DB.prepare(
        "SELECT data_key, updated_at, payload_bytes FROM app_data ORDER BY data_key"
      ).all();
      return json({ ok: true, records: rows.results || [] });
    }

    if (request.method === "GET" && path === "/v1/refresh-runs") {
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 10)));
      const rows = await env.DB.prepare(
        "SELECT id, started_at, finished_at, status, store_count_before, store_count_after, cast_count_before, cast_count_after, source_results_json FROM refresh_runs ORDER BY id DESC LIMIT ?"
      ).bind(limit).all();
      return json({ ok: true, runs: rows.results || [] });
    }

    const dataMatch = path.match(/^\/v1\/data\/([a-z_]+)$/);
    if (dataMatch) {
      const key = dataMatch[1];
      if (!ALLOWED_KEYS.has(key)) return json({ ok: false, error: "invalid_key" }, 400);

      if (request.method === "GET") {
        const row = await env.DB.prepare(
          "SELECT value_json, updated_at, payload_bytes FROM app_data WHERE data_key = ?"
        ).bind(key).first();
        if (!row) return json({ ok: true, key, found: false, value: null });
        let value;
        try { value = JSON.parse(row.value_json); }
        catch { return json({ ok: false, error: "stored_json_invalid", key }, 500); }
        return json({ ok: true, key, found: true, value, updatedAt: row.updated_at, bytes: row.payload_bytes });
      }

      if (request.method === "PUT") {
        const raw = await request.text();
        if (raw.length > 2_000_000) return json({ ok: false, error: "payload_too_large", maxBytes: 2_000_000 }, 413);
        let value;
        try { value = JSON.parse(raw); }
        catch { return json({ ok: false, error: "invalid_json" }, 400); }
        const valueJson = JSON.stringify(value);
        const updatedAt = new Date().toISOString();
        const bytes = new TextEncoder().encode(valueJson).length;
        await env.DB.prepare(
          "INSERT INTO app_data (data_key, value_json, updated_at, payload_bytes) VALUES (?, ?, ?, ?) ON CONFLICT(data_key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at, payload_bytes = excluded.payload_bytes"
        ).bind(key, valueJson, updatedAt, bytes).run();
        return json({ ok: true, key, updatedAt, bytes });
      }
    }

    if (request.method === "POST" && path === "/v1/refresh-runs") {
      const raw = await request.text();
      if (raw.length > 200_000) return json({ ok: false, error: "payload_too_large" }, 413);
      let run;
      try { run = JSON.parse(raw); }
      catch { return json({ ok: false, error: "invalid_json" }, 400); }
      const status = ["completed", "partial", "failed"].includes(run.status) ? run.status : "failed";
      const startedAt = String(run.startedAt || new Date().toISOString());
      const finishedAt = String(run.finishedAt || new Date().toISOString());
      const safeJson = JSON.stringify(run.sourceResults || {});
      const result = await env.DB.prepare(
        "INSERT INTO refresh_runs (started_at, finished_at, status, store_count_before, store_count_after, cast_count_before, cast_count_after, source_results_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(
        startedAt, finishedAt, status,
        Number.isFinite(Number(run.storeCountBefore)) ? Number(run.storeCountBefore) : null,
        Number.isFinite(Number(run.storeCountAfter)) ? Number(run.storeCountAfter) : null,
        Number.isFinite(Number(run.castCountBefore)) ? Number(run.castCountBefore) : null,
        Number.isFinite(Number(run.castCountAfter)) ? Number(run.castCountAfter) : null,
        safeJson
      ).run();
      return json({ ok: true, id: result.meta?.last_row_id ?? null });
    }

    return json({ ok: false, error: "not_found" }, 404);
  }
};
